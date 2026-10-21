        // TỐI ƯU KHUNG HÌNH: cập nhật biến --app-vh = 1% chiều cao thực tế của viewport, dùng làm
        // phương án dự phòng cho các trình duyệt/WebView cũ chưa hỗ trợ đơn vị "dvh" (xem CSS ở trên).
        const setAppVh = () => { document.documentElement.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`); document.documentElement.style.setProperty('--app-vw', `${window.innerWidth * 0.01}px`); };
        setAppVh();
        window.addEventListener('resize', setAppVh);
        window.addEventListener('orientationchange', setAppVh);

        const manifestObj = { "name": "Thien Kieu", "short_name": "ThienKieu", "start_url": ".", "display": "standalone", "background_color": "#000000", "theme_color": "#ffdf00", "icons": [{"src": "https://api.dicebear.com/7.x/identicon/svg?seed=ThienKieu", "sizes": "192x192", "type": "image/svg+xml"}] };
        const blob = new Blob([JSON.stringify(manifestObj)], {type: 'application/json'});
        const link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(blob); document.head.appendChild(link);

        window.onerror = function(msg, src, ln, col) {
            // SỬA LỖI: "Script error." (dòng 0, không rõ nguồn) là lỗi vô hại từ script bên ngoài
            // (VD: YouTube iframe player, quảng cáo, tiện ích trình duyệt) - trình duyệt cố tình giấu
            // chi tiết vì lý do bảo mật cross-origin, KHÔNG phải lỗi thật của Bí Cảnh nên bỏ qua, không hiện banner.
            if (!msg || msg === 'Script error.' || (ln === 0 && col === 0)) return true;
            let d = document.getElementById('bi-canh-error-banner');
            if (!d) {
                d = document.createElement('div');
                d.id = 'bi-canh-error-banner';
                d.style.cssText = `color: #ff4500; padding: 15px 40px 15px 15px; background: #111; position: fixed; top: 0; z-index: 9999; width: 100%; font-size: 12px; overflow: auto; max-height: 100vh; box-sizing: border-box;`;
                document.body.appendChild(d);
            }
            d.innerHTML = `<button onclick="this.parentElement.remove()" style="position:absolute; top:8px; right:10px; background:none; border:none; color:#ff4500; font-size:18px; cursor:pointer;">✕</button><h3>LỖI BÍ CẢNH: ${String(msg).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';')}</h3><p>Tại dòng: ${Number(ln) || 0}</p><p><b>Gợi ý:</b> Tắt Word Wrap trong App Edit Code!</p>`;
            return true;
        };

        const originalWarn = console.warn; const originalError = console.error;
        console.warn = function(...args) { if (typeof args[0] === 'string' && (args[0].includes('cdn.tailwindcss.com') || args[0].includes('in-browser Babel') || args[0].includes('WebChannel') || args[0].includes('experimental'))) return; originalWarn.apply(console, args); };
        console.error = function(...args) { if (typeof args[0] === 'string' && args[0].includes('Firestore backend')) return; originalError.apply(console, args); };

        // SỬA GIAO DIỆN: thay hộp thoại alert() mặc định (xám đen xấu xí của trình duyệt) bằng
        // hộp thoại tự vẽ theo đúng tông màu cổ trang (nền đen, viền vàng) của Bí Cảnh.
        // Toàn bộ 100+ chỗ gọi alert("...") trong code KHÔNG cần sửa gì cả vì hàm alert được thay ở đây.
        (function() {
            const nativeAlert = window.alert.bind(window);
            let overlay = null, box = null, msgEl = null, btnEl = null;
            const buildDom = () => {
                overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; font-family:inherit;';
                box = document.createElement('div');
                box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; box-sizing:border-box; padding:20px; text-align:center; max-height:85vh; overflow-y:auto; overflow-x:hidden;';
                msgEl = document.createElement('p');
                msgEl.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 18px 0; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; max-width:100%;';
                btnEl = document.createElement('button');
                btnEl.textContent = 'ĐÃ RÕ';
                btnEl.style.cssText = 'background:#eab308; color:#000; border:none; padding:10px 28px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase;';
                box.appendChild(msgEl); box.appendChild(btnEl); overlay.appendChild(box);
            };
            window.alert = function(message) {
                try {
                    if (!overlay) buildDom();
                    msgEl.textContent = (window.__term ? window.__term(String(message)) : message);
                    document.body.appendChild(overlay);
                    if (window.__playSfx) window.__playSfx('NOTIFY'); // 🆕 phát âm thanh khi popup hiện ra (trước đây im lặng)
                    const close = () => { if (window.__playSfx) window.__playSfx('CLICK'); if (overlay.parentElement) overlay.parentElement.removeChild(overlay); overlay.removeEventListener('click', onOverlayClick); btnEl.removeEventListener('click', close); };
                    const onOverlayClick = (e) => { if (e.target === overlay) close(); };
                    btnEl.addEventListener('click', close); // 🆕 âm thanh khi bấm nút "ĐÃ RÕ" (đã gộp vào trong close ở trên)
                    overlay.addEventListener('click', onOverlayClick);
                } catch (e) { nativeAlert(message); }
            };
        })();

        // SỬA GIAO DIỆN: hộp thoại confirm() mặc định của trình duyệt (nền xám xịt, không đồng bộ
        // với tông màu cổ trang đen-vàng của Bí Cảnh) được thay bằng hộp thoại tự vẽ có 2 nút
        // Huỷ / Xác Nhận. Vì confirm() gốc chạy đồng bộ (block luôn trình duyệt) còn hộp thoại tự vẽ
        // bắt buộc phải là bất đồng bộ (chờ người dùng bấm nút), nên cung cấp thêm hàm window.askConfirm(message)
        // trả về Promise<boolean> để dùng "await askConfirm(...)" thay cho "confirm(...)" trong code React.
        window.askConfirm = function(message) {
            return new Promise((resolve) => {
                try {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; font-family:inherit;';
                    const box = document.createElement('div');
                    box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; box-sizing:border-box; padding:20px; text-align:center; max-height:85vh; overflow-y:auto; overflow-x:hidden;';
                    const msgEl = document.createElement('p');
                    msgEl.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 18px 0; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; max-width:100%;';
                    msgEl.textContent = (window.__term ? window.__term(String(message)) : message);
                    const btnRow = document.createElement('div');
                    btnRow.style.cssText = 'display:flex; gap:10px;';
                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'HUỶ';
                    cancelBtn.style.cssText = 'flex:1; background:#27272a; color:#d4d4d8; border:1px solid #52525b; padding:10px 14px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase;';
                    const okBtn = document.createElement('button');
                    okBtn.textContent = 'XÁC NHẬN';
                    okBtn.style.cssText = 'flex:1; background:#eab308; color:#000; border:none; padding:10px 14px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase;';
                    btnRow.appendChild(cancelBtn); btnRow.appendChild(okBtn);
                    box.appendChild(msgEl); box.appendChild(btnRow); overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    if (window.__playSfx) window.__playSfx('CLICK'); // 🆕 phát âm thanh khi popup xác nhận hiện ra
                    const close = (result) => { if (window.__playSfx) window.__playSfx('CLICK'); if (overlay.parentElement) overlay.parentElement.removeChild(overlay); resolve(result); };
                    cancelBtn.addEventListener('click', () => close(false));
                    okBtn.addEventListener('click', () => close(true));
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
                } catch (e) { resolve(window.confirm(message)); }
            });
        };

        // 🆕 Hộp thoại 3 lựa chọn khi thoát chỉnh sửa: LƯU / HỦY thay đổi / TIẾP TỤC SỬA -> Promise<'save'|'discard'|'stay'>
        window.askChoice = function(message) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
                const box = document.createElement('div');
                box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; box-sizing:border-box; padding:20px; text-align:center; max-height:85vh; overflow-y:auto; overflow-x:hidden;';
                const msg = document.createElement('p');
                msg.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 16px 0; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; max-width:100%;';
                msg.textContent = message; box.appendChild(msg);
                const mk = (txt, css, val) => { const b = document.createElement('button'); b.textContent = txt; b.style.cssText = 'display:block; width:100%; padding:10px 14px; margin-top:8px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase; ' + css; b.onclick = () => { if (window.__playSfx) window.__playSfx('CLICK'); overlay.remove(); resolve(val); }; box.appendChild(b); };
                mk('LƯU THAY ĐỔI', 'background:#eab308; color:#000; border:none;', 'save');
                mk('HỦY THAY ĐỔI', 'background:#7f1d1d; color:#fecaca; border:1px solid #ef4444;', 'discard');
                mk('TIẾP TỤC CHỈNH SỬA', 'background:#27272a; color:#d4d4d8; border:1px solid #52525b;', 'stay');
                overlay.appendChild(box); document.body.appendChild(overlay);
                if (window.__playSfx) window.__playSfx('CLICK');
            });
        };


