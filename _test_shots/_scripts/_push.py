import subprocess, os, json
env = {k: v for k, v in os.environ.items()
       if k.upper() not in ('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','FTP_PROXY','NO_PROXY')}
env['GIT_TERMINAL_PROMPT'] = '0'
cwd = r"E:\青的数据\青的obsidian\辰星工作台"
def run(args, timeout=180):
    p = subprocess.run(args, cwd=cwd, env=env, capture_output=True, timeout=timeout)
    return p.returncode, (p.stdout or b'').decode('utf-8', 'ignore'), (p.stderr or b'').decode('utf-8', 'ignore')
out = []
rc, o, e = run(["git","add","server/index.html","index.html","辰星工作台.html"])
out.append(("add", rc, o, e))
msg = "汉字新增📚洪恩1300字分类(130组/可标认识·不认识·同步打卡) + 百家姓去掉拼音"
rc, o, e = run(["git","commit","-m",msg])
out.append(("commit", rc, o, e))
rc, o, e = run(["git","rev-parse","--short","HEAD"])
out.append(("head", rc, o.strip(), e))
rc, o, e = run(["git","push","origin","HEAD:main"], timeout=240)
out.append(("push", rc, o, e))
rc, o, e = run(["git","log","--oneline","-2"])
out.append(("log", rc, o, e))
res = "\n\n".join("### %s (rc=%s)\n%s\n%s" % (k, rc, str(o)[-1500:], str(e)[-800:]) for k, rc, o, e in out)
open(os.path.join(cwd, "_push_result.txt"), "w", encoding="utf-8").write(res)
print(res)
