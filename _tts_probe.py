# -*- coding: utf-8 -*-
"""探测百度翻译 TTS 返回的 mp3 体积与耗时，评估本地化可行性"""
import urllib.request, urllib.parse, time, os

def get(text, spd='3', lan='zh'):
    url = 'https://fanyi.baidu.com/gettts?lan=%s&text=%s&spd=%s&source=web' % (
        lan, urllib.parse.quote(text), spd)
    req = urllib.request.Request(url, headers={
        'Referer': 'https://fanyi.baidu.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    t0 = time.time()
    d = urllib.request.urlopen(req, timeout=20).read()
    return d, time.time() - t0

op = urllib.request.build_opener(urllib.request.ProxyHandler({}))
urllib.request.install_opener(op)

out = []
for t in ['一', '三', '鹅', '妈妈', '床前明月光']:
    try:
        d, dt = get(t)
        out.append('%s  %d bytes  %.2fs  head=%r' % (t, len(d), dt, d[:4]))
    except Exception as e:
        out.append('%s  ERR %s' % (t, e))

# 英文
try:
    d, dt = get('I want to eat an apple.', '3', 'en')
    out.append('EN  %d bytes %.2fs' % (len(d), dt))
except Exception as e:
    out.append('EN ERR %s' % e)

open(os.path.join(os.path.dirname(__file__), '_tts_probe.txt'), 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
