/* Connect the course's existing answer fragments with Live Questions. */
(function(){
 let lastReveal=null;
 function showJoin(){const panel=document.querySelector('.lq-overlay');if(panel)panel.hidden=false;}
 function setupJoin(){
  const source=document.querySelector('.lq-overlay-qr svg'),panel=document.getElementById('audience-join');
  if(source&&panel&&!panel.querySelector('svg')){
   panel.querySelector('.join-qr').append(source.cloneNode(true));panel.hidden=false;
   panel.tabIndex=0;panel.setAttribute('role','button');panel.setAttribute('aria-label','Show the voting QR code');
   panel.addEventListener('click',showJoin);panel.addEventListener('keydown',e=>{if(e.key==='Enter'){showJoin();e.preventDefault();}});
  }
  document.querySelectorAll('.mcq-vote-header').forEach(header=>{
   header.querySelectorAll('.lq-row').forEach((row,i)=>{row.querySelector('.lq-label').textContent='ABCD'[i];});
   const qr=header.querySelector('.lq-qr');if(qr&&!qr.dataset.bound){qr.dataset.bound='true';qr.tabIndex=0;qr.setAttribute('role','button');qr.setAttribute('aria-label','Show the joining QR code');qr.addEventListener('click',showJoin);qr.addEventListener('keydown',e=>{if(e.key==='Enter')showJoin();});}
   function refresh(){
    const count=header.querySelector('.lq-count'),n=Number(header.querySelector('.lq-count-n')?.textContent||0),correct=header.querySelector('.lq-correct .lq-pct');
    if(!count)return;let summary=count.querySelector('.lq-correct-summary');if(!summary){summary=document.createElement('span');summary.className='lq-correct-summary';count.append(summary);}
    const text=correct&&!header.classList.contains('lq-results-hidden')?(n?' · '+correct.textContent+' correct':' · no votes'):'';
    if(summary.textContent!==text)summary.textContent=text;
    header.querySelectorAll('.lq-row').forEach((row,i)=>{const a='ABCD'[i],votes=row.querySelector('.lq-n')?.textContent||'0',pct=row.querySelector('.lq-pct')?.textContent||'0%';const label=a+': '+votes+' votes ('+pct+')';if(row.getAttribute('aria-label')!==label){row.setAttribute('aria-label',label);row.setAttribute('role','img');row.title=label;}});
   }
   if(!header.dataset.observed){header.dataset.observed='true';new MutationObserver(refresh).observe(header,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-status']});}
   refresh();
  });
 }
 function attach(){
  setupJoin();
  Reveal.on('fragmentshown',event=>{
   const slide=Reveal.getCurrentSlide();if(!slide?.classList.contains('mcq')||!slide.querySelector('.answer-reason.visible'))return;
   if(lastReveal===slide.id)return;lastReveal=slide.id;slide.classList.add('poll-answer-visible');
   document.dispatchEvent(new CustomEvent('data1001:reveal-answer'));
  });
  Reveal.on('fragmenthidden',()=>{
   const slide=Reveal.getCurrentSlide();if(!slide?.classList.contains('mcq')||slide.querySelector('.answer-reason.visible'))return;
   lastReveal=null;slide.classList.remove('poll-answer-visible');document.dispatchEvent(new CustomEvent('data1001:hide-results'));
  });
  Reveal.on('slidechanged',()=>{
   const slide=Reveal.getCurrentSlide();lastReveal=null;
   if(slide?.classList.contains('mcq')&&!slide.querySelector('.answer-reason.visible'))document.dispatchEvent(new CustomEvent('data1001:hide-results'));
  });
 }
 document.addEventListener('data1001:lq-ready',setupJoin);
 document.addEventListener('data1001:answer-revealed',()=>{
  if(!window.Reveal)return;const slide=Reveal.getCurrentSlide();if(!slide?.classList.contains('mcq'))return;
  lastReveal=slide.id;slide.classList.add('poll-answer-visible');
  if(!slide.querySelector('.answer-reason.visible'))Reveal.nextFragment();
 });
 if(window.Reveal){if(Reveal.isReady())attach();else Reveal.on('ready',attach);}else document.addEventListener('DOMContentLoaded',()=>{if(window.Reveal){if(Reveal.isReady())attach();else Reveal.on('ready',attach);}});
})();
