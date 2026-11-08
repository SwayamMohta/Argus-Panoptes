"""Seed Hyderabad-only demo profiles, reports, comments, and engagement.

Run from backend/:
    python -m scripts.seed_demo_data

Idempotent: reports are keyed by a fixed public_ref and skipped when present.
No Bengaluru/Delhi/Mumbai data is used. Coordinates are the ward's
ST_PointOnSurface, so every report falls inside a real GHMC ward.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from geoalchemy2.elements import WKTElement
from sqlalchemy import select, text

from app.db.session import SessionLocal
from app.models.issue import (
    Comment,
    Issue,
    IssueConfirmation,
    IssueEvent,
    IssuePrivateLocation,
    IssueVote,
)
from app.models.user import Profile

CITIZEN_ID = UUID("11111111-1111-4111-8111-111111111111")
OFFICIAL_ID = UUID("22222222-2222-4222-8222-222222222222")

CITIZEN = {
    "id": CITIZEN_ID,
    "handle": "demo_hyderabad",
    "display_name": "Hyderabad Demo Citizen",
    "role": "citizen",
    "area": "Banjara Hills",
    "city": "Hyderabad",
    "state": "Telangana",
}

OFFICIAL = {
    "id": OFFICIAL_ID,
    "handle": "ghmc_official",
    "display_name": "GHMC Ward Officer",
    "role": "official",
    "area": "Banjara Hills",
    "city": "Hyderabad",
    "state": "Telangana",
}

WARDS = (
    "93-BANJARA HILLS",
    "95-JUBILEE HILLS",
    "105-GACHIBOWLI",
    "106-SERILINGAMPALLY",
    "107-MADHAPUR",
    "121-KUKATPALLY",
    "149-BEGUMPET",
    "68-TOLICHOWKI",
)

SEEDS = (
    {
        "ref": "REP-SEED-01",
        "ward": "93-BANJARA HILLS",
        "category": "roads",
        "title": "Deep pothole at Road No. 12 junction",
        "description": (
            "A deep crater has formed in the centre lane where Road No. 12 meets the "
            "flyover descent. Two-wheelers are swerving into traffic to avoid it."
        ),
        "location": "Road No. 12 Junction, Banjara Hills",
        "status": "in_progress",
        "priority": "standard",
        "age": timedelta(days=2),
        "comments": (
            ("ghmc_official", True, "Cold-mix patch work is scheduled for tomorrow morning."),
            ("demo_hyderabad", False, "A barricade would help until the patch is laid."),
        ),
    },
    {
        "ref": "REP-SEED-02",
        "ward": "107-MADHAPUR",
        "category": "water",
        "title": "Pipeline leak flooding 100ft Road",
        "description": (
            "Water has been pooling along the service road for two days. The leak is "
            "wasting drinking water and weakening the asphalt."
        ),
        "location": "100ft Road, Madhapur",
        "status": "resolved",
        "priority": "urgent",
        "age": timedelta(days=6),
        "comments": (
            ("ghmc_official", True, "Valve replaced and the road was dried and inspected."),
            ("demo_hyderabad", False, "Supply is back to normal. Thank you."),
        ),
    },
    {
        "ref": "REP-SEED-03",
        "ward": "121-KUKATPALLY",
        "category": "sanitation",
        "title": "Overflowing bin near KPHB metro",
        "description": (
            "The bin beside the metro pillar has not been cleared for three days. "
            "Waste is spilling onto the footpath."
        ),
        "location": "KPHB Metro Pillar 42, Kukatpally",
        "status": "under_review",
        "priority": "urgent",
        "age": timedelta(days=1),
        "comments": (
            ("demo_hyderabad", False, "The smell is noticeable from the bus stop."),
            ("ghmc_official", True, "Sanitation team has been asked to clear it today."),
        ),
    },
    {
        "ref": "REP-SEED-04",
        "ward": "105-GACHIBOWLI",
        "category": "power",
        "title": "Low-hanging power line near DLF Phase 2",
        "description": (
            "An overhead line is hanging close to head height near the pedestrian "
            "crossing. It is especially hard to see after sunset."
        ),
        "location": "DLF Phase 2 Crossing, Gachibowli",
        "status": "reported",
        "priority": "safety_hazard",
        "age": timedelta(hours=10),
        "comments": (
            ("demo_hyderabad", False, "Please treat this as urgent; children use this crossing."),
        ),
    },
    {
        "ref": "REP-SEED-05",
        "ward": "68-TOLICHOWKI",
        "category": "drainage",
        "title": "Blocked storm drain before monsoon",
        "description": (
            "Silt and plastic have blocked the drain mouth. Any heavy shower will "
            "flood the low-lying houses on this lane."
        ),
        "location": "Paramount Hills Lane, Tolichowki",
        "status": "in_progress",
        "priority": "standard",
        "age": timedelta(days=4),
        "comments": (
            ("ghmc_official", True, "Desilting crew is on site; work should finish this week."),
        ),
    },
    {
        "ref": "REP-SEED-06",
        "ward": "106-SERILINGAMPALLY",
        "category": "transit",
        "title": "Broken bus shelter roof at Madhapur PS",
        "description": (
            "The shelter roof has torn loose and hangs over the seating area. "
            "Commuters stand in the sun instead of using it."
        ),
        "location": "Madhapur Police Station Bus Stop",
        "status": "reported",
        "priority": "standard",
        "age": timedelta(days=3),
        "comments": (),
    },
    {
        "ref": "REP-SEED-07",
        "ward": "95-JUBILEE HILLS",
        "category": "roads",
        "title": "Broken footpath slab near Road No. 36",
        "description": (
            "A footpath slab has collapsed over a utility pit. The gap is wide enough "
            "to trip pedestrians and is unmarked at night."
        ),
        "location": "Road No. 36, Jubilee Hills",
        "status": "resolved",
        "priority": "urgent",
        "age": timedelta(days=10),
        "comments": (("ghmc_official", True, "Slab replaced and the edges were grouted."),),
    },
    {
        "ref": "REP-SEED-08",
        "ward": "149-BEGUMPET",
        "category": "water",
        "title": "Sewage overflow near Prakash Nagar",
        "description": (
            "Sewage is overflowing from a manhole onto the pavement and entering the "
            "storm drain. The area needs immediate disinfection."
        ),
        "location": "Prakash Nagar Main Road, Begumpet",
        "status": "under_review",
        "priority": "urgent",
        "age": timedelta(hours=12),
        "comments": (("demo_hyderabad", False, "This has been recurring in the same spot."),),
    },
    {
        "ref": "REP-SEED-09",
        "ward": "93-BANJARA HILLS",
        "category": "power",
        "title": "Streetlight outage near Road No. 1",
        "description": (
            "The streetlight outside the community park has been dark for four nights. "
            "The stretch is used by walkers after sunset."
        ),
        "location": "Road No. 1, Banjara Hills",
        "status": "resolved",
        "priority": "standard",
        "age": timedelta(days=5),
        "comments": (
            ("ghmc_official", True, "Luminaire replaced and the circuit was tested."),
            ("demo_hyderabad", False, "The stretch is lit again. Thank you."),
        ),
    },
)

STATUS_ORDER = ("reported", "under_review", "in_progress", "resolved")
STEP_DESCRIPTIONS = {
    "reported": "Citizen report filed.",
    "under_review": "Ward inspection and engineering review queued.",
    "in_progress": "Civic repair work in progress.",
    "resolved": "Repair completed and verified.",
}


def ensure_profile(db, data):
    profile = db.get(Profile, data["id"])
    if profile is None:
        profile = Profile(**data)
        db.add(profile)
        db.flush()
    return profile


def ward_points(db):
    rows = db.execute(
        text(
            """
            SELECT id, name, zone, circle,
                   ST_Y(ST_PointOnSurface(geom)) AS lat,
                   ST_X(ST_PointOnSurface(geom)) AS lon
            FROM areas
            WHERE name = ANY(:names)
            """
        ),
        {"names": list(WARDS)},
    ).all()
    return {row.name: row for row in rows}


def seed_issue(db, seed, ward):
    exists = db.scalar(select(Issue.id).where(Issue.public_ref == seed["ref"]))
    if exists is not None:
        return False

    now = datetime.now(UTC)
    created = now - seed["age"]
    point = WKTElement(f"POINT({ward.lon} {ward.lat})", srid=4326)
    status = seed["status"]
    status_index = STATUS_ORDER.index(status)
    resolved_at = created + timedelta(hours=6 * status_index) if status == "resolved" else None

    comments = seed["comments"]
    issue = Issue(
        id=uuid4(),
        public_ref=seed["ref"],
        category_id=seed["category"],
        area_id=ward.id,
        area_assignment_status="matched",
        area_assigned_at=created,
        author_id=CITIZEN_ID,
        is_anonymous=False,
        title=seed["title"],
        description=seed["description"],
        location_text=seed["location"],
        geom=point,
        status=status,
        priority=seed["priority"],
        is_urgent_hazard=seed["priority"] == "safety_hazard",
        vote_score=2,
        confirmations_count=1,
        comments_count=len(comments),
        created_at=created,
        updated_at=created,
        resolved_at=resolved_at,
    )
    db.add(issue)
    db.flush()

    db.add(
        IssuePrivateLocation(
            issue_id=issue.id,
            exact_geom=point,
            original_lat=Decimal(str(round(ward.lat, 6))),
            original_lon=Decimal(str(round(ward.lon, 6))),
        )
    )
    for index in range(status_index + 1):
        key = STATUS_ORDER[index]
        db.add(
            IssueEvent(
                issue_id=issue.id,
                status=key,
                description=STEP_DESCRIPTIONS[key],
                actor_id=OFFICIAL_ID if key != "reported" else CITIZEN_ID,
                occurred_at=created + timedelta(hours=6 * index),
            )
        )

    db.add_all(
        [
            IssueVote(issue_id=issue.id, user_id=CITIZEN_ID, direction=1),
            IssueVote(issue_id=issue.id, user_id=OFFICIAL_ID, direction=1),
            IssueConfirmation(
                issue_id=issue.id,
                user_id=OFFICIAL_ID,
                confirmed_geom=point,
                distance_m=Decimal("0"),
                created_at=created + timedelta(hours=2),
            ),
        ]
    )

    parent = None
    for index, (handle, is_official, body) in enumerate(comments):
        author_id = OFFICIAL_ID if handle == "ghmc_official" else CITIZEN_ID
        comment = Comment(
            id=uuid4(),
            issue_id=issue.id,
            parent_id=parent.id if index == 1 and parent is not None else None,
            author_id=author_id,
            is_anonymous=False,
            is_official=is_official,
            body=body,
            depth=1 if index == 1 and parent is not None else 0,
            vote_score=1 if index == 0 else 0,
            created_at=created + timedelta(hours=1 + index),
            updated_at=created + timedelta(hours=1 + index),
        )
        if index == 0:
            parent = comment
        db.add(comment)
    return True


def main() -> None:
    with SessionLocal() as db:
        ensure_profile(db, CITIZEN)
        ensure_profile(db, OFFICIAL)
        wards = ward_points(db)
        missing = [name for name in WARDS if name not in wards]
        if missing:
            raise SystemExit(f"Missing wards: {missing}")

        created = 0
        for seed in SEEDS:
            if seed_issue(db, seed, wards[seed["ward"]]):
                created += 1
        db.commit()
        print(f"Seed complete: {created} new reports, {len(SEEDS) - created} already present.")


if __name__ == "__main__":
    main()
