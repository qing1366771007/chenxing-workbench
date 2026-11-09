# -*- coding: utf-8 -*-
"""古诗、英语模块进入时预热本地音频"""
import shutil

P = r'E:\青的数据\青的obsidian\辰星工作台\server\index.html'
s = open(P, encoding='utf-8').read()

anchor = 'function switchModule(module) {\n'
idx = s.rfind(anchor)
assert idx > 0

inject = '''function switchModule(module) {
  // \u8fdb\u6a21\u5757\u5148\u628a\u8981\u8bfb\u7684\u97f3\u9884\u70ed\u597d\uFF0C\u70b9\u4e86\u5c31\u54cd
  try {
    if (module === 'poem' && typeof poemsData !== 'undefined') {
      var _pt = [];
      poemsData.slice(0, 12).forEach(function (p) {
        _pt.push(p.title);
        _pt = _pt.concat(p.lines || []);
      });
      cxPreloadAudio(_pt, 'zh');
    } else if (module === 'engsentence' && typeof engSentenceData !== 'undefined') {
      var _en = [], _zh = [];
      for (var _k in engSentenceData) {
        (engSentenceData[_k] || []).forEach(function (it) {
          if (it && it.en) _en.push(it.en);
          if (it && it.zh) _zh.push(it.zh);
        });
      }
      cxPreloadAudio(_en, 'en');
      cxPreloadAudio(_zh, 'zh');
    }
  } catch (e) {}
'''
s = s[:idx] + inject + s[idx + len(anchor):]

open(P, 'wb').write(s.encode('utf-8'))
shutil.copyfile(P, r'E:\青的数据\青的obsidian\辰星工作台\index.html')
print('ok', len(s))
