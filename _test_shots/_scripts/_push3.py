# -*- coding: utf-8 -*-
import subprocess, os
env = {k: v for k, v in os.environ.items()
       if k.upper() not in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'FTP_PROXY', 'NO_PROXY')}
env['GIT_TERMINAL_PROMPT'] = '0'
cwd = r"E:\青的数据\青的obsidian\辰星工作台"

def run(args, timeout=240):
    p = subprocess.run(args, cwd=cwd, env=env, capture_output=True, timeout=timeout)
    return p.returncode, (p.stdout or b'').decode('utf-8', 'ignore'), (p.stderr or b'').decode('utf-8', 'ignore')

out = []
out.append(("add", *run(["git", "add", "server/index.html", "index.html", "辰星工作台.html"])))
msg = ("英语句子新增「句子·生活动作」17句：洗手/刷牙/洗脸/梳头/穿衣脱衣/穿袜/系鞋带/拉拉链/戴帽/收拾玩具；"
       "卡片统一最小高度")
out.append(("commit", *run(["git", "commit", "-m", msg])))
out.append(("head", *run(["git", "rev-parse", "--short", "HEAD"])))
out.append(("push", *run(["git", "push", "origin", "HEAD:main"])))
out.append(("log", *run(["git", "log", "--oneline", "-2"])))
res = "\n\n".join("### %s (rc=%s)\n%s\n%s" % (k, rc, str(o)[-1200:], str(e)[-600:]) for k, rc, o, e in out)
open(os.path.join(cwd, "_push_result3.txt"), "w", encoding="utf-8").write(res)
print(res)
