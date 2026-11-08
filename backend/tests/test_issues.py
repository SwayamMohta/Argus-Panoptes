import uuid

from tests.conftest import OVERLAP

ISSUES = "/api/v1/issues"
NEAR_LAT, NEAR_LON = 17.4005, 78.4005
FAR_LAT, FAR_LON = 17.50, 78.60
WATER_SQUARE = "POLYGON((78.42 17.42, 78.44 17.42, 78.44 17.44, 78.42 17.44, 78.42 17.42))"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def user_token(make_token):
    sub = uuid.uuid4()
    return make_token(sub=sub, email=f"{sub.hex[:8]}@example.com"), f"user_{sub.hex[:12]}"


def create_issue(client, token, **overrides):
    payload = {
        "categoryId": "roads",
        "title": "Dangerous pothole near the main junction",
        "description": "Deep crater in the center lane.",
        "location": "Banjara Hills, Road No. 12",
        "coordinates": {"lat": 17.40, "lon": 78.40},
    }
    payload.update(overrides)
    return client.post(ISSUES, json=payload, headers=auth(token))


def make_issue(client, token, **overrides):
    response = create_issue(client, token, **overrides)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_requires_authentication(client):
    assert create_issue(client, "unused").status_code == 401


def test_create_requires_coordinates(client, make_token):
    token, _ = user_token(make_token)
    response = create_issue(client, token, coordinates=None)

    assert response.status_code == 422


def test_create_rejects_coordinates_outside_hyderabad(client, make_token):
    token, _ = user_token(make_token)
    response = create_issue(client, token, coordinates={"lat": 0, "lon": 0})

    assert response.status_code == 422


def test_create_derives_matched_area_and_initial_state(client, make_token, area_factory):
    area = area_factory(name="Ward 91 Khairatabad")
    token, handle = user_token(make_token)

    body = make_issue(client, token)

    assert body["areaId"] == area["id"]
    assert body["area"] == "Ward 91 Khairatabad"
    assert body["areaAssignmentStatus"] == "matched"
    assert body["author"] == handle
    assert body["isAnonymous"] is False
    assert body["status"] == "reported"
    assert body["priority"] == "standard"
    assert body["upvotes"] == 1
    assert body["userVote"] == 1
    assert body["confirmationsCount"] == 0
    assert body["userConfirmed"] is False
    assert body["publicRef"].startswith("REP-")
    assert [step["key"] for step in body["timeline"]] == [
        "reported",
        "under_review",
        "in_progress",
        "resolved",
    ]
    assert [step["completed"] for step in body["timeline"]] == [True, False, False, False]
    assert body["timeline"][0]["date"] is not None


def test_create_unmatched_area_does_not_guess(client, make_token):
    token, _ = user_token(make_token)

    body = make_issue(client, token, coordinates={"lat": FAR_LAT, "lon": FAR_LON})

    assert body["areaId"] is None
    assert body["area"] is None
    assert body["areaAssignmentStatus"] == "unmatched"


def test_create_accepts_greater_hyderabad_buffer_as_unmatched(client, make_token):
    token, _ = user_token(make_token)

    body = make_issue(client, token, coordinates={"lat": 17.5705589, "lon": 78.4380271})

    assert body["areaId"] is None
    assert body["area"] is None
    assert body["areaAssignmentStatus"] == "unmatched"


def test_create_with_manual_area_marks_manual_and_allows_remote_coordinates(
    client, make_token, area_factory
):
    area = area_factory(name="Ward 91 Manual Override")
    token, _ = user_token(make_token)

    body = make_issue(
        client,
        token,
        areaId=area["id"],
        coordinates={"lat": 0, "lon": 0},
    )

    assert body["areaId"] == area["id"]
    assert body["area"] == "Ward 91 Manual Override"
    assert body["areaAssignmentStatus"] == "manual"


def test_create_with_unknown_manual_area_returns_422(client, make_token):
    token, _ = user_token(make_token)

    response = create_issue(client, token, areaId=str(uuid.uuid4()))

    assert response.status_code == 422


def test_create_ambiguous_area_returns_no_choice(client, make_token, area_factory):
    area_factory(name="First Ward")
    area_factory(name="Second Ward", wkt=OVERLAP)
    token, _ = user_token(make_token)

    body = make_issue(client, token)

    assert body["areaId"] is None
    assert body["area"] is None
    assert body["areaAssignmentStatus"] == "ambiguous"


