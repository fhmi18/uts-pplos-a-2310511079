# PowerShell Script untuk menjalankan Docker Containerization
# Sistem Manajemen Kos - 2310511079

Clear-Host

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Docker Containerization Starter" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "[Step 1] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[✓] $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] Docker not found! Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Step 2: Check Docker Compose
Write-Host "[Step 2] Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "[✓] $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "[✗] Docker Compose not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Navigate to project
Write-Host "[Step 3] Getting current directory..." -ForegroundColor Yellow
$projectDir = Get-Location
Write-Host "[✓] Current directory: $projectDir" -ForegroundColor Green

# Step 4: Check docker-compose.yml exists
Write-Host "[Step 4] Checking docker-compose.yml..." -ForegroundColor Yellow
if (Test-Path "docker-compose.yml") {
    Write-Host "[✓] docker-compose.yml found" -ForegroundColor Green
} else {
    Write-Host "[✗] docker-compose.yml not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory" -ForegroundColor Red
    exit 1
}

# Step 5: Build and start services
Write-Host "[Step 5] Building and starting services..." -ForegroundColor Yellow
Write-Host "This may take 1-2 minutes..." -ForegroundColor Cyan
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 6: Wait for services
Write-Host "[Step 6] Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 7: Check containers
Write-Host "[Step 7] Checking container status..." -ForegroundColor Yellow
docker-compose ps

# Step 8: Test services
Write-Host ""
Write-Host "[Step 8] Testing services..." -ForegroundColor Yellow

$endpoints = @(
    @{name = "Gateway"; url = "http://localhost:3004/api/gateway/health"},
    @{name = "Auth Service"; url = "http://localhost:3001/api/auth/health"},
    @{name = "Booking Service"; url = "http://localhost:3003/api/booking/health"}
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.url -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "[✓] $($endpoint.name) is running" -ForegroundColor Green
        } else {
            Write-Host "[⚠] $($endpoint.name) returned status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[⚠] $($endpoint.name) not yet responding (still initializing)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running at:" -ForegroundColor Cyan
Write-Host "  Gateway:        http://localhost:3004" -ForegroundColor White
Write-Host "  Auth Service:   http://localhost:3001" -ForegroundColor White
Write-Host "  Booking Service: http://localhost:3003" -ForegroundColor White
Write-Host "  MySQL:          localhost:3306" -ForegroundColor White
Write-Host ""
Write-Host "Database credentials:" -ForegroundColor Cyan
Write-Host "  User: root" -ForegroundColor White
Write-Host "  Password: root123" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Postman" -ForegroundColor White
Write-Host "  2. Import: postman/collection.json" -ForegroundColor White
Write-Host "  3. Set variable: baseUrl = http://localhost:3004" -ForegroundColor White
Write-Host "  4. Test endpoints" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs:              docker-compose logs -f" -ForegroundColor Gray
Write-Host "  View specific logs:     docker-compose logs auth-service" -ForegroundColor Gray
Write-Host "  Restart services:       docker-compose restart" -ForegroundColor Gray
Write-Host "  Stop services:          docker-compose down" -ForegroundColor Gray
Write-Host "  Stop and remove data:   docker-compose down -v" -ForegroundColor Gray
Write-Host ""
