# Roadmap: Observability (OTel) Integration

## Goal
Deploy ứng dụng và tích hợp OpenTelemetry (OTel) để thu thập Tracing/Metrics lên Data Meter system.

## Phases

### Phase 1: Setup OTel SDK & Infrastructure (DONE)
- [ ] Cấu hình OTel Collector trong Docker Compose
- [ ] Thêm dependencies OTel SDK vào backend
- [ ] Khởi tạo Tracer Provider trong FastAPI

### Phase 2: Instrumentation & Middleware
- [ ] Thêm FastAPI Instrumentation
- [ ] Thêm SQLAlchemy Instrumentation (Database Tracing)
- [ ] Custom Span cho business logic (Service Layer)

### Phase 3: Metrics & Deployment
- [ ] Cấu hình Prometheus/Grafana (nếu cần) hoặc Export sang OTLP Endpoint của user
- [ ] Cấu hình Environment Variables cho Prod deployment
- [ ] Test E2E tracing flow
