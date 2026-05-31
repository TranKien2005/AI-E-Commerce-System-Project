param(
    [string]$BackendImageName = "ai-ecommerce-backend",
    [string]$FrontendImageName = "ai-ecommerce-frontend",
    [string]$Tag = "test",
    [string]$InfrastructureManifest = "../k8s/infrastructure.yaml",
    [string]$ApplicationManifest = "../k8s/application.yaml",
    [string]$Dockerfile = "Dockerfile",
    [switch]$SkipMigration,
    [switch]$SkipMonitoring,
    [switch]$SkipPortForward
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

function Start-PortForwardJob {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Service,
        [Parameter(Mandatory = $true)]
        [string]$Ports
    )

    Get-Job -Name $Name -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
    Get-Job -Name $Name -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue
    Start-Job -Name $Name -ScriptBlock {
        param($ServiceName, $PortSpec)
        kubectl port-forward "service/$ServiceName" $PortSpec
    } -ArgumentList $Service, $Ports | Out-Null
}

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendDir

$FullBackendImageName = "${BackendImageName}:${Tag}"
$FullFrontendImageName = "${FrontendImageName}:${Tag}"

Write-Host "[1/8] Checking Kubernetes context..."
Invoke-Step { kubectl config use-context docker-desktop } "Failed to switch kubectl context to docker-desktop."
Invoke-Step { kubectl get nodes } "Kubernetes is not ready. Open Docker Desktop and wait for Kubernetes to be Running."

Write-Host "[2/8] Building docker images..."
Write-Host "Building backend image: $FullBackendImageName using $Dockerfile"
Invoke-Step { docker build -f $Dockerfile -t $FullBackendImageName . } "Docker build for backend failed."
Write-Host "Building frontend image: $FullFrontendImageName"
Invoke-Step { docker build -f ../frontend/Dockerfile -t $FullFrontendImageName ../frontend } "Docker build for frontend failed."

Write-Host "[3/8] Deploying infrastructure dependencies: $InfrastructureManifest"
# Delete existing postgres and redis deployments/services/statefulsets/PVCs to start fresh and avoid conflicts
Invoke-Step { kubectl delete service postgres redis --ignore-not-found } "Failed to delete old postgres and redis services."
Invoke-Step { kubectl delete deployment postgres redis --ignore-not-found } "Failed to delete old postgres and redis deployments."
Invoke-Step { kubectl delete statefulset postgres redis --ignore-not-found } "Failed to delete old postgres and redis statefulsets."
Write-Host "Keeping PostgreSQL persistent volume..."
Invoke-Step { kubectl apply -f $InfrastructureManifest } "Failed to apply infrastructure manifest."

Write-Host "[4/8] Waiting for core infrastructure stack..."
Invoke-Step { kubectl rollout status statefulset/postgres --timeout=180s } "PostgreSQL statefulset did not become ready."
Invoke-Step { kubectl rollout status statefulset/redis --timeout=180s } "Redis statefulset did not become ready."
Invoke-Step { kubectl rollout status deployment/mailhog --timeout=180s } "MailHog deployment did not become ready."
Invoke-Step { kubectl rollout status deployment/jaeger --timeout=180s } "Jaeger deployment did not become ready."

if (-not $SkipMonitoring) {
    Write-Host "[5/8] Applying monitoring stack..."
    # Ensure monitoring namespace exists
    $null = kubectl get ns monitoring -o name 2>$null
    if ($LASTEXITCODE -ne 0) {
        Invoke-Step { kubectl create namespace monitoring } "Failed to create monitoring namespace."
    }
    # Apply otel-collector and prometheus/grafana rules from root
    Invoke-Step { kubectl apply -f "../k8s/otel-collector-jaeger.yaml" } "Failed to apply OpenTelemetry config."
    Write-Host "Applying Prometheus alerts rules (requires Prometheus Operator CRDs)..."
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        kubectl apply -f "../k8s/prometheus-rules.yaml" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Prometheus alert rules could not be applied. Ensure Prometheus CRDs are installed."
        }
    } catch {
        Write-Host "Warning: Prometheus alert rules could not be applied. Ensure Prometheus CRDs are installed."
    }
    $ErrorActionPreference = $oldEAP
    # Also apply the local monitoring manifest if present
    if (Test-Path "k8s/monitoring-local.yaml") {
        Invoke-Step { kubectl apply -f "k8s/monitoring-local.yaml" } "Failed to apply monitoring-local manifest."
        Invoke-Step { kubectl rollout status deployment/prometheus --timeout=180s } "Prometheus deployment did not become ready."
        Invoke-Step { kubectl rollout status deployment/loki --timeout=180s } "Loki deployment did not become ready."
        Invoke-Step { kubectl rollout status daemonset/promtail --timeout=180s } "Promtail daemonset did not become ready."
        Invoke-Step { kubectl rollout status deployment/grafana --timeout=180s } "Grafana deployment did not become ready."
    }
} else {
    Write-Host "[5/8] Skipping monitoring stack."
}

