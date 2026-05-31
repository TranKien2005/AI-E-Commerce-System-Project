#!/usr/bin/env bash
set -e

BACKEND_IMAGE="ai-ecommerce-backend"
FRONTEND_IMAGE="ai-ecommerce-frontend"
TAG="test"
INFRASTRUCTURE_MANIFEST="../k8s/infrastructure.yaml"
APPLICATION_MANIFEST="../k8s/application.yaml"
DOCKERFILE="Dockerfile"
SKIP_MIGRATION=false
SKIP_MONITORING=false
SKIP_PORT_FORWARD=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-migration) SKIP_MIGRATION=true ;;
        --skip-monitoring) SKIP_MONITORING=true ;;
        --skip-port-forward) SKIP_PORT_FORWARD=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

cd "$(dirname "$0")"

FULL_BACKEND_IMAGE="${BACKEND_IMAGE}:${TAG}"
FULL_FRONTEND_IMAGE="${FRONTEND_IMAGE}:${TAG}"

echo "[1/8] Checking Kubernetes context..."
kubectl config use-context docker-desktop || echo "Warning: docker-desktop context not found, using current."
kubectl get nodes

echo "[2/8] Building docker images..."
echo "Building backend image: $FULL_BACKEND_IMAGE using $DOCKERFILE"
docker build -f "$DOCKERFILE" -t "$FULL_BACKEND_IMAGE" .
echo "Building frontend image: $FULL_FRONTEND_IMAGE"
docker build -f "../frontend/Dockerfile" -t "$FULL_FRONTEND_IMAGE" ../frontend

echo "[3/8] Applying infrastructure stack: $INFRASTRUCTURE_MANIFEST"
# Delete existing non-headless postgres and redis services to avoid clusterIP modification error
kubectl delete service postgres redis --ignore-not-found
kubectl apply -f "$INFRASTRUCTURE_MANIFEST"

echo "[4/8] Waiting for core infrastructure stack..."
kubectl rollout status statefulset/postgres --timeout=180s
kubectl rollout status statefulset/redis --timeout=180s
kubectl rollout status deployment/mailhog --timeout=180s
kubectl rollout status deployment/jaeger --timeout=180s

if [ "$SKIP_MONITORING" = false ]; then
    echo "[5/8] Applying monitoring stack..."
    # Ensure monitoring namespace exists
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -f "../k8s/otel-collector-jaeger.yaml"
    echo "Applying Prometheus alerts rules (requires Prometheus Operator CRDs)..."
    kubectl apply -f "../k8s/prometheus-rules.yaml" || echo "Warning: Prometheus alert rules could not be applied. Ensure Prometheus CRDs are installed."
    if [ -f "k8s/monitoring-local.yaml" ]; then
        kubectl apply -f "k8s/monitoring-local.yaml"
        kubectl rollout status deployment/prometheus --timeout=180s
        kubectl rollout status deployment/loki --timeout=180s
        kubectl rollout status daemonset/promtail --timeout=180s
        kubectl rollout status deployment/grafana --timeout=180s
    fi
else
    echo "[5/8] Skipping monitoring stack."
fi

echo "[6/8] Deploying Ingress Controller (if not present)..."
if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
    echo "Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
fi
echo "Waiting for Ingress Controller to be ready..."
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s

if [ "$SKIP_MIGRATION" = false ]; then
    echo "[7/8] Running Alembic migrations..."
    kubectl delete job ecommerce-migration --ignore-not-found
    kubectl apply -f "k8s/migration-job.yaml"
    echo "Waiting for migration to complete..."
    kubectl wait --for=condition=complete job/ecommerce-migration --timeout=120s
else
    echo "[7/8] Skipping migrations."
fi

echo "[8/8] Applying application stack: $APPLICATION_MANIFEST"
kubectl apply -f "$APPLICATION_MANIFEST"

echo "Restarting deployments to ensure they run the newly built images..."
kubectl rollout restart deployment/ecommerce-backend
kubectl rollout restart deployment/ecommerce-frontend
kubectl rollout status deployment/ecommerce-backend --timeout=180s
kubectl rollout status deployment/ecommerce-frontend --timeout=180s

echo "Current pods:"
kubectl get pods

if [ "$SKIP_PORT_FORWARD" = false ]; then
    echo "Opening developer ports in background..."

    # Kill old port forwards
    pkill -f "port-forward" || true

    kubectl port-forward service/ecommerce-backend 8000:8000 > /dev/null 2>&1 &
    kubectl port-forward service/mailhog 8025:8025 > /dev/null 2>&1 &
    kubectl port-forward service/jaeger 16686:16686 > /dev/null 2>&1 &

    if [ "$SKIP_MONITORING" = false ] && [ -f "k8s/monitoring-local.yaml" ]; then
        kubectl port-forward service/grafana 3002:3000 > /dev/null 2>&1 &
        kubectl port-forward service/prometheus 9090:9090 > /dev/null 2>&1 &
        kubectl port-forward service/loki 3100:3100 > /dev/null 2>&1 &
    fi

    echo "============================================="
    echo "APPLICATION IS READY!"
    echo "============================================="
    echo "Frontend Application: http://localhost"
    echo "Backend API Base:    http://localhost/api/v1"
    echo "Backend API (Direct): http://localhost:8000"
    echo "OpenAPI docs:         http://localhost:8000/docs"
    echo "MailHog UI:           http://localhost:8025"
    echo "Jaeger UI:            http://localhost:16686"
    if [ "$SKIP_MONITORING" = false ] && [ -f "k8s/monitoring-local.yaml" ]; then
        echo "Grafana UI:           http://localhost:3002 (admin / Admin@123)"
        echo "Prometheus UI:        http://localhost:9090"
        echo "Loki API:             http://localhost:3100"
    fi
    echo "============================================="
    echo "Ports opened. Background jobs started."
fi
