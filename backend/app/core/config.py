from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "AI E-Commerce Backend"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14

    AI_SEARCH_MODE: str = "mock"
    AI_SEARCH_BASE_URL: str = ""
    AI_SEARCH_API_KEY: str = ""
    AI_SEARCH_TIMEOUT_SECONDS: int = 5

    TRACING_ENABLED: bool = True
    OTEL_SERVICE_NAME: str = "ai-ecommerce-backend"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""

    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_SECONDS: int = 60

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
    RESEND_FROM: str = "onboarding@resend.dev" # Mặc định của Resend khi chưa verify domain


settings = Settings()
