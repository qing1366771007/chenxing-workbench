const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:'new',args:['--no-sandbox','--disable-gpu']});
const p=await b.newPage(); await p.setViewport({width:420,height:900});
await p.goto('http://127.0.0.1:8811/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));
await p.evaluate(()=>{switchModule('hanzi');hzHgEnter();});
await new Promise(r=>setTimeout(r,300));
// 标 5 个认识
await p.evaluate(()=>{ for(let i=0;i<5;i++){ hzHgPick(i); hzHgMark(1);} });
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('cx_checkin')));
await p.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));
const after=await p.evaluate(async()=>{
  switchModule('hanzi'); hzHgEnter();
  const d=JSON.parse(localStorage.getItem('cx_checkin'));
  switchModule('checkin');
  await new Promise(r=>setTimeout(r,800));
  return {hongen:d.hongen, knownLen:(d.hongenKnown||[]).length,
     checkinCount:document.getElementById('hongenCount').textContent,
     goal:document.getElementById('hongenGoal').textContent,
     bar:document.getElementById('hongenBar').style.width,
     cardsKnown:document.querySelectorAll('#hzHgGrid .hz-hg-card.known').length,
     label:document.getElementById('hzHgLabel').textContent};
});
console.log('BEFORE', JSON.stringify(before));
console.log('AFTER ', JSON.stringify(after));
await b.close();
})();
