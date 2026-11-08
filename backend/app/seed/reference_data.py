from datetime import date

from sqlalchemy.orm import Session

from app.models.reference import (
    Category,
    CategoryCheckpoint,
    Notice,
    ServiceStandard,
)

CATEGORIES = [
    {
        "id": "health",
        "name": "Healthcare & Clinics",
        "short_name": "Health",
        "icon": "medical-outline",
        "color": "#2563EB",
        "bg_color": "#F1F5F9",
        "status": "good",
        "status_label": "Active",
        "compliance_score": 92,
        "active_assets_count": 18,
        "last_audited_days_ago": 1,
        "description": (
            "Primary Health Centers (PHCs), maternity clinics, immunization "
            "centers, and Anganwadis."
        ),
        "avoided_cost_inr": None,
        "sort_order": 1,
    },
    {
        "id": "ration",
        "name": "PDS & Food Security",
        "short_name": "Ration / PDS",
        "icon": "basket-outline",
        "color": "#D97706",
        "bg_color": "#F1F5F9",
        "status": "critical",
        "status_label": "High Priority",
        "compliance_score": 68,
        "active_assets_count": 24,
        "last_audited_days_ago": 2,
        "description": (
            "Fair Price Shops (FPS), public distribution depots, and subsidized "
            "grain allocation counters."
        ),
        "avoided_cost_inr": None,
        "sort_order": 2,
    },
    {
        "id": "roads",
        "name": "Roads & Works",
        "short_name": "Roads",
        "icon": "car-outline",
        "color": "#4B5563",
        "bg_color": "#F1F5F9",
        "status": "review",
        "status_label": "Needs Review",
        "compliance_score": 74,
        "active_assets_count": 42,
        "last_audited_days_ago": 3,
        "description": (
            "Arterial roads, pedestrian footpaths, asphalt integrity, and street "
            "illumination corridors."
        ),
        "avoided_cost_inr": 48000,
        "sort_order": 3,
    },
    {
        "id": "transit",
        "name": "Public Transit & Stops",
        "short_name": "Transit",
        "icon": "bus-outline",
        "color": "#059669",
        "bg_color": "#F1F5F9",
        "status": "good",
        "status_label": "Active",
        "compliance_score": 89,
        "active_assets_count": 16,
        "last_audited_days_ago": 2,
        "description": (
            "Municipal bus stops, weather-protected passenger shelters, and feeder "
            "interchange points."
        ),
        "avoided_cost_inr": None,
        "sort_order": 4,
    },
    {
        "id": "water",
        "name": "Water Works & Supply",
        "short_name": "Water",
        "icon": "water-outline",
        "color": "#0284C7",
        "bg_color": "#F1F5F9",
        "status": "good",
        "status_label": "Active",
        "compliance_score": 91,
        "active_assets_count": 29,
        "last_audited_days_ago": 1,
        "description": (
            "Piped municipal supply network, public water ATMs, borewell reservoirs, "
            "and testing kiosks."
        ),
        "avoided_cost_inr": 28400,
        "sort_order": 5,
    },
    {
        "id": "sanitation",
        "name": "Sanitation & Waste",
        "short_name": "Sanitation",
        "icon": "trash-outline",
        "color": "#7C3AED",
        "bg_color": "#F1F5F9",
        "status": "review",
        "status_label": "Needs Review",
        "compliance_score": 78,
        "active_assets_count": 31,
        "last_audited_days_ago": 1,
        "description": (
            "Dry/wet waste collection hubs, public e-toilets, and community trash "
            "compactor stations."
        ),
        "avoided_cost_inr": None,
        "sort_order": 6,
    },
    {
        "id": "power",
        "name": "Power Grid & Electrical",
        "short_name": "Power Grid",
        "icon": "flash-outline",
        "color": "#EA580C",
        "bg_color": "#F1F5F9",
        "status": "critical",
        "status_label": "High Priority",
        "compliance_score": 64,
        "active_assets_count": 22,
        "last_audited_days_ago": 4,
        "description": (
            "Ground transformers, low-hanging overhead cables, distribution junction "
            "boxes, and earth pits."
        ),
        "avoided_cost_inr": 16000,
        "sort_order": 7,
    },
    {
        "id": "drainage",
        "name": "Storm Drainage",
        "short_name": "Drainage",
        "icon": "rainy-outline",
        "color": "#0891B2",
        "bg_color": "#F1F5F9",
        "status": "good",
        "status_label": "Active",
        "compliance_score": 86,
        "active_assets_count": 19,
        "last_audited_days_ago": 2,
        "description": (
            "Stormwater drains (SWDs), roadside catch-basins, desilting canals, and "
            "flood outlet gates."
        ),
        "avoided_cost_inr": 10000,
        "sort_order": 8,
    },
]

