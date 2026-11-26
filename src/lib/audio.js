// SỬA LỖI ÂM THANH: link BGM cũ trỏ tới chosic.com (blog WordPress) - server này chặn hotlink
// (kiểm tra Referer) nên trình duyệt không tải/play được, lỗi bị nuốt âm thầm do .catch(()=>{}).
// Đổi sang cùng domain assets.mixkit.co như các hiệu ứng khác (domain này cho phép hotlink trực tiếp).
// Nếu vẫn lỗi (mạng chặn/đổi link), có BGM_FALLBACK_URL dự phòng + tính năng "Tải nhạc nền lên" (upload) để thay thế.
// 🆕 THÊM HIỆU ỨNG ÂM THANH MỚI (HINT = gợi ý, VICTORY = chiến thắng lớn khi xong cả Đạo Lộ/mùa
// giải, COMBO = trả lời đúng liên tiếp trong Tu Luyện Chi Lộ): CỐ Ý dùng lại đúng các URL mixkit
// ĐÃ CÓ SẴN VÀ ĐÃ CHẠY ỔN ĐỊNH trong app (CLICK/SUCCESS/GACHA) thay vì trỏ tới file mp3 mới chưa
// từng được kiểm chứng, để tránh lặp lại đúng kiểu lỗi "hiệu ứng âm thanh bị lỗi" mà file nguồn
// ngoài (URL lạ/CORS/link chết) hay gây ra. Muốn đổi thành file riêng, dùng nút "🔄 Tải Lên File
// Âm Thanh Riêng" trong bảng Tiên Âm (xem handleSfxUpload) - không cần sửa code.

// 🔊 ÂM THANH TỰ TẠO (WebAudio): các file mixkit bên ngoài hay bị chặn (hotlink/CORS/mạng trường/Zalo)
// nên hiệu ứng + popup im lặng. Nay nếu file không tải được thì tự SINH âm bằng code - không cần mạng.
import { classifyClick, shouldPlay, loadPrefs } from './audioPrefs.js';
// 🔊 ÂM THANH GIAO DIỆN TỰ ĐỘNG cho mọi tương tác (không phải sửa từng màn hình). Cài đặt 3 kênh (nhạc nền/hiệu ứng/âm giao diện)
// + âm lượng nằm ở window.__audioPrefs (useAudio cập nhật). Mỗi loại thao tác một âm riêng (xem classifyClick trong audioPrefs.js):
// nút thường=TAP, nút chính=PRESS, công tắc/mở rộng=TOGGLE, tab=TAB, đóng/quay lại=CLOSE, xoá=WARN, chọn tệp=OPEN;
// gõ phím trong ô nhập=TYPE, kéo thanh trượt=TICK, hộp chọn/ô tích=TOGGLE, thông báo role=alert/status xuất hiện=WARN/NOTIFY.
// Nút có data-sfx="KEY" thì dùng đúng KEY; ô nhập có data-sfx="off" thì không có tiếng gõ.
window.__audioPrefs = window.__audioPrefs || loadPrefs();
const recentSfx = (ms) => (Date.now() - (window.__lastSfxAt || 0)) < ms;
document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button, [role=button], [role=tab], label, summary') : null;
    if (!b || recentSfx(150)) return;
    const inp = b.tagName === 'LABEL' ? b.querySelector('input, select') : null, cn = typeof b.className === 'string' ? b.className : '';
    const tg = (v) => { const x = b.getAttribute(v); return x == null ? null : x === 'true'; };
    window.__synthSfx(classifyClick({ sfx: b.getAttribute('data-sfx'), tag: (inp || b).tagName.toLowerCase(), type: (inp || b).type, role: b.getAttribute('role'), text: b.textContent, aria: b.getAttribute('aria-label') || b.title, cls: cn, pressed: tg('aria-pressed'), expanded: tg('aria-expanded') }));
}, false);
let __lastType = 0, __lastTick = 0, __lastNote = 0;
document.addEventListener('keydown', e => {
    const t = e.target; if (!t || !t.tagName || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
    const ok = t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|search|email|password|tel|url|number|)$/i.test(t.type || '')) || t.isContentEditable;
    if (!ok || t.getAttribute('data-sfx') === 'off' || !(e.key.length === 1 || e.key === 'Backspace')) return;
    const n = Date.now(); if (n - __lastType < 35) return; __lastType = n; window.__synthSfx('TYPE');
}, true);
document.addEventListener('input', e => { const t = e.target; if (!t || t.type !== 'range') return; const n = Date.now(); if (n - __lastTick < 70) return; __lastTick = n; window.__synthSfx('TICK'); }, true);
document.addEventListener('change', e => { const t = e.target; if (!t || recentSfx(150)) return; if (t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'radio') window.__synthSfx('TOGGLE'); }, true);
try { new MutationObserver(ms => { if (recentSfx(400) || Date.now() - __lastNote < 600) return;
    for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; const r = n.getAttribute && n.getAttribute('role'), hit = r === 'alert' || r === 'status' ? n : (n.querySelector ? n.querySelector('[role=alert],[role=status]') : null);
        if (hit && (hit.textContent || '').trim()) { __lastNote = Date.now(); window.__synthSfx(hit.getAttribute('role') === 'alert' ? 'WARN' : 'NOTIFY'); return; } }
}).observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch (e) {}
// 📜 Người dùng tự cuộn tay -> tạm dừng tự cuộn phụ đề 4 giây (hết giật/khựng)
['wheel','touchmove','mousedown'].forEach(ev => document.addEventListener(ev, () => { window.__trUserScroll = Date.now(); }, { passive: true }));
window.__synthSfx = function(key) {
    window.__lastSfxAt = Date.now();
    if (!shouldPlay(key, window.__audioPrefs)) return; // tắt hiệu ứng / tắt âm giao diện
    if (window.__sfxDebug) window.__sfxDebug.push(key);
    try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const ctx = window.__sfxCtx || (window.__sfxCtx = new AC());
        if (ctx.state === 'suspended') ctx.resume();
        const P = {
            CLICK: [[700,0,.05,'triangle',.12]],
            TAP: [[520,0,.035,'triangle',.07]],
            TYPE: [[900,0,.02,'square',.04]],
            DING: [[1175,0,.08,'sine',.12],[1568,.07,.16,'sine',.1]],
            SWOOSH: [[300,0,.06,'sawtooth',.05],[600,.05,.08,'sawtooth',.05],[900,.1,.08,'sawtooth',.04]],
            COIN: [[1319,0,.05,'square',.07],[1760,.05,.2,'square',.07]],
            LEVELUP: [[523,0,.1],[659,.1,.1],[784,.2,.1],[1047,.3,.1],[1319,.4,.1],[1568,.5,.1],[2093,.6,.5]],
            HINT: [[900,0,.06,'sine',.14],[1200,.07,.09,'sine',.14]],
            CORRECT: [[660,0,.1],[880,.1,.12],[1320,.2,.22]],
            WRONG: [[220,0,.18,'sawtooth',.12],[160,.16,.3,'sawtooth',.12]],
            SUCCESS: [[523,0,.1],[659,.1,.1],[784,.2,.1],[1047,.3,.32]],
            FAIL: [[330,0,.15,'square',.09],[260,.15,.15,'square',.09],[196,.3,.3,'square',.09]],
            GACHA: [[784,0,.08],[988,.08,.08],[1175,.16,.08],[1568,.24,.28]],
            VICTORY: [[523,0,.12],[659,.12,.12],[784,.24,.12],[1047,.36,.14],[1319,.5,.35]],
            COMBO: [[988,0,.07],[1319,.07,.07],[1568,.14,.2]],
            BUY: [[880,0,.06,'square',.08],[1320,.06,.06,'square',.08],[1760,.12,.24,'square',.08]],
            EQUIP: [[600,0,.06,'triangle',.13],[900,.06,.14,'triangle',.13]],
            TAB: [[480,0,.04,'sine',.1],[640,.04,.07,'sine',.1]],
            OPEN: [[400,0,.06,'sine',.1],[600,.05,.08,'sine',.1],[800,.1,.12,'sine',.1]],
            CLOSE: [[800,0,.05,'sine',.1],[500,.05,.09,'sine',.1]],
            BUFF: [[523,0,.08,'sine',.14],[784,.08,.08,'sine',.14],[1047,.16,.08,'sine',.14],[1568,.24,.38,'sine',.12]],
            REWARD: [[659,0,.09],[784,.09,.09],[988,.18,.09],[1319,.27,.09],[1568,.36,.09],[1976,.45,.5]],
            RANKUP: [[392,0,.1],[523,.1,.1],[659,.2,.1],[784,.3,.12],[1047,.42,.45]],
            ERROR: [[200,0,.12,'square',.1],[150,.12,.22,'square',.1]],
            NOTIFY: [[988,0,.07,'sine',.12],[1319,.09,.16,'sine',.12]],
            TOGGLE: [[600,0,.04,'square',.06],[800,.05,.06,'square',.06]],
            STREAK: [[330,0,.08,'sawtooth',.08],[440,.08,.08,'sawtooth',.08],[660,.16,.24,'sawtooth',.08]],
            PRESS: [[440,0,.05,'triangle',.12],[660,.045,.09,'triangle',.12]],
            SELECT: [[740,0,.04,'sine',.1],[988,.04,.08,'sine',.1]],
            SEND: [[600,0,.05,'sine',.1],[900,.05,.05,'sine',.1],[1200,.1,.1,'sine',.1]],
            POP: [[300,0,.05,'sine',.14],[520,.04,.07,'sine',.12]],
            TICK: [[1400,0,.015,'square',.03]],
            WARN: [[300,0,.07,'sawtooth',.08],[230,.07,.12,'sawtooth',.08]],
            DENY: [[180,0,.08,'square',.08],[150,.08,.1,'square',.08]],
            POWERUP: [[392,0,.07,'triangle',.14],[523,.07,.07,'triangle',.14],[784,.14,.07,'triangle',.14],[1047,.21,.07,'triangle',.14],[1568,.28,.3,'triangle',.12]]
        };
        // Bộ âm thanh (mua ở Cửa Hàng): đổi dạng sóng, cao độ và độ ngân của mọi hiệu ứng
        const PACKS = { default: { t: null, m: 1, d: 1 }, chime: { t: 'sine', m: 1.5, d: 1.7 }, retro: { t: 'square', m: 1, d: .75 }, crystal: { t: 'triangle', m: 2, d: 1.35 }, thunder: { t: 'sawtooth', m: .5, d: 1.45 } };
        const pk = PACKS[window.__sfxPack] || PACKS.default;
        const master = ctx.__master || (ctx.__master = (() => { const m = ctx.createGain(); m.connect(ctx.destination); return m; })());
        master.gain.value = Math.min(1.25, ((window.__audioPrefs && window.__audioPrefs.sfxVol) != null ? window.__audioPrefs.sfxVol : 0.8) * 1.25); // âm lượng hiệu ứng (mặc định 0.8 -> 1.0 như trước)
        (P[key] || P.CLICK).forEach(([f,t,d0,type,v]) => {
            const d = d0 * pk.d;
            const o = ctx.createOscillator(), g = ctx.createGain(), st = ctx.currentTime + t;
            o.type = pk.t || type || 'sine'; o.frequency.value = f * pk.m;
            g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(v || .18, st + .01); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
            o.connect(g); g.connect(master); o.start(st); o.stop(st + d + .02);
        });
    } catch (e) {}
};
['pointerdown','keydown'].forEach(ev => document.addEventListener(ev, () => { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const c = window.__sfxCtx || (window.__sfxCtx = new AC()); if (c.state === 'suspended') c.resume(); } } catch(e){} }, { passive: true }));
export const AUDIO_URLS = {
    BGM: "https://assets.mixkit.co/music/preview/mixkit-happy-love-song-493.mp3",
    CORRECT: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-reward-952.mp3",
    WRONG: "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3",
    SUCCESS: "https://assets.mixkit.co/sfx/preview/mixkit-magic-sweep-game-trophy-257.mp3",
    FAIL: "https://assets.mixkit.co/sfx/preview/mixkit-losing-bleeps-2026.mp3",
    CLICK: "https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-kick-2521.mp3",
    GACHA: "https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3",
    HINT: "https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-kick-2521.mp3",
    VICTORY: "https://assets.mixkit.co/sfx/preview/mixkit-magic-sweep-game-trophy-257.mp3",
    COMBO: "https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3"
};
// 🔊 SỬA LỖI "ÂM THANH VẪN BỊ LỖI": nguyên nhân phổ biến nhất trong WebView/App Edit Code KHÔNG
// phải file hỏng mà là "Chính sách Tự Phát" (Autoplay Policy) của trình duyệt - Audio bị TỪ CHỐI
// phát cho tới khi có ít nhất 1 cái CHẠM/BẤM thật của người dùng trên trang. Trước đây lần phát
// đầu tiên (thường xảy ra trước khi người dùng kịp bấm gì) luôn thất bại và bị gắn cờ audioErrors
// vĩnh viễn dù file hoàn toàn không hỏng. Nay: bắt sự kiện CHẠM/BẤM đầu tiên trên toàn trang để
// "mở khoá" toàn bộ Audio (play() rồi pause() ngay lập tức, âm thầm, không ai nghe thấy) trước khi
// code thật sự cần phát tiếng - hàm gắn ra window để component React gọi vào lúc mount.
// 🆕 SỬA TẬN GỐC LỖI "ÂM THANH VẪN CÂM DÙ ĐÃ TẢI LẠI": bản trước chỉ gỡ được lỗi cho 2 nơi CHỦ
// ĐỘNG tạo Audio mới (nút Tải Lại & nút Đổi File). Nhưng initOneAudio còn tự động THỬ LẠI 1 lần
// sau 1.5s nếu file lỗi ngay lúc mount (a.onerror ở dưới) - lần thử lại đó cũng tạo 1 Audio HOÀN
// TOÀN MỚI, không nằm trong 2 nơi trên, nên vẫn bị câm dù không còn báo lỗi gì (vì thử lại thành
// công, chỉ là chưa được "mở khoá" quyền tự phát). Đây là lý do 1 số hiệu ứng - đặc biệt VICTORY/
// COMBO ở đoạn kết Đạo Lộ vì chúng thường là hiệu ứng ĐẦU TIÊN được phát rất muộn trong phiên -
// vẫn im lặng dù đã "Tải Lại Âm Thanh". Nay đổi __unlockAudioElement thành TỰ BỎ QUA (no-op, cực
// nhẹ) các Audio ĐÃ mở khoá rồi (cờ a.__unlocked riêng cho từng Audio, không còn cờ toàn cục), nên
// có thể gọi lại thoải mái mỗi lần người dùng chạm/bấm phím MÀ KHÔNG GỠ LISTENER NỮA (xem useEffect
// mount bên dưới) - nhờ vậy bất kỳ Audio mới nào sinh ra bất cứ lúc nào trong phiên (kể cả do thử
// lại mạng) cũng chắc chắn được mở khoá ở lần chạm/bấm phím kế tiếp bất kỳ, không cần đợi người
// dùng tự bấm "Tải Lại Âm Thanh" mới sửa được.
window.__unlockAudioElement = (a) => {
    if (!a || a.__unlocked) return;
    try {
        const p = a.play();
        if (p && p.catch) { p.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); }
        else { a.pause(); a.currentTime = 0; }
    } catch (e) {}
    a.__unlocked = true;
};
window.__unlockAudioOnce = (audioMap) => { Object.values(audioMap || {}).forEach(a => window.__unlockAudioElement(a)); };
