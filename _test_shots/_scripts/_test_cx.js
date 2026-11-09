const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:\\青的数据\\青的obsidian\\辰星工作台\\_test_shots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const URL = process.argv[2] || 'http://127.0.0.1:8811/index.html';
const TAG = process.argv[3] || 'local';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise(r => setTimeout(r, 3500));

  const report = { tag: TAG, url: URL, steps: [] };
  const push = (k, v) => { report.steps.push([k, v]); };

  // 首页状态 / 是否有遮罩
  push('title', await page.title());
  push('bodyClass', await page.evaluate(() => document.body.className));
  push('visibleScreens', await page.evaluate(() => Array.from(document.querySelectorAll('.module-screen.active, .screen.active')).map(e => e.id)));
  await page.screenshot({ path: `${OUT}/${TAG}_00_home.png` });

  // 关掉可能存在的登录/引导遮罩
  await page.evaluate(() => {
    ['loginScreen', 'loginOverlay', 'authGate', 'welcomeScreen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });

  // ---- 进入汉字模块 ----
  await page.evaluate(() => switchModule('hanzi'));
  await new Promise(r => setTimeout(r, 800));
  push('hz_active', await page.evaluate(() => {
    const el = document.getElementById('module-hanzi');
    return el ? el.classList.contains('active') : 'no-el';
  }));
  push('tabs', await page.evaluate(() => Array.from(document.querySelectorAll('#hzTabs .tab-item')).map(t => t.textContent)));
  push('origCards', await page.evaluate(() => document.querySelectorAll('#hzGrid .hz-card').length));
  await page.screenshot({ path: `${OUT}/${TAG}_01_hanzi_orig.png` });

  // 原有分类点一个字，确认详情/朗读没坏
  push('origClick', await page.evaluate(() => {
    const w = []; const _s = window.speak;
    window.speak = function (t, l) { w.push([t, l]); };
    const c = document.querySelector('#hzGrid .hz-card');
    if (c) c.click();
    window.speak = _s;
    return { spoke: w, char: (document.getElementById('hzDetailChar') || {}).textContent,
             shown: (document.getElementById('hzDetail') || { className: '' }).className };
  }));

  // ---- A. 洪恩1300字 ----
  push('hg_tab_click', await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#hzTabs .tab-item')).find(x => x.textContent.indexOf('洪恩') >= 0);
    if (!t) return 'tab-missing';
    t.click();
    return 'clicked';
  }));
  await new Promise(r => setTimeout(r, 600));

  push('hg_data', await page.evaluate(() => ({
    groups: typeof HONGEN_GROUPS !== 'undefined' ? HONGEN_GROUPS.length : 'undef',
    chars: typeof HONGEN_GROUPS !== 'undefined' ? HONGEN_GROUPS.join('').length : 0,
    nodeCardsTotal: document.querySelectorAll('.hz-hg-card').length,   // 两套 DOM 会各渲染一份
    panelVisible: (function(){ const p = document.getElementById('hzHgPanel'); return p ? getComputedStyle(p).display : 'no-panel'; })(),
    label: (document.getElementById('hzHgLabel') || {}).textContent,
    cards: document.querySelectorAll('#hzHgGrid .hz-hg-card').length,
    gridHidden: getComputedStyle(document.getElementById('hzGrid')).display,
    knownCnt: (document.getElementById('hzHgKnownCnt') || {}).textContent,
    groupStat: (document.getElementById('hzHgGroupStat') || {}).textContent
  })));
  await page.screenshot({ path: `${OUT}/${TAG}_02_hongen_group.png` });

  // 点第 3 个字
  push('hg_pick', await page.evaluate(() => {
    const w = []; const _s = window.speak;
    window.speak = function (t, l) { w.push([t, l]); };
    const cards = document.querySelectorAll('#hzHgGrid .hz-hg-card');
    if (!cards[2]) return 'no-card:' + cards.length;
    cards[2].click();
    window.speak = _s;
    return { spoke: w, big: (document.getElementById('hzHgBigChar') || {}).textContent,
             picked: document.querySelectorAll('#hzHgGrid .hz-hg-card.picked').length };
  }));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/${TAG}_03_hongen_pick.png` });

  // 标记认识
  push('hg_mark', await page.evaluate(() => {
    const before = JSON.parse(localStorage.getItem('cx_checkin') || '{}').hongen || 0;
    const btn = Array.from(document.querySelectorAll('.hz-hg-act.ok'))[0];
    if (!btn) return 'no-btn';
    btn.click();
    const d = JSON.parse(localStorage.getItem('cx_checkin') || '{}');
    return { hongenBefore: before, hongenAfter: d.hongen, knownLen: (d.hongenKnown || []).length,
             knownCntUI: (document.getElementById('hzHgKnownCnt') || {}).textContent };
  }));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/${TAG}_04_hongen_marked.png` });

  // 翻组：下一组 / 跳组
  push('hg_nav', await page.evaluate(() => {
    hzHgNext(); hzHgNext();
    const l1 = document.getElementById('hzHgLabel').textContent;
    const chars = Array.from(document.querySelectorAll('#hzHgGrid .hz-hg-ch')).map(e => e.textContent);
    hzHgJump.toString().length; // noop
    return { label: l1, chars };
  }));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: `${OUT}/${TAG}_05_hongen_group3.png` });

  // 打卡页进度跟着变
  push('checkin', await page.evaluate(() => {
    switchModule('checkin');
    return new Promise(res => setTimeout(() => {
      res({ hongenCount: (document.getElementById('hongenCount') || {}).textContent,
            goal: (document.getElementById('hongenGoal') || {}).textContent,
            barWidth: (document.getElementById('hongenBar') || { style: {} }).style.width });
    }, 700));
  }));
  await page.screenshot({ path: `${OUT}/${TAG}_06_checkin.png` });

  // ---- B. 百家姓 ----
  await page.evaluate(() => switchModule('surnames'));
  await new Promise(r => setTimeout(r, 900));
  push('surname', await page.evaluate(() => {
    const rows = document.querySelectorAll('#surnameList .surname-row');
    const py = document.querySelectorAll('#surnameList .surname-pinyin');
    const r0 = rows[0];
    return {
      rows: rows.length,
      pinyinNodes: py.length,
      firstRowText: r0 ? r0.textContent.replace(/\s+/g, '|') : 'none',
      firstRowHTML: r0 ? r0.innerHTML.replace(/\s+/g, ' ').slice(0, 160) : '',
      rowH: r0 ? Math.round(r0.getBoundingClientRect().height) : 0,
      charsFont: r0 ? getComputedStyle(r0.querySelector('.surname-chars')).fontSize : ''
    };
  }));
  await page.screenshot({ path: `${OUT}/${TAG}_07_surname.png` });

  // 音频入口还在（点一行仍会朗读）
  push('surname_speak', await page.evaluate(() => {
    const w = []; const _s = window.speak;
    window.speak = function (t, l) { w.push([t, l]); };
    try { document.querySelectorAll('#surnameList .surname-row')[1].click(); } catch(e) { return 'no-row:' + document.querySelectorAll('#surnameList .surname-row').length; }
    window.speak = _s;
    return w;
  }));

  // ---- 其它模块不炸 ----
  push('other_modules', await page.evaluate(() => {
    const ids = ['english', 'pinyin', 'math', 'think', 'poem', 'body', 'checkin', 'hanzi'];
    const out = {};
    ids.forEach(id => {
      try { switchModule(id); const el = document.getElementById('module-' + id);
        out[id] = el ? el.classList.contains('active') : 'no-el';
      } catch (e) { out[id] = 'ERR ' + e.message; }
    });
    return out;
  }));
  await new Promise(r => setTimeout(r, 500));
  // 触发 resize（skill 提到的裸引用坑）
  await page.setViewport({ width: 380, height: 820, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 500));
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 500));

  report.errors = errs.slice(0, 30);
  report.errorCount = errs.length;
  fs.writeFileSync(`${OUT}/${TAG}_report.json`, JSON.stringify(report, null, 2));
  report.steps.forEach(x => console.log('>> ' + x[0] + ': ' + JSON.stringify(x[1])));
  console.log('ERRORS', report.errorCount, JSON.stringify(report.errors.slice(0,10)));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
