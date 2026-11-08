"""Import GHMC ward boundaries from ghmc_wards.kml into PostGIS.

Source: the project owner's `ghmc_wards.kml` (155 GHMC wards with ward number,
zone, and circle attributes). The KML is preserved unchanged at the repo root.

Only ward name, GHMC zone/circle, and polygon are stored. OSM-style source
metadata is not imported.

Run from backend/:
    python -m scripts.import_ghmc_wards
"""

import json
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from sqlalchemy import text

from app.db.session import SessionLocal

KML_PATH = Path(__file__).resolve().parents[2] / "ghmc_wards.kml"
REPORT_PATH = Path(__file__).resolve().parents[1] / "data" / "ghmc_wards_import_report.json"
NS = {"k": "http://www.opengis.net/kml/2.2"}

RECOGNIZABLE_NAMES = [
    "KUKATPALLY",
    "BANJARA HILLS",
    "MADHAPUR",
    "GACHIBOWLI",
    "SECUNDERABAD",
    "HITEC CITY",
    "TOLICHOWKI",
    "DILSUKHNAGAR",
]


def _coordinates(element: ET.Element) -> list[list[float]]:
    ring = []
    for triplet in (element.text or "").split():
        parts = triplet.split(",")
        if len(parts) >= 2:
            ring.append([float(parts[0]), float(parts[1])])
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def _geometry(placemark: ET.Element) -> dict:
    polygons = placemark.findall(".//k:Polygon", NS)
    rings_by_polygon = []
    for polygon in polygons:
        rings = []
        outer = polygon.find(".//k:outerBoundaryIs//k:coordinates", NS)
        if outer is not None:
            rings.append(_coordinates(outer))
        for inner in polygon.findall(".//k:innerBoundaryIs//k:coordinates", NS):
            rings.append(_coordinates(inner))
        rings = [ring for ring in rings if len(ring) >= 4]
        if rings:
            rings_by_polygon.append(rings)

    if len(rings_by_polygon) == 1:
        return {"type": "Polygon", "coordinates": rings_by_polygon[0]}
    return {"type": "MultiPolygon", "coordinates": rings_by_polygon}


def load_wards() -> list[dict]:
    root = ET.parse(KML_PATH).getroot()
    wards = []
    for placemark in root.findall(".//k:Placemark", NS):
        data = {
            simple.get("name"): (simple.text or "").strip()
            for simple in placemark.findall(".//k:SimpleData", NS)
        }
        name = " ".join((data.get("ward") or "").split())
        wards.append(
            {
                "name": name,
                "zone": " ".join((data.get("ZONE") or data.get("CIRCLE") or "Hyderabad").split()),
                "circle": " ".join((data.get("CIRCLE") or "").split()) or None,
                "geometry": _geometry(placemark),
            }
        )
    return wards


def import_wards(session, wards: list[dict]) -> int:
    # Keep areas referenced by existing issues; replace the rest with the KML set.
    session.execute(
        text(
            "DELETE FROM areas WHERE id NOT IN "
            "(SELECT area_id FROM issues WHERE area_id IS NOT NULL)"
        )
    )
    statement = text(
        """
        INSERT INTO areas (id, name, zone, circle, geom)
        VALUES (
            gen_random_uuid(),
            :name,
            :zone,
            :circle,
            ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)))
        )
        ON CONFLICT (name) DO UPDATE SET
            geom = EXCLUDED.geom,
            zone = EXCLUDED.zone,
            circle = EXCLUDED.circle
        """
    )
    invalid = 0
    for ward in wards:
        geometry = json.dumps(ward["geometry"])
        valid = session.execute(
            text("SELECT ST_IsValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326)))"),
            {"geometry": geometry},
        ).scalar_one()
        if not valid:
            invalid += 1
        session.execute(
            statement,
            {
                "name": ward["name"],
                "zone": ward["zone"],
                "circle": ward["circle"],
                "geometry": geometry,
            },
        )
    return invalid


def build_report(session, wards: list[dict], invalid: int) -> dict:
    names = [ward["name"] for ward in wards]
    counts = Counter(names)
    geometry_types = Counter(ward["geometry"]["type"] for ward in wards)
    vertices = 0
    for ward in wards:
        geometry = ward["geometry"]
        polygons = (
            [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        )
        vertices += sum(len(ring) for polygon in polygons for ring in polygon)
    imported = session.execute(text("SELECT count(*) FROM areas")).scalar_one()
    bbox = session.execute(
        text(
            "SELECT ST_XMin(e), ST_YMin(e), ST_XMax(e), ST_YMax(e) "
            "FROM (SELECT ST_Extent(geom) AS e FROM areas) s"
        )
    ).one()
    overlapping_pairs = session.execute(
        text(
            """
            SELECT count(*) FROM areas a JOIN areas b ON a.id < b.id
            WHERE ST_Intersects(a.geom, b.geom)
              AND ST_Area(ST_Intersection(a.geom, b.geom)) > 1e-12
            """
        )
    ).scalar_one()

    recognizable = {}
    for target in RECOGNIZABLE_NAMES:
        recognizable[target] = (
            session.execute(
                text("SELECT name FROM areas WHERE name ILIKE :pattern ORDER BY name"),
                {"pattern": f"%{target}%"},
            )
            .scalars()
            .all()
        )

    return {
        "source": str(KML_PATH),
        "source_format": "KML 2.2 (WGS84 lon/lat)",
        "placemarks_in_file": len(wards),
        "areas_imported": imported,
        "unique_ward_names": len(counts),
        "empty_names": sum(1 for name in names if not name),
        "duplicate_name_groups": {n: c for n, c in counts.items() if c > 1},
        "geometry_types_in_file": dict(geometry_types),
        "total_vertices_in_file": vertices,
        "invalid_geometries_in_source": invalid,
        "overlapping_area_pairs": overlapping_pairs,
        "bbox": list(bbox),
        "zones": dict(Counter(ward["zone"] for ward in wards)),
        "circles": len({ward["circle"] for ward in wards if ward["circle"]}),
        "recognizable_names": recognizable,
        "attribution": "GHMC ward boundaries (ghmc_wards.kml)",
        "licence_note": "Licence/attribution to be confirmed by the project owner.",
    }


def main() -> None:
    wards = load_wards()
    with SessionLocal() as session:
        invalid = import_wards(session, wards)
        session.flush()
        report = build_report(session, wards, invalid)
        session.commit()

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
