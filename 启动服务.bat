@echo off
chcp 65001 >nul
title 辰星工作台云端服务
cd /d "%~dp0server"

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║      正在启动辰星工作台云端服务...        ║
echo   ╚══════════════════════════════════════════╝
echo.

if not exist node_modules (
  echo   第一次启动，正在安装依赖...
  echo   （可能需要1-2分钟，请耐心等待）
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   ❌ 依赖安装失败，请检查网络
    pause
    exit /b 1
  )
)

echo.
echo   ✅ 启动成功！不要关闭此窗口
echo.
echo   🌐 本地访问: http://localhost:3000
echo   📱 手机访问: http://你电脑的IP:3000
echo.
echo   （按 Ctrl+C 停止服务）
echo.

npm start
pause
