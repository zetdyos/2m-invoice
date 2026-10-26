from sqlmodel import Session, select
from .database import engine
from .models import User, Setting
from .security import hash_password
from .config import settings


def seed() -> None:
    with Session(engine) as session:
        if not session.exec(select(User)).first():
            session.add(User(
                username=settings.admin_username,
                full_name="Administrator",
                hashed_password=hash_password(settings.admin_password),
            ))
        if not session.get(Setting, 1):
            session.add(Setting(id=1))
        session.commit()
