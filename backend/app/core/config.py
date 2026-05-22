from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "AI E-Commerce Backend"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5433/ecommerce"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14

    AI_SEARCH_MODE: str = "mock"
    AI_SEARCH_BASE_URL: str = ""
    AI_SEARCH_API_KEY: str = ""
    AI_SEARCH_TIMEOUT_SECONDS: int = 5

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_AUTH: str = "10/minute"
    CIRCUIT_BREAKER_FAIL_MAX: int = 5
    CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS: int = 30

    TRACING_ENABLED: bool = True
    OTEL_SERVICE_NAME: str = "ecommerce-backend"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://jaeger:4317"

    # Email Settings
    # EMAIL_BACKEND: "smtp" (MailHog/Local) or "resend" (Production API)
    EMAIL_BACKEND: str = "smtp"

    # SMTP / MailHog
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@ecommerce.local"

    # Resend API
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "onboarding@resend.dev"


settings = Settings()
