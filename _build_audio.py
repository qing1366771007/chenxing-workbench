# -*- coding: utf-8 -*-
"""批量把朗读文本生成 mp3 存到 server/audio/，文件名 = fnv1a64(text) 的 base36"""
import os, json, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

WD = r'E:\青的数据\青的obsidian\辰星工作台'
AUD = os.path.join(WD, 'server', 'audio')
os.makedirs(os.path.join(AUD, 'zh'), exist_ok=True)
os.makedirs(os.path.join(AUD, 'en'), exist_ok=True)

MASK = (1 << 64) - 1


def fnv1a64(t):
    h = 0xcbf29ce484222325
    for ch in t.encode('utf-8'):
        h ^= ch
        h = (h * 0x100000001b3) & MASK
    return h


def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    out = ''
    while n:
        out = d[n % 36] + out
        n //= 36
    return out


def key(t):
    return b36(fnv1a64(t.strip()))


op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
urllib.request.install_opener(op)

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')


def fetch(text, lan):
    spd = '3'
    url = 'https://fanyi.baidu.com/gettts?lan=%s&text=%s&spd=%s&source=web' % (
        lan, urllib.parse.quote(text), spd)
    req = urllib.request.Request(url, headers={'Referer': 'https://fanyi.baidu.com/', 'User-Agent': UA})
    for attempt in range(3):
        try:
            d = urllib.request.urlopen(req, timeout=25).read()
            if len(d) > 1500 and d[:2] in (b'\xff\xf3', b'\xff\xfb', b'ID'):
                return d
            time.sleep(0.6)
        except Exception:
            time.sleep(0.8)
    return None


texts = json.load(open(os.path.join(WD, '_audio_texts.json'), encoding='utf-8'))
jobs = []
for lan in ('zh', 'en'):
    seen = {}
    for t in texts[lan]:
        t = t.strip()
        if not t or len(t) > 60:
            continue
        k = key(t)
        if k in seen:
            print('HASH COLLISION', repr(t), repr(seen[k]))
            continue
        seen[k] = t
        fp = os.path.join(AUD, lan, k + '.mp3')
        if os.path.exists(fp) and os.path.getsize(fp) > 1500:
            continue
        jobs.append((t, lan, fp))

print('待生成', len(jobs), flush=True)

done = [0]
fail = []


def work(job):
    t, lan, fp = job
    d = fetch(t, lan)
    if d:
        tmp = fp + '.part'
        open(tmp, 'wb').write(d)
        os.replace(tmp, fp)
        done[0] += 1
        if done[0] % 100 == 0:
            print('progress', done[0], flush=True)
        return True
    fail.append(t)
    return False


t0 = time.time()
with ThreadPoolExecutor(max_workers=6) as ex:
    futs = [ex.submit(work, j) for j in jobs]
    for f in as_completed(futs):
        pass

print('ok', done[0], 'fail', len(fail), '%.1fs' % (time.time() - t0), flush=True)
if fail:
    open(os.path.join(WD, '_audio_fail.txt'), 'w', encoding='utf-8').write('\n'.join(fail[:300]))
    print('failed sample', fail[:10], flush=True)
