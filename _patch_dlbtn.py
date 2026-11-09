# -*- coding: utf-8 -*-
"""在洪恩识字面板加「下载离线发音包」入口（只改第一套可见 DOM）"""
import shutil

P = r'E:\青的数据\青的obsidian\辰星工作台\server\index.html'
s = open(P, encoding='utf-8').read()

anchor = '''          <div class="hz-hg-stat">\u5df2\u8ba4\u8bc6 <b id="hzHgKnownCnt">0</b> / <span id="hzHgTotal">1300</span> \u4e2a\u5b57 \u00b7 <span id="hzHgGroupStat">\u672c\u7ec4 0/10</span></div>'''
assert s.count(anchor) == 2, s.count(anchor)

block = anchor + '''
          <div style="text-align:center;margin:-2px 0 10px;">
            <button id="cxDlAudioBtn" onclick="cxDownloadAllAudio()" style="border:none;background:#eef2ff;color:#6c5ce7;font-size:12px;font-weight:700;padding:6px 13px;border-radius:999px;box-shadow:0 2px 6px rgba(108,92,231,.14);cursor:pointer;">\U0001F4E5 \u4E0B\u8F7D\u79BB\u7EBF\u53D1\u97F3\u5305</button>
            <div id="cxDlAudioTip" style="font-size:11px;color:#b2bec3;margin-top:4px;">\u5DF2\u81EA\u52A8\u7F13\u5B58\u5F53\u524D\u7EC4\uFF1B\u70B9\u8FD9\u91CC\u628A 1300 \u4E2A\u5B57\u5168\u4E0B\u5230\u624B\u673A\uFF0C\u65AD\u7F51\u4E5F\u80FD\u8BFB</div>
          </div>'''

# 只替换第一处（可见那套 DOM）
i = s.find(anchor)
s = s[:i] + block + s[i + len(anchor):]

open(P, 'wb').write(s.encode('utf-8'))
shutil.copyfile(P, r'E:\青的数据\青的obsidian\辰星工作台\index.html')
print('ok bytes', len(s))
