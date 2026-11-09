const fs = require('fs');
const path = require('path');
const HTML = 'E:/青的数据/青的obsidian/辰星工作台/server/index.html';
const s = fs.readFileSync(HTML, 'utf8');

// 抽出注入的模块代码，直接跑，保证测的就是线上那份
const start = s.indexOf('var _cxAudEl = null;');
const end = s.indexOf('// 一键把 1300 个字全下到手机');
const mod = s.slice(start, end);
const sandbox = {};
const fn = new Function(mod + '\nreturn {cxLocalAudioUrl, _cxFnv64, _cxB36, cxPreloadAudio};');
const api = fn();

const AUD = 'E:/青的数据/青的obsidian/辰星工作台/server/audio';
const tests = ['一', '三', '鹅', '妈妈', '二', '人', '大'];
const out = [];
for (const t of tests) {
  const u = api.cxLocalAudioUrl(t, 'zh');
  const file = path.join(AUD, u.replace('/audio/', ''));
  out.push(`${t}  ${u}  exists=${fs.existsSync(file)}  ${fs.existsSync(file) ? fs.statSync(file).size + 'B' : ''}`);
}
// 反查：任取一个已知文件，看反推出的文本能否对上
const en = api.cxLocalAudioUrl('Hello!', 'en');
out.push('EN Hello! -> ' + en + ' exists=' + fs.existsSync(path.join(AUD, en.replace('/audio/', ''))));
fs.writeFileSync('E:/青的数据/青的obsidian/辰星工作台/_hash_test.txt', out.join('\n'));
console.log(out.join('\n'));
