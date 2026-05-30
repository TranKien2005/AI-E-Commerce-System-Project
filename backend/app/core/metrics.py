from prometheus_client import Counter, Gauge

# Registration and Auth metrics
REGISTRATION_IP_COUNTER = Counter(
    "auth_registration_attempts_total",
    "Total account registration attempts",
    ["ip_address", "status"],  # status: success or failed
)

LOGIN_ATTEMPTS_COUNTER = Counter(
    "auth_login_attempts_total", "Total login attempts", ["ip_address", "status"]
)

OTP_VERIFY_COUNTER = Counter(
    "auth_otp_verify_attempts_total",
    "Total OTP verification attempts",
    ["ip_address", "status"],
)

# Cart/Ordering activity for fraud detection
CART_UPDATE_COUNTER = Counter(
    "cart_update_attempts_total",
    "Total cart update attempts",
    ["ip_address", "user_id"],
)

# WebSocket monitoring
WS_CONNECTIONS_GAUGE = Gauge(
    "ws_concurrent_connections_total",
    "Total concurrent WebSocket connections",
    ["channel"],  # channel: chat, account
)

# WebSocket close code tracking
WS_CLOSE_CODE_COUNTER = Counter(
    "ws_close_code_attempts_total",
    "Total WebSocket connection closes by code",
    ["channel", "close_code"],
)

# Order management metrics
ORDER_TRANSITION_COUNTER = Counter(
    "order_status_transition_total",
    "Total order status transition attempts",
    ["from_status", "to_status", "status"],  # status: success or failed
)

# DB connection pool metrics
DB_POOL_ACTIVE = Gauge(
    "db_connection_pool_active", "Active connections in the SQLAlchemy pool"
)
DB_POOL_IDLE = Gauge(
    "db_connection_pool_idle", "Idle connections in the SQLAlchemy pool"
)
DB_POOL_OVERFLOW = Gauge(
    "db_connection_pool_overflow", "Overflow connections in the SQLAlchemy pool"
)
