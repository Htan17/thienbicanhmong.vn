// js/guard.js — chạy SAU các thư viện CDN, TRƯỚC js/app.min.js (xem app.html).
// 1) Nếu thiếu React/Firebase (mất mạng lần đầu, CDN bị chặn...) -> hiện màn hình "không tải được" + Thử lại, KHÔNG nạp app (tránh sập trắng).
// 2) Thanh thông báo mất/có mạng trong lúc dùng app.
// 3) Nuốt lỗi Promise do mạng (không hiện banner đỏ).
// 4) Đăng ký service worker (sw.js) để lần sau mở được app ngay cả khi ngoại tuyến.
(function () {
    'use strict';
    var libsOk = !!(window.React && window.ReactDOM && window.firebase && window.firebase.initializeApp && window.firebase.auth && window.firebase.firestore);
    window.__tkbcLibsOk = libsOk;
    var isOffline = function () { return navigator.onLine === false; };

    function showBlocked() {
        window.__tkbcBlocked = true;
        var root = document.getElementById('root'); if (!root) return;
        var off = isOffline();
        root.innerHTML =
            '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;padding:24px;box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">' +
            '<div style="max-width:340px;width:100%;text-align:center;border:1px solid #3f3f46;border-radius:14px;background:#18181b;padding:24px;color:#e4e4e7">' +
            '<div style="width:46px;height:46px;margin:0 auto 14px;border-radius:12px;border:1px solid #a16207;display:flex;align-items:center;justify-content:center;font-size:22px">' + (off ? '📡' : '⚠️') + '</div>' +
            '<h1 style="margin:0;font-size:18px;color:#facc15;font-weight:800">' + (off ? 'Không có kết nối mạng' : 'Chưa tải được ứng dụng') + '</h1>' +
            '<p id="tk-guard-msg" style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:10px 0 0">' + (off
                ? 'Lần đầu mở cần có mạng để tải ứng dụng. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động — trang sẽ tự tải lại khi có mạng.'
                : 'Mạng yếu hoặc một số thành phần bị chặn nên chưa tải xong. Hãy thử lại sau ít giây.') + '</p>' +
            '<button id="tk-guard-retry" style="margin-top:16px;width:100%;background:#eab308;color:#000;border:none;border-radius:10px;padding:12px 14px;font-weight:900;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer">Thử lại</button>' +
            '<a href="./" style="display:block;margin-top:12px;font-size:12px;color:#a1a1aa">← Về trang giới thiệu</a>' +
            '</div></div>';
        var b = document.getElementById('tk-guard-retry'); if (b) b.onclick = function () { location.reload(); };
        window.addEventListener('online', function () { var m = document.getElementById('tk-guard-msg'); if (m) m.textContent = 'Đã có mạng trở lại, đang tải lại…'; setTimeout(function () { location.reload(); }, 800); });
    }
    if (!libsOk) showBlocked();

    // Thanh trạng thái mạng (độc lập với React nên luôn hoạt động).
    var bar = null, hideTimer = 0;
    function ensureBar() {
        if (bar) return bar;
        bar = document.createElement('div'); bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite');
        bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9998;padding:calc(6px + env(safe-area-inset-top,0px)) 12px 6px;text-align:center;font:700 12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;transform:translateY(-110%);transition:transform .25s ease;pointer-events:none';
        document.body.appendChild(bar); return bar;
    }
    function showBar(text, bg, fg) { var b = ensureBar(); b.textContent = text; b.style.background = bg; b.style.color = fg; requestAnimationFrame(function () { b.style.transform = 'translateY(0)'; }); }
    function hideBar() { if (bar) bar.style.transform = 'translateY(-110%)'; }
    function onOffline() { clearTimeout(hideTimer); if (libsOk) showBar('Mất kết nối mạng — một số tính năng tạm ngưng, dữ liệu sẽ đồng bộ khi có mạng', '#7f1d1d', '#fecaca'); }
    function onOnline() { clearTimeout(hideTimer); if (!bar || !libsOk) return; showBar('Đã kết nối lại', '#14532d', '#bbf7d0'); hideTimer = setTimeout(hideBar, 2200); }
    window.addEventListener('offline', onOffline); window.addEventListener('online', onOnline);
    if (isOffline()) { if (document.body) onOffline(); else document.addEventListener('DOMContentLoaded', onOffline); }

    // Lỗi Promise liên quan mạng: im lặng (Firestore 'unavailable', fetch thất bại...).
    window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason, txt = String((r && (r.code || r.message)) || r || '');
        if (isOffline() || /unavailable|network-request-failed|Failed to fetch|NetworkError|Load failed|offline/i.test(txt)) { try { console.warn('[TKBC] Bỏ qua lỗi mạng:', txt); } catch (x) {} e.preventDefault(); }
    });

    // Service worker: chỉ trên https (hoặc localhost); thêm ?nosw=1 để tắt khi gỡ lỗi.
    try {
        var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if ('serviceWorker' in navigator && secure && !/[?&]nosw=1\b/.test(location.search)) {
            window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('[TKBC] Không đăng ký được service worker:', err && err.message); }); });
        }
    } catch (e) {}
})();
