import secrets
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
STATIC_DIR = BASE_DIR / "app" / "static"          # built React app lives here
SECRET_FILE = DATA_DIR / ".secret_key"


def _default_secret() -> str:
    # Persist an auto-generated secret so tokens survive restarts.
    if SECRET_FILE.exists():
        return SECRET_FILE.read_text().strip()
    key = secrets.token_urlsafe(48)
    SECRET_FILE.write_text(key)
    return key


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = ""
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    admin_username: str = "admin"
    admin_password: str = "admin123"

    database_url: str = f"sqlite:///{(DATA_DIR / 'invoicer.db').as_posix()}"

    def resolved_secret(self) -> str:
        return self.secret_key or _default_secret()


settings = Settings()