def test_anonymous_issue_hides_author_and_exact_coordinates(client, make_token):
    token, _ = user_token(make_token)

    created = make_issue(client, token, isAnonymous=True)
    detail = client.get(f"{ISSUES}/{created['id']}").json()

    for body in (created, detail):
        assert body["author"] == "Anonymous Citizen"
        assert body["isAnonymous"] is True
        assert "authorId" not in body
        assert "exactLat" not in body
        assert "exactLon" not in body
        assert "coordinates" not in body


def test_issue_detail_includes_timeline(client, make_token):
    token, _ = user_token(make_token)
    created = make_issue(client, token)

    response = client.get(f"{ISSUES}/{created['id']}")

    assert response.status_code == 200
    assert len(response.json()["timeline"]) == 4


def test_unknown_issue_returns_404(client):
    response = client.get(f"{ISSUES}/{uuid.uuid4()}")

    assert response.status_code == 404


def test_feed_filters_by_category_area_and_status(client, make_token, area_factory):
    roads_area = area_factory(name="Roads Ward")
    water_area = area_factory(name="Water Ward", wkt=WATER_SQUARE)
    token, _ = user_token(make_token)
    road_issue = make_issue(client, token)
    water_issue = make_issue(
        client,
        token,
        categoryId="water",
        coordinates={"lat": 17.43, "lon": 78.43},
    )

    def ids(**params):
        response = client.get(ISSUES, params=params)
        assert response.status_code == 200
        return {item["id"] for item in response.json()["items"]}

    assert ids(categoryId="roads") == {road_issue["id"]}
    assert ids(areaId=roads_area["id"]) == {road_issue["id"]}
    assert ids(areaId=water_area["id"]) == {water_issue["id"]}
    assert ids(status="reported") == {road_issue["id"], water_issue["id"]}
    assert ids(status="resolved") == set()


def test_feed_paginates(client, make_token):
    token, _ = user_token(make_token)
    first = make_issue(client, token, title="First reported issue")
    second = make_issue(client, token, title="Second reported issue")

    page_one = client.get(ISSUES, params={"sortBy": "new", "page": 1, "limit": 1}).json()
    page_two = client.get(ISSUES, params={"sortBy": "new", "page": 2, "limit": 1}).json()

    assert page_one["total"] == 2
    assert page_one["page"] == 1
    assert page_one["limit"] == 1
    assert {item["id"] for item in page_one["items"] + page_two["items"]} == {
        first["id"],
        second["id"],
    }


def test_feed_proximity_filter(client, make_token):
    token, _ = user_token(make_token)
    near_issue = make_issue(client, token)
    make_issue(client, token, coordinates={"lat": FAR_LAT, "lon": FAR_LON})

    body = client.get(
        ISSUES,
        params={"near": f"{NEAR_LAT},{NEAR_LON}", "radiusM": 1000},
    ).json()

    assert [item["id"] for item in body["items"]] == [near_issue["id"]]


def test_feed_rejects_malformed_near_parameter(client):
    response = client.get(ISSUES, params={"near": "not-a-point", "radiusM": 1000})

    assert response.status_code == 422


def test_feed_personalizes_vote_and_confirmation_for_the_caller(client, make_token):
    author_token, _ = user_token(make_token)
    viewer_token, _ = user_token(make_token)
    issue = make_issue(client, author_token)
    client.post(
        f"{ISSUES}/{issue['id']}/confirm",
        json={"lat": 17.4005, "lon": 78.4005},
        headers=auth(viewer_token),
    )

    anonymous = client.get(ISSUES).json()["items"][0]
    personalized = client.get(ISSUES, headers=auth(viewer_token)).json()["items"][0]

    assert anonymous["userVote"] == 0
    assert anonymous["userConfirmed"] is False
    assert personalized["userVote"] == 0
    assert personalized["userConfirmed"] is True


def test_vote_toggle_switch_and_non_negative_display(client, make_token):
    author_token, _ = user_token(make_token)
    second_token, _ = user_token(make_token)
    third_token, _ = user_token(make_token)
    issue = make_issue(client, author_token)
    url = f"{ISSUES}/{issue['id']}/vote"

    cancelled = client.post(url, json={"direction": 1}, headers=auth(author_token)).json()
    assert cancelled == {"issueId": issue["id"], "upvotes": 0, "userVote": 0}

    downvoted = client.post(url, json={"direction": -1}, headers=auth(author_token)).json()
    assert downvoted["upvotes"] == 0
    assert downvoted["userVote"] == -1

    balanced = client.post(url, json={"direction": 1}, headers=auth(second_token)).json()
    assert balanced["upvotes"] == 0
    assert balanced["userVote"] == 1

    positive = client.post(url, json={"direction": 1}, headers=auth(third_token)).json()
    assert positive["upvotes"] == 1


