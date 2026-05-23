param(
    [string]$ImageName = "ai-ecommerce-backend",
    [string]$Tag = "phase1",
    [string]$Manifest = "k8s/all-in-one-local.yaml",
    [string]$MonitoringManifest = "k8s/monitoring-local.yaml",
    [string]$Dockerfile = "Dockerfile.local",
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

$FullImageName = "${ImageName}:${Tag}"

Write-Host "[1/7] Checking Kubernetes context..."
Invoke-Step { kubectl config use-context docker-desktop } "Failed to switch kubectl context to docker-desktop."
Invoke-Step { kubectl get nodes } "Kubernetes is not ready. Open Docker Desktop and wait for Kubernetes to be Running."

Write-Host "[2/7] Building backend image: $FullImageName using $Dockerfile"
Invoke-Step { docker build -f $Dockerfile -t $FullImageName . } "Docker build failed. Fix the build error before applying Kubernetes manifests."

Write-Host "[3/7] Applying app stack: $Manifest"
Invoke-Step { kubectl apply -f $Manifest } "Failed to apply Kubernetes manifest."

Write-Host "[4/7] Waiting for app dependencies..."
Invoke-Step { kubectl rollout status deployment/postgres --timeout=180s } "PostgreSQL deployment did not become ready."
Invoke-Step { kubectl rollout status deployment/redis --timeout=180s } "Redis deployment did not become ready."
Invoke-Step { kubectl rollout status deployment/mailhog --timeout=180s } "MailHog deployment did not become ready."
Invoke-Step { kubectl rollout status deployment/jaeger --timeout=180s } "Jaeger deployment did not become ready."

if (-not $SkipMonitoring) {
    Write-Host "[5/7] Applying monitoring stack: $MonitoringManifest"
    Invoke-Step { kubectl apply -f $MonitoringManifest } "Failed to apply monitoring manifest."
    Invoke-Step { kubectl rollout status deployment/prometheus --timeout=180s } "Prometheus deployment did not become ready."
    Invoke-Step { kubectl rollout status deployment/loki --timeout=180s } "Loki deployment did not become ready."
    Invoke-Step { kubectl rollout status daemonset/promtail --timeout=180s } "Promtail daemonset did not become ready."
    Invoke-Step { kubectl rollout status deployment/grafana --timeout=180s } "Grafana deployment did not become ready."
} else {
    Write-Host "[5/7] Skipping monitoring stack."
}

if (-not $SkipMigration) {
    Write-Host "[6/7] Running Alembic migrations..."
    Invoke-Step { kubectl delete job ecommerce-migration --ignore-not-found } "Failed to delete previous migration job."
    Invoke-Step { kubectl apply -f "k8s/migration-job.yaml" } "Failed to apply migration job."
    Write-Host "Waiting for migration to complete..."
    Invoke-Step { kubectl wait --for=condition=complete job/ecommerce-migration --timeout=120s } "Alembic migration failed or timed out. Check job logs: kubectl logs job/ecommerce-migration"
} else {
    Write-Host "[6/7] Skipping migrations."
}

Write-Host "[7/7] Restarting backend deployment to use rebuilt image..."
Invoke-Step { kubectl rollout restart deployment/ecommerce-backend } "Failed to restart backend deployment."
Invoke-Step { kubectl rollout status deployment/ecommerce-backend --timeout=180s } "Backend deployment did not become ready."

Write-Host "Current pods:"
kubectl get pods | Out-Host

if (-not $SkipPortForward) {
    Write-Host "Opening demo ports as background PowerShell jobs..."
    Start-PortForwardJob -Name ecommerce-backend-port -Service ecommerce-backend -Ports "8000:80"
    Start-PortForwardJob -Name mailhog-port -Service mailhog -Ports "8025:8025"
    Start-PortForwardJob -Name jaeger-port -Service jaeger -Ports "16686:16686"
    if (-not $SkipMonitoring) {
        Start-PortForwardJob -Name grafana-port -Service grafana -Ports "3002:3000"
        Start-PortForwardJob -Name prometheus-port -Service prometheus -Ports "9090:9090"
        Start-PortForwardJob -Name loki-port -Service loki -Ports "3100:3100"
    }

    Write-Host "Backend API: http://localhost:8000"
    Write-Host "OpenAPI docs: http://localhost:8000/docs"
    Write-Host "MailHog UI: http://localhost:8025"
    Write-Host "Jaeger UI: http://localhost:16686"
    if (-not $SkipMonitoring) {
        Write-Host "Grafana UI: http://localhost:3002 (admin / Admin@123)"
        Write-Host "Prometheus UI: http://localhost:9090"
        Write-Host "Loki API: http://localhost:3100"
    }
    Write-Host "Use Get-Job to view port-forward jobs and Stop-Job <Id> to stop them."
} else {
    Write-Host "Port-forward skipped. Run .\k8s-ports.ps1 if needed."
}
