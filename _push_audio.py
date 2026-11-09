# -*- coding: utf-8 -*-
import subprocess, os, shutil, time

WD = r'E:\青的数据\青的obsidian\辰星工作台'
env = dict(os.environ)
for k in ('HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'):
    env.pop(k, None)
env['GIT_SSH_COMMAND'] = 'ssh -i E:/qing-ssh/id_ed25519 -o StrictHostKeyChecking=no'


def run(args, timeout=900):
    p = subprocess.run(args, cwd=WD, env=env, capture_output=True, text=True,
                       encoding='utf-8', errors='ignore', timeout=timeout)
    return (p.returncode, (p.stdout or '') + (p.stderr or ''))


out = []
rc, o = run(['git', 'add', '-A'])
out.append('add rc=%d %s' % (rc, o.strip()[:300]))
rc, o = run(['git', 'commit', '-m',
             '朗读音频全部本地化：2141 段预生成 mp3，点字 80ms 出声，未命中自动回退在线合成'])
out.append('commit rc=%d %s' % (rc, o.strip()[:500]))
rc, o = run(['git', 'push', 'origin', 'main'], timeout=1800)
out.append('push rc=%d %s' % (rc, o.strip()[:800]))
rc, o = run(['git', 'log', '--oneline', '-2'])
out.append('log: ' + o.strip())

open(os.path.join(WD, '_push_audio.txt'), 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
