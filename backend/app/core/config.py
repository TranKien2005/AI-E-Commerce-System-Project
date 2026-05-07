from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "AI E-Commerce Backend"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14

    AI_SEARCH_MODE: str = "mock"
    AI_SEARCH_BASE_URL: str = ""
    AI_SEARCH_API_KEY: str = ""
    AI_SEARCH_TIMEOUT_SECONDS: int = 5

    # SMTP / Email (MailHog by default)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@ecommerce.local"


settings = Settings()
