# Kubernetes Deployment

## 1. Build images

```bash
docker build -t your-registry/ecommerce-backend:latest ./backend
docker build --build-arg VITE_API_BASE_URL=/api/v1 -t your-registry/ecommerce-frontend:latest ./frontend
```

Push images to your registry, then update image names in `k8s/application.yaml`.

## 2. Install observability stack

```bash
kubectl create namespace monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
helm install loki grafana/loki-stack --namespace monitoring --set promtail.enabled=true,loki.persistence.enabled=true,loki.persistence.size=10Gi
kubectl apply -f k8s/otel-collector-jaeger.yaml
```

## 3. Deploy infrastructure

```bash
kubectl apply -f k8s/infrastructure.yaml
kubectl wait --for=condition=Ready pod -l app=postgres --timeout=120s
kubectl wait --for=condition=Ready pod -l app=redis --timeout=120s
```

## 4. Deploy app

```bash
kubectl apply -f k8s/application.yaml
kubectl rollout status deployment/ecommerce-backend
kubectl rollout status deployment/ecommerce-frontend
kubectl get pods
```

## 5. Access dashboards

Grafana:

```bash
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
```

Open `http://localhost:3000`.

Jaeger:

```bash
kubectl port-forward svc/opentelemetry-collector 16686:16686 -n monitoring
```

Open `http://localhost:16686`.

## 6. Validation

```bash
kubectl apply --dry-run=client -f k8s/infrastructure.yaml
kubectl apply --dry-run=client -f k8s/application.yaml
kubectl apply --dry-run=client -f k8s/otel-collector-jaeger.yaml
```

## Notes

- Replace placeholder secrets before production.
- Replace `your-registry/...` images before deploy.
- Keep `VITE_API_BASE_URL=/api/v1` when frontend and backend share same Ingress host.
