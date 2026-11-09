const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:/青的数据/青的obsidian/辰星工作台/';
const RES = OUT + '_t_local.txt';
const log = [];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900 });

  const audioReqs = [];
  page.on('response', r => {
    const u = r.url();
    if (u.indexOf('/audio/') >= 0) audioReqs.push(r.status() + ' ' + u.split('/audio/')[1]);
  });
  const ttsReqs = [];
  page.on('request', r => { if (r.url().indexOf('/api/tts') >= 0) ttsReqs.push(r.url()); });

  const t0 = Date.now();
  await page.goto('http://localhost:3007/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  log.push('page load ' + (Date.now() - t0) + 'ms');

  await page.evaluate(() => { switchModule('hanzi'); hzHgEnter(); });
  await new Promise(r => setTimeout(r, 1500));

  // 点第 1 个字
  await page.evaluate(() => { hzHgPick(0); });
  await new Promise(r => setTimeout(r, 300));

  // 调「读一读」
  const t1 = Date.now();
  await page.evaluate(() => { hzHgSpeak(); });

  // 等 audio 元素开始播
  let played = false, src = '', dur = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    const st = await page.evaluate(() => {
      var a = window._cxAudEl;
      if (!a) return null;
      return { src: a.src, paused: a.paused, t: a.currentTime, ready: a.readyState, dur: a.duration };
    });
    if (st && st.src) {
      src = st.src; dur = st.dur || 0;
      if (!st.paused && st.t > 0) { played = true; break; }
    }
  }
  log.push('first click -> playing=' + played + ' in ' + (Date.now() - t1) + 'ms');
  log.push('src=' + src + ' dur=' + dur);
  log.push('audio requests: ' + JSON.stringify(audioReqs.slice(0, 12)));
  log.push('tts fallback requests: ' + ttsReqs.length);

  // 预加载效果：切到下一组再切回，应该已有缓存
  await page.evaluate(() => { hzHgNext(); });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => { hzHgPrev(); });
  await new Promise(r => setTimeout(r, 500));
  log.push('total audio requests after group nav: ' + audioReqs.length);

  // 再看下载按钮存在
  const btn = await page.evaluate(() => {
    var b = document.getElementById('cxDlAudioBtn');
    return b ? b.textContent.trim() : 'MISSING';
  });
  log.push('download btn: ' + btn);

  await page.screenshot({ path: OUT + '_t_local.png' });
  await browser.close();
  fs.writeFileSync(RES, log.join('\n'));
  console.log(log.join('\n'));
})().catch(e => {
  fs.writeFileSync(RES, 'ERR ' + e.message + '\n' + log.join('\n'));
  console.log('ERR', e.message);
});