CHECKPOINTS = [
    {
        "id": "h1",
        "category_id": "health",
        "title": "Medicine Stock Transparency",
        "description": "Essential drug inventory board clearly displayed and updated within 24 hours.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "h2",
        "category_id": "health",
        "title": "Cold-Chain Vaccine Storage",
        "description": "Vaccine storage temperature log maintained within statutory +2°C to +8°C.",
        "is_critical": True,
        "sort_order": 2,
    },
    {
        "id": "h3",
        "category_id": "health",
        "title": "Sanitation & Potable Water",
        "description": "Functional handwashing stations, clean patient washrooms, and safe drinking water.",
        "is_critical": False,
        "sort_order": 3,
    },
    {
        "id": "h4",
        "category_id": "health",
        "title": "Duty Doctor / Staff Attendance",
        "description": "Duty medical officer and auxiliary nurse roster verified against physical records.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "r1",
        "category_id": "ration",
        "title": "Weigh Scale Calibration Seal",
        "description": "Electronic weigh scale carries intact tamper-proof seal from Legal Metrology Dept.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "r2",
        "category_id": "ration",
        "title": "Price & Quota Board Display",
        "description": "Mandatory bilingual board showing daily grain quotas and official government subsidy rates.",
        "is_critical": True,
        "sort_order": 2,
    },
    {
        "id": "r3",
        "category_id": "ration",
        "title": "Biometric e-POS Machine Uptime",
        "description": "Point-of-sale machine functioning online; no unauthorized manual offline paper records.",
        "is_critical": False,
        "sort_order": 3,
    },
    {
        "id": "r4",
        "category_id": "ration",
        "title": "Grain Quality & Pallet Storage",
        "description": "Grain bags stored on raised wooden pallets (dunnage), free of moisture and pest infestation.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "rd1",
        "category_id": "roads",
        "title": "Pothole Severity & Patching",
        "description": "Absence of deep craters (>50mm depth) or hazardous unbarricaded utility cuts.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "rd2",
        "category_id": "roads",
        "title": "Pedestrian Footpath Usability",
        "description": "Continuous sidewalk free of construction debris, illegal encroachment, and vehicle parking.",
        "is_critical": False,
        "sort_order": 2,
    },
    {
        "id": "rd3",
        "category_id": "roads",
        "title": "Night Safety Illumination",
        "description": "All street light luminaires functioning; zero continuous dark zones along transit routes.",
        "is_critical": True,
        "sort_order": 3,
    },
    {
        "id": "rd4",
        "category_id": "roads",
        "title": "Road Signage & Zebra Markings",
        "description": "High-visibility reflective retro markings at pedestrian crossings and school zones.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "t1",
        "category_id": "transit",
        "title": "Weather Shelter & Seating",
        "description": "Overhead roof intact without rusted leaks; secure bench seating for senior citizens.",
        "is_critical": False,
        "sort_order": 1,
    },
    {
        "id": "t2",
        "category_id": "transit",
        "title": "Timetable & Route Map Legibility",
        "description": "Current bus route chart and schedule legible and protected from vandalism.",
        "is_critical": False,
        "sort_order": 2,
    },
    {
        "id": "t3",
        "category_id": "transit",
        "title": "Braille & Wheelchair Accessibility",
        "description": "Tactile paving leading to bus boarding bay with graded ramp access.",
        "is_critical": True,
        "sort_order": 3,
    },
    {
        "id": "t4",
        "category_id": "transit",
        "title": "Emergency SOS & Night Lighting",
        "description": "Functional solar/grid LED illumination inside the shelter bay.",
        "is_critical": True,
        "sort_order": 4,
    },
    {
        "id": "w1",
        "category_id": "water",
        "title": "Potability & Chlorine Testing",
        "description": "Bimonthly residual chlorine report posted on public dashboard (TDS within safe limits).",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "w2",
        "category_id": "water",
        "title": "Pipeline Valve Leakage Control",
        "description": "Main distribution sluice valves secured without pooling or contamination backflow.",
        "is_critical": True,
        "sort_order": 2,
    },
    {
        "id": "w3",
        "category_id": "water",
        "title": "Water ATM Dispenser Operation",
        "description": "Coin/card automated dispensing units clean and delivering calibrated 20L volume.",
        "is_critical": False,
        "sort_order": 3,
    },
    {
        "id": "w4",
        "category_id": "water",
        "title": "Public Tanker Quota Logging",
        "description": "Emergency tanker delivery logs verified against registered beneficiary lists.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "s1",
        "category_id": "sanitation",
        "title": "Zero Blackspot Dumping",
        "description": "Roadside corners free of uncollected municipal solid waste dumping.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "s2",
        "category_id": "sanitation",
        "title": "Source Segregation Compliance",
        "description": "Wet organic, dry recyclable, and domestic sanitary waste collected in separate bins.",
        "is_critical": False,
        "sort_order": 2,
    },
    {
        "id": "s3",
        "category_id": "sanitation",
        "title": "Public Restroom Cleanliness",
        "description": "Community toilets with working running water, lighting, and daily sanitization log.",
        "is_critical": True,
        "sort_order": 3,
    },
    {
        "id": "s4",
        "category_id": "sanitation",
        "title": "Compactor Bin Enclosures",
        "description": "Hydraulic waste compactors fully sealed to prevent leachate runoff and odor.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "p1",
        "category_id": "power",
        "title": "Transformer Perimeter Fencing",
        "description": "Chain-link protective barrier locked with hazard danger signage.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "p2",
        "category_id": "power",
        "title": "Overhead Cable Sag Clearance",
        "description": "No live conductor hanging below statutory 4.5m road crossing clearance.",
        "is_critical": True,
        "sort_order": 2,
    },
    {
        "id": "p3",
        "category_id": "power",
        "title": "Junction Box Metal Enclosures",
        "description": "Street distribution feeder pillars closed with functioning latch; no exposed fuses.",
        "is_critical": True,
        "sort_order": 3,
    },
    {
        "id": "p4",
        "category_id": "power",
        "title": "Earthing Continuity",
        "description": "Substation ground earth wires intact and free of mechanical damage or corrosion.",
        "is_critical": False,
        "sort_order": 4,
    },
    {
        "id": "d1",
        "category_id": "drainage",
        "title": "Manhole Grate Integrity",
        "description": "Zero missing or broken RCC/cast iron slabs over roadside stormwater channels.",
        "is_critical": True,
        "sort_order": 1,
    },
    {
        "id": "d2",
        "category_id": "drainage",
        "title": "Pre-Monsoon Silt Clearance",
        "description": "Drains cleared of construction silt and plastic debris to ensure unobstructed flow.",
        "is_critical": True,
        "sort_order": 2,
    },
    {
        "id": "d3",
        "category_id": "drainage",
        "title": "Road Ingress Catch-Basins",
        "description": "Curb-side water inlets clear of mud buildup to prevent localized standing water.",
        "is_critical": False,
        "sort_order": 3,
    },
    {
        "id": "d4",
        "category_id": "drainage",
        "title": "Outfall Gate Flaps",
        "description": "Backflow prevention valves at lake/river outfall points freely operational.",
        "is_critical": False,
        "sort_order": 4,
    },
]

