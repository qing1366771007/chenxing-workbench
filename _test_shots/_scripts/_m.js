const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:'new',args:['--no-sandbox','--disable-gpu']});
const p=await b.newPage();
await p.setViewport({width:420,height:900});
await p.goto('http://127.0.0.1:8811/index.html',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3000));
await p.evaluate(()=>switchModule('surnames'));
await new Promise(r=>setTimeout(r,800));
const m=await p.evaluate(()=>{
  const row=document.querySelectorAll('#surnameList .surname-row')[0];
  const ch=row.querySelector('.surname-chars');
  const list=document.getElementById('surnameList');
  const num=row.querySelector('.surname-num');
  const out={rowW:row.clientWidth,chW:ch.clientWidth,chScroll:ch.scrollWidth,listW:list.clientWidth,
    numW:num.offsetWidth,chH:ch.clientHeight,chLineH:getComputedStyle(ch).lineHeight,fs:getComputedStyle(ch).fontSize,
    ls:getComputedStyle(ch).letterSpacing,rowH:row.offsetHeight, sideW:document.querySelector('.sidebar')?document.querySelector('.sidebar').offsetWidth:0};
  // 试算不同字号是否单行
  const meas=(fs,ls)=>{const d=document.createElement('div');d.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font-weight:700;font-size:'+fs+'px;letter-spacing:'+ls+'px;';d.textContent=ch.textContent;row.appendChild(d);const w=d.getBoundingClientRect().width;d.remove();return Math.round(w);};
  out.try={};
  [[20,4],[19,2],[18,2],[17,1],[16,1],[15,1]].forEach(([f,l])=>{out.try[f+'/'+l]=meas(f,l);});
  return out;
});
console.log(JSON.stringify(m,null,1));
await b.close();
})();
