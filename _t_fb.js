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
  let tts = [];
  page.on('request', r => { if (r.url().indexOf('/api/tts') >= 0) tts.push(decodeURIComponent(r.url()).slice(0, 90)); });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));

  await page.goto('http://localhost:3009/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 700));

  // 1) 命中本地
  await page.evaluate(() => { switchModule('hanzi'); hzHgEnter(); });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => { hzHgPick(2); });
  await page.evaluate(() => { hzHgSpeak(); });
  let hit = false, src = '';
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 50));
    const st = await page.evaluate(() => { var a = window._cxAudEl; return a ? { p: a.paused, t: a.currentTime, s: a.src } : null; });
    if (st && !st.p && st.t > 0) { hit = true; src = st.s; break; }
  }
  log.push('local hit: ' + hit + '  ' + src.split('/audio/')[1]);

  // 2) 未命中 → 回退在线
  tts = [];
  await page.evaluate(() => { speakZh('这句话肯定没有预生成过测试回退链路'); });
  await new Promise(r => setTimeout(r, 4000));
  log.push('fallback tts requests: ' + tts.length + '  ' + (tts[0] || ''));

  // 3) 收集器
  const miss = await page.evaluate(() => Object.keys(window._cxMissLog || {}).slice(0, 10));
  log.push('miss log: ' + JSON.stringify(miss));
  log.push('js errors: ' + (errs.length ? errs.join(' | ') : 'none'));

  await browser.close();
  fs.writeFileSync(OUT + '_t_fb.txt', log.join('\n'));
  console.log(log.join('\n'));
})().catch(e => { fs.writeFileSync(OUT + '_t_fb.txt', 'ERR ' + e.message + '\n' + log.join('\n')); console.log('ERR', e.message); });
