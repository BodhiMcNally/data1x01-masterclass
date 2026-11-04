/* Presenter setup stays in this browser. No key is embedded in the deck. */
(() => {
  'use strict';
  const PROFILE = 'data1x01:voting:connection:v1';
  let memory = {}, busy = false;
  const clean = text => text.replace(/\s+/g, ' ').trim();
  const read = () => { try { return JSON.parse(localStorage.getItem(PROFILE) || '{}'); } catch { return memory; } };
  function origin(value) {
    const u = new URL(value.trim());
    if (!(u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error('Enter the server address only, beginning with https:// and without a page path.');
    return u.origin;
  }
  function keyFor(server) { try { return sessionStorage.getItem('lq:key:' + server) || localStorage.getItem('lq:key:' + server) || ''; } catch { return ''; } }
  function freshRoom() { return 'data1x01-' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0,8); }

  // The visible question and answer rows are the source for phone voting.
  // This runs before Reveal initialises the native extension.
  document.addEventListener('data1001:before-questions', () => {
   for (const slide of document.querySelectorAll('section.mcq')) {
    const header = slide.querySelector('.mcq-vote-header[data-lq]');
    if (!header) continue;
    try {
      const q = JSON.parse(header.dataset.lq);
      const rows = [...slide.querySelectorAll('.answer-row')];
      const paragraphs = [...slide.querySelectorAll('.question-panel > p')];
      const prompt = clean(paragraphs.map(p => p.textContent).join(' '));
      const heading = clean(slide.querySelector('h2')?.textContent || 'Question');
      q.prompt = (heading + '. ' + prompt).slice(0,430);
      if (slide.querySelector('.question-panel pre,.question-panel table,.question-panel img')) q.prompt += ' See the code, plot or table on the slide.';
      if (rows.length >= 2 && rows.length <= 26) {
        q.options = rows.map(row => clean(row.querySelector('.option-text')?.textContent || ''));
        q.correct = rows.flatMap((row,i) => row.dataset.correct === 'true' ? [i] : []);
        if (q.options.some(v => !v || v.length > 200) || q.correct.length !== 1) throw Error('Check the MCQ answer rows.');
      }
      q.confidence = true;
      q.revision = window.DATA1X01_REVISION?.[slide.id] || q.revision;
      header.dataset.lq = JSON.stringify(q);
    } catch (err) { console.error('Voting question could not be synchronised:', slide.id, err.message); }
   }
  });

  function init() {
    const start = document.getElementById('start-voting'), settings = document.getElementById('voting-settings'), status = document.getElementById('voting-status');
    if (!start || !settings) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'voting-dialog';
    dialog.setAttribute('aria-labelledby','voting-dialog-title');
    dialog.innerHTML = `<form id="voting-form"><h2 id="voting-dialog-title">Live voting</h2>
      <p>Connect to your voting server. Students join using the QR code.</p>
      <label for="voting-server">Voting server address</label><input id="voting-server" type="url" placeholder="https://your-worker.workers.dev" required autocomplete="off">
      <label for="voting-key">Presenter key</label><input id="voting-key" type="password" required autocomplete="off" spellcheck="false">
      <label class="voting-import" for="voting-files">Import connection files</label><input id="voting-files" type="file" multiple>
      <p class="voting-help">Choose <strong>server.json</strong> and <strong>presenter-key</strong> from the <strong>.live-questions</strong> folder in your existing project. These files are read locally.</p>
      <label class="voting-remember"><input id="voting-remember" type="checkbox" checked> Remember on this browser</label>
      <p id="voting-error" role="alert"></p>
      <div class="voting-actions"><button id="voting-connect" type="submit">Start a new session</button><button id="voting-cancel" type="button">Cancel</button></div>
      <div class="voting-secondary"><button id="voting-end" type="button">End live voting</button><button id="voting-forget" type="button">Forget saved connection</button></div>
      </form>`;
    document.body.append(dialog);
    const field = name => dialog.querySelector('#voting-' + name);
    function show() {
      const p = read(), url = new URL(location.href);
      field('server').value = url.searchParams.get('lq-server') || p.server || (location.protocol === 'https:' && location.pathname.startsWith('/slides/') ? location.origin : '');
      let server; try { server = origin(field('server').value); } catch {}
      field('key').value = memory.key || (server ? keyFor(server) : '');
      field('error').textContent = '';
      field('end').hidden = !url.searchParams.has('lq-server');
      dialog.showModal();
    }
    // Do not let Reveal consume navigation keys while a field is being edited.
    dialog.addEventListener('keydown', e => e.stopPropagation());
    dialog.addEventListener('click', e => e.stopPropagation());
    field('cancel').onclick = () => dialog.close();
    settings.onclick = show;
    field('files').onchange = async e => {
      try {
        for (const file of e.target.files) {
          if (file.size > 16384) throw Error('Choose the small server.json and presenter-key files.');
          const text = (await file.text()).trim();
          if (file.name === 'presenter-key') field('key').value = text;
          else if (file.name === 'server.json') field('server').value = origin(JSON.parse(text).server);
          else throw Error('Choose server.json and presenter-key from .live-questions.');
        }
        field('error').textContent = '';
      } catch (err) { field('error').textContent = err.message; }
      e.target.value = '';
    };
    function connect(server,key,session,closing=false) {
      return new Promise((resolve,reject) => {
        const socket = new WebSocket(server.replace(/^http/,'ws') + '/api/s/' + encodeURIComponent(session) + '/ws');
        let settled = false;
        const finish = error => { if (settled) return; settled=true; clearTimeout(timer); socket.close(); error ? reject(error) : resolve(); };
        const timer = setTimeout(() => finish(Error('Could not connect. Check your internet connection and server address, then try again.')),8000);
        socket.onopen = () => socket.send(JSON.stringify({t:'hello',v:1,role:'deck',voter:crypto.randomUUID(),key}));
        socket.onmessage = e => {
          let msg; try { msg=JSON.parse(e.data); } catch { return; }
          if (msg.t === 'welcome') {
            if (!msg.presenter) return finish(Error('The server did not accept the presenter key. Import the presenter-key file from your working project.'));
            if (closing) for (const el of document.querySelectorAll('.mcq-vote-header[data-lq]')) socket.send(JSON.stringify({t:'close',id:JSON.parse(el.dataset.lq).id}));
            finish();
          } else if (msg.t === 'error') finish(Error('The server could not start voting. Check the server address and presenter key.'));
        };
        socket.onerror = () => finish(Error('Could not reach the voting server. Check the address and your internet connection.'));
        socket.onclose = () => { if (!settled) finish(Error('The voting server closed the connection. Please try again.')); };
      });
    }
    async function launch(server,key,remember) {
      if (busy) return;
      busy=true; start.disabled=true; field('connect').disabled=true;
      try {
        server=origin(server); key=key.trim();
        if (!key) throw Error('Import your presenter-key file or enter the presenter key.');
        const session=freshRoom();
        await connect(server,key,session);
        memory={server,key};
        const storage=remember ? localStorage : sessionStorage;
        storage.setItem('lq:key:' + server,key);
        if (remember) localStorage.setItem(PROFILE,JSON.stringify({server}));
        else { localStorage.removeItem(PROFILE); localStorage.removeItem('lq:key:' + server); }
        const url=new URL(location.href); url.searchParams.delete('presenter'); url.searchParams.set('lq-server',server); url.searchParams.set('session',session);
        // The native plugin reads localStorage. Non-remembered keys are copied
        // from sessionStorage before its next initialisation, then removed.
        location.replace(url.toString());
      } catch (err) { if (!dialog.open) show(); field('error').textContent=err.message; }
      finally { busy=false; start.disabled=false; field('connect').disabled=false; }
    }
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();launch(field('server').value,field('key').value,field('remember').checked);};
    start.onclick=()=>{
      if (document.documentElement.dataset.lqMode === 'presenter') { const overlay=document.querySelector('.lq-overlay');if(overlay)overlay.hidden=false; return; }
      const p=read(); if (p.server && keyFor(p.server)) launch(p.server,keyFor(p.server),true); else show();
    };
    field('end').onclick=async()=>{
      const url=new URL(location.href),server=url.searchParams.get('lq-server');
      try { if (server) await connect(origin(server),keyFor(origin(server)),url.searchParams.get('session') || 'data1x01-revision',true); }
      catch (err) { field('error').textContent=err.message; return; }
      url.searchParams.delete('lq-server');url.searchParams.delete('session');url.searchParams.delete('presenter');location.replace(url.toString());
    };
    field('forget').onclick=()=>{
      const p=read(); let server;try{server=origin(field('server').value || p.server);}catch{}
      if(server){localStorage.removeItem('lq:key:'+server);sessionStorage.removeItem('lq:key:'+server);}
      localStorage.removeItem(PROFILE);memory={};field('key').value='';field('error').textContent='Saved connection forgotten.';
    };
    const update=()=>{
      const mode=document.documentElement.dataset.lqMode;
      start.textContent=mode==='presenter'?'Show joining QR':'Start live voting';
      status.textContent=mode==='presenter'?'Live voting connected. Students can join now.':new URL(location.href).searchParams.has('lq-server')?'Connecting to live voting… Use Voting settings if it does not connect.':'Present offline or start a live session.';
    };
    new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['data-lq-mode']});update();
  }
  // Carry a session-only key into the unmodified native plugin, then clear it
  // from persistent storage once the plugin has consumed it.
  const serverParam=new URL(location.href).searchParams.get('lq-server');
  if(serverParam)try{
    const server=origin(serverParam),key=sessionStorage.getItem('lq:key:'+server);
    if(key){localStorage.setItem('lq:key:'+server,key);document.addEventListener('data1001:lq-ready',()=>localStorage.removeItem('lq:key:'+server),{once:true});}
  }catch{}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
