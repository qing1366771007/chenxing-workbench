const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:/青的数据/青的obsidian/辰星工作台/';
const bad = [];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const page = await browser.newPage();
  page.on('response', r => {
    const u = r.url();
    if (u.indexOf('/audio/') >= 0 && r.status() !== 200) bad.push(r.status() + ' ' + u.split('/audio/')[1]);
  });
  await page.goto('http://localhost:3008/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => { switchModule('hanzi'); hzHgEnter(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => { switchModule('poem'); showPoem(0); });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => { switchModule('engsentence'); });
  await new Promise(r => setTimeout(r, 3000));

  // 顺便把 1300 个字的 hash 全算出来，交给 Python 反查
  const hz = await page.evaluate(() => {
    var o = {};
    for (var g = 0; g < HONGEN_GROUPS.length; g++) {
      for (var i = 0; i < HONGEN_GROUPS[g].length; i++) {
        var ch = HONGEN_GROUPS[g].charAt(i);
        if (o[ch]) continue;
        o[ch] = cxLocalAudioUrl(ch, 'zh');
      }
    }
    return o;
  });
  fs.writeFileSync(OUT + '_t_404.json', JSON.stringify({ bad: bad, hz: hz }, null, 1));
  console.log('bad', bad.length);
  await browser.close();
})().catch(e => console.log('ERR', e.message));
