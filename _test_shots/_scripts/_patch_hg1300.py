# -*- coding: utf-8 -*-
"""辰星工作台：A. 导入洪恩1300字  B. 百家姓去拼音"""
import re, sys, io

FP = r"E:\青的数据\青的obsidian\辰星工作台\server\index.html"
MD = r"E:\青的数据\青的obsidian\辰星工作台\洪恩识字1300字.md"

raw = open(FP, "rb").read()
text = raw.decode("utf-8").replace("\r\n", "\n")
orig_len = len(text)

# ---------- 1. 解析字表 ----------
groups = []
for line in open(MD, encoding="utf-8").read().split("\n"):
    line = line.strip()
    if not line.startswith("|"):
        continue
    if set(line) <= set("|:- "):
        continue
    cells = [c.strip() for c in line.strip("|").split("|")]
    if len(cells) == 10 and all(c and not c.isdigit() for c in cells):
        groups.append(cells)
assert len(groups) == 130, "组数不对: %d" % len(groups)
assert all(len(g) == 10 for g in groups), "有组不是10字"
flat = "".join("".join(g) for g in groups)
assert len(flat) == 1300, "总字数不对: %d" % len(flat)
print("[1] 字表 OK：%d 组 / %d 字" % (len(groups), len(flat)))

G_LIT = ",\n  ".join('"%s"' % "".join(g) for g in groups)

