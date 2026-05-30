# UAT: Observability (New Relic)

## Status
- [x] Cài đặt dependency `newrelic`
- [x] Cấu hình `newrelic.ini` với License Key
- [x] Init New Relic agent trong `main.py`
- [ ] Verify data flow lên New Relic Dashboard

## Test Case 1: Khởi động App
- **Action:** Chạy `cd backend && uvicorn app.main:app --reload`
- **Expect:** App chạy không lỗi, log New Relic hiện "Agent is initialized"
- **Result:** PENDING

## Test Case 2: Phát sinh Transactions
- **Action:** `curl http://localhost:8000/health`
- **Expect:** New Relic Dashboard hiện transaction `/health`
- **Result:** PENDING

## Test Case 3: Error Tracking
- **Action:** Gọi endpoint gây lỗi (nếu có)
- **Expect:** New Relic hiện Error Event
- **Result:** PENDING
