@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "COMPOSE_ANSI=never"
set "BUILDKIT_PROGRESS=plain"
docker info >nul 2>&1
if errorlevel 1 (
  echo Please start Docker Desktop with Linux containers, then run again.
  exit /b 1
)
docker compose --ansi never --progress plain up --build -d
set "DOCKER_EXIT_CODE=%ERRORLEVEL%"
exit /b %DOCKER_EXIT_CODE%