# ---------- 2. 新的 initHanzi + 洪恩模块代码 ----------
NEW_JS = '''// ============================================================
// 📚 洪恩识字 1300 字（2026-11-09 新增，与原有 155 字分类并列）
// 130 组 × 10 字，顺序即洪恩教学顺序
// ============================================================
var HONGEN_GROUPS = [
  __GROUPS__
];
var HZ_HG_TAB = '📚 洪恩1300字';
var HZ_HG_TOTAL = 1300;
var _hzHgMode = false;
var _hzHgGroup = 0;
var _hzHgPickIdx = -1;
var _hzHgKnownMap = null;

function hzHgCharAt(gi) {
  var g = Math.floor(gi / 10), i = gi % 10;
  var s = HONGEN_GROUPS[g];
  return s ? s.charAt(i) : '';
}

// 已知字：优先读 cx_checkin.hongenKnown（下标数组）；
// 老数据只有 hongen=N → 按洪恩顺序把前 N 个当已认识，保证打卡页数字延续
function hzHgKnown() {
  if (_hzHgKnownMap) return _hzHgKnownMap;
  var d = {}, m = {};
  try { d = getCheckinData() || {}; } catch (e) { d = {}; }
  if (Array.isArray(d.hongenKnown)) {
    d.hongenKnown.forEach(function (i) { m[i] = 1; });
  } else {
    var n = Math.max(0, Math.min(HZ_HG_TOTAL, Number(d.hongen) || 0));
    for (var i = 0; i < n; i++) m[i] = 1;
  }
  _hzHgKnownMap = m;
  return m;
}

function hzHgCount() {
  var m = hzHgKnown(), c = 0;
  for (var k in m) { if (m[k]) c++; }
  return c;
}

function hzHgSave() {
  var m = hzHgKnown(), arr = [];
  for (var k in m) { if (m[k]) arr.push(Number(k)); }
  arr.sort(function (a, b) { return a - b; });
  var d = {}, today = getTodayStr();
  try { d = getCheckinData() || {}; } catch (e) { d = {}; }
  d.hongenKnown = arr;
  d.hongen = arr.length;
  if (!d[today]) d[today] = { habits: {}, hongen: arr.length };
  saveCheckinData(d);
  try { renderHongen(d); } catch (e) {}
}

function hzHgStat() {
  var t = document.getElementById('hzHgTotal');
  if (t) t.textContent = HZ_HG_TOTAL;
  var k = document.getElementById('hzHgKnownCnt');
  if (k) k.textContent = hz HgCount();
  var gs = document.getElementById('hzHgGroupStat');
  if (gs) {
    var m = hzHgKnown(), c = 0;
    for (var i = 0; i < 10; i++) { if (m[_hzHgGroup * 10 + i]) c++; }
    gs.textContent = '本组 ' + c + '/10';
  }
}

function hzHgRender() {
  var g = _hzHgGroup;
  var s = HONGEN_GROUPS[g] || '';
  var m = hzHgKnown();
  var lb = document.getElementById('hzHgLabel');
  if (lb) lb.textContent = '第 ' + (g + 1) + ' / ' + HONGEN_GROUPS.length + ' 组';
  var grid = document.getElementById('hzHgGrid');
  if (grid) {
    grid.innerHTML = '';
    for (var i = 0; i < s.length; i++) {
      var gi = g * 10 + i;
      var card = document.createElement('div');
      card.className = 'hz-hg-card' + (m[gi] ? ' known' : '') + (gi === _hzHgPickIdx ? ' picked' : '');
      card.innerHTML = '<span class="hz-hg-ch">' + s.charAt(i) + '</span>' +
        '<span class="hz-hg-badge' + (m[gi] ? '' : ' off') + '">' + (m[gi] ? '✓' : '?') + '</span>';
      (function (idx) { card.onclick = function () { hzHgPick(idx); }; })(gi);
      grid.appendChild(card);
    }
  }
  hzHgStat();
}

function hzHgPick(gi) {
  if (gi < 0 || gi >= HZ_HG_TOTAL) return;
  _hzHgPickIdx = gi;
  var ch = hzHgCharAt(gi);
  hzCurrentChar = { c: ch };          // 让旧的 speakHzCurrent() 也能读
  var big = document.getElementById('hzHgBigChar');
  if (big) big.textContent = ch;
  hzHgRender();
  speakZh(ch);
}

function hzHgSpeak() {
  if (_hzHgPickIdx < 0) { alert('先点一个字'); return; }
  speakZh(hzHgCharAt(_hzHgPickIdx));
}

function hzHgMark(known) {
  if (_hzHgPickIdx < 0) { alert('先点一个字，再标认识/不认识'); return; }
  var m = hzHgKnown();
  if (known) { m[_hzHgPickIdx] = 1; } else { delete m[_hzHgPickIdx]; }
  hzHgSave();
  hzHgRender();
  if (known) hzHgAdvance();
}

// 标「认识」后自动跳下一个字（跨组自动翻）
function hzHgAdvance() {
  var gi = _hzHgPickIdx + 1;
  if (gi >= HZ_HG_TOTAL) return;
  if (gi % 10 === 0) { _hzHgGroup = Math.floor(gi / 10); hzHgRender(); }
  setTimeout(function () { hzHgPick(gi); }, 280);
}

function hzHgPrev() {
  if (_hzHgGroup > 0) { _hzHgGroup--; hzHgRender(); }
}

function hzHgNext() {
  if (_hzHgGroup < HONGEN_GROUPS.length - 1) { _hzHgGroup++; hzHgRender(); }
}

function hzHgJump() {
  var v = prompt('跳到第几组？（1 - ' + HONGEN_GROUPS.length + '）', String(_hzHgGroup + 1));
  if (v === null) return;
  var n = parseInt(v, 10);
  if (isNaN(n)) return;
  n = Math.max(1, Math.min(HONGEN_GROUPS.length, n));
  _hzHgGroup = n - 1;
  hzHgRender();
}

function hzHgEnter() {
  _hzHgMode = true;
  _hzHgPickIdx = -1;
  var big = document.getElementById('hzHgBigChar');
  if (big) big.textContent = '—';
  // 自动定位到第一个还没认识的字所在组
  var m = hzHgKnown(), first = -1;
  for (var i = 0; i < HZ_HG_TOTAL; i++) { if (!m[i]) { first = i; break; } }
  _hzHgGroup = first >= 0 ? Math.floor(first / 10) : 0;
  initHanzi();
}

function initHanzi() {
  const tabs = document.getElementById('hzTabs');
  tabs.innerHTML = '';
  const th = document.createElement('div');
  th.className = 'tab-item hz-hg-tab' + (_hzHgMode ? ' active' : '');
  th.textContent = HZ_HG_TAB;
  th.onclick = () => { hzHgEnter(); };
  tabs.appendChild(th);
  Object.keys(hanzhiCategories).forEach(cat => {
    const t = document.createElement('div');
    t.className = 'tab-item' + (!_hzHgMode && cat === hzCurrentCat ? ' active' : '');
    t.textContent = cat;
    t.onclick = () => { _hzHgMode = false; hzCurrentCat = cat; initHanzi(); };
    tabs.appendChild(t);
  });
  const grid = document.getElementById('hzGrid');
  const panel = document.getElementById('hzHgPanel');
  if (_hzHgMode) {
    grid.style.display = 'none';
    grid.innerHTML = '';
    if (panel) panel.style.display = 'block';
    const det = document.getElementById('hzDetail');
    if (det) det.classList.remove('show');
    hzHgRender();
    return;
  }
  if (panel) panel.style.display = 'none';
  grid.style.display = '';
  grid.innerHTML = '';
  hanzhiCategories[hzCurrentCat].forEach(item => {
    const d = document.createElement('div');
    d.className = 'hz-card';
    if (hzCurrentChar && hzCurrentChar.c === item.c) d.classList.add('selected');
    d.innerHTML = `<div class="hz-char">${item.c}</div><div class="hz-pinyin">${item.p}</div>`;
    d.onclick = () => showHanzi(item);
    grid.appendChild(d);
  });
}
'''.replace("__GROUPS__", G_LIT)
NEW_JS = NEW_JS.replace("hz HgCount", "hzHgCount")

