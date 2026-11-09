# -*- coding: utf-8 -*-
import base64
import json
import os
import time
import urllib.request
import urllib.error

# ⚠️ 安全改动（2026-10-03）：Token 已从代码中移除
#    永远不要把 Token 写进文件里 —— 文件会被同步/备份/上传，Token 就跟着跑了
#    用法：先设环境变量，再运行本脚本
#        set GITHUB_TOKEN=你的token
#    新 Token 在 https://github.com/settings/tokens 生成（勾 repo 权限）
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
if not TOKEN:
    print("=" * 50)
    print("❌ 未检测到 GITHUB_TOKEN 环境变量")
    print("=" * 50)
    print()
    print("请先打开命令行执行：")
    print("    set GITHUB_TOKEN=你的token")
    print()
    print("Token 生成地址：https://github.com/settings/tokens")
    print("（勾选 repo 权限，生成后只显示一次，务必复制）")
    print()
    os.system("pause")
    exit(1)

BASE_DIR = r"E:\青的数据\青的obsidian\辰星工作台"
REPO_NAME = "chenxing-study"

def api(url, method="GET", data=None):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("=" * 50)
print("辰星工作台 - GitHub Pages 部署工具")
print("=" * 50)
print()

# 1. Get user
print("[1/5] 获取用户信息...")
status, user = api("https://api.github.com/user")
if status != 200:
    print(f"   失败: {user.get('message')}")
    print("   请检查 Token 是否正确")
    os.system("pause")
    exit(1)
username = user["login"]
print(f"   用户名: {username}")
print()

# 2. Create repo
print(f"[2/5] 创建仓库 {REPO_NAME}...")
status, repo = api(
    "https://api.github.com/user/repos",
    method="POST",
    data={"name": REPO_NAME, "description": "辰星工作台 - 儿童学习平台", "auto_init": True, "private": False}
)
if status == 201:
    print("   创建成功!")
elif status == 422:
    print("   仓库已存在，将更新文件...")
else:
    print(f"   失败 (状态码: {status}): {repo.get('message')}")
    os.system("pause")
    exit(1)
print()

# 3. Get default branch
status, repo_info = api(f"https://api.github.com/repos/{username}/{REPO_NAME}")
default_branch = repo_info.get("default_branch", "main")
print(f"   默认分支: {default_branch}")
print()

# 4. Upload files
print("[3/5] 开始上传文件...")
all_files = []
for root, dirs, files in os.walk(BASE_DIR):
    # Skip _backup folder
    if "_backup" in root:
        continue
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, BASE_DIR).replace("\\", "/")
        # Skip deploy scripts
        if rel in ("deploy-github.ps1", "一键部署.bat"):
            continue
        all_files.append((rel, full))

total = len(all_files)
print(f"   共 {total} 个文件待上传")
print()

success_count = 0
fail_count = 0
for i, (rel, full) in enumerate(all_files, 1):
    print(f"   [{i}/{total}] {rel} ... ", end="", flush=True)
    
    try:
        with open(full, "rb") as f:
            content = base64.b64encode(f.read()).decode("ascii")
    except Exception as e:
        print(f"读取失败 ({e})")
        fail_count += 1
        continue
    
    url = f"https://api.github.com/repos/{username}/{REPO_NAME}/contents/{rel}"
    status, existing = api(url)
    sha = existing.get("sha") if status == 200 else None
    
    body = {"message": f"deploy: {rel}", "content": content}
    if sha:
        body["sha"] = sha
    
    status, result = api(url, method="PUT", data=body)
    if status in (200, 201):
        print("OK")
        success_count += 1
    else:
        print(f"失败 ({status})")
        fail_count += 1
    
    time.sleep(0.2)

print()
print(f"   上传完成: 成功 {success_count} 个, 失败 {fail_count} 个")
print()

# 5. Enable GitHub Pages
print("[4/5] 启用 GitHub Pages...")
pages_url = f"https://api.github.com/repos/{username}/{REPO_NAME}/pages"
status, pages = api(pages_url, method="POST", data={"source": {"branch": default_branch, "path": "/"}})
if status == 201:
    print("   启用成功!")
elif status == 409:
    print("   已启用")
else:
    print(f"   状态码: {status}, {pages.get('message', '')}")
print()

# 6. Result
print("[5/5] 部署完成!")
print()
print("=" * 50)
print(f"🎉 永久链接: https://{username}.github.io/{REPO_NAME}/")
print(f"📦 仓库地址: https://github.com/{username}/{REPO_NAME}")
print()
print("注意: 首次部署后需要等待1-3分钟才能访问")
print("如果页面显示 404，稍等几分钟刷新即可")
print("=" * 50)
print()
os.system("pause")
