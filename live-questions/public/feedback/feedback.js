(() => {
  const message = document.getElementById('feedback-status');
  fetch('/feedback/config.json', {cache:'no-store'}).then(r => { if(!r.ok) throw Error(); return r.json(); }).then(config => {
    if (!config.url) { message.textContent='The feedback survey is being prepared. Please return to this link after the session.'; return; }
    const url = new URL(config.url);
    if (url.protocol !== 'https:' || !(url.hostname === 'qualtrics.com' || url.hostname.endsWith('.qualtrics.com')) || !url.pathname.startsWith('/jfe/form/')) throw Error();
    const link=document.getElementById('survey-link');link.href=url.href;link.hidden=false;
    message.textContent='The survey opens in Qualtrics. Your voting responses are not sent with this link.';
    location.replace(url.href);
  }).catch(()=>{message.textContent='The survey link could not be loaded. Please ask Bodhi for the feedback link.';});
})();
