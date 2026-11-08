from app.db.session import SessionLocal
from app.seed.reference_data import seed_all


def main() -> None:
    with SessionLocal() as session:
        seed_all(session)
        session.commit()


if __name__ == "__main__":
    main()
