# Plan: Phase 1 — New Relic APM Setup

## Mục tiêu
Instrument FastAPI app với New Relic APM, export traces/metrics lên New Relic.

## Tasks

### 1. Thêm New Relic dependency
**File:** `backend/requirements.txt`
```bash
newrelic>=8.10.0
```

### 2. Cấu hình Environment Variables
**File:** `backend/.env` (hoặc `backend/.env.prod`)
```bash
NEW_RELIC_LICENSE_KEY=your_license_key_here
NEW_RELIC_APP_NAME=ecommerce-api
NEW_RELIC_ENVIRONMENT=production
NEW_RELIC_LOG_LEVEL=info
NEW_RELIC_HIGH_SECURITY=false
```

### 3. Cập nhật main.py
**File:** `backend/app/main.py`
```python
import newrelic.agent

# Initialize at module load
newrelic.agent.initialize('newrelic.ini', environment='production')
app = newrelic.agent.WSGIApplicationWrapper(app)
```

### 4. Tạo newrelic.ini
**File:** `backend/newrelic.ini`
```ini
[NEW_RELIC]
license_key = your_license_key_here
app_name = ecommerce-api
log_level = info
enable_thread_profiler = true
enable_error_tracker = true
enable_browser_autorum = false
transaction_tracer.transaction_threshold = 1.0
transaction_tracer.stack_trace_threshold = 0.5
```

### 5. Cập nhật Dockerfile (nếu có)
```dockerfile
ENV NEW_RELIC_LICENSE_KEY=$NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_PYTHON_APP_NAME=ecommerce-api
```

## Alternative: OpenTelemetry → New Relic (nếu muốn dùng OTel SDK)

Nếu muốn dùng OTel thay vì native agent:
```bash
pip install opentelemetry-exporter-otlp-proto-grpc
```

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# OTLP endpoint cho New Relic
otlp_exporter = OTLPSpanExporter(
    endpoint="otlp.nr-data.net:4317",
    headers={"api-key": os.environ["NEW_RELIC_LICENSE_KEY"]}
)
```

## Verification
- [ ] Deploy lên server
- [ ] Gọi vài request đến API
- [ ] Kiểm tra New Relic Dashboard → APM → Transactions

## Blocker
- Cần `NEW_RELIC_LICENSE_KEY` từ user.

## Options

| Approach | Pros | Cons |
|----------|------|------|
| New Relic Agent (native) | Đơn giản, auto-instrument | Ít control |
| OTel → NR OTLP | Dùng chung SDK, migrate dễ | Cấu hình phức tạp hơn |

## Next Steps
1. User cung cấp license key
2. Chọn approach (native agent vs OTel)
3. Update config files
4. Deploy & verify