# -*- coding: utf-8 -*-
"""把「本地音频优先」注入 index.html（只改第二套 DOM 的脚本块）"""
import re, shutil, os

P = r'E:\青的数据\青的obsidian\辰星工作台\server\index.html'
s = open(P, encoding='utf-8').read()
orig_len = len(s)
log = []

LOCAL_MOD = '''// ============================================================
// \U0001F50A 本地预生成音频（2026-11-09）
// 常用朗读已提前生成 mp3 放在服务器 /audio 下，
// 文件名 = fnv1a64(文本) 的 36 进制。命中就直接播：零等待、断网也能读。
// 没命中的（临时拼的句子）自动回落到在线 TTS。
// ============================================================
var _cxAudEl = null;
var _cxPreLoaded = {};
var _cxPreEls = [];

function _cxFnv64(str) {
  try {
    if (typeof BigInt === 'undefined' || typeof TextEncoder === 'undefined') return null;
    var bytes = new TextEncoder().encode(str);
    var h = BigInt('0xcbf29ce484222325');
    var p = BigInt('0x100000001b3');
    var m = (BigInt(1) << BigInt(64)) - BigInt(1);
    for (var i = 0; i < bytes.length; i++) {
      h = h ^ BigInt(bytes[i]);
      h = (h * p) & m;
    }
    return h;
  } catch (e) { return null; }
}

function _cxB36(n) {
  var d = '0123456789abcdefghijklmnopqrstuvwxyz';
  if (typeof n === 'bigint') {
    if (n === BigInt(0)) return '0';
    var out = '', base = BigInt(36);
    while (n > BigInt(0)) { out = d[Number(n % base)] + out; n = n / base; }
    return out;
  }
  return String(n);
}

function cxLocalAudioUrl(text, lang) {
  if (!text) return '';
  var t = String(text).trim();
  if (!t || t.length > 60) return '';
  var h = _cxFnv64(t);
  if (h === null) return '';
  var sub = (lang && String(lang).indexOf('en') === 0) ? 'en' : 'zh';
  return '/audio/' + sub + '/' + _cxB36(h) + '.mp3';
}

// 命中本地就立刻播，播不了也不回退（避免同一句响两遍）
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
}

function cxPreloadAudio(list, lang) {
  if (!list || !list.length) return;
  for (var i = 0; i < list.length; i++) {
    var u = cxLocalAudioUrl(list[i], lang);
    if (!u || _cxPreLoaded[u]) continue;
    _cxPreLoaded[u] = 1;
    try { fetch(u, { cache: 'force-cache' }).catch(function () {}); } catch (e) {}
    try {
      var a = new Audio();
      a.preload = 'auto';
      a.src = u;
      _cxPreEls.push(a);
      if (_cxPreEls.length > 60) { try { var o = _cxPreEls.shift(); o.src = ''; } catch (e) {} }
    } catch (e) {}
  }
}

function cxPreloadGroup(g) {
  if (typeof HONGEN_GROUPS === 'undefined' || !HONGEN_GROUPS.length) return;
  var arr = [];
  for (var k = g - 1; k <= g + 1; k++) {
    var sg = HONGEN_GROUPS[k];
    if (!sg) continue;
    for (var i = 0; i < sg.length; i++) arr.push(sg.charAt(i));
  }
  cxPreloadAudio(arr, 'zh');
}

// 一键把 1300 个字全下到手机（断网也能读）
function cxDownloadAllAudio() {
  if (typeof HONGEN_GROUPS === 'undefined') return;
  var all = [];
  for (var g = 0; g < HONGEN_GROUPS.length; g++) {
    var sg = HONGEN_GROUPS[g];
    for (var i = 0; i < sg.length; i++) all.push(sg.charAt(i));
  }
  var btn = document.getElementById('cxDlAudioBtn');
  var tip = document.getElementById('cxDlAudioTip');
  var done = 0, ok = 0, idx = 0, total = all.length;
  if (btn) { btn.disabled = true; btn.textContent = '\u23F3 下载中 0 / ' + total; }
  function step() {
    if (idx >= total) {
      if (btn) { btn.disabled = false; btn.textContent = '\u2705 离线发音包已下好'; }
      if (tip) tip.textContent = '\u5DF2\u5B58\u5230\u624B\u673A\uFF08\u5171 ' + ok + ' \u4E2A\u97F3\uFF09\uFF0C\u4EE5\u540E\u65AD\u7F51\u4E5F\u80FD\u8BFB';
      return;
    }
    var u = cxLocalAudioUrl(all[idx], 'zh');
    idx++;
    done++;
    if (!u) { step(); return; }
    fetch(u, { cache: 'force-cache' }).then(function (r) {
      if (r && r.ok) ok++;
    }).catch(function () {}).then(function () {
      if (btn) btn.textContent = '\u23F3 \u4E0B\u8F7D\u4E2D ' + done + ' / ' + total;
      if (done % 8 === 0) setTimeout(step, 0); else step();
    });
  }
  step();
}

'''

