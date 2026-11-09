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
msg = "英语句子新增「句子·生活用语」19句：开灯/关灯/开窗/关窗/开门/关门/风扇/电视/空调/水龙头等"
out.append(("commit", *run(["git", "commit", "-m", msg])))
out.append(("head", *run(["git", "rev-parse", "--short", "HEAD"])))
out.append(("push", *run(["git", "push", "origin", "HEAD:main"])))
out.append(("log", *run(["git", "log", "--oneline", "-2"])))
res = "\n\n".join("### %s (rc=%s)\n%s\n%s" % (k, rc, str(o)[-1200:], str(e)[-600:]) for k, rc, o, e in out)
open(os.path.join(cwd, "_push_result2.txt"), "w", encoding="utf-8").write(res)
print(res)
