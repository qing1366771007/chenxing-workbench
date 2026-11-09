const puppeteer = require('puppeteer-core');
const OUT = 'E:\\青的数据\\青的obsidian\\辰星工作台\\_test_shots';
const URL = process.argv[2] || 'http://127.0.0.1:8813/index.html';
const TAG = process.argv[3] || 'lifeact_local';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  await sleep(3500);

  const out = {};
  out.cats = await page.evaluate(() => Object.keys(engSentenceData));
  out.counts = await page.evaluate(() => {
    const o = {}; Object.keys(engSentenceData).forEach(k => o[k] = engSentenceData[k].length); return o;
  });
  out.newItems = await page.evaluate(() => (engSentenceData['句子·生活动作'] || []).map(x => x.en + ' | ' + x.zh));

  await page.evaluate(() => switchModule('engsentence'));
  await sleep(900);
  out.tabs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn')).map(b => b.textContent.trim()));

  out.clickNew = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn'))
      .find(x => x.textContent.indexOf('生活动作') >= 0);
    if (!b) return 'btn-missing';
    b.click(); return 'clicked';
  });
  await sleep(800);

  out.list = await page.evaluate(() => {
    const cards = document.querySelectorAll('#engSentList > *');
    const first = cards[0];
    const r = first ? first.getBoundingClientRect() : null;
    return {
      cardCount: cards.length,
      texts: Array.from(cards).slice(0, 4).map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      firstCard: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      innerW: window.innerWidth,
      bodyScrollW: document.body.scrollWidth,
      overflow: document.body.scrollWidth > window.innerWidth
    };
  });
  await page.screenshot({ path: `${OUT}/${TAG}_01_tab.png` });

  // 真点第一张卡 → 抓 TTS 请求
  tts.length = 0;
  await page.evaluate(() => { const c = document.querySelector('#engSentList > *'); if (c) c.click(); });
  await sleep(2000);
  out.ttsAfterTap = tts.slice(0, 4);
  await page.screenshot({ path: `${OUT}/${TAG}_02_tap.png` });

  // 滚到底，看最后几条
  await page.evaluate(() => { const l = document.getElementById('engSentList'); if (l) l.scrollTop = l.scrollHeight; });
  await sleep(500);
  await page.screenshot({ path: `${OUT}/${TAG}_03_bottom.png` });
  out.lastCards = await page.evaluate(() => {
    const cards = document.querySelectorAll('#engSentList > *');
    return Array.from(cards).slice(-3).map(e => e.textContent.replace(/\s+/g, ' ').trim());
  });

  // 回切老分类，确认没坏
  out.backOld = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn'))
      .find(x => x.textContent.indexOf('家庭日常') >= 0);
    if (!b) return 'btn-missing';
    b.click();
    return document.querySelectorAll('#engSentList > *').length;
  });
  await sleep(600);
  await page.screenshot({ path: `${OUT}/${TAG}_04_old_cat.png` });

  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
