const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:\\青的数据\\青的obsidian\\辰星工作台\\_test_shots';
const URL = process.argv[2] || 'http://127.0.0.1:8812/index.html';
const TAG = process.argv[3] || 'eng_local';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const tts = [];
  page.on('request', r => { const u = r.url(); if (u.indexOf('/api/tts') >= 0) tts.push(decodeURIComponent(u)); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise(r => setTimeout(r, 3500));

  const out = {};
  out.cats = await page.evaluate(() => Object.keys(engSentenceData));
  out.counts = await page.evaluate(() => {
    const o = {};
    Object.keys(engSentenceData).forEach(k => o[k] = engSentenceData[k].length);
    return o;
  });

  await page.evaluate(() => switchModule('engsentence'));
  await new Promise(r => setTimeout(r, 900));
  out.popupTabs = await page.evaluate(() => Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn')).map(b => b.textContent));

  // 点「句子·生活用语」
  out.click = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn')).find(x => x.textContent.indexOf('生活用语') >= 0);
    if (!b) return 'btn-missing';
    b.click();
    return 'clicked';
  });
  await new Promise(r => setTimeout(r, 700));

  out.list = await page.evaluate(() => {
    const cards = document.querySelectorAll('#engSentList .eng-sent-card, #engSentList .eng-word-card, #engSentList > div');
    const first = cards[0];
    return {
      cardCount: cards.length,
      firstHTML: first ? first.innerHTML.replace(/\s+/g, ' ').slice(0, 240) : 'none',
      texts: Array.from(document.querySelectorAll('#engSentList > *')).slice(0, 3).map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      firstRect: first ? { w: Math.round(first.getBoundingClientRect().width), h: Math.round(first.getBoundingClientRect().height) } : null,
      bodyScrollW: document.body.scrollWidth,
      innerW: window.innerWidth
    };
  });
  await page.screenshot({ path: `${OUT}/${TAG}_01_life_sent.png` });

  // A. 真点第 1 张卡 → 应真的发出 TTS 请求（朗读证据）
  out.tapReal = await page.evaluate(() => {
    const c = document.querySelector('#engSentList > *');
    const txt = c ? c.textContent.replace(/\s+/g, ' ').trim() : '';
    if (c) c.click();
    return txt;
  });
  await new Promise(r => setTimeout(r, 2000));
  out.ttsCalls = tts.slice(-4);
  // B. 再拦截一次，确认点第 2 张卡传的 en/zh 正确
  out.tapHook = await page.evaluate(() => {
    const w = []; const _f = window.speakEnWithZh;
    window.speakEnWithZh = function (en, zh) { w.push([en, zh]); };
    const cards = document.querySelectorAll('#engSentList > *');
    if (cards[1]) cards[1].click();
    window.speakEnWithZh = _f;
    return w;
  });
  await page.screenshot({ path: `${OUT}/${TAG}_02_life_sent_tap.png` });

  // 回到别的分类，确认原有分类没坏
  out.otherCat = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn')).find(x => x.textContent.indexOf('问候') >= 0);
    if (!b) return 'missing';
    b.click();
    return document.querySelectorAll('#engSentList > *').length;
  });
  await new Promise(r => setTimeout(r, 400));

  // 单词模块 / 其它模块不炸
  out.modules = await page.evaluate(() => {
    const ids = ['engsentence', 'english', 'hanzi', 'surnames', 'checkin', 'poem'];
    const o = {};
    ids.forEach(id => { try { switchModule(id); const el = document.getElementById('module-' + id); o[id] = el ? el.classList.contains('active') : 'no-el'; } catch (e) { o[id] = 'ERR ' + e.message; } });
    return o;
  });
  out.errors = errs.slice(0, 10);
  fs.writeFileSync(`${OUT}/${TAG}_report.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