Write-Host "[6/8] Deploying Ingress Controller (if not present)..."
$null = kubectl get ns ingress-nginx -o name 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing NGINX Ingress Controller..."
    Invoke-Step { kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml } "Failed to deploy NGINX Ingress controller."
}
Write-Host "Waiting for Ingress Controller to be ready..."
Invoke-Step { kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s } "Ingress Controller did not become ready."

Write-Host "[7/8] Applying application stack: $ApplicationManifest"
Invoke-Step { kubectl apply -f $ApplicationManifest } "Failed to apply application manifest."

if (-not $SkipMigration) {
    Write-Host "[8/8] Running Alembic migrations..."
    Invoke-Step { kubectl delete job ecommerce-migration --ignore-not-found } "Failed to delete previous migration job."
    Invoke-Step { kubectl apply -f "k8s/migration-job.yaml" } "Failed to apply migration job."
    Write-Host "Waiting for migration to complete..."
    Invoke-Step { kubectl wait --for=condition=complete job/ecommerce-migration --timeout=120s } "Alembic migration failed or timed out. Check job logs: kubectl logs job/ecommerce-migration"
} else {
    Write-Host "[8/8] Skipping migrations."
}

Write-Host "Restarting deployments to ensure they run the newly built images..."
Invoke-Step { kubectl rollout restart deployment/ecommerce-backend } "Failed to restart backend."
Invoke-Step { kubectl rollout restart deployment/ecommerce-frontend } "Failed to restart frontend."
Invoke-Step { kubectl rollout status deployment/ecommerce-backend --timeout=180s } "Backend deployment did not become ready."
Invoke-Step { kubectl rollout status deployment/ecommerce-frontend --timeout=180s } "Frontend deployment did not become ready."

Write-Host "Current pods:"
kubectl get pods | Out-Host

if (-not $SkipPortForward) {
    Write-Host "Opening developer ports as background PowerShell jobs..."
    # Terminate any dangling port-forward jobs first
    Get-Process -Name kubectl -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Start-PortForwardJob -Name ecommerce-backend-port -Service ecommerce-backend -Ports "8000:8000"
    Start-PortForwardJob -Name mailhog-port -Service mailhog -Ports "8025:8025"
    Start-PortForwardJob -Name jaeger-port -Service jaeger -Ports "16686:16686"
    if (-not $SkipMonitoring) {
        if (Test-Path "k8s/monitoring-local.yaml") {
            Start-PortForwardJob -Name grafana-port -Service grafana -Ports "3002:3000"
            Start-PortForwardJob -Name prometheus-port -Service prometheus -Ports "9090:9090"
            Start-PortForwardJob -Name loki-port -Service loki -Ports "3100:3100"
        }
    }

    Write-Host "============================================="
    Write-Host "APPLICATION IS READY!"
    Write-Host "============================================="
    Write-Host "Frontend Application: http://localhost"
    Write-Host "Backend API Base:    http://localhost/api/v1"
    Write-Host "Backend API (Direct): http://localhost:8000"
    Write-Host "OpenAPI docs:         http://localhost:8000/docs"
    Write-Host "MailHog UI:           http://localhost:8025"
    Write-Host "Jaeger UI:            http://localhost:16686"
    if (-not $SkipMonitoring) {
        if (Test-Path "k8s/monitoring-local.yaml") {
            Write-Host "Grafana UI:           http://localhost:3002 (admin / Admin@123)"
            Write-Host "Prometheus UI:        http://localhost:9090"
            Write-Host "Loki API:             http://localhost:3100"
        }
    }
    Write-Host "============================================="
    Write-Host "Use Get-Job to view port-forward jobs and Stop-Job <Id> to stop them."
} else {
    Write-Host "Port-forward skipped."
}
