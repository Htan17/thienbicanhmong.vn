/* Service worker — giúp app mở được khi mất mạng.
 *  - Cùng nguồn (HTML/JS/CSS của app): ưu tiên MẠNG (luôn lấy bản mới), mạng lỗi/chậm thì dùng bản đã lưu.
 *  - CDN (React, Firebase SDK, Tailwind, font...): dùng bản đã lưu ngay, cập nhật ngầm.
 *  - KHÔNG đụng tới Firestore/Auth/YouTube/API: các yêu cầu đó đi thẳng ra mạng.
 * Muốn buộc mọi máy tải lại bản mới: đổi số VERSION. */
const VERSION = 'tkbc-v16-shell-3';
const CACHE = VERSION;
const PRECACHE = ['./', 'index.html', 'app.html', 'css/styles.css', 'js/boot.js', 'js/guard.js'];
const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('tkbc-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const cacheable = (res) => res && (res.ok || res.type === 'opaque');
async function put(req, res) { try { const c = await caches.open(CACHE); await c.put(req, res); } catch (e) {} }

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const fromCache = () => cache.match(req).then((r) => r || cache.match(req, { ignoreSearch: true }));
  try {
    const hasCache = await fromCache();
    const net = fetch(req);
    // Có bản lưu: đợi mạng tối đa vài giây rồi dùng bản lưu (mạng yếu không treo app). Chưa có bản lưu: đợi mạng.
    const res = hasCache ? await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NETWORK_TIMEOUT_MS))]) : await net;
    if (cacheable(res) && res.status === 200) put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await fromCache();
    if (hit) return hit;
    if (req.mode === 'navigate') { const shell = await cache.match('app.html'); if (shell) return shell; }
    return new Response('Không có kết nối mạng.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => { if (cacheable(res)) put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { refresh.catch(() => {}); return hit; }
  const res = await refresh;
  return res || new Response('', { status: 504 });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    e.respondWith(networkFirst(req)); return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    if (url.hostname === 'www.gstatic.com' && !url.pathname.startsWith('/firebasejs/')) return;
    e.respondWith(staleWhileRevalidate(req));
  }
});
