const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio']
  });
  const p = await b.newPage();
  await p.setViewport({ width: 420, height: 900, deviceScaleFactor: 1 });
  await p.goto('http://127.0.0.1:8813/index.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(3500);
  await p.evaluate(() => switchModule('engsentence'));
  await sleep(800);
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#engSentCatBar .eng-sent-cat-btn'))
      .find(x => x.textContent.indexOf('生活动作') >= 0);
    if (btn) btn.click();
  });
  await sleep(800);
  const m = await p.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#engSentList > *'));
    const sizes = [19, 17.5, 17, 16.5, 16, 15.5, 15];
    return cards.map(c => {
      const en = c.querySelector('.eng-sent-en');
      const r = { t: en.textContent, len: en.textContent.length, avail: en.clientWidth, out: {} };
      sizes.forEach(s => {
        en.style.fontSize = s + 'px';
        r.out[s] = Math.round(en.getBoundingClientRect().height);
      });
      en.style.fontSize = '';
      // 单行高度基准
      const lh = parseFloat(getComputedStyle(en).lineHeight);
      r.single = Math.round(lh);
      return r;
    });
  });
  m.forEach(r => console.log(r.t, '| len', r.len, '| avail', r.avail, '| single', r.single, '|', JSON.stringify(r.out)));
  await b.close();
})();