# ---------- 3. 替换 initHanzi（只在块2） ----------
s1 = text.find('<script type="text/legacy">')
s2 = text.find("<script>", s1 + 10)
assert s1 > 0 and s2 > s1
p = text.find("function initHanzi() {", s2)
assert p > 0, "块2 里找不到 initHanzi"
pend = text.find("function showHanzi(item) {", p)
assert pend > p
old_init = text[p:pend]
assert old_init.count("function initHanzi") == 1
text = text[:p] + NEW_JS + "\n" + text[pend:]
print("[2] initHanzi 已替换（块2），新增洪恩模块 %d 字符" % len(NEW_JS))

# ---------- 4. HTML：插入洪恩面板（两套 DOM 都插） ----------
PANEL = '''        <div class="hz-hg-panel" id="hzHgPanel" style="display:none;">
          <div class="hz-hg-nav">
            <button class="hz-hg-btn" onclick="hzHgPrev()">\u2039 上一组</button>
            <span class="hz-hg-label" id="hzHgLabel" onclick="hzHgJump()">第 1 / 130 组</span>
            <button class="hz-hg-btn" onclick="hzHgNext()">下一组 \u203a</button>
          </div>
          <div class="hz-hg-stat">已认识 <b id="hzHgKnownCnt">0</b> / <span id="hzHgTotal">1300</span> 个字 \u00b7 <span id="hzHgGroupStat">本组 0/10</span></div>
          <div class="hz-hg-grid" id="hzHgGrid"></div>
          <div class="hz-hg-big">
            <div class="hz-hg-bigchar" id="hzHgBigChar">\u2014</div>
            <div class="hz-hg-acts">
              <button class="hz-hg-act spk" onclick="hzHgSpeak()">\U0001F50A 读一读</button>
              <button class="hz-hg-act ok" onclick="hzHgMark(1)">\u2705 认识</button>
              <button class="hz-hg-act no" onclick="hzHgMark(0)">\u274C 不认识</button>
            </div>
          </div>
        </div>
'''
GRID_LINE = '<div class="card-grid-3" id="hzGrid"></div>'
cnt = text.count(GRID_LINE)
assert cnt == 2, "hzGrid 行数异常: %d" % cnt
text = text.replace(GRID_LINE, GRID_LINE + "\n" + PANEL.rstrip("\n"))
print("[3] 洪恩面板已插入 %d 处 DOM" % cnt)

