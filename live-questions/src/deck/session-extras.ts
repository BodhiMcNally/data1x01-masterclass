import { qrSvg } from './qr';

// The survey QR uses a stable hosted landing page; its Qualtrics target is
// configured independently, so a later survey URL does not change the QR.
function setup(server?: string) {
  const hosted = location.protocol === 'https:' && location.pathname.startsWith('/slides');
  const supplied = server || new URLSearchParams(location.search).get('lq-server') || (hosted ? location.origin : null);
  let origin: string | null = null;
  if (supplied) {
    try { const u = new URL(supplied); if (u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(u.hostname))) origin = u.origin; } catch { /* no valid voting origin */ }
  }
  const box = document.getElementById('feedback-qr');
  const link = document.getElementById('feedback-link') as HTMLAnchorElement | null;
  if (!box || !link) return;
  if (!origin) { box.textContent = 'Connect live voting to display the feedback QR, or open the hosted presentation.'; return; }
  const url = origin + '/feedback/';
  box.replaceChildren(qrSvg(url, 'Open the DATA1x01 session feedback survey'));
  link.href = url; link.textContent = 'Open session feedback';
}
document.addEventListener('data1001:lq-ready', (event) => setup((event as CustomEvent).detail.server));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setup());
else setup();

function addFullscreen() {
  if (document.getElementById('presentation-fullscreen')) return;
  const button = document.createElement('button');
  button.id = 'presentation-fullscreen'; button.className = 'presentation-fullscreen'; button.type = 'button';
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/></svg>';
  const update = () => { const active = !!document.fullscreenElement; button.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen'); button.title = active ? 'Exit full screen (Esc)' : 'Full screen (F)'; };
  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
      else window.open(location.href, '_blank', 'noopener');
    } catch { window.open(location.href, '_blank', 'noopener'); }
  });
  update(); document.addEventListener('fullscreenchange', update); document.body.append(button);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addFullscreen);
else addFullscreen();
