.PHONY: help build build-backend build-frontend deploy deploy-infra deploy-app deploy-monitoring \
	teardown teardown-all rollback-backend rollback-frontend \
	logs-backend logs-frontend logs-all \
	port-dashboard port-grafana port-jaeger \
	status clean

K8S_DIR := k8s
BACKEND_IMG := ai-ecommerce-backend:test
FRONTEND_IMG := ai-ecommerce-frontend:test

help: ## Hiển thị danh sách lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m  %-22s\033[0m %s\n", $$1, $$2}'

## === BUILD ===
build: build-backend build-frontend ## Build tất cả Docker images
build-backend: ## Build backend Docker image
	docker build -t $(BACKEND_IMG) ./backend

build-frontend: ## Build frontend Docker image
	docker build --build-arg VITE_API_BASE_URL=/api/v1 -t $(FRONTEND_IMG) ./frontend

## === DEPLOY ===
deploy: deploy-monitoring deploy-infra deploy-app ## Deploy toàn bộ hệ thống lên K8s

deploy-monitoring: ## Cài đặt Prometheus, Grafana, Loki (Helm) và Jaeger
	@echo ">> Tạo namespace monitoring..."
	kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply --validate=false -f -
	@echo ">> Cài đặt Prometheus + Grafana..."
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
	helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
	helm repo update
	helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring 2>/dev/null || kubectl upgrade -f k8s/dashboard-admin.yaml
	helm install loki grafana/loki-stack --namespace monitoring \
		--set promtail.enabled=true,loki.persistence.enabled=true,loki.persistence.size=10Gi 2>/dev/null || true
	@echo ">> Triển khai Jaeger..."
	kubectl apply --validate=false -f $(K8S_DIR)/otel-collector-jaeger.yaml
	kubectl apply -f $(K8S_DIR)/dashboard-admin.yaml

deploy-infra: ## Triển khai Postgres + Redis StatefulSets
	@echo ">> Triển khai Postgres + Redis..."
	kubectl apply --validate=false -f $(K8S_DIR)/infrastructure.yaml
	@echo ">> Đợi Postgres sẵn sàng..."
	kubectl wait --for=condition=Ready pod -l app=postgres --timeout=120s || true
	@echo ">> Đợi Redis sẵn sàng..."
	kubectl wait --for=condition=Ready pod -l app=redis --timeout=120s || true

deploy-app: ## Triển khai Backend, Frontend + Ingress
	@echo ">> Triển khai Backend + Frontend..."
	kubectl apply --validate=false -f $(K8S_DIR)/application.yaml
	@echo ">> Đợi rollout backend..."
	kubectl rollout status deployment ecommerce-backend --timeout=120s || true
	@echo ">> Đợi rollout frontend..."
	kubectl rollout status deployment ecommerce-frontend --timeout=120s || true

## === TEARDOWN ===
teardown: teardown-app teardown-infra ## Xóa toàn bộ app (giữ infrastructure)

teardown-app: ## Xóa Backend, Frontend, Ingress
	kubectl delete -f $(K8S_DIR)/application.yaml --ignore-not-found=true

teardown-infra: ## Xóa Postgres + Redis
	kubectl delete -f $(K8S_DIR)/infrastructure.yaml --ignore-not-found=true

teardown-all: teardown-app teardown-infra ## Xóa toàn bộ (app + infra)

## === ROLLBACK ===
rollback-backend: ## Rollback backend deployment
	kubectl rollout undo deployment ecommerce-backend

rollback-frontend: ## Rollback frontend deployment
	kubectl rollout undo deployment ecommerce-frontend

## === LOGS ===
logs-backend: ## Xem logs backend (theo dõi realtime)
	kubectl logs -l app=ecommerce-backend -f --tail=100

logs-frontend: ## Xem logs frontend nginx (theo dõi realtime)
	kubectl logs -l app=ecommerce-frontend -f --tail=100

logs-all: ## Xem logs tất cả pod app
	kubectl logs -l app=ecommerce-backend -f --tail=50 & \
	kubectl logs -l app=ecommerce-frontend -f --tail=50

## === PORT-FORWARD (Chạy nền) ===
port-dashboard: ## Mở Kubernetes Dashboard tại https://localhost:8443
	@echo ">> Dashboard: https://localhost:8443"
	@echo ">> Token:"
	@kubectl -n kubernetes-dashboard create token admin-user
	@kubectl port-forward -n kubernetes-dashboard svc/kubernetes-dashboard 8443:443

port-grafana: ## Mở Grafana tại http://localhost:3000
	@echo ">> Grafana: http://localhost:3000"

port-jaeger: ## Mở Jaeger Tracing tại http://localhost:16686
	@echo ">> Jaeger UI: http://localhost:16686"
	@kubectl port-forward svc/opentelemetry-collector 16686:16686 -n monitoring

## === STATUS ===
status: ## Hiển thị trạng thái tất cả pod
	@echo "=== POD STATUS ==="
	@kubectl get pods -A -o wide --sort-by=.metadata.creationTimestamp
	@echo ""
	@echo "=== SERVICE STATUS ==="
	@kubectl get svc -A
	@echo ""
	@echo "=== INGRESS STATUS ==="
	@kubectl get ingress -A
	@echo ""
	@echo "=== DEPLOYMENT STATUS ==="
	@kubectl get deployments -A

## === CLEAN ===
clean: ## Xóa image local
	docker rmi $(BACKEND_IMG) $(FRONTEND_IMG) 2>/dev/null || true