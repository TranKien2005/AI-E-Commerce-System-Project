# Kubernetes Production Deployment & Operations Guide

Tài liệu hướng dẫn triển khai, vận hành và giám sát cụm Kubernetes (K8s) cho hệ thống E-Commerce (FastAPI Backend + React Frontend).

---

## 🏗️ Kiến Trúc Hệ Thống

- **Frontend:** React (Vite) + Nginx SPA fallback.
- **Backend:** FastAPI, tích hợp OpenTelemetry Tracing & Prometheus Metrics.
- **Cache & Session:** Redis StatefulSet (thay thế in-memory state của OTP và refresh token).
- **Database:** PostgreSQL StatefulSet + Persistent Volume Claim (10Gi).
- **Observability:** Jaeger (Tracing) + Prometheus/Grafana (Metrics) + Loki (Logs).

---

## 🛠️ Quy Trình Triển Khai (Deployment)

### 1. Chuẩn bị Môi trường Local (Docker Desktop)
- Mở **Docker Desktop** -> **Settings** -> **Kubernetes** -> Tích chọn **Enable Kubernetes** -> Chọn **Apply & restart**.
- Đợi trạng thái Kubernetes hiển thị màu xanh lá (**Running**).

### 2. Build Docker Images cho Môi trường Local
Nếu chạy trên cụm local (Docker Desktop), build images với tag local và sử dụng cấu hình không pull từ registry:

```bash
# Build Backend
docker build -t ai-ecommerce-backend:test ./backend

# Build Frontend (truyền API base URL qua build-arg)
docker build --build-arg VITE_API_BASE_URL=/api/v1 -t ai-ecommerce-frontend:test ./frontend
```

*Lưu ý: Manifest `k8s/application.yaml` đã được thiết lập sử dụng image tag `test` này và `imagePullPolicy: IfNotPresent` để tận dụng Docker cache local.*

### 3. Cài đặt Bộ Công Cụ Giám Sát (Observability Stack)
Tạo namespace và cài đặt Prometheus, Grafana, Loki qua Helm:

```bash
# 1. Tạo namespace giám sát
kubectl create namespace monitoring

# 2. Cài đặt Prometheus & Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring

# 3. Cài đặt Grafana Loki (Logging)
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install loki grafana/loki-stack --namespace monitoring --set promtail.enabled=true,loki.persistence.enabled=true,loki.persistence.size=10Gi

# 4. Triển khai Jaeger Tracing
kubectl apply -f k8s/otel-collector-jaeger.yaml
```

### 4. Triển khai Hạ Tầng & Ứng Dụng
Triển khai cơ sở dữ liệu trước, đợi sẵn sàng rồi deploy ứng dụng:

```bash
# 1. Khởi chạy Postgres + Redis
kubectl apply -f k8s/infrastructure.yaml

# 2. Đợi Database & Cache sẵn sàng
kubectl wait --for=condition=Ready pod -l app=postgres --timeout=120s
kubectl wait --for=condition=Ready pod -l app=redis --timeout=120s

# 3. Triển khai Frontend, Backend & Ingress
kubectl apply -f k8s/application.yaml
```

---

## 📊 Hướng Dẫn Vận Hành & Giám Sát (Operations)

### 1. Truy Cập Kubernetes Dashboard (Quản trị cụm)
Hệ thống quản trị trực quan K8s đã được cấu hình với tài khoản `admin-user`:

```bash
# 1. Khởi chạy proxy Dashboard
kubectl port-forward -n kubernetes-dashboard svc/kubernetes-dashboard 8443:443
```
- Truy cập: **[https://localhost:8443](https://localhost:8443)**
- Tạo token đăng nhập mới khi cần:
  ```bash
  kubectl -n kubernetes-dashboard create token admin-user
  ```

### 2. Xem Metrics & Logs (Grafana)
Grafana thu thập metrics hệ thống từ Prometheus và logs từ Loki.

```bash
# 1. Lấy mật khẩu admin của Grafana
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

# 2. Port-forward cổng Grafana ra máy local
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```
- Truy cập: **[http://localhost:3000](http://localhost:3000)** (Username: `admin`, Password lấy từ câu lệnh trên).
- Thêm Data Source **Loki** tại URL: `http://loki.monitoring.svc.cluster.local:3100` để xem logs kết hợp đồ thị.

### 3. Kiểm Tra Trace Đường Đi Request (Jaeger Tracing)
Giúp trace chi tiết thời gian xử lý request qua FastAPI xuống Database:

```bash
# Port-forward cổng Jaeger UI
kubectl port-forward svc/opentelemetry-collector 16686:16686 -n monitoring
```
- Truy cập: **[http://localhost:16686](http://localhost:16686)**.

---

## 🛠️ Các Lệnh Điều Hành Tiêu Biểu (Cheat Sheet)

### Kiểm tra Trạng thái Hệ thống
```bash
# Xem tất cả pod trên mọi namespace kèm IP và Node
kubectl get pods -A -o wide

# Xem logs thời gian thực của backend
kubectl logs -l app=ecommerce-backend -f --tail=100

# Xem logs của frontend nginx
kubectl logs -l app=ecommerce-frontend -f
```

### Cập nhật & Khởi động lại Ứng dụng (Zero-Downtime Rollout)
Khi cập nhật code hoặc sửa đổi config:

```bash
# Khởi động lại backend
kubectl rollout restart deployment ecommerce-backend

# Khởi động lại frontend
kubectl rollout restart deployment ecommerce-frontend

# Theo dõi trạng thái rollout
kubectl rollout status deployment ecommerce-backend
```

### Debug & Tương tác Trực tiếp
```bash
# Truy cập shell bên trong pod database (Postgres)
kubectl exec -it postgres-0 -- psql -U postgres -d ecommerce

# Truy cập shell bên trong pod redis để check OTP/session keys
kubectl exec -it redis-0 -- redis-cli

# Debug gọi thử API trực tiếp bên trong cluster qua một pod tạm
kubectl run curl-test --image=radial/busyboxplus:curl -i --tty --rm
# Inside shell: curl http://ecommerce-backend:8000/health
```

---

## ⚠️ Khuyến Nghị Cho Môi Trường Production
1. **Bảo mật:** Tuyệt đối không commit file chứa secret thật. Cập nhật `POSTGRES_PASSWORD` trong `k8s/infrastructure.yaml` và `SECRET_KEY`, `DATABASE_URL` trong `k8s/application.yaml` thông qua các giải pháp quản lý Secret như HashiCorp Vault hoặc Sealed Secrets.
2. **Registry:** Thay thế image `ai-ecommerce-backend:test` bằng Docker Registry private của bạn (ví dụ: Google Artifact Registry, AWS ECR, DockerHub Private) và đổi `imagePullPolicy` thành `Always`.
3. **Scaling:** Tăng số lượng `replicas` trong backend/frontend deployment dựa trên tải thực tế, cấu hình HPA (Horizontal Pod Autoscaler).
