$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $root "backend\.env"
$backendEnvExample = Join-Path $root "backend\.env.example"
$frontendEnv = Join-Path $root "monitor-ui\.env"
$frontendEnvExample = Join-Path $root "monitor-ui\.env.example"

function Ensure-EnvFile {
  param(
    [string] $Target,
    [string] $Example
  )

  if (-not (Test-Path $Target) -and (Test-Path $Example)) {
    Copy-Item $Example $Target
    Write-Host "Created $Target from example."
  }
}

function Test-Port {
  param(
    [string] $HostName,
    [int] $Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $connect = $client.BeginConnect($HostName, $Port, $null, $null)
    $connected = $connect.AsyncWaitHandle.WaitOne(1000, $false)
    if ($connected) {
      $client.EndConnect($connect)
    }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

function Wait-ForMongo {
  Write-Host "Waiting for MongoDB on 127.0.0.1:27017..."

  for ($attempt = 1; $attempt -le 60; $attempt += 1) {
    if (Test-Port -HostName "127.0.0.1" -Port 27017) {
      Write-Host "MongoDB is reachable."
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "MongoDB did not become reachable on 127.0.0.1:27017. Start Docker Desktop and retry, or update backend\.env MONGODB_URI."
}

function Start-DevWindow {
  param(
    [string] $Title,
    [string] $WorkingDirectory,
    [string] $Command
  )

  $escapedDirectory = $WorkingDirectory.Replace("'", "''")
  $escapedCommand = $Command.Replace("'", "''")
  $windowCommand = "& { `$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$escapedDirectory'; $escapedCommand }"

  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $windowCommand
  ) | Out-Null
}

Set-Location $root
Ensure-EnvFile -Target $backendEnv -Example $backendEnvExample
Ensure-EnvFile -Target $frontendEnv -Example $frontendEnvExample

Write-Host "Starting MongoDB service..."
docker compose up -d mongo
Wait-ForMongo

Write-Host "Starting backend and frontend dev servers..."
Start-DevWindow -Title "Heartbeat Backend" -WorkingDirectory $root -Command "npm run dev"
Start-DevWindow -Title "Heartbeat Frontend" -WorkingDirectory (Join-Path $root "monitor-ui") -Command "npm start"

Write-Host ""
Write-Host "Heartbeat dev stack is starting."
Write-Host "Backend:  http://localhost:3002"
Write-Host "Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Close the spawned Backend and Frontend PowerShell windows to stop the dev servers."
