param(
    [string]$ImageName = "ai-ecommerce-backend",
    [string]$Tag = "phase1",
    [string[]]$SeedArgs = @()
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

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendDir

$FullImageName = "${ImageName}:${Tag}"
$SeedPodName = "ecommerce-seed"
$SeedCommand = @("python", "scripts/seed.py") + $SeedArgs

Write-Host "Running seed in Docker Desktop Kubernetes with image: $FullImageName"
Invoke-Step { kubectl config use-context docker-desktop } "Failed to switch kubectl context to docker-desktop."
Invoke-Step { kubectl get sts postgres } "PostgreSQL StatefulSet was not found."
Invoke-Step { kubectl delete pod $SeedPodName --ignore-not-found } "Failed to delete previous seed pod."

kubectl run $SeedPodName `
    --rm `
    -i `
    --restart=Never `
    --image=$FullImageName `
    --image-pull-policy=Never `
    --env="DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/ecommerce" `
    --env="PYTHONPATH=/app" `
    --command -- @SeedCommand

if ($LASTEXITCODE -ne 0) {
    throw "Seed failed. Check the output above."
}
