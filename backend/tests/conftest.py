import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["TRACING_ENABLED"] = "false"

sqlite_url = "sqlite:///./test.db"
engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def client():
    class _FakeRedis:
        def __init__(self):
            self._data = {}

        def setex(self, key, ttl, value):
            self._data[key] = value

        def get(self, key):
            return self._data.get(key)

        def delete(self, *keys):
            for k in keys:
                self._data.pop(k, None)

        def exists(self, key):
            return 1 if key in self._data else 0

    fake_redis = _FakeRedis()

    with patch("app.db.session.engine", engine):
        with patch("app.db.session.SessionLocal", TestingSessionLocal):
            from app.services import auth_service

            auth_service._redis_client = fake_redis  # type: ignore

            from app.main import app
            from app.db import base  # noqa: F401
            from app.models.base import Base

            Base.metadata.create_all(bind=engine)

            db = TestingSessionLocal()
            from app.core.security import get_password_hash
            from app.models.entities import User
            from datetime import datetime, timezone

            existing = db.scalar(User.__table__.select().limit(1))
            if existing is None:
                from app.models.entities import Shop

                buyer = User(
                    email="buyer@example.com",
                    password=get_password_hash("Buyer@123"),
                    full_name="Aeris Buyer",
                    role="buyer",
                    status="active",
                    email_verified_at=datetime.now(timezone.utc),
                )
                seller = User(
                    email="seller@example.com",
                    password=get_password_hash("Seller@123"),
                    full_name="Aeris Seller",
                    role="seller",
                    status="active",
                    email_verified_at=datetime.now(timezone.utc),
                )
                admin = User(
                    email="admin@example.com",
                    password=get_password_hash("Admin@123"),
                    full_name="Aeris Admin",
                    role="admin",
                    status="active",
                    email_verified_at=datetime.now(timezone.utc),
                )
                db.add_all([admin, buyer, seller])
                db.flush()

                db.add(
                    Shop(
                        owner_id=seller.id,
                        name="Amazon Seed Shop",
                        description="Imported catalog",
                        status="active",
                    )
                )
                db.commit()
            db.close()

            with TestClient(app) as tc:
                yield tc


def login_token(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["data"]["access_token"]
