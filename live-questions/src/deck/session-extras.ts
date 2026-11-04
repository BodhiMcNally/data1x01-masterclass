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
