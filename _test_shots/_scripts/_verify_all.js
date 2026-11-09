const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:'new',args:['--no-sandbox','--disable-gpu']});
const p=await b.newPage();
await p.setViewport({width:420,height:900});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8811/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));
await p.evaluate(()=>{ document.getElementById('module-hanzi')&&switchModule('hanzi'); });
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>hzHgEnter());
await new Promise(r=>setTimeout(r,400));
const sweep=await p.evaluate(()=>{
  const bad=[];
  for(let g=0;g<130;g++){
    hzHgJumpTo = g; // noop
  }
  // 直接逐组渲染（不弹 prompt）
  let ok=0;
  for(let g=0;g<HONGEN_GROUPS.length;g++){
    _hzHgGroup=g; hzHgRender();
    const n=document.querySelectorAll('#hzHgGrid .hz-hg-card').length;
    const lb=document.getElementById('hzHgLabel').textContent;
    const expect=(g+1)+' / 130';
    if(n!==10||lb.indexOf(expect)<0) bad.push([g+1,n,lb]);
    ok++;
  }
  return {checked:ok,bad:bad.slice(0,5),
    total:document.querySelectorAll('#hzHgGrid .hz-hg-card').length,
    lastLabel:document.getElementById('hzHgLabel').textContent,
    lastChars:HONGEN_GROUPS[129]};
});
console.log('SWEEP', JSON.stringify(sweep));
// 不认识：取消勾选
const un=await p.evaluate(()=>{
  _hzHgGroup=0; hzHgRender(); hzHgPick(0);
  hzHgMark(0);   // 标不认识（原本没标也一样）
  hzHgPick(0); hzHgMark(1);
  const a=JSON.parse(localStorage.getItem('cx_checkin')).hongen;
  hzHgPick(0); hzHgMark(0);
  const b=JSON.parse(localStorage.getItem('cx_checkin')).hongen;
  return {afterMark:a, afterUnmark:b, known:(JSON.parse(localStorage.getItem('cx_checkin')).hongenKnown||[]).length};
});
console.log('TOGGLE', JSON.stringify(un));
// 刷新后是否保留
await p.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));
const pers=await p.evaluate(()=>{
  switchModule('hanzi'); hzHgEnter();
  const m=hzHgKnown();
  return {hongen:JSON.parse(localStorage.getItem('cx_checkin')).hongen, knownCount:Object.keys(m).length,
          bigLabel:document.getElementById('hzHgLabel').textContent,
          checkinUI:(function(){switchModule('checkin');return new Promise(r=>setTimeout(()=>r(document.getElementById('hongenCount').textContent+'/'+document.getElementById('hongenGoal').textContent),700));})()};
});
console.log('PERSIST', JSON.stringify(await pers));
console.log('PAGEERRORS', errs.length, JSON.stringify(errs.slice(0,5)));
await b.close();
})();
