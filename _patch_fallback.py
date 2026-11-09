# -*- coding: utf-8 -*-
"""修：本地音频 404/播放失败时自动回退到在线 TTS；并加未命中文本收集器"""
import shutil

P = r'E:\青的数据\青的obsidian\辰星工作台\server\index.html'
s = open(P, encoding='utf-8').read()
log = []

# ---------- 1) cxPlayLocal 支持失败回调 ----------
old = """// \u547D\u4E2D\u672C\u5730\u5C31\u7ACB\u523B\u64AD\uFF0C\u64AD\u4E0D\u4E86\u4E5F\u4E0D\u56DE\u9000\uFF08\u907F\u514D\u540C\u4E00\u53E5\u54CD\u4E24\u904D\uFF09
function cxPlayLocal(url, rate) {
  try {
    if (!_cxAudEl) { _cxAudEl = new Audio(); }
    var a = _cxAudEl;
    try { a.pause(); } catch (e) {}
    a.src = url;
    a.playbackRate = rate || 1;
    a.volume = 1;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    return true;
  } catch (e) { return false; }
}"""
new = """// \u547D\u4E2D\u672C\u5730\u5C31\u7ACB\u523B\u64AD\uFF1B\u6CA1\u8FD9\u4E2A\u6587\u4EF6\uFF0804\uFF09\u6216\u64AD\u4E0D\u4E86\uFF0C\u81EA\u52A8\u56DE\u9000 onFail
function cxPlayLocal(url, rate, onFail) {
  try {
    if (!_cxAudEl) { _cxAudEl = new Audio(); }
    var a = _cxAudEl;
    var _fail = onFail || null;
    function _doFail() {
      if (!_fail) return;
      var f = _fail; _fail = null;
      try { f(); } catch (e) {}
    }
    try { a.onerror = null; a.pause(); } catch (e) {}
    a.onerror = _doFail;
    a.onplaying = function () { _fail = null; };
    a.src = url;
    a.playbackRate = rate || 1;
    a.volume = 1;
    var p = a.play();
    if (p && p.catch) p.catch(function () { _doFail(); });
    return true;
  } catch (e) { return false; }
}

// \u6536\u96C6\u672C\u5730\u6CA1\u6709\u7684\u6587\u672C\uFF08\u4F9B\u540E\u53F0\u8865\u751F\u6210\uFF09
var _cxMissLog = {};
function _cxLogMiss(t, lang) {
  if (!t) return;
  _cxMissLog[(lang.indexOf('en') === 0 ? 'en|' : 'zh|') + t] = 1;
}"""
assert s.count(old) == 1, ('cxPlayLocal', s.count(old))
s = s.replace(old, new)
log.append('cxPlayLocal 已加回退')

# ---------- 2) speak 拆成 speak + _cxSpeakImpl ----------
old_head = """function speak(text, lang) {
  if (!text) return;

  // \u6E05\u7406\u6587\u672C
  text = String(text).trim();
  if (!text) return;
  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u9884\u751F\u6210\u97F3\u9891\uFF1A\u547D\u4E2D\u5C31\u76F4\u63A5\u54CD\uFF0C\u4E0D\u7B49\u7F51\u7EDC
  var _locU = cxLocalAudioUrl(text, lang);
  if (_locU && cxPlayLocal(_locU)) return;
"""
new_head = """function speak(text, lang) {
  _cxSpeakImpl(text, lang, false, 1);
}

function _cxSpeakImpl(text, lang, _skipLocal, _rate) {
  if (!text) return;

  // \u6E05\u7406\u6587\u672C
  text = String(text).trim();
  if (!text) return;
  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u9884\u751F\u6210\u97F3\u9891\uFF1A\u547D\u4E2D\u5C31\u76F4\u63A5\u54CD\uFF0C\u4E0D\u7B49\u7F51\u7EDC
  if (!_skipLocal) {
    var _locU = cxLocalAudioUrl(text, lang);
    if (_locU) {
      var _hit = cxPlayLocal(_locU, _rate || 1, function () {
        _cxSpeakImpl(text, lang, true, _rate);   // \u6CA1\u8FD9\u4E2A\u6587\u4EF6 \u2192 \u56DE\u9000\u5728\u7EBF\u5408\u6210
      });
      if (_hit) return;
      _cxLogMiss(text, lang);
    } else {
      _cxLogMiss(text, lang);
    }
  }
"""
assert s.count(old_head) == 1, ('speak head', s.count(old_head))
s = s.replace(old_head, new_head)
log.append('speak 已加回退')

# ---------- 3) speakSlow 同理 ----------
old_slow = """function speakSlow(text, lang) {
  if (!text) return;
  text = String(text).trim();
  if (!text) return;
  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u97F3\u9891\u4F18\u5148\uFF08\u964D\u901F 0.85 \u500D\uFF09
  var _locU2 = cxLocalAudioUrl(text, lang);
  if (_locU2 && cxPlayLocal(_locU2, 0.85)) return;
"""
new_slow = """function speakSlow(text, lang) {
  _cxSpeakSlowImpl(text, lang, false);
}

function _cxSpeakSlowImpl(text, lang, _skipLocal) {
  if (!text) return;
  text = String(text).trim();
  if (!text) return;
  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u97F3\u9891\u4F18\u5148\uFF08\u964D\u901F 0.85 \u500D\uFF09
  if (!_skipLocal) {
    var _locU2 = cxLocalAudioUrl(text, lang);
    if (_locU2) {
      var _hit2 = cxPlayLocal(_locU2, 0.85, function () {
        _cxSpeakSlowImpl(text, lang, true);
      });
      if (_hit2) return;
      _cxLogMiss(text, lang);
    } else {
      _cxLogMiss(text, lang);
    }
  }
"""
assert s.count(old_slow) == 1, ('speakSlow', s.count(old_slow))
s = s.replace(old_slow, new_slow)
log.append('speakSlow 已加回退')

# ---------- 4) 暴露收集器 ----------
s = s.replace("var _cxMissLog = {};", "var _cxMissLog = {};\nwindow._cxMissLog = _cxMissLog;", 1)

open(P, 'wb').write(s.encode('utf-8'))
shutil.copyfile(P, r'E:\青的数据\青的obsidian\辰星工作台\index.html')
log.append('bytes %d' % len(s))
out = '\n'.join(log)
open(r'E:\青的数据\青的obsidian\辰星工作台\_fix_fallback.txt', 'w', encoding='utf-8').write(out)
print(out)