# ---------- 1) 在第二处 speak 前插入模块 ----------
marker = '// \u767e\u5EA6\u7FFB\u8BD1TTS\u8BED\u97F3\u5408\u6210 - \u5F39\u51FA\u53EF\u89C1\u64AD\u653E\u5668'
idxs = [m.start() for m in re.finditer(re.escape(marker), s)]
assert len(idxs) == 2, idxs
ins = idxs[1]
s = s[:ins] + LOCAL_MOD + s[ins:]
log.append('模块已插入 @%d' % ins)

# ---------- 2) speak / speakSlow 本地优先 ----------
old_speak = """  if (text.length > 200) text = text.substring(0, 200);

  // \u5728 Android App \u91CC\uFF0C\u4E2D\u6587\u7528\u539F\u751FTTS\uFF0C\u82F1\u8BED\u7528\u670D\u52A1\u5668\u4EE3\u7406"""
new_speak = """  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u9884\u751F\u6210\u97F3\u9891\uFF1A\u547D\u4E2D\u5C31\u76F4\u63A5\u54CD\uFF0C\u4E0D\u7B49\u7F51\u7EDC
  var _locU = cxLocalAudioUrl(text, lang);
  if (_locU && cxPlayLocal(_locU)) return;

  // \u2461 \u5728 Android App \u91CC\uFF0C\u4E2D\u6587\u7528\u539F\u751FTTS\uFF0C\u82F1\u8BED\u7528\u670D\u52A1\u5668\u4EE3\u7406"""
cnt = s.count(old_speak)
assert cnt == 1, ('speak anchor', cnt)
s = s.replace(old_speak, new_speak)
log.append('speak 已改成本地优先')

old_slow = """  if (text.length > 200) text = text.substring(0, 200);

  // \u65B0\u7248 APK \u6709\u539F\u751F\u6162\u901F\u63A5\u53E3"""
new_slow = """  if (text.length > 200) text = text.substring(0, 200);

  // \u2460 \u672C\u5730\u97F3\u9891\u4F18\u5148\uFF08\u964D\u901F 0.85 \u500D\uFF09
  var _locU2 = cxLocalAudioUrl(text, lang);
  if (_locU2 && cxPlayLocal(_locU2, 0.85)) return;

  // \u65B0\u7248 APK \u6709\u539F\u751F\u6162\u901F\u63A5\u53E3"""
cnt2 = s.count(old_slow)
assert cnt2 == 1, ('speakSlow anchor', cnt2)
s = s.replace(old_slow, new_slow)
log.append('speakSlow 已改成本地优先')

# ---------- 3) hzHgRender 末尾预热当前组 ----------
old_r = """  hzHgStat();
  hzAsrBindHold();
}

function hzHgPick(gi) {"""
new_r = """  hzHgStat();
  hzAsrBindHold();
  cxPreloadGroup(g);   // \u9884\u70ED\u5F53\u524D\u7EC4\u4E0A\u4E0B 30 \u4E2A\u5B57\uFF0C\u70B9\u4E86\u96F6\u7B49\u5F85
}

function hzHgPick(gi) {"""
cnt3 = s.count(old_r)
assert cnt3 == 1, ('hzHgRender', cnt3)
s = s.replace(old_r, new_r)
log.append('hzHgRender 已加预热')

open(P, 'wb').write(s.encode('utf-8'))
shutil.copyfile(P, r'E:\青的数据\青的obsidian\辰星工作台\index.html')
log.append('bytes %d -> %d' % (orig_len, len(s)))
open(r'E:\青的数据\青的obsidian\辰星工作台\_local_audio_result.txt', 'w', encoding='utf-8').write('\n'.join(log))
print('\n'.join(log))