NOTICES = [
    {
        "id": "notice-hmwssb-01",
        "title": "Scheduled 6-Hour Water Supply Interruption",
        "summary": (
            "Pumping main interconnection works at Jubilee Hills reservoir. Alternate "
            "tanker supply arranged for affected blocks."
        ),
        "locality_text": "Banjara Hills & Jubilee Hills",
        "category": "water",
        "category_label": "Water Supply Curtailment",
        "source": "HMWSSB (Khairatabad Division O&M)",
        "published_on": date(2026, 11, 4),
        "expires_on": date(2026, 11, 6),
        "is_official": True,
        "impact": "Low water pressure between 10:00 AM and 04:00 PM on Nov 5.",
        "contact_helpline": "155313",
    },
    {
        "id": "notice-ghmc-02",
        "title": "Traffic Diversion: Stormwater Culvert Construction",
        "summary": (
            "Cross-culvert laying across Road No. 10. Commuters advised to divert via "
            "Road No. 12 or Cancer Hospital lane."
        ),
        "locality_text": "Banjara Hills",
        "category": "roads",
        "category_label": "Road Closure & Diversion",
        "source": "GHMC Khairatabad Circle & Hyderabad Traffic Police",
        "published_on": date(2026, 11, 3),
        "expires_on": date(2026, 11, 8),
        "is_official": True,
        "impact": "Single lane operation from 09:00 PM to 06:00 AM nightly.",
        "contact_helpline": "040-21111111",
    },
    {
        "id": "notice-tsspdcl-03",
        "title": "Feeder Pillar Augmentation & Preventive Shutdown",
        "summary": (
            "Transformer oil filtration and 11kV overhead line clearing for cyber corridor lines."
        ),
        "locality_text": "Madhapur & Kondapur",
        "category": "power",
        "category_label": "Electricity Maintenance",
        "source": "TSSPDCL Central Discom (Metro Zone)",
        "published_on": date(2026, 11, 4),
        "expires_on": date(2026, 11, 7),
        "is_official": True,
        "impact": "Staggered shutdown 01:00 PM – 03:30 PM on Nov 7.",
        "contact_helpline": "1912",
    },
    {
        "id": "notice-imd-04",
        "title": "Severe Weather Advisory: Thunderstorms & Gusty Winds",
        "summary": (
            "Isolated heavy thunderstorms accompanied by lightning and surface winds "
            "30-40 km/h predicted over Greater Hyderabad."
        ),
        "locality_text": "Greater Hyderabad Municipal Area",
        "category": "weather",
        "category_label": "Weather Advisory",
        "source": "India Meteorological Department (IMD) Hyderabad",
        "published_on": date(2026, 11, 4),
        "expires_on": date(2026, 11, 5),
        "is_official": True,
        "impact": "Avoid parking beneath aged tree canopies and waterlogged low-lying culverts.",
        "contact_helpline": "040-23464000",
    },
    {
        "id": "notice-hmwssb-05",
        "title": "Underground Sewerage Pipeline Rehabilitation",
        "summary": (
            "Trenchless desilting and liner replacement along Begumpet main road "
            "corridor to prevent monsoon backflows."
        ),
        "locality_text": "Begumpet & Secunderabad",
        "category": "infrastructure",
        "category_label": "Civic Infrastructure Works",
        "source": "HMWSSB Sewerage Operations Wing",
        "published_on": date(2026, 11, 2),
        "expires_on": date(2026, 11, 9),
        "is_official": True,
        "impact": "Partial road shoulder barricading near Prakash Nagar.",
        "contact_helpline": "155313",
    },
]

