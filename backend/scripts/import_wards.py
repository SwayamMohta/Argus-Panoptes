"""Import wards_hyderabad.geojson into PostGIS.

The app needs only two things from this dataset: the ward name and its polygon.
The original GeoJSON file is preserved unchanged; attribution and vintage are
recorded in the data-quality report and documentation.

Run from backend/:
    python -m scripts.import_wards
"""

import json
from collections import Counter
from pathlib import Path

from sqlalchemy import text

from app.db.session import SessionLocal

GEOJSON_PATH = Path(__file__).resolve().parents[2] / "wards_hyderabad.geojson"
REPORT_PATH = Path(__file__).resolve().parents[1] / "data" / "wards_hyderabad_import_report.json"


def load_features() -> list[dict]:
    with GEOJSON_PATH.open(encoding="utf-8") as handle:
        collection = json.load(handle)
    if collection.get("type") != "FeatureCollection":
        raise ValueError("Expected a GeoJSON FeatureCollection")
    return collection.get("features", [])


def import_features(session, features: list[dict]) -> int:
    statement = text(
        """
        INSERT INTO areas (id, name, geom)
        VALUES (
            gen_random_uuid(),
            :name,
            ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)))
        )
        ON CONFLICT (name) DO UPDATE SET geom = EXCLUDED.geom
        """
    )
    invalid_originals = 0
    for feature in features:
        properties = feature.get("properties") or {}
        name = (properties.get("Name") or "").strip()
        geometry = json.dumps(feature.get("geometry"))
        valid = session.execute(
            text("SELECT ST_IsValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)))"),
            {"geometry": geometry},
        ).scalar_one()
        if not valid:
            invalid_originals += 1
        session.execute(statement, {"name": name, "geometry": geometry})
    return invalid_originals


def build_report(session, features: list[dict], invalid_originals: int) -> dict:
    names = [(feature.get("properties") or {}).get("Name", "").strip() for feature in features]
    nonempty = [name for name in names if name]
    counts = Counter(nonempty)
    duplicates = {name: count for name, count in counts.items() if count > 1}

    geometry_types = Counter((feature.get("geometry") or {}).get("type") for feature in features)
    imported = session.execute(text("SELECT count(*) FROM areas")).scalar_one()

    targets = {}
    for target in [
        "Kukatpally",
        "Madhapur",
        "Banjara Hills",
        "Gachibowli",
        "Secunderabad",
        "HITEC City",
        "Tolichowki",
        "Dilsukhnagar",
    ]:
        rows = (
            session.execute(
                text("SELECT name FROM areas WHERE name ILIKE :pattern ORDER BY name"),
                {"pattern": f"%{target}%"},
            )
            .scalars()
            .all()
        )
        targets[target] = rows

    sample_matches = []
    sample_rows = session.execute(
        text(
            """
            SELECT a.name,
                   (
                       SELECT count(*) FROM areas b
                       WHERE ST_Covers(b.geom, ST_PointOnSurface(a.geom))
                   ) AS covering_polygons
            FROM areas a
            ORDER BY a.name
            LIMIT 10
            """
        )
    ).all()
    for row in sample_rows:
        sample_matches.append({"name": row.name, "covering_polygons": row.covering_polygons})

    bbox = session.execute(
        text(
            "SELECT ST_XMin(e), ST_YMin(e), ST_XMax(e), ST_YMax(e) "
            "FROM (SELECT ST_Extent(geom) AS e FROM areas) s"
        )
    ).one()

    return {
        "source": str(GEOJSON_PATH),
        "features_in_file": len(features),
        "areas_imported": imported,
        "unique_ward_names": len(counts),
        "empty_names": len(names) - len(nonempty),
        "duplicate_name_groups": duplicates,
        "geometry_types_in_file": dict(geometry_types),
        "invalid_geometries_in_source": invalid_originals,
        "bbox": list(bbox),
        "recognizable_names": targets,
        "sample_point_in_polygon": sample_matches,
        "attribution": "© OpenStreetMap contributors (ODbL 1.0)",
        "vintage_note": "OSM feature timestamps in the file are 2017-12-31.",
    }


def main() -> None:
    features = load_features()
    with SessionLocal() as session:
        invalid_originals = import_features(session, features)
        session.flush()
        report = build_report(session, features, invalid_originals)
        session.commit()

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
