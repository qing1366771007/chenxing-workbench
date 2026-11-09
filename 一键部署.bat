@echo off
chcp 65001 >nul
cd /d "E:\青的数据\青的obsidian\辰星工作台"

REM ============================================
REM  ⚠️ 安全改动（2026-10-03）
REM  Token 已从脚本中移除 —— 不要再写回这里
REM  文件会被同步/备份/上传，Token 跟着跑就泄露了
REM ============================================

if "%GITHUB_TOKEN%"=="" (
    echo.
    echo ============================================
    echo   [错误] 未设置 GITHUB_TOKEN 环境变量
    echo ============================================
    echo.
    echo 请先在命令行执行：
    echo     set GITHUB_TOKEN=你的token
    echo.
    echo 然后再双击本文件。
    echo.
    echo Token 生成地址：https://github.com/settings/tokens
    echo （勾选 repo 权限，生成后只显示一次）
    echo.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\青的数据\青的obsidian\辰星工作台\deploy-github.ps1" -Token "%GITHUB_TOKEN%"
pause
