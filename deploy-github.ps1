# GitHub Pages 部署脚本 - 辰星工作台
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File deploy-github.ps1 -Token "你的TOKEN"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$baseDir = "E:\青的obsidian\辰星工作台"
$repoName = "chenxing-study"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# 1. 获取用户名
Write-Host "1. 正在获取GitHub用户信息..." -ForegroundColor Cyan
$user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
$username = $user.login
Write-Host "   用户名: $username" -ForegroundColor Green

# 2. 创建仓库
Write-Host "2. 正在创建仓库 $repoName..." -ForegroundColor Cyan
try {
    $repoBody = @{
        name = $repoName
        description = "辰星工作台 - 儿童学习平台"
        public = $true
        auto_init = $true
    } | ConvertTo-Json
    $repo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $repoBody -ContentType "application/json"
    Write-Host "   仓库创建成功!" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "   仓库已存在，继续上传..." -ForegroundColor Yellow
    } else {
        Write-Host "   创建仓库失败: $_" -ForegroundColor Red
        exit 1
    }
}

# 3. 上传文件
Write-Host "3. 开始上传文件..." -ForegroundColor Cyan
$files = Get-ChildItem $baseDir -Recurse -File
$total = $files.Count
$count = 0

foreach ($file in $files) {
    $count++
    $relativePath = $file.FullName.Substring($baseDir.Length + 1).Replace('\', '/')
    
    Write-Host "   [$count/$total] 上传: $relativePath" -NoNewline
    
    # 读取文件并Base64编码
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # 检查文件是否已存在
    $checkUri = "https://api.github.com/repos/$username/$repoName/contents/$relativePath"
    $sha = $null
    try {
        $existing = Invoke-RestMethod -Uri $checkUri -Headers $headers -ErrorAction SilentlyContinue
        $sha = $existing.sha
    } catch {}
    
    # 上传文件
    $uploadBody = @{
        message = "upload: $relativePath"
        content = $base64
    }
    if ($sha) { $uploadBody.sha = $sha }
    
    $uploadBodyJson = $uploadBody | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $checkUri -Method Put -Headers $headers -Body $uploadBodyJson -ContentType "application/json" | Out-Null
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " 失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

# 4. 启用 GitHub Pages
Write-Host "4. 正在启用 GitHub Pages..." -ForegroundColor Cyan
$pagesBody = @{
    source = @{
        branch = "main"
        path = "/"
    }
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName/pages" -Method Post -Headers $headers -Body $pagesBody -ContentType "application/json" | Out-Null
    Write-Host "   GitHub Pages 已启用!" -ForegroundColor Green
} catch {
    Write-Host "   Pages可能已启用或正在处理中..." -ForegroundColor Yellow
}

# 5. 输出链接
$pagesUrl = "https://$username.github.io/$repoName/"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署完成!" -ForegroundColor Green
Write-Host "永久访问链接: $pagesUrl" -ForegroundColor Yellow
Write-Host "注意: 首次部署后需要等待1-2分钟才能访问" -ForegroundColor Yellow
Write-Host "仓库地址: https://github.com/$username/$repoName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
