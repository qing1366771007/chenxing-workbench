const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:/青的数据/青的obsidian/辰星工作台/';
const log = [];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900 });

  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });

  const audio = [];
  page.on('response', r => { if (r.url().indexOf('/audio/') >= 0) audio.push(r.status()); });
  let tts = 0;
  page.on('request', r => { if (r.url().indexOf('/api/tts') >= 0) tts++; });

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));
  log.push('load ok, errors=' + errs.length);

  // 洪恩
  await page.evaluate(() => { switchModule('hanzi'); hzHgEnter(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => { hzHgPick(5); });
  const t1 = Date.now();
  await page.evaluate(() => { hzHgSpeak(); });
  let ok1 = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 50));
    const st = await page.evaluate(() => { var a = window._cxAudEl; return a ? { p: a.paused, t: a.currentTime, s: a.src } : null; });
    if (st && !st.p && st.t > 0) { ok1 = true; break; }
  }
  log.push('hanzi speak: playing=' + ok1 + ' ' + (Date.now() - t1) + 'ms');

  // 古诗：打开第 1 首并朗读整首
  await page.evaluate(() => { switchModule('poem'); });
  await new Promise(r => setTimeout(r, 900));
  const poemInfo = await page.evaluate(() => {
    try { showPoem(0); return document.getElementById('poemTitle').textContent; } catch (e) { return 'ERR ' + e.message; }
  });
  await new Promise(r => setTimeout(r, 1500));
  log.push('poem opened: ' + poemInfo + ', audio reqs so far=' + audio.length);

  // 英语
  await page.evaluate(() => { switchModule('engsentence'); });
  await new Promise(r => setTimeout(r, 2500));
  log.push('engsentence opened, audio reqs=' + audio.length);

  log.push('audio 200s=' + audio.filter(x => x === 200).length + ' non200=' + audio.filter(x => x !== 200).length);
  log.push('tts fallbacks=' + tts);
  log.push('js errors: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'none'));

  await page.evaluate(() => { switchModule('hanzi'); });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + '洪恩识字-离线发音包.png' });
  await browser.close();
  fs.writeFileSync(OUT + '_t_local2.txt', log.join('\n'));
  console.log(log.join('\n'));
})().catch(e => {
  fs.writeFileSync(OUT + '_t_local2.txt', 'ERR ' + e.message + '\n' + log.join('\n'));
  console.log('ERR', e.message);
});
