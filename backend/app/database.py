from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Resolve relative to this file, so running from another directory is safe.
DATABASE_PATH = Path(__file__).resolve().parents[1] / "tickets.db"
engine = create_engine(f"sqlite:///{DATABASE_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    # Each request gets a session; closing it also rolls back uncommitted work.
    with SessionLocal() as session:
        yield session
