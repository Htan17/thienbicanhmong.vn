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
                box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; padding:20px; text-align:center;';
                msgEl = document.createElement('p');
                msgEl.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 18px 0; white-space:pre-wrap;';
                btnEl = document.createElement('button');
                btnEl.textContent = 'ĐÃ RÕ';
                btnEl.style.cssText = 'background:#eab308; color:#000; border:none; padding:10px 28px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase;';
                box.appendChild(msgEl); box.appendChild(btnEl); overlay.appendChild(box);
            };
            window.alert = function(message) {
                try {
                    if (!overlay) buildDom();
                    msgEl.textContent = message;
                    document.body.appendChild(overlay);
                    if (window.__playSfx) window.__playSfx('CLICK'); // 🆕 phát âm thanh khi popup hiện ra (trước đây im lặng)
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
                    box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; padding:20px; text-align:center;';
                    const msgEl = document.createElement('p');
                    msgEl.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 18px 0; white-space:pre-wrap;';
                    msgEl.textContent = message;
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
                box.style.cssText = 'background:#0a0a0a; border:2px solid #b8860b; box-shadow:0 0 25px rgba(234,179,8,0.35); max-width:340px; width:100%; padding:20px; text-align:center;';
                const msg = document.createElement('p');
                msg.style.cssText = 'color:#e5e5e5; font-size:13px; line-height:1.6; margin:0 0 16px 0; white-space:pre-wrap;';
                msg.textContent = message; box.appendChild(msg);
                const mk = (txt, css, val) => { const b = document.createElement('button'); b.textContent = txt; b.style.cssText = 'display:block; width:100%; padding:10px 14px; margin-top:8px; font-weight:900; font-size:11px; letter-spacing:1px; cursor:pointer; text-transform:uppercase; ' + css; b.onclick = () => { if (window.__playSfx) window.__playSfx('CLICK'); overlay.remove(); resolve(val); }; box.appendChild(b); };
                mk('LƯU THAY ĐỔI', 'background:#eab308; color:#000; border:none;', 'save');
                mk('HỦY THAY ĐỔI', 'background:#7f1d1d; color:#fecaca; border:1px solid #ef4444;', 'discard');
                mk('TIẾP TỤC CHỈNH SỬA', 'background:#27272a; color:#d4d4d8; border:1px solid #52525b;', 'stay');
                overlay.appendChild(box); document.body.appendChild(overlay);
                if (window.__playSfx) window.__playSfx('CLICK');
            });
        };
