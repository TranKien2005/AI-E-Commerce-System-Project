param(
    [string]$AppManifest = "k8s/all-in-one-local.yaml",
    [string]$MonitoringManifest = "k8s/monitoring-local.yaml",
    [switch]$Remove,
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendDir

kubectl config use-context docker-desktop | Out-Host

Get-Job | Where-Object { $_.Name -match "port" } | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Where-Object { $_.Name -match "port" } | Remove-Job -ErrorAction SilentlyContinue

kubectl delete pod image-loader --ignore-not-found | Out-Host
kubectl delete pod ecommerce-migration --ignore-not-found | Out-Host
kubectl delete pod ecommerce-seed --ignore-not-found | Out-Host

if ($Remove) {
    if ($RemoveData) {
        Write-Host "Removing app, monitoring, and PostgreSQL data..."
        kubectl delete -f $MonitoringManifest --ignore-not-found | Out-Host
        kubectl delete -f $AppManifest --ignore-not-found | Out-Host
    } else {
        Write-Host "Removing app and monitoring workloads/config, keeping PostgreSQL data PVC..."
        kubectl delete -f $MonitoringManifest --ignore-not-found | Out-Host
        kubectl delete deployment ecommerce-backend postgres redis mailhog jaeger --ignore-not-found | Out-Host
        kubectl delete service ecommerce-backend postgres redis mailhog jaeger --ignore-not-found | Out-Host
        kubectl delete configmap ecommerce-backend-config --ignore-not-found | Out-Host
        kubectl delete secret ecommerce-backend-secret postgres-secret --ignore-not-found | Out-Host
    }
} else {
    Write-Host "Temporarily stopping app and monitoring by scaling deployments to 0. Data and configuration are kept."
    kubectl scale deployment ecommerce-backend postgres redis mailhog jaeger prometheus grafana loki --replicas=0 --ignore-not-found | Out-Host
    kubectl scale daemonset promtail --replicas=0 --ignore-not-found | Out-Host
}

Write-Host "Current deployments:"
kubectl get deployments | Out-Host

Write-Host "Current pods:"
kubectl get pods | Out-Host

if (-not $Remove) {
    Write-Host "To start again, run: .\k8s-up.ps1"
    Write-Host "To remove workloads/config but keep DB data, run: .\k8s-down.ps1 -Remove"
    Write-Host "To remove everything including DB data, run: .\k8s-down.ps1 -Remove -RemoveData"
}