SERVICE_STANDARDS = [
    {
        "id": "sla-pothole",
        "service": "Pothole & Asphalt Repair",
        "standard_hours": 48,
        "authority": "Roads & Works Wing",
        "is_critical": False,
        "category_id": "roads",
        "sort_order": 1,
    },
    {
        "id": "sla-water-burst",
        "service": "Drinking Water Pipeline Burst",
        "standard_hours": 12,
        "authority": "HMWSSB",
        "is_critical": False,
        "category_id": "water",
        "sort_order": 2,
    },
    {
        "id": "sla-streetlight",
        "service": "Streetlight Luminaire Darkness",
        "standard_hours": 24,
        "authority": "Electrical Division",
        "is_critical": False,
        "category_id": "power",
        "sort_order": 3,
    },
    {
        "id": "sla-waste",
        "service": "Solid Waste Blackspot Removal",
        "standard_hours": 24,
        "authority": "Sanitation Engineering",
        "is_critical": False,
        "category_id": "sanitation",
        "sort_order": 4,
    },
    {
        "id": "sla-manhole",
        "service": "Missing Storm Drain Manhole Cover",
        "standard_hours": 6,
        "authority": "Stormwater Emergency Squad",
        "is_critical": True,
        "category_id": "drainage",
        "sort_order": 5,
    },
    {
        "id": "sla-power-line",
        "service": "Low Hanging Power Line Clearance",
        "standard_hours": 4,
        "authority": "TSSPDCL Electrical Safety",
        "is_critical": True,
        "category_id": "power",
        "sort_order": 6,
    },
]


def seed_all(session: Session) -> None:
    for row in CATEGORIES:
        session.merge(Category(**row))
    for row in CHECKPOINTS:
        session.merge(CategoryCheckpoint(**row))
    for row in NOTICES:
        session.merge(Notice(**row))
    for row in SERVICE_STANDARDS:
        session.merge(ServiceStandard(**row))
    session.flush()
