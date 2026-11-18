"""Run explicitly with: python -m app.seed. Never runs on server startup."""
from sqlalchemy import func, select

from .database import Base, SessionLocal, engine
from .models import Category, Priority, Status, Ticket


def seed():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Ticket)):
            print("Tickets already exist; seed skipped.")
            return
        db.add_all([
            Ticket(subject="Password reset email never arrives", description="A fictional user cannot receive the reset link after checking spam.", category=Category.account, priority=Priority.high, status=Status.open),
            Ticket(subject="Duplicate charge on demo invoice", description="The fictional November invoice lists the starter subscription twice.", category=Category.billing, priority=Priority.high, status=Status.in_progress),
            Ticket(subject="CSV export stops at 50 rows", description="A fictional customer reports an incomplete export from the reports page.", category=Category.technical, priority=Priority.medium, status=Status.open),
            Ticket(subject="How can I change the workspace name?", description="A fictional team wants instructions for renaming its workspace.", category=Category.general, priority=Priority.low, status=Status.resolved),
            Ticket(subject="Dashboard loads slowly", description="A fictional customer reports a slow dashboard when opening monthly reports.", category=Category.technical, priority=Priority.medium, status=Status.in_progress),
        ])
        db.commit()
        print("Created 5 fictional tickets.")


if __name__ == "__main__":
    seed()