# ---------- 5. CSS ----------
CSS = '''
/* ===== 📚 洪恩1300字 ===== */
.hz-hg-panel { margin-top:4px; }
.hz-hg-nav { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.hz-hg-btn { flex:0 0 auto; border:none; background:#fff; color:var(--star-purple,#8b5cf6); font-size:13px; font-weight:700; padding:8px 11px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,.06); cursor:pointer; }
.hz-hg-btn:active { transform:scale(.96); }
.hz-hg-label { flex:1; text-align:center; font-size:14px; font-weight:700; color:var(--text-dark,#333); cursor:pointer; }
.hz-hg-stat { text-align:center; font-size:13px; color:var(--text-light,#999); margin-bottom:10px; }
.hz-hg-stat b { color:var(--star-orange,#f39c12); font-size:17px; margin:0 1px; }
.hz-hg-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
.hz-hg-card { position:relative; display:flex; align-items:center; justify-content:center; padding:12px 0 10px; background:#fff; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,.06); cursor:pointer; border:2px solid transparent; transition:transform .12s; }
.hz-hg-card:active { transform:scale(.94); }
.hz-hg-card.known { background:linear-gradient(135deg,#eafff6,#c8f7e2); border-color:#2ecc71; }
.hz-hg-card.picked { border-color:var(--star-purple,#8b5cf6); box-shadow:0 0 0 3px rgba(139,92,246,.18); }
.hz-hg-ch { font-size:30px; font-weight:800; color:var(--text-dark,#333); line-height:1.1; }
.hz-hg-card.known .hz-hg-ch { color:#0f8a4d; }
.hz-hg-badge { position:absolute; top:1px; right:5px; font-size:11px; font-weight:800; color:#2ecc71; }
.hz-hg-badge.off { color:#e0e0e0; }
.hz-hg-big { margin-top:14px; background:#fff; border-radius:16px; padding:14px 14px 16px; box-shadow:0 4px 14px rgba(0,0,0,.07); text-align:center; }
.hz-hg-bigchar { font-size:76px; font-weight:800; color:var(--star-purple,#8b5cf6); line-height:1.05; }
.hz-hg-acts { display:flex; gap:8px; justify-content:center; margin-top:10px; }
.hz-hg-act { border:none; border-radius:10px; padding:10px 15px; font-size:14px; font-weight:700; color:#fff; cursor:pointer; }
.hz-hg-act:active { transform:scale(.96); }
.hz-hg-act.ok { background:linear-gradient(135deg,#55efc4,#00b894); }
.hz-hg-act.no { background:linear-gradient(135deg,#ffb3b3,#ff7675); }
.hz-hg-act.spk { background:linear-gradient(135deg,#74b9ff,#0984e3); }
@media (max-width:420px) {
  .hz-hg-ch { font-size:26px; }
  .hz-hg-bigchar { font-size:64px; }
  .hz-hg-act { padding:10px 12px; font-size:13px; }
}
'''
ANCHOR_CSS = '.hz-detail-row .value { color:var(--text-dark); }'
c = text.count(ANCHOR_CSS)
assert c >= 1, "CSS 锚点没找到"
text = text.replace(ANCHOR_CSS, ANCHOR_CSS + "\n" + CSS.strip("\n"))
print("[4] CSS 已插入 %d 处" % c)

# ---------- 6. 百家姓去拼音 ----------
OLD_SUR = """      '<div class="surname-chars">' +
        '<div>' + item.chars + '</div>' +
        '<div class="surname-pinyin">' + item.pinyin + '</div>' +
      '</div>' +"""
NEW_SUR = """      '<div class="surname-chars">' + item.chars + '</div>' +"""
n = text.count(OLD_SUR)
assert n == 2, "renderSurnames 拼音行命中数异常: %d" % n
text = text.replace(OLD_SUR, NEW_SUR)
print("[5] renderSurnames 去拼音 %d 处" % n)

# 行高/字号微调（两处 CSS 都改）
pairs = [
    ("  font-size:20px; font-weight:700; color:var(--text-dark); letter-spacing:4px;\n  flex:1; line-height:1.5;",
     "  font-size:24px; font-weight:700; color:var(--text-dark); letter-spacing:6px;\n  flex:1; line-height:1.2;"),
    ("  border-radius:12px; padding:14px 18px; box-shadow:0 2px 6px rgba(0,0,0,0.05);",
     "  border-radius:12px; padding:9px 18px; box-shadow:0 2px 6px rgba(0,0,0,0.05);"),
    ("  .surname-chars { font-size:18px; letter-spacing:3px; }\n  .surname-row { padding:12px 14px; }",
     "  .surname-chars { font-size:20px; letter-spacing:4px; }\n  .surname-row { padding:8px 14px; }"),
]
for o, nw in pairs:
    k = text.count(o)
    assert k == 2, "CSS 微调锚点命中数异常(%d): %s" % (k, o[:30])
    text = text.replace(o, nw)
print("[6] 百家姓行高/字号微调完成（2 处 CSS）")

# ---------- 7. 写回（强制 LF） ----------
text = text.replace("\r\n", "\n")
open(FP, "wb").write(text.encode("utf-8"))
print("[7] 写回 %s：%d -> %d 字节" % (FP, len(raw), len(text.encode("utf-8"))))
print("    校验: HONGEN_GROUPS=%d, surname-pinyin 残留(JS)=%d" % (
    text.count("HONGEN_GROUPS"), text.count('surname-pinyin">')))