// ===== CHẾ ĐỘ GIAO DIỆN: "Học tập" (thuật ngữ học đường) / "Thiên Kiều" (thuật ngữ tu tiên gốc) =====
// Đổi TOÀN BỘ chữ hiển thị (nội dung, placeholder, tooltip, hộp thoại) bằng một bộ từ điển, không cần sửa từng màn hình.
// Dùng cho cuộc thi KHKT / giáo viên / phụ huynh: ngôn ngữ trung tính, đúng tính chất "trò chơi hoá bổ trợ tự học".
(function () {
    const PAIRS = [
        ['Học Qua Video Tiên Âm', 'Học qua video'], ['Vượt Ải Ngay', 'Làm bài ngay'], ['Vượt Ải', 'Làm bài'], ['Khai Mở Đạo Lộ', 'Bắt đầu lộ trình'], ['Huỷ Đạo Lộ', 'Huỷ lộ trình'], ['Tu Luyện Chi Lộ', 'Lộ trình học'], ['Khai Sơn Lập Phái', 'Tạo nhóm học tập'], ['Chưa có thế lực? Khai sơn ngay', 'Chưa có tài khoản? Đăng ký ngay'],
        ['Hào Quang Cá Nhân', 'Hiệu ứng hồ sơ'], ['Mật Mã Phong Ấn', 'Mật khẩu'], ['Danh Xưng (Đạo Hiệu)', 'Tên hiển thị'], ['Lưu Lại Ấn Ký', 'Lưu hồ sơ'], ['Kết Giao Bằng Hữu', 'Kết bạn học'],
        ['Kết Bạn Ngẫu Nhiên', 'Kết bạn ngẫu nhiên'], ['Phong Thần Bảng', 'Bảng xếp hạng'], ['Tàng Kinh Các', 'Thư viện học liệu'], ['Ải Bí Tịch', 'Bài luyện tập'], ['Vào Bí Cảnh', 'Đăng nhập'],
        ['Linh Thạch', 'Điểm thưởng'], ['Danh Vọng', 'Thành tích'], ['Đạo Hữu', 'Bạn học'], ['Bang Hội', 'Nhóm học tập'], ['Tông Môn', 'Nhóm học tập'], ['Môn Phái', 'Nhóm học tập'], ['Thế Lực', 'Nhóm học tập'],
        ['Thiên Bảng', 'Bảng xếp hạng'], ['Sư Phụ AI', 'Trợ lý AI'], ['Đạo Lộ', 'Lộ trình'], ['Tu Luyện', 'Luyện tập'], ['Bí Tịch', 'Bộ đề'], ['Trân Bảo', 'Vật phẩm'], ['Di Ngôn', 'Giới thiệu'],
        ['Kết Duyên', 'Kết bạn'], ['Tiên Âm', 'Âm thanh'], ['Ải', 'Bài'], ['Đạo Hiệu', 'Tên hiển thị'],
        ['Phàm Nhân', 'Khởi đầu'], ['Luyện Khí', 'Cấp 1 · Khởi đầu'], ['Trúc Cơ', 'Cấp 2 · Cơ bản'], ['Kim Đan', 'Cấp 3 · Vững vàng'], ['Nguyên Anh', 'Cấp 4 · Thành thạo'], ['Hóa Thần', 'Cấp 5 · Giỏi'], ['Đại Thánh', 'Cấp 6 · Xuất sắc'], ['Tiên Tôn', 'Cấp 7 · Bậc thầy']
    ].sort((a, b) => b[0].length - a[0].length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RULES = PAIRS.map(([f, t]) => ({ re: new RegExp('(^|[^\\p{L}\\p{N}])(' + esc(f) + ')(?=$|[^\\p{L}\\p{N}])', 'giu'), to: t }));
    const caseLike = (src, to) => (src === src.toUpperCase() && src !== src.toLowerCase()) ? to.toUpperCase() : (src.charAt(0) !== src.charAt(0).toLowerCase() ? to : to.toLowerCase());
    const transform = (s) => { let out = s; for (const r of RULES) out = out.replace(r.re, (m, p, w) => p + caseLike(w, r.to)); return out; };
    window.__term = (s) => (window.__uiMode === 'study' ? transform(String(s)) : String(s));

    const ATTRS = ['placeholder', 'title', 'aria-label'];
    const txtOrig = new WeakMap(), attrOrig = new WeakMap();
    const skip = (el) => !el || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(el.nodeName) || (el.closest && el.closest('[data-noterm]'));
    function procText(n) {
        const v = n.nodeValue; if (!v || v.length < 2 || skip(n.parentNode)) return;
        const rec = txtOrig.get(n); if (rec && rec.r === v) return;
        const nv = transform(v);
        if (nv !== v) { txtOrig.set(n, { o: v, r: nv }); n.nodeValue = nv; } else if (rec) txtOrig.delete(n);
    }
    function procAttrs(el) {
        if (el.nodeType !== 1 || skip(el)) return;
        for (const a of ATTRS) {
            const v = el.getAttribute && el.getAttribute(a); if (!v) continue;
            let rec = attrOrig.get(el); if (rec && rec[a] && rec[a].r === v) continue;
            const nv = transform(v);
            if (nv !== v) { rec = rec || {}; rec[a] = { o: v, r: nv }; attrOrig.set(el, rec); el.setAttribute(a, nv); }
        }
    }
    function walk(root) {
        if (!root) return;
        if (root.nodeType === 3) { procText(root); return; }
        if (root.nodeType !== 1) return;
        procAttrs(root);
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) procText(n);
        root.querySelectorAll && root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(procAttrs);
    }
    function restoreAll() {
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) { const rec = txtOrig.get(n); if (rec && n.nodeValue === rec.r) n.nodeValue = rec.o; txtOrig.delete(n); }
        document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => { const rec = attrOrig.get(el); if (!rec) return; for (const a in rec) if (el.getAttribute(a) === rec[a].r) el.setAttribute(a, rec[a].o); attrOrig.delete(el); });
    }
    let obs = null, pending = new Set(), raf = 0;
    const flush = () => { raf = 0; const items = Array.from(pending); pending.clear(); items.forEach(walk); };
    window.__applyUiMode = function (mode) {
        window.__uiMode = mode === 'study' ? 'study' : 'thienkieu';
        try { localStorage.setItem('uiMode', window.__uiMode); } catch (e) {}
        if (obs) { obs.disconnect(); obs = null; }
        const start = () => {
            if (window.__uiMode !== 'study') { restoreAll(); return; }
            walk(document.body);
            obs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(n => pending.add(n)); else if (m.type === 'characterData') pending.add(m.target); else if (m.type === 'attributes') pending.add(m.target); } if (!raf) raf = requestAnimationFrame(flush); });
            obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        };
        if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    };
    // Khởi tạo: ưu tiên ?mode=hoctap trên đường dẫn (tiện cho ban giám khảo), sau đó lưu trên thiết bị
    let init = 'thienkieu';
    try { const q = new URLSearchParams(location.search).get('mode'); init = (q === 'hoctap' || q === 'study') ? 'study' : (q === 'thienkieu' ? 'thienkieu' : (localStorage.getItem('uiMode') || 'thienkieu')); } catch (e) {}
    window.__applyUiMode(init);
})();


// ===== GIAO DIỆN SÁNG / TỐI / TỰ ĐỘNG (theo hệ thống) =====
// Đặt thuộc tính data-theme trên <html> ngay khi tải (tránh nháy màu); phần CSS nằm ở css/styles.css (khối THEME LIGHT).
(function () {
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
    const effective = (mode) => mode === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : (mode === 'light' ? 'light' : 'dark');
    window.__applyTheme = function (mode) {
        mode = (mode === 'light' || mode === 'auto') ? mode : 'dark';
        window.__themeMode = mode;
        try { localStorage.setItem('theme', mode); } catch (e) {}
        const eff = effective(mode);
        document.documentElement.setAttribute('data-theme', eff);
        let m = document.querySelector('meta[name="theme-color"]');
        if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
        m.content = eff === 'light' ? '#e7e7ea' : '#000000';
    };
    if (mq) { const onChange = () => { if (window.__themeMode === 'auto') window.__applyTheme('auto'); }; if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange); }
    let saved = 'dark'; try { saved = localStorage.getItem('theme') || 'dark'; } catch (e) {}
    window.__applyTheme(saved);
})();
