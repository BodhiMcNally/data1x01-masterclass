/* Local answer selection and the sample-size illustration. No remote services. */
(function () {
  document.querySelectorAll('.answer-row').forEach(row => {
    const button = row.querySelector('.choice-letter');
    if (!button) return;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click', () => {
      row.closest('.choices').querySelectorAll('.answer-row').forEach(other => {
        other.classList.toggle('selected', other === row);
        other.querySelector('button').setAttribute('aria-pressed', String(other === row));
      });
      button.blur();
    });
  });
  const svg = document.querySelector('#sampling-plot');
  if (!svg) return;
  function draw(n) {
    const se=1.2/Math.sqrt(n), density=x=>Math.exp(-.5*((x-7)/se)**2)/(se*Math.sqrt(2*Math.PI));
    const px=x=>36+(x-6.1)/1.8*498, py=y=>270-y/7*236;
    const points=[];
    for(let i=0;i<=360;i++){const x=6.1+1.8*i/360;points.push([px(x),py(density(x))]);}
    const path='M'+points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' L');
    svg.querySelector('#sampling-curve').setAttribute('d',path);
    svg.querySelector('#sampling-fill').setAttribute('d',path+` L${px(7.9)},270 L36,270 Z`);
    const ticks=svg.querySelector('#sampling-ticks');
    ticks.innerHTML=[6.2,6.6,7,7.4,7.8].map(x=>`<line x1="${px(x)}" y1="270" x2="${px(x)}" y2="276" stroke="#718087"/><text x="${px(x)}" y="298" text-anchor="middle">${x.toFixed(1)}</text>`).join('');
    document.querySelector('#sampling-summary').textContent=`EV = 7 hours     SE = ${se.toFixed(2)} hours`;
    document.querySelectorAll('[data-n]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.n)===n)));
  }
  document.querySelectorAll('[data-n]').forEach(b=>b.addEventListener('click',()=>{draw(Number(b.dataset.n));b.blur();}));
  draw(25);
})();

/* Confidence interval comparison, also available without an R server. */
(function(){
 const svg=document.querySelector('#ci-plot');
 if(svg){
  const x=v=>42+(v+.5)/2*470;
  const cases={0:{t:2,p:'0.06395'},'0.75':{t:-1,p:'0.3332'},'1.25':{t:-3,p:'0.00897'}};
  function drawNull(mu){
   const c=cases[mu],inside=mu>=-.0328623864&&mu<=1.0328623864;
   svg.innerHTML=`<line x1="${x(-.5)}" y1="170" x2="${x(1.5)}" y2="170" stroke="#8b969a"/>`+[-.5,0,.5,1,1.5].map(v=>`<line x1="${x(v)}" x2="${x(v)}" y1="170" y2="177" stroke="#8b969a"/><text x="${x(v)}" y="202" text-anchor="middle">${v}</text>`).join('')+`<line x1="${x(-.0328623864)}" x2="${x(1.0328623864)}" y1="108" y2="108" stroke="#146c72" stroke-width="8"/><circle cx="${x(.5)}" cy="108" r="8" fill="#146c72"/><line x1="${x(mu)}" x2="${x(mu)}" y1="45" y2="165" stroke="#c62536" stroke-width="3" stroke-dasharray="7 5"/><text x="${x(.5)}" y="35" text-anchor="middle">95% confidence interval</text><text x="${x(mu)}" y="68" text-anchor="middle" fill="#c62536">H₀: μD = ${mu}</text>`;
   document.querySelector('#ci-summary').textContent=`t = ${c.t}, p = ${c.p}. ${inside?'Retain':'Reject'} H₀ at 5%.`;
   document.querySelectorAll('[data-null]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.null)===mu)));
  }
  document.querySelectorAll('[data-null]').forEach(b=>b.addEventListener('click',()=>{drawNull(Number(b.dataset.null));b.blur();}));
  drawNull(.75);
 }
 /* Actual R Shiny widgets connect only in the companion app. Static controls remain usable otherwise. */
 if(new URLSearchParams(location.search).get('shiny')!=='1'||!/^https?:$/.test(location.protocol))return;
 const panels=Array.from(document.querySelectorAll('[data-shiny-widget]'));
 panels.forEach(panel=>{
  const frame=document.createElement('iframe');
  frame.className='shiny-frame';frame.title=panel.dataset.shinyWidget==='ci'?'Interactive R Shiny confidence interval':'Interactive R Shiny sampling distribution';
  frame.src='../?widget='+encodeURIComponent(panel.dataset.shinyWidget);
  panel.appendChild(frame);
 });
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  const panel=panels.find(p=>p.querySelector('iframe').contentWindow===event.source);
  if(!panel)return;
  if(event.data==='shiny-connected')panel.classList.add('shiny-connected');
  if(event.data==='shiny-disconnected')panel.classList.remove('shiny-connected');
 });
})();