def test_confirm_toggle_requires_coordinates_and_records_distance(client, make_token):
    author_token, _ = user_token(make_token)
    witness_token, _ = user_token(make_token)
    issue = make_issue(client, author_token)
    url = f"{ISSUES}/{issue['id']}/confirm"

    confirmed = client.post(
        url, json={"lat": NEAR_LAT, "lon": NEAR_LON}, headers=auth(witness_token)
    ).json()
    assert confirmed == {
        "issueId": issue["id"],
        "confirmationsCount": 1,
        "userConfirmed": True,
    }

    toggled_off = client.post(
        url, json={"lat": NEAR_LAT, "lon": NEAR_LON}, headers=auth(witness_token)
    ).json()
    assert toggled_off["confirmationsCount"] == 0
    assert toggled_off["userConfirmed"] is False

    missing = client.post(url, json={}, headers=auth(witness_token))
    assert missing.status_code == 422


def test_confirm_rejects_witnesses_too_far_away(client, make_token):
    author_token, _ = user_token(make_token)
    witness_token, _ = user_token(make_token)
    issue = make_issue(client, author_token)

    response = client.post(
        f"{ISSUES}/{issue['id']}/confirm",
        json={"lat": FAR_LAT, "lon": FAR_LON},
        headers=auth(witness_token),
    )

    assert response.status_code == 422


def test_comments_thread_and_enforce_depth(client, make_token):
    token, _ = user_token(make_token)
    issue = make_issue(client, token)
    url = f"{ISSUES}/{issue['id']}/comments"

    parent = client.post(url, json={"text": "Top level"}, headers=auth(token))
    assert parent.status_code == 201
    parent = parent.json()
    parent_id = parent["id"]

    depth_one = client.post(
        url, json={"text": "Reply one", "parentCommentId": parent_id}, headers=auth(token)
    ).json()
    depth_two = client.post(
        url,
        json={"text": "Reply two", "parentCommentId": depth_one["id"]},
        headers=auth(token),
    ).json()
    depth_three = client.post(
        url,
        json={"text": "Reply three", "parentCommentId": depth_two["id"]},
        headers=auth(token),
    ).json()

    too_deep = client.post(
        url,
        json={"text": "Reply four", "parentCommentId": depth_three["id"]},
        headers=auth(token),
    )
    assert too_deep.status_code == 422

    tree = client.get(url).json()
    assert tree["total"] == 1
    assert len(tree["items"]) == 1
    assert tree["items"][0]["id"] == parent_id
    assert tree["items"][0]["replies"][0]["id"] == depth_one["id"]
    assert tree["items"][0]["replies"][0]["replies"][0]["id"] == depth_two["id"]
    assert client.get(f"{ISSUES}/{issue['id']}").json()["commentsCount"] == 4


def test_comments_are_anonymous_and_official_flag_is_server_controlled(client, make_token):
    token, _ = user_token(make_token)
    issue = make_issue(client, token)
    url = f"{ISSUES}/{issue['id']}/comments"

    body = client.post(
        url,
        json={"text": "Anonymous tip", "isAnonymous": True, "isOfficial": True},
        headers=auth(token),
    ).json()

    assert body["author"] == "Anonymous Citizen"
    assert body["isAnonymous"] is True
    assert body["isOfficial"] is False


def test_comment_reply_must_belong_to_the_same_issue(client, make_token):
    token, _ = user_token(make_token)
    first = make_issue(client, token, title="First issue")
    second = make_issue(client, token, title="Second issue")
    parent = client.post(
        f"{ISSUES}/{first['id']}/comments", json={"text": "On first"}, headers=auth(token)
    ).json()

    response = client.post(
        f"{ISSUES}/{second['id']}/comments",
        json={"text": "Wrong thread", "parentCommentId": parent["id"]},
        headers=auth(token),
    )

    assert response.status_code == 422


def test_comment_vote_toggle(client, make_token):
    author_token, _ = user_token(make_token)
    voter_token, _ = user_token(make_token)
    issue = make_issue(client, author_token)
    comment = client.post(
        f"{ISSUES}/{issue['id']}/comments",
        json={"text": "Useful comment"},
        headers=auth(author_token),
    ).json()
    url = f"/api/v1/comments/{comment['id']}/vote"

    upvoted = client.post(url, json={"direction": 1}, headers=auth(voter_token)).json()
    assert upvoted == {
        "commentId": comment["id"],
        "upvotes": 1,
        "userVote": 1,
    }

    cancelled = client.post(url, json={"direction": 1}, headers=auth(voter_token)).json()
    assert cancelled["upvotes"] == 0
    assert cancelled["userVote"] == 0
