#!/usr/bin/env bash
set -e

IMAGE_NAME="ai-ecommerce-backend"
TAG="phase1"
MANIFEST="k8s/all-in-one-local.yaml"
MONITORING_MANIFEST="k8s/monitoring-local.yaml"
DOCKERFILE="Dockerfile.local"
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

FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo "[1/7] Checking Kubernetes context..."
kubectl config use-context docker-desktop || echo "Warning: docker-desktop context not found, using current."
kubectl get nodes

echo "[2/7] Building backend image: $FULL_IMAGE_NAME using $DOCKERFILE"
docker build -f "$DOCKERFILE" -t "$FULL_IMAGE_NAME" .

echo "[3/7] Applying app stack: $MANIFEST"
kubectl apply -f "$MANIFEST"

echo "[4/7] Waiting for app dependencies..."
kubectl rollout status deployment/postgres --timeout=180s
kubectl rollout status deployment/redis --timeout=180s
kubectl rollout status deployment/mailhog --timeout=180s
kubectl rollout status deployment/jaeger --timeout=180s

if [ "$SKIP_MONITORING" = false ]; then
    echo "[5/7] Applying monitoring stack: $MONITORING_MANIFEST"
    kubectl apply -f "$MONITORING_MANIFEST"
    kubectl rollout status deployment/prometheus --timeout=180s
    kubectl rollout status deployment/loki --timeout=180s
    kubectl rollout status daemonset/promtail --timeout=180s
    kubectl rollout status deployment/grafana --timeout=180s
else
    echo "[5/7] Skipping monitoring stack."
fi

if [ "$SKIP_MIGRATION" = false ]; then
    echo "[6/7] Running Alembic migrations..."
    kubectl delete job ecommerce-migration --ignore-not-found
    kubectl apply -f "k8s/migration-job.yaml"
    echo "Waiting for migration to complete..."
    kubectl wait --for=condition=complete job/ecommerce-migration --timeout=120s
else
    echo "[6/7] Skipping migrations."
fi

echo "[7/7] Restarting backend deployment..."
kubectl rollout restart deployment/ecommerce-backend
kubectl rollout status deployment/ecommerce-backend --timeout=180s

echo "Current pods:"
kubectl get pods

if [ "$SKIP_PORT_FORWARD" = false ]; then
    echo "Opening demo ports in background..."

    # Kill old port forwards
    pkill -f "port-forward" || true

    kubectl port-forward service/ecommerce-backend 8000:80 > /dev/null 2>&1 &
    kubectl port-forward service/mailhog 8025:8025 > /dev/null 2>&1 &
    kubectl port-forward service/jaeger 16686:16686 > /dev/null 2>&1 &

    if [ "$SKIP_MONITORING" = false ]; then
        kubectl port-forward service/grafana 3002:3000 > /dev/null 2>&1 &
        kubectl port-forward service/prometheus 9090:9090 > /dev/null 2>&1 &
        kubectl port-forward service/loki 3100:3100 > /dev/null 2>&1 &
    fi

    echo "Ports opened."
    echo "Backend API: http://localhost:8000"
    echo "OpenAPI docs: http://localhost:8000/docs"
    echo "MailHog UI: http://localhost:8025"
    echo "Jaeger UI: http://localhost:16686"
    if [ "$SKIP_MONITORING" = false ]; then
        echo "Grafana UI: http://localhost:3002 (admin / Admin@123)"
        echo "Prometheus UI: http://localhost:9090"
        echo "Loki API: http://localhost:3100"
    fi
fi
