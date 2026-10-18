        const safeGetItem = (key) => { try { return localStorage.getItem(key); } catch(e) { return null; } };
        const safeSetItem = (key, val) => { try { localStorage.setItem(key, val); } catch(e) { console.warn("Lỗi ghi nhớ:", e); } };
        
        const RESET_TIME_KEY = 'thien_kieu_v86_reset'; const SEASON_DURATION = 48 * 60 * 60 * 1000; 
        const GUILD_RESET_TIME_KEY = 'thien_kieu_guild_reset_v1'; const GUILD_SEASON_DURATION = 3 * 24 * 60 * 60 * 1000; 

        const firebaseConfig = { apiKey: "AIzaSyAtnPNb-nGauIQZOwVcErwF3FiYcIeN5bw", authDomain: "thienbicanhmong.firebaseapp.com", projectId: "thienbicanhmong", storageBucket: "thienbicanhmong.firebasestorage.app", messagingSenderId: "921080331892", appId: "1:921080331892:web:ef3ed0c8be1e99cb4c5b21" };
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        const auth = firebase.auth(); const firestore = firebase.firestore();

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
        // 🔊 Âm thanh cho MỌI nút bấm: nếu thao tác không tự phát tiếng riêng thì phát tiếng 'TAP' nhẹ
        document.addEventListener('click', e => {
            if (window.__sfxMuted) return;
            const b = e.target && e.target.closest ? e.target.closest('button, [role=button], label, summary') : null;
            if (!b || (Date.now() - (window.__lastSfxAt || 0)) < 150) return;
            window.__synthSfx('TAP');
        }, false);
        // 📜 Người dùng tự cuộn tay -> tạm dừng tự cuộn phụ đề 4 giây (hết giật/khựng)
        ['wheel','touchmove','mousedown'].forEach(ev => document.addEventListener(ev, () => { window.__trUserScroll = Date.now(); }, { passive: true }));
        window.__synthSfx = function(key) {
            window.__lastSfxAt = Date.now();
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
                    COMBO: [[988,0,.07],[1319,.07,.07],[1568,.14,.2]]
                };
                (P[key] || P.CLICK).forEach(([f,t,d,type,v]) => {
                    const o = ctx.createOscillator(), g = ctx.createGain(), st = ctx.currentTime + t;
                    o.type = type || 'sine'; o.frequency.value = f;
                    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(v || .18, st + .01); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
                    o.connect(g); g.connect(ctx.destination); o.start(st); o.stop(st + d + .02);
                });
            } catch (e) {}
        };
        ['pointerdown','keydown'].forEach(ev => document.addEventListener(ev, () => { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const c = window.__sfxCtx || (window.__sfxCtx = new AC()); if (c.state === 'suspended') c.resume(); } } catch(e){} }, { passive: true }));
        const AUDIO_URLS = {
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
        // ⚠️ Nhạc nền tạm thời trên là 1 bản demo của Mixkit (chỉ để đảm bảo link không bị chặn hotlink).
        // Nhạc này KHÔNG hợp tông cổ trang - vào Cài Đặt > "Tải nhạc nền lên" để tự chọn 1 bài nhạc cổ phong .mp3 bạn thích, sẽ thay thế ngay lập tức và lưu tốt hơn link ngoài.
        const GIFT_CODES = { 'TRIEUQUOCDOANVIP': {s:999999999, f:999999999}, 'DAODUCMATHAN': {s:2000, f:0}, 'COCHANNHAN666': {s:1500, f:0}, 'THIENKIEU2026': {s:1000, f:0}, 'SAOBANG2000': {s:0, f:2000}, 'TONGCHUQUANLAM': {s:999999, f:99999} };

        // CẢNH GIỚI MỚI
        // 🎁 CÔNG DỤNG ĐỘT PHÁ: mỗi cảnh giới cho +5%/bậc Linh Thạch kiếm được vĩnh viễn từ việc phá Ải
        // (bonusPercent), thay vì Đột Phá chỉ đổi màu/tên suông như trước.
        const RANKS = [
            { id: 'refining', name: 'Luyện Khí', color: '#94a3b8', price: 0, reqFame: 0, level: 1, bonusPercent: 0 },
            { id: 'foundation', name: 'Trúc Cơ', color: '#22c55e', price: 500, reqFame: 0, level: 2, bonusPercent: 5 },
            { id: 'goldencore', name: 'Kim Đan', color: '#eab308', price: 2000, reqFame: 0, level: 3, bonusPercent: 10 },
            { id: 'nascent', name: 'Nguyên Anh', color: '#a855f7', price: 5000, reqFame: 0, level: 4, bonusPercent: 15 },
            { id: 'divine', name: 'Hóa Thần', color: '#ec4899', price: 10000, reqFame: 1000, level: 5, bonusPercent: 20 },
            { id: 'greatsage', name: 'Đại Thánh', color: '#ff4500', price: 25000, reqFame: 3000, level: 6, bonusPercent: 25 },
            { id: 'immortal', name: 'Tiên Tôn', color: '#00ffff', price: 50000, reqFame: 10000, level: 7, bonusPercent: 30 },
            { id: 'tiende', name: 'Tiên Đế', color: '#ff00ff', price: 100000, reqFame: 25000, level: 8, bonusPercent: 35 },
            { id: 'daoto', name: 'Đạo Tổ', color: '#00ff00', price: 250000, reqFame: 50000, level: 9, bonusPercent: 40 },
            { id: 'sangthe', name: 'Sáng Thế Thần', color: '#ffffff', price: 500000, reqFame: 100000, level: 10, bonusPercent: 45 }
        ];
        const getRankBonusPercent = (rankId) => (RANKS.find(r => r.id === rankId)?.bonusPercent) || 0;

        // ============================================================
        // 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): hằng số dùng riêng cho tính năng lộ trình luyện thi có sơ đồ
        // cây (Đạo Đồ) kiểu Duolingo. Xem thêm state/logic ở khu vực "TU LUYỆN CHI LỘ" bên trong App().
        // ============================================================
        // 4 mức độ khó người học tự chọn khi khai mở Đạo Lộ - quyết định số câu/ngày, tần suất ải ôn
        // tập xen kẽ (reviewEvery) và có Ải Boss tổng kết cuối mỗi chặng hay không (bossEvery).
        const EXAM_DIFFICULTY = [
            { id: 'ez', name: 'Nhập Môn', icon: '🌱', color: '#4ade80', qPerDay: 6, reviewEvery: 5, bossEvery: 0, desc: 'Học nhẹ nhàng, ít câu mỗi ngày, không có Ải Boss.' },
            { id: 'normal', name: 'Tu Luyện', icon: '⚔️', color: '#22d3ee', qPerDay: 10, reviewEvery: 4, bossEvery: 7, desc: 'Nhịp độ vừa phải, có ải ôn tập xen kẽ.' },
            { id: 'hard', name: 'Khổ Luyện', icon: '🔥', color: '#f97316', qPerDay: 14, reviewEvery: 3, bossEvery: 5, desc: 'Câu hỏi dày đặc, ôn tập liên tục.' },
            { id: 'hardcore', name: 'Luyện Ngục', icon: '💀', color: '#ef4444', qPerDay: 20, reviewEvery: 2, bossEvery: 3, desc: 'Cường độ tối đa - chỉ dành cho bậc quyết tâm cao nhất.' }
        ];
        const getExamDifficulty = (id) => EXAM_DIFFICULTY.find(d => d.id === id) || EXAM_DIFFICULTY[1];
        // Gợi ý nhanh (chip bấm chọn) khi khai mở Đạo Lộ theo "Môn Học Cụ Thể" - người học vẫn có thể tự
        // gõ thêm môn khác không có trong danh sách này.
        const EXAM_SUBJECT_SUGGESTIONS = ['Toán', 'Ngữ Văn', 'Tiếng Anh', 'Vật Lý', 'Hoá Học', 'Sinh Học', 'Lịch Sử', 'Địa Lý', 'GDCD/KTPL', 'Tin Học'];
        // 🏅 PHONG THÁI ĐẠO HỮU: danh hiệu nhỏ (KHÔNG bán, KHÔNG mua được bằng Linh Thạch/Danh Vọng) chỉ
        // thưởng riêng cho Top 3 Đạo Hữu Bảng mỗi ngày (xem finalizeExamPathDailyReset). Người nhận có
        // thể chọn hiển thị cạnh tên (examPathActiveTitle) hoặc gỡ bất kỳ lúc nào, y hệt cơ chế Khung Tên.
        const EXAM_PATH_TITLES = [
            { id: 'ept_1', name: 'Đạo Hữu Đứng Đầu Hôm Nay', class: 'ept-gold' },
            { id: 'ept_2', name: 'Đạo Hữu Nhị Vị Hôm Nay', class: 'ept-silver' },
            { id: 'ept_3', name: 'Đạo Hữu Tam Vị Hôm Nay', class: 'ept-bronze' }
        ];

        const FRAMES = [
            { id: 'luctruc', name: 'Lục Trúc', price: 50, color: '#22c55e' },
            { id: 'huyetma', name: 'Huyết Ma', price: 100, color: '#dc2626' },
            { id: 'cuuu', name: 'Cửu U', price: 200, color: '#a855f7' },
            { id: 'chanlong', name: 'Chân Long', price: 500, color: '#ffdf00' },
            { id: 'viemde', name: 'Viêm Đế', price: 1000, color: '#ff4500' },
            { id: 'banghan', name: 'Băng Hàn', price: 2000, color: '#00ffff' },
            { id: 'mathan', name: 'Ma Thần', price: 5000, color: '#8b0000' }
        ];

        const NAME_FRAMES = [
            { id: 'nf_vip', name: 'VIP', price: 150, class: 'nf-vip' },
            { id: 'nf_maton', name: 'Ma Tôn', price: 300, class: 'nf-maton' },
            { id: 'nf_kiemthan', name: 'Kiếm Thần', price: 500, class: 'nf-kiemthan' },
            { id: 'nf_daoton', name: 'Đạo Tôn', price: 800, class: 'nf-daoton' },
            { id: 'nf_viemde', name: 'Viêm Đế', price: 1000, class: 'nf-viemde' },
            { id: 'nf_tiende', name: 'Tiên Đế', price: 2000, class: 'nf-tiende' },
            { id: 'nf_thanthoai', name: 'Thần Thoại', price: 5000, class: 'nf-thanthoai' },
            { id: 'nf_tongsu', name: 'Tông Sư', price: 99999, class: 'nf-tongsu' } 
        ];

        const NAME_COLORS = [
            { id: 'nc_cyan', name: 'Lam Băng', price: 1000, color: '#00ffff' },
            { id: 'nc_pink', name: 'Hồng Liên', price: 1500, color: '#ff00ff' },
            { id: 'nc_green', name: 'Lục Nguyệt', price: 2000, color: '#22c55e' },
            { id: 'nc_purple', name: 'Tử Sát', price: 2500, color: '#a855f7' },
            { id: 'nc_gold', name: 'Kim Tôn', price: 3000, color: '#ffdf00' },
            { id: 'nc_blood', name: 'Huyết Nguyệt', price: 4000, color: '#dc2626' },
            { id: 'nc_darkgold', name: 'Hắc Kim', price: 5000, color: '#b8860b' }
        ];

        const PERSONAL_AURAS = [
            { id: 'pa_sacred', name: 'Thánh Quang', price: 5000, class: 'aura-sacred' },
            { id: 'pa_blood', name: 'Huyết Sát', price: 5000, class: 'aura-blood' },
            { id: 'pa_gold', name: 'Hoàng Kim', price: 8000, class: 'aura-gold' },
            { id: 'pa_rainbow', name: 'Cầu Vồng', price: 10000, class: 'aura-rainbow' },
            { id: 'pa_starlight', name: 'Tinh Tú', price: 15000, class: 'aura-starlight' },
            { id: 'pa_chaos', name: 'Hỗn Độn', price: 99999, class: 'aura-chaos' } 
        ];

        // ĐỒ TRANG TRÍ APP (SHOP THEME & BOARD FRAME)
        const APP_THEMES = [
            { id: 'theme-blood', name: 'Huyết Quỷ (Màu Nền)', price: 3000 },
            { id: 'theme-abyss', name: 'Vực Sâu (Màu Nền)', price: 3000 },
            { id: 'theme-gold', name: 'Hoàng Kim (Màu Nền)', price: 8000 }
        ];

        const ITEMS = [
            { id: 'tay_tuy_dan', name: 'Tẩy Tủy Đan', price: 1000, icon: '💊', desc: 'Bảo vật sưu tầm (chưa có công dụng đặc biệt)' },
            { id: 'thien_dao_lenh', name: 'Thiên Đạo Lệnh', price: 2000, icon: '📜', desc: 'Bảo vật sưu tầm (chưa có công dụng đặc biệt)' },
            { id: 'x2_card', name: 'Bùa Nhân Đôi', price: 3000, icon: '🧧', desc: 'Kích hoạt để NHÂN ĐÔI Linh Thạch nhận được từ MỌI lượt Vượt Ải & Lưu Bài Học Video trong 2 giờ kế tiếp (tối đa 2 lượt mua/ngày)' },
            { id: 'aura_laoma', name: 'Hào Quang Lão Ma', price: 5000, icon: '🔥' }
        ];

        const GUILD_BEASTS = [
            { id: 'gb_dragon', name: 'Thanh Long', icon: '🐉', price: 1500 },
            { id: 'gb_tiger', name: 'Bạch Hổ', icon: '🐅', price: 1500 },
            { id: 'gb_bird', name: 'Chu Tước', icon: '🦅', price: 1500 },
            { id: 'gb_turtle', name: 'Huyền Vũ', icon: '🐢', price: 1500 }
        ];

        const generateGameId = () => Math.floor(10000000 + Math.random() * 90000000).toString();
        const generateGuildId = () => Math.floor(100000 + Math.random() * 900000).toString();
        // Rút gọn số lớn để không tràn thanh chỉ số: 999 giữ nguyên, 1.2k, 45k, 3.4m...
        const formatNumber = (num) => {
            const n = Number(num) || 0;
            const sign = n < 0 ? '-' : '';
            const abs = Math.abs(n);
            if (abs < 1000) return sign + abs.toString();
            if (abs < 1000000) return sign + (Math.floor(abs / 100) / 10).toString().replace(/\.0$/, '') + 'k';
            if (abs < 1000000000) return sign + (Math.floor(abs / 100000) / 10).toString().replace(/\.0$/, '') + 'm';
            return sign + (Math.floor(abs / 100000000) / 10).toString().replace(/\.0$/, '') + 'b';
        };
        // SỬA LỖI THÔNG BÁO DÀI NGOẰNG: lỗi API Gemini (đặc biệt lỗi hết quota) trả về nguyên đoạn văn
        // dài hàng chục dòng (link tài liệu, danh sách chi tiết từng quota...). Rút gọn lại thành 1 câu
        // ngắn, dễ hiểu bằng tiếng Việt, chỉ giữ nguyên câu gốc nếu nó vốn đã ngắn.
        const shortErr = (msg) => {
            const raw = String(msg || 'Không rõ nguyên nhân');
            if (/quota|429|resource.?exhausted/i.test(raw)) {
                return 'Hết lượt dùng miễn phí (Quota) cho API Key rồi! Hãy chờ vài phút rồi thử lại, hoặc thêm Key thứ 2 (từ dự án Google khác) ở mục Hồ Sơ để AI chạy song song.';
            }
            if (/api key not valid|invalid.?api.?key|permission.?denied|api_key_invalid/i.test(raw)) {
                return 'API Key Gemini không hợp lệ! Hãy kiểm tra lại Key đã dán đúng chưa.';
            }
            const oneLine = raw.replace(/\s+/g, ' ').trim();
            return oneLine.length > 140 ? oneLine.slice(0, 140) + '...' : oneLine;
        };
        // 🛰️ GỌI GEMINI API VỚI TỰ ĐỘNG DỰ PHÒNG MODEL: Google liên tục khai tử/đổi tên model (2.0-flash rồi
        // 2.5-flash đều lần lượt bị ngừng cấp cho user mới trong 2026) khiến app hay bị lỗi "hết quota"/"not
        // found" giả. Thử lần lượt từng model trong danh sách, hễ model nào bị khai tử/không tồn tại thì tự
        // động thử model kế tiếp, chỉ thật sự báo lỗi khi TẤT CẢ đều thất bại.
        const GEMINI_MODEL_CANDIDATES = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
        // ⏳ Lỗi "hết quota"/giới hạn tốc độ (429) của tầng miễn phí thường chỉ là tạm thời (giới hạn theo
        // PHÚT, không phải theo ngày) -> trước đây báo lỗi ngay khiến người dùng tưởng hết hạn dùng hẳn.
        // Giờ tự đợi rồi thử lại TOÀN BỘ danh sách model 1 lần nữa trước khi thật sự báo lỗi.
        const isTransientQuotaError = (msg) => /quota|rate.?limit|429|resource_exhausted|hết lượt/i.test(msg || '');
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        // 🔑🔑 BỂ 2 API KEY: Key 1 (chính) lưu như cũ ở 'geminiApiKey'; Key 2 (phụ) lưu ở 'geminiApiKey2' +
        // Firestore users/{uid}/private/settings. Mỗi lời gọi AI lập 1 "kế hoạch thử" theo thứ tự: model tốt nhất
        // với từng Key trước, rồi mới tới model dự phòng. Nghĩa là Key 1 lỗi (hết lượt / sai / treo / máy chủ bận)
        // thì lời gọi CHUYỂN NGAY sang Key 2 ở cùng model, không phải chờ thử hết các model của Key 1.
        //  - Chế độ "Song song": mỗi lời gọi bắt đầu từ Key luân phiên -> nhiều lời gọi cùng lúc chia đều 2 Key.
        //  - Chế độ "Dự phòng": luôn thử Key 1 trước, Key 2 chỉ chạy khi Key 1 không gọi được.
        // Hạn mức Gemini tính theo (dự án Google x model) nên trạng thái nghỉ cũng ghi theo từng Key + model.
        const GEMINI_TIMEOUT = { text: 60000, video: 240000 };
        const KEY_INVALID_RE = /api key not valid|invalid.?api.?key|api_key_invalid|permission.?denied|api key expired|key.?expired|api_key_service_blocked|referer.*blocked|ip address restriction|api key.*(disabled|suspended)/i;
        const SERVER_BUSY_RE = /overloaded|unavailable|503|500|internal error|deadline|timed? ?out|timeout|failed to fetch|network|abort|load failed/i;
        const geminiErrKind = (em) => {
            em = em || '';
            if (KEY_INVALID_RE.test(em)) return 'invalid';
            if (/no longer available|not.?found|not.?supported|404/i.test(em)) return 'notfound';
            if (isTransientQuotaError(em)) return 'quota';
            if (SERVER_BUSY_RE.test(em)) return 'busy';
            return 'other';
        };
        const GeminiPool = (() => {
            const LS = 'geminiApiKey2', LM = 'geminiKeyMode';
            let k2 = '', mode = 'parallel';
            try { k2 = (localStorage.getItem(LS) || '').trim(); mode = localStorage.getItem(LM) === 'backup' ? 'backup' : 'parallel'; } catch (e) {}
            const cool = {}, bad = {}, deadModel = {}, stat = {}; let rr = 0; const subs = new Set();
            const ck = (k, m) => k + '|' + m;
            const st = k => stat[k] || (stat[k] = { ok: 0, err: 0, last: '' });
            const emit = () => subs.forEach(f => { try { f(); } catch (e) {} });
            const api = {
                subscribe: f => { subs.add(f); return () => subs.delete(f); },
                getSecondary: () => k2,
                setSecondary(k) { k2 = (k || '').trim(); try { if (k2) localStorage.setItem(LS, k2); else localStorage.removeItem(LS); } catch (e) {} emit(); },
                getMode: () => mode,
                setMode(m) { mode = m === 'backup' ? 'backup' : 'parallel'; try { localStorage.setItem(LM, mode); } catch (e) {} emit(); },
                list(primary) { const a = [(primary || '').trim(), k2].filter(Boolean); return a.filter((k, i) => a.indexOf(k) === i); },
                isBad: k => !!bad[k],
                plan(primary) {
                    const all = api.list(primary), now = Date.now(), live = all.filter(k => !bad[k]);
                    let keys = live;
                    if (mode === 'parallel' && live.length > 1) { const s = rr++ % live.length; keys = live.slice(s).concat(live.slice(0, s)); }
                    const ready = [], rest = [];
                    GEMINI_MODEL_CANDIDATES.forEach(m => {
                        if (deadModel[m] > now) return;
                        keys.forEach(k => (cool[ck(k, m)] > now ? rest : ready).push({ key: k, model: m }));
                    });
                    rest.sort((a, b) => cool[ck(a.key, a.model)] - cool[ck(b.key, b.model)]);
                    let plan = ready.concat(rest);
                    if (!plan.length) { plan = []; GEMINI_MODEL_CANDIDATES.forEach(m => all.forEach(k => plan.push({ key: k, model: m }))); }
                    return plan;
                },
                report(key, model, kind, msg) {
                    const s = st(key);
                    if (kind === 'ok') { s.ok++; s.last = ''; delete cool[ck(key, model)]; delete bad[key]; }
                    else if (kind === 'quota') { s.err++; cool[ck(key, model)] = Date.now() + 65000; s.last = 'Hết lượt (' + model + ')'; }
                    else if (kind === 'invalid') { s.err++; bad[key] = true; s.last = 'Key không hợp lệ / bị chặn'; }
                    else if (kind === 'notfound') { deadModel[model] = Date.now() + 600000; }
                    else if (kind === 'busy') { s.err++; cool[ck(key, model)] = Date.now() + 15000; s.last = shortErr(msg); }
                    else { s.err++; s.last = shortErr(msg); }
                    emit();
                },
                reset(key) { delete bad[key]; GEMINI_MODEL_CANDIDATES.forEach(m => delete cool[ck(key, m)]); emit(); },
                lastOf: k => (k && stat[k] && stat[k].last) || '',
                statusOf(key) {
                    if (!key) return { text: 'Chưa nhập', cls: 'text-zinc-500' };
                    if (bad[key]) return { text: '✗ Không hợp lệ', cls: 'text-red-400' };
                    const now = Date.now(), main = GEMINI_MODEL_CANDIDATES.find(m => !(deadModel[m] > now));
                    if (main && cool[ck(key, main)] > now) {
                        const left = cool[ck(key, main)] - now;
                        return { text: '⏳ Nghỉ ' + Math.ceil(left / 1000) + 's', cls: 'text-amber-400' };
                    }
                    const s = stat[key];
                    return { text: '✓ Sẵn sàng' + (s && s.ok ? ' · ' + s.ok + ' lượt' : ''), cls: 'text-emerald-400' };
                },
                summary(primary) {
                    const n = api.list(primary).length;
                    if (n >= 2) return mode === 'backup' ? 'Key 1 chạy trước, Key 2 tự thay khi Key 1 không gọi được' : '2 Key chạy song song, Key nào lỗi sẽ tự chuyển sang Key kia';
                    return n === 1 ? 'Mới có 1 Key (thêm Key thứ 2 để có dự phòng và tăng sức AI)' : 'Chưa có Key nào';
                }
            };
            return api;
        })();
        const geminiGenerateContent = async (apiKey, parts, _retried = false) => {
            const plan = GeminiPool.plan(apiKey);
            if (!plan.length) throw new Error('Chưa có API Key Gemini');
            const isVideo = Array.isArray(parts) && parts.some(p => p && (p.file_data || p.fileData));
            const timeoutMs = isVideo ? GEMINI_TIMEOUT.video : GEMINI_TIMEOUT.text;
            let lastErr = null, quotaErr = null, busyErr = null;
            for (const { key, model } of plan) {
                if (GeminiPool.isBad(key)) continue;           // Key vừa bị loại ngay trong lời gọi này
                const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts }] }), signal: ctl ? ctl.signal : undefined
                    });
                    const data = await res.json();
                    if (timer) clearTimeout(timer);
                    if (data.error) {
                        const em = data.error.message || data.error.status || '';
                        const err = new Error(data.error.message || 'Lỗi Gemini API'); err.kind = geminiErrKind(em); throw err;
                    }
                    GeminiPool.report(key, model, 'ok');
                    return data;
                } catch (e) {
                    if (timer) clearTimeout(timer);
                    const aborted = e && e.name === 'AbortError';
                    const msg = aborted ? 'Quá thời gian chờ (timeout)' : ((e && e.message) || '');
                    const kind = e && e.kind ? e.kind : (aborted ? 'busy' : geminiErrKind(msg));
                    lastErr = aborted ? new Error(msg) : (e instanceof Error ? e : new Error(msg));
                    GeminiPool.report(key, model, kind, msg);
                    if (kind === 'quota') quotaErr = quotaErr || lastErr;
                    else if (kind === 'busy') busyErr = busyErr || lastErr;
                }
            }
            // Mọi tổ hợp Key x model đều tạm thời không dùng được -> đợi vài giây rồi thử lại TOÀN BỘ 1 lần.
            if (!_retried && (quotaErr || busyErr)) {
                await sleep(quotaErr ? (GeminiPool.list(apiKey).length > 1 ? 4000 : 6000) : 2500);
                return geminiGenerateContent(apiKey, parts, true);
            }
            throw quotaErr || busyErr || lastErr || new Error('Không có model Gemini nào khả dụng lúc này');
        };
        // 🧪 Thử 1 Key: trả về { kind: 'ok' | 'quota' | 'invalid' | 'error', msg }
        const geminiTestKey = async (key) => {
            GeminiPool.reset(key);
            let tried = 0, quotaHits = 0, skipped = 0, last = '';
            for (const model of GEMINI_MODEL_CANDIDATES) {
                tried++;
                const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timer = ctl ? setTimeout(() => ctl.abort(), 20000) : null;
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: 'Trả lời đúng 1 từ: OK' }] }] }), signal: ctl ? ctl.signal : undefined
                    });
                    const data = await res.json(); if (timer) clearTimeout(timer);
                    if (!data.error) { GeminiPool.report(key, model, 'ok'); return { kind: 'ok' }; }
                    const em = data.error.message || data.error.status || '', kind = geminiErrKind(em); last = em;
                    if (kind === 'invalid') { GeminiPool.report(key, model, 'invalid'); return { kind: 'invalid' }; }
                    if (kind === 'notfound') { skipped++; continue; }
                    if (kind === 'quota') { quotaHits++; GeminiPool.report(key, model, 'quota'); continue; }
                    GeminiPool.report(key, model, kind, em);
                } catch (e) { if (timer) clearTimeout(timer); last = (e && e.name === 'AbortError') ? 'Quá thời gian chờ (timeout)' : (e && e.message) || ''; GeminiPool.report(key, model, 'busy', last); }
            }
            if (quotaHits > 0 && quotaHits === tried - skipped) return { kind: 'quota' };
            return { kind: 'error', msg: shortErr(last) };
        };
        // Lấy ID video từ mọi kiểu link YouTube phổ biến (watch?v=, youtu.be/, shorts/, embed/)
        const extractYouTubeId = (url) => {
            if (!url) return null;
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
            ];
            for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
            return null;
        };
        const shuffleArray = (array) => { let res = [...array]; for (let i = res.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [res[i], res[j]] = [res[j], res[i]]; } return res; };

        // 🆕 TÁCH RIÊNG bộ phân tích cú pháp văn bản đề thi thành hàm dùng chung (dùng khi TẠO Bí Tịch mới
        // VÀ khi THÊM câu hỏi bằng cách dán văn bản trong màn hình CHỈNH SỬA ẢI) - tránh lặp code 2 nơi.
        // Hỗ trợ 3 kiểu câu hỏi:
        // - Mặc định (1 đáp án): "Đáp án: A"
        // - Nhiều ý đúng/sai (dạng đề Vật Lý/Hoá mới): "Đáp án: A,C" (liệt kê từ 2 chữ cái trở lên)
        // - Điền số (câu tính toán, KHÔNG cần liệt kê A/B/C/D): chỉ ghi thẳng "Đáp án: 12.5"
        const parseRawQuizText = (rawQuizText) => {
            const questionList = []; let currentQuestion = null;
            const canPush = (q) => q && (q.o.length >= 2 || q.type === 'numeric');
            (rawQuizText || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
                if (/^(Câu|Bài|Q)\s*\d+/i.test(line) || line.includes('?')) {
                    if (canPush(currentQuestion)) questionList.push(currentQuestion);
                    currentQuestion = { q: line.replace(/^(Câu|Bài|Q)\s*\d+[\.\:\s\-]*/i,'').trim(), o: [], c: 0, type: 'single' };
                } else if (/^[A-D][\.\:\)]/i.test(line)) {
                    if (currentQuestion && currentQuestion.o.length < 4) { currentQuestion.o.push(line.replace(/^[A-D][\.\:\)]\s*/i,'').trim()); }
                } else if (/^(Đáp án|DA)[\s\:\.]*/i.test(line)) {
                    if (!currentQuestion) return;
                    const rest = line.replace(/^(Đáp án|DA)[\s\:\.]*/i, '').trim();
                    const letters = [...new Set((rest.match(/[A-D]/gi) || []).map(l => l.toUpperCase()))];
                    if (currentQuestion.o.length > 0 && letters.length >= 2) {
                        currentQuestion.type = 'multi';
                        currentQuestion.c = letters.map(l => l.charCodeAt(0) - 65).sort((a,b) => a - b);
                    } else if (currentQuestion.o.length > 0 && letters.length === 1) {
                        currentQuestion.type = 'single';
                        currentQuestion.c = letters[0].charCodeAt(0) - 65;
                    } else {
                        const numMatch = rest.replace(/,/g, '.').match(/-?\d+(\.\d+)?/);
                        if (numMatch) { currentQuestion.type = 'numeric'; currentQuestion.c = numMatch[0]; }
                    }
                }
            });
            if (canPush(currentQuestion)) questionList.push(currentQuestion);
            return questionList;
        };

        // 🆕 Nén 1 file ảnh thành chuỗi base64 (JPEG, tối đa 900px chiều dài cạnh lớn nhất) để đính kèm
        // vào câu hỏi (ảnh sơ đồ, đồ thị...) mà không làm phình quá to dữ liệu lưu trên Firestore.
        const compressImageFile = (file, maxDim = 900, quality = 0.72) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
            reader.onload = (ev) => {
                const img = new Image();
                img.onerror = () => reject(new Error('Ảnh bị lỗi hoặc không đúng định dạng'));
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxDim || height > maxDim) {
                        if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
                        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // 🆕 SỬA LỖI HIỂN THỊ KÝ TỰ TOÁN/LÝ TỪ AI: Gemini đôi khi trả về công thức bằng cú pháp LaTeX
        // (\pi, \frac{a}{b}, \(...\), $...$) hoặc bằng bộ ký tự Unicode "in nghiêng/đậm" đặc biệt (Mathematical
        // Alphanumeric Symbols, ví dụ 𝑥, 𝐴) mà rất nhiều máy/phông không hiển thị được, hiện ra toàn ô vuông
        // hoặc ký tự lạ. Hàm này chuẩn hoá lại về chữ/ký hiệu Unicode thông thường, hiển thị được trên mọi máy.
        const sanitizeAiMathText = (text) => {
            if (!text) return text;
            // Chuyển chữ Toán in nghiêng/đậm Unicode đặc biệt (𝑥,𝐴,𝜋...) về chữ cái/số bình thường
            let s = String(text).normalize('NFKD');
            // Bỏ dấu phân cách công thức kiểu LaTeX: \( \) \[ \] $$ $
            s = s.replace(/\\\(|\\\)|\\\[|\\\]|\$\$|\$/g, '');
            // Quy đổi 1 số lệnh Hy Lạp/ký hiệu LaTeX phổ biến sang ký hiệu Unicode thường gặp
            const latexMap = [
                [/\\pi/g, 'π'], [/\\omega/g, 'ω'], [/\\theta/g, 'θ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'],
                [/\\gamma/g, 'γ'], [/\\Delta/g, 'Δ'], [/\\delta/g, 'δ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
                [/\\varphi/g, 'φ'], [/\\phi/g, 'φ'], [/\\Sigma/g, 'Σ'], [/\\sigma/g, 'σ'], [/\\infty/g, '∞'],
                [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\approx/g, '≈'], [/\\neq/g, '≠'], [/\\times/g, '×'],
                [/\\cdot/g, '·'], [/\\pm/g, '±'], [/\\rightarrow/g, '→'], [/\\to/g, '→'], [/\\sqrt/g, '√'],
                [/\\Omega/g, 'Ω'], [/\\circ/g, '°'],
            ];
            latexMap.forEach(([re, val]) => { s = s.replace(re, val); });
            // \frac{a}{b} -> (a)/(b)
            s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
            // ^{...} và _{...} -> ^(...) và _(...)
            s = s.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_($1)');
            // dọn dấu { } LaTeX còn sót lại + dấu \ thừa trước chữ cái
            s = s.replace(/[{}]/g, '').replace(/\\(?=[a-zA-Z])/g, '');
            return s;
        };

        // LOGIC MÚI GIỜ CHUẨN XÁC TỪ NGÀI (ĐÃ ĐƯỢC TÍCH HỢP)
        const getVNSourceDate = (date) => {
            return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
        };

        const calculateStreak = (userData) => {
            const now = new Date();
            const today = getVNSourceDate(now);
            
            if (userData.lastPlayedDate === today) { return { streakCount: userData.streakCount || 0, lastPlayedDate: today }; }

            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = getVNSourceDate(yesterdayDate);

            const isConsecutive = userData.lastPlayedDate === yesterdayStr;
            return { streakCount: isConsecutive ? (userData.streakCount || 0) + 1 : 1, lastPlayedDate: today };
        };

        // ============================================================
        // 🗺️ TU LUYỆN CHI LỘ - hàm thuần (không phụ thuộc state React) dùng chung cho Đạo Hữu Bảng
        // (BXH thời gian luyện thi trong ngày) và Đạo Đồ (sơ đồ cây).
        // ============================================================
        // Đạo Hữu Bảng chỉ TÍNH ĐIỂM trong khung giờ 4h00 - 23h00 (giờ Việt Nam) mỗi ngày, để khuyến
        // khích giờ học lành mạnh thay vì cày điểm lúc nửa đêm. Ngoài khung giờ này vẫn luyện Ải bình
        // thường, chỉ là không cộng vào Đạo Hữu Bảng hôm đó.
        const EXAM_PATH_WINDOW_START_HOUR = 4;
        const EXAM_PATH_WINDOW_END_HOUR = 23;
        const getVNHour = (date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(date)) % 24;
        const isExamPathWindowOpen = (date) => { const h = getVNHour(date || new Date()); return h >= EXAM_PATH_WINDOW_START_HOUR && h < EXAM_PATH_WINDOW_END_HOUR; };
        // Tính mốc thời gian (ms) của lần 4h00 sáng (giờ VN) SẮP TỚI kế tiếp - dùng làm "nextReset" cho
        // Đạo Hữu Bảng, theo đúng mô hình meta/season đã có sẵn (xem seasonDocRef trong useEffect chính).
        const getNextExamPathResetTs = (from) => {
            const now = from || new Date();
            const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const next = new Date(vnNow);
            next.setHours(EXAM_PATH_WINDOW_START_HOUR, 0, 0, 0);
            if (next <= vnNow) next.setDate(next.getDate() + 1);
            return now.getTime() + (next.getTime() - vnNow.getTime());
        };
        // Gộp lịch sử các lần luyện (attempts) của TỪNG node theo chủ đề (topics) thành % thành thạo mỗi
        // chủ đề (0-100), dùng để vẽ Bát Quái Đồ. TÍNH THUẦN Ở CLIENT (không cần gọi AI) để luôn nhanh,
        // miễn phí và không phụ thuộc API Key - phần AI (nếu có Key) chỉ dùng để viết THÊM 1 đoạn nhận
        // xét bằng lời (xem getExamPathAiAdvice), không dùng để tính điểm.
        const computeTopicMastery = (examPath) => {
            const acc = {}; // { topic: { correct, total } }
            (examPath?.nodes || []).forEach(n => {
                if (!n.bestScore && n.bestScore !== 0) return; // node chưa luyện lần nào -> bỏ qua
                (n.topics && n.topics.length ? n.topics : ['Tổng Quát']).forEach(t => {
                    if (!acc[t]) acc[t] = { correct: 0, total: 0 };
                    acc[t].correct += n.bestScore; acc[t].total += 100; // bestScore đã là % (0-100)
                });
            });
            const result = {};
            Object.keys(acc).forEach(t => { result[t] = Math.round((acc[t].correct / acc[t].total) * 100); });
            return result;
        };
        // 🎉 Pháo hoa CSS thuần (KHÔNG phụ thuộc file/URL ngoài nên luôn hiển thị được kể cả khi mất
        // mạng/loa lỗi) - dùng khi hoàn thành toàn bộ Đạo Lộ hoặc chốt hạng Đạo Hữu Bảng cuối ngày.
        const ConfettiBurst = () => {
            const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
                id: i, left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1.6 + Math.random() * 1.2,
                color: ['#eab308', '#22d3ee', '#f97316', '#a855f7', '#4ade80', '#ec4899'][i % 6], rot: Math.random() * 360
            })), []);
            return (
                <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
                    {pieces.map(p => (
                        <span key={p.id} className="confetti-piece" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
                    ))}
                </div>
            );
        };

        // 🕸️ BÁT QUÁI ĐỒ: biểu đồ mạng nhện (radar chart) SVG THUẦN TỰ VẼ (không dùng thư viện ngoài, y
        // hệt tinh thần "hand-rolled SVG" đã có sẵn trong app) - vẽ % thành thạo từng chủ đề luyện thi.
        const RadarChart = ({ data }) => {
            const topics = Object.keys(data);
            const N = topics.length;
            const size = 260, cx = size / 2, cy = size / 2, maxR = 88;
            const angleFor = (i) => (Math.PI * 2 * i / N) - Math.PI / 2;
            const pointFor = (i, val) => { const r = (val / 100) * maxR; const a = angleFor(i); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
            const dataPoints = topics.map((t, i) => pointFor(i, data[t]));
            const polygonPoints = dataPoints.map(p => p.join(',')).join(' ');
            return (
                <div className="flex justify-center bg-black/40 border border-zinc-800 py-4">
                    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280 }}>
                        {[0.25, 0.5, 0.75, 1].map(r => (
                            <polygon key={r} points={topics.map((_, i) => pointFor(i, r * 100).join(',')).join(' ')} fill="none" stroke="#3f3f46" strokeWidth="1" />
                        ))}
                        {topics.map((t, i) => { const [x, y] = pointFor(i, 100); return <line key={t} x1={cx} y1={cy} x2={x} y2={y} stroke="#3f3f46" strokeWidth="1" />; })}
                        <polygon points={polygonPoints} fill="rgba(16,185,129,0.35)" stroke="#10b981" strokeWidth="2" />
                        {dataPoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#10b981" />)}
                        {topics.map((t, i) => { const [x, y] = pointFor(i, 122); return <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-axis-label">{t.length > 10 ? t.slice(0, 9) + '…' : t}</text>; })}
                    </svg>
                </div>
            );
        };

        const UserName = ({ u, cls = '' }) => {
            if (!u) return <span className={`inline-block font-black uppercase text-zinc-500 ${cls}`}>Vô Danh</span>;
            let nColor = u.nameColor; let aura = (u.inventory?.includes('aura_laoma') && !nColor) ? 'lao-ma-aura' : '';
            const fObj = NAME_FRAMES.find(f => f.id === u.nameFrame); const wCls = fObj ? fObj.class : ''; let finalColor = nColor ? nColor : (wCls ? undefined : '#ffdf00');
            // 🏅 Danh hiệu Phong Thái Đạo Hữu (Tu Luyện Chi Lộ, nếu đã chọn hiển thị) - hiện như 1 nhãn nhỏ
            // NGAY TRƯỚC tên, gói trong span "inline-flex" thay vì span đơn như cũ để không phá vỡ layout ở
            // MỌI nơi đang gọi <UserName/> (vẫn nằm cùng 1 dòng với tên, cls vẫn áp lên đúng span tên).
            const titleObj = EXAM_PATH_TITLES.find(t => t.id === u.examPathActiveTitle && (u.examPathTitles || []).includes(t.id));
            return (
                <span className="inline-flex items-center gap-1 flex-wrap align-middle">
                    {titleObj && <span className={`text-[7px] px-1 py-0.5 ${titleObj.class}`}>{titleObj.name}</span>}
                    <span className={`inline-block font-black uppercase ${aura} ${wCls} ${cls}`} style={{ color: finalColor }}>{u.name || 'VÔ DANH'}</span>
                </span>
            );
        };
        // 🏆 BẢNG XẾP HẠNG THU NHỎ (Phong Thần Bảng TOP 5) - dùng chung cho MỌI màn hình "kết quả sau khi
        // học" (Vượt Ải thường, Ôn Tập Từ Vựng Video, Lưu Bài Học Video...), để người chơi luôn thấy được
        // vị trí của mình so với người khác ngay sau mỗi lần học, tạo động lực học tiếp.
        const MiniLeaderboard = ({ list, currentUser, title = "Phong Thần Bảng (TOP 5)" }) => {
            if (!list || list.length === 0) return null;
            const top5 = list.slice(0, 5);
            const myIdx = currentUser ? list.findIndex(p => p.uid === currentUser.uid) : -1;
            const me = myIdx >= 5 ? list[myIdx] : null;
            const rowCls = (i, isMe) => {
                let rankCls = "text-zinc-500"; let bgRankCls = "bg-black border-zinc-800";
                if (i === 0) { rankCls = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; bgRankCls = "bg-yellow-900/20 border-yellow-500"; }
                else if (i === 1) { rankCls = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; bgRankCls = "bg-gray-800/30 border-gray-400"; }
                else if (i === 2) { rankCls = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]"; bgRankCls = "bg-orange-900/20 border-orange-500"; }
                if (isMe) bgRankCls = "bg-yellow-900/40 border-yellow-500";
                return { rankCls, bgRankCls };
            };
            return (
                <div className="mt-8 border-t border-yellow-700/30 pt-6 text-left">
                    <h3 className="text-yellow-500 font-black text-xs mb-4 uppercase tracking-widest text-center">{title}</h3>
                    <div className="space-y-2">
                        {top5.map((p, i) => {
                            const { rankCls, bgRankCls } = rowCls(i, currentUser && p.uid === currentUser.uid);
                            return (
                                <div key={p.uid || i} className={`flex justify-between items-center p-2 border ${bgRankCls}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`${rankCls} text-xs font-black w-6 text-center`}>#{i+1}</span>
                                        <img src={p.photo} className={`w-8 h-8 object-cover ${p.frame ? 'frame-'+p.frame : 'border border-zinc-700'} ${p.aura||''}`} alt="avatar" />
                                        <UserName u={p} cls="text-[11px] tracking-wide" />
                                    </div>
                                    <span className="text-green-400 font-black text-xs whitespace-nowrap drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(p.seasonScore || 0)}</span>
                                </div>
                            );
                        })}
                        {me && (
                            <div className="flex justify-between items-center p-2 border bg-yellow-900/40 border-yellow-500 mt-2 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-500 text-xs font-black w-6 text-center">#{myIdx+1}</span>
                                    <img src={me.photo} className={`w-8 h-8 object-cover ${me.frame ? 'frame-'+me.frame : 'border border-zinc-700'} ${me.aura||''}`} alt="avatar" />
                                    <UserName u={me} cls="text-[11px] tracking-wide" />
                                </div>
                                <span className="text-green-400 font-black text-xs whitespace-nowrap drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(me.seasonScore || 0)}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        };
        // 🈶 SỬA LỖI TRA TỪ CHỮ TƯỢNG HÌNH: tiếng Trung/Nhật không có khoảng trắng giữa các từ, nên
        // trước đây tách theo \s+ khiến CẢ CÂU dính thành 1 khối bấm được duy nhất (bấm đâu cũng tra
        // nguyên câu). Giờ phát hiện có ký tự Hán (CJK) trong câu thì dùng Intl.Segmenter (API chuẩn của
        // trình duyệt, có sẵn ICU tách từ tiếng Trung/Nhật rất tốt, KHÔNG cần tải thư viện ngoài) để tách
        // đúng từng "từ/cụm từ đi cùng nhau" (VD: 非常 / 喜欢 tách riêng thay vì dính nguyên câu).
        // Nếu trình duyệt cũ không hỗ trợ Intl.Segmenter thì fallback về tách từng CHỮ HÁN riêng lẻ
        // (vẫn tra được, chỉ là tách nhỏ hơn 1 chút, không bị lỗi dính cả câu như trước).
        const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
        const KANA_RE = /[\u3040-\u30ff]/;
        // 🇰🇷 Hangul (tiếng Hàn): dùng Intl.Segmenter locale 'ko' để tách đúng từ/âm tiết đi cùng nhau
        // (chữ Hàn tuy có khoảng trắng nhưng thường là theo CỤM TỪ chứ không phải từng từ đơn lẻ).
        const HANGUL_RE = /[\uac00-\ud7af]/;
        const segmentCjkText = (text) => {
            const locale = HANGUL_RE.test(text) ? 'ko' : (KANA_RE.test(text) ? 'ja' : 'zh');
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                try {
                    const seg = new Intl.Segmenter(locale, { granularity: 'word' });
                    return Array.from(seg.segment(text), s => s.segment);
                } catch (e) { /* rơi xuống fallback bên dưới */ }
            }
            return Array.from(text); // fallback: tách theo từng chữ (Array.from tôn trọng ký tự Unicode)
        };
        // ✍️ LUYỆN VIẾT CHỮ THEO MẪU: dùng thư viện HanziWriter (chuẩn ngành, có sẵn dữ liệu thứ tự nét
        // của hàng ngàn chữ Hán) để vừa trình diễn hoạt ảnh viết mẫu, vừa cho người học tự viết theo và
        // TỰ ĐỘNG chấm đúng/sai từng nét ngay khi vẽ - đúng kiểu "luyện chữ tăng khả năng ghi nhớ"
        // thay vì chỉ xem chữ suông. Component tách riêng vì HanziWriter tự quản lý canvas/SVG của nó,
        // cần mount 1 lần cho mỗi chữ (qua targetRef), không để React re-render đè lên.
        // ✍️ SỬA LỖI THEO YÊU CẦU: trước đây phải bấm "Tự Viết" mới bắt đầu được, viết xong lại phải tự
        // bấm "Chữ Tiếp Theo" mới sang chữ mới - rất vướng tay. Giờ khung viết sẵn sàng là TỰ ĐỘNG vào
        // luôn chế độ viết (không cần bấm gì cả), viết xong 1 chữ thì tự động chuyển sang chữ kế tiếp sau
        // ít giây. Nút "Xem Mẫu" giờ CHỈ bật lên sau khi người học viết SAI ít nhất 1 nét (đúng ý: viết
        // thử trước, sai thì mới cần xem mẫu để sửa) - trước đó không cho xem mẫu để buộc tự nhớ trước.
        const CharacterWritePractice = ({ char, playSfx, apiKey, meaningCache, onMeaningFetched, onAutoAdvance }) => {
            const { useEffect, useRef, useState } = React;
            const targetRef = useRef(null);
            const writerRef = useRef(null);
            const [status, setStatus] = useState('Đang chuẩn bị nét chữ...');
            const [mistakes, setMistakes] = useState(0);
            const [ready, setReady] = useState(typeof window.HanziWriter !== 'undefined');
            const [completed, setCompleted] = useState(false);
            const [meaning, setMeaning] = useState(meaningCache?.[char] || null);
            const [meaningLoading, setMeaningLoading] = useState(false);
            const advanceTimerRef = useRef(null);

            useEffect(() => {
                if (typeof window.HanziWriter === 'undefined') {
                    // Thư viện tải từ CDN có thể chưa xong kịp lúc component mount lần đầu -> đợi rồi thử lại.
                    const t = setInterval(() => { if (typeof window.HanziWriter !== 'undefined') { setReady(true); clearInterval(t); } }, 300);
                    return () => clearInterval(t);
                }
            }, []);

            const startQuizInternal = (writer) => {
                if (!writer) return;
                setStatus('Viết nét đầu tiên vào khung đi nào...');
                writer.quiz({
                    onMistake: () => { setMistakes(m => m + 1); setStatus('Sai nét rồi, thử lại nét này xem! (giờ có thể bấm "Xem Mẫu" nếu cần)'); playSfx('WRONG'); },
                    onCorrectStroke: (data) => { setStatus(data.strokesRemaining > 0 ? 'Chuẩn! Viết tiếp nét sau...' : 'Nét cuối rồi, cố lên!'); },
                    onComplete: (summary) => {
                        setStatus(summary.totalMistakes === 0 ? '🎉 Hoàn Hảo! Không sai nét nào! Đang sang chữ tiếp...' : `✅ Hoàn thành! Sai ${summary.totalMistakes} lần. Đang sang chữ tiếp...`);
                        setCompleted(true);
                        playSfx('SUCCESS');
                        // ⏭️ TỰ ĐỘNG CHUYỂN CHỮ: viết xong là tự sang chữ kế tiếp sau 1.6s, không cần bấm nút.
                        if (onAutoAdvance) { advanceTimerRef.current = setTimeout(() => onAutoAdvance(), 1600); }
                    }
                });
            };

            useEffect(() => {
                if (!ready || !targetRef.current) return;
                targetRef.current.innerHTML = '';
                setMistakes(0); setCompleted(false);
                setStatus('Đang chuẩn bị nét chữ...');
                if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
                let writer;
                try {
                    writer = window.HanziWriter.create(targetRef.current, char, {
                        width: 260, height: 260, padding: 8,
                        showOutline: true,
                        strokeColor: '#67e8f9',
                        radicalColor: '#f472b6',
                        outlineColor: '#3f3f46',
                        drawingColor: '#facc15',
                        highlightColor: '#a855f7',
                        strokeAnimationSpeed: 1.1,
                        delayBetweenStrokes: 250,
                        showCharacter: false,
                    });
                    writerRef.current = writer;
                    // 🚀 TỰ ĐỘNG VÀO CHẾ ĐỘ VIẾT NGAY, khỏi cần bấm "Tự Viết" như trước.
                    startQuizInternal(writer);
                } catch (e) { setStatus('Không tải được dữ liệu nét chữ cho "' + char + '" (có thể không phải chữ Hán chuẩn).'); }
                return () => { if (targetRef.current) targetRef.current.innerHTML = ''; if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
            }, [char, ready]);

            // 📖 Tra sẵn nghĩa + cấp độ (HSK/N.../TOPIK...) của chữ đang luyện, dùng chung API Key Gemini
            // đã nhập ở màn Học Qua Video. Có cache theo từng chữ nên quay lại chữ cũ không tốn API nữa.
            useEffect(() => {
                setMeaning(meaningCache?.[char] || null);
                if (meaningCache?.[char] || !apiKey) return;
                let cancelled = false;
                setMeaningLoading(true);
                (async () => {
                    try {
                        const prompt = `Chữ Hán: "${char}"\nHãy giải nghĩa chữ này cho người Việt học ngoại ngữ. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"meaning": "nghĩa tiếng Việt của chữ này", "pinyin": "cách đọc Latinh (Pinyin có dấu thanh)", "level": "trình độ phổ biến nhất (VD: HSK1-HSK6); để 'Không rõ' nếu không xác định", "example": "1 từ/cụm ví dụ ngắn có dùng chữ này kèm nghĩa tiếng Việt"}`;
                        const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
                        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
                        const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
                        if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
                        const parsed = JSON.parse(raw);
                        if (!cancelled) { setMeaning(parsed); if (onMeaningFetched) onMeaningFetched(char, parsed); }
                    } catch (e) { /* im lặng bỏ qua, không chặn luyện viết chỉ vì tra nghĩa lỗi */ }
                    finally { if (!cancelled) setMeaningLoading(false); }
                })();
                return () => { cancelled = true; };
            }, [char, apiKey]);

            const showSample = () => { if (writerRef.current) { setStatus('Đang trình diễn thứ tự nét mẫu...'); writerRef.current.animateCharacter({ onComplete: () => setStatus(completed ? 'Đang sang chữ tiếp...' : 'Giờ đến lượt Ngài, viết lại vào khung nhé!') }); } };

            return (
                <div className="text-center">
                    <div ref={targetRef} className="mx-auto bg-black border-2 border-cyan-700 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.25)]" style={{ width: 260, height: 260 }}>
                        {!ready && <p className="text-[10px] text-zinc-500 italic pt-24">Đang tải thư viện nét chữ...</p>}
                    </div>
                    <p className="text-[11px] text-cyan-300 mt-3 font-bold min-h-[32px] leading-snug px-2">{status}</p>
                    {mistakes > 0 && <p className="text-[9px] text-red-400 uppercase font-black">Số lần sai: {mistakes}</p>}
                    <div className="flex gap-2 mt-2">
                        <button onClick={showSample} disabled={!ready || mistakes === 0} title={mistakes === 0 ? 'Viết thử trước đã, sai nét thì nút này mới mở!' : ''} className="flex-1 bg-purple-800 hover:bg-purple-600 disabled:opacity-30 text-white py-2.5 text-[10px] font-black uppercase">👁 Xem Mẫu</button>
                    </div>
                    {/* 📖 NGHĨA / CẤP ĐỘ CỦA CHỮ ĐANG LUYỆN */}
                    <div className="mt-3 bg-black/60 border border-zinc-800 p-2 text-left text-[10px] min-h-[40px]">
                        {meaningLoading && <p className="text-zinc-500 italic text-center">Đang tra nghĩa chữ này...</p>}
                        {!meaningLoading && !meaning && !apiKey && <p className="text-zinc-600 italic text-center">Nhập API Key Gemini ở trên để xem nghĩa/cấp độ chữ này.</p>}
                        {meaning && (
                            <div className="space-y-1">
                                <p><span className="text-yellow-500 font-black uppercase">Nghĩa: </span><span className="text-white">{meaning.meaning}</span> {meaning.level && meaning.level !== 'Không rõ' && <span className="text-[9px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1.5 py-0.5 ml-1 font-black uppercase">{meaning.level}</span>}</p>
                                {meaning.pinyin && <p><span className="text-cyan-400 font-black uppercase">Phiên âm: </span><span className="text-white">{meaning.pinyin}</span></p>}
                                {meaning.example && <p><span className="text-green-400 font-black uppercase">Ví dụ: </span><span className="text-white">{meaning.example}</span></p>}
                            </div>
                        )}
                    </div>
                </div>
            );
        };
        // SỬA LỖI TRA CỤM TỪ (v2): cách cũ bắt bấm LẦN LƯỢT từng chữ liền kề trong 600ms mới ghép được
        // cụm (VD 因为 phải bấm 因 rồi bấm ngay 为) -> rất dễ chỉ bấm trúng 1 chữ (VD chỉ bấm 为) vì
        // người dùng không biết phải bấm nối tiếp. Giờ đổi cách chọn tự nhiên hơn, giống bôi đen văn bản:
        // - Bấm chữ ĐẦU TIÊN của cụm -> chữ đó tô sáng, chờ người dùng bấm tiếp.
        // - Bấm chữ THỨ HAI bất kỳ (không cần liền kề) -> tự động chọn TRỌN cả khoảng từ chữ đầu đến
        //   chữ vừa bấm (VD bấm 因 rồi bấm 为 dù 2 chữ có tách token hay không) -> tra luôn cả cụm 因为.
        // - Bấm lại đúng chữ đầu tiên, hoặc không bấm gì thêm sau ~900ms -> tra đúng 1 chữ đó như cũ.
        const ClickableSentence = ({ text, onWordClick, vocab }) => {
            const { useState, useRef, useEffect } = React;
            // Câu chứa chữ Hán/Kana -> tách theo từ CJK; câu dùng chữ Latinh (có dấu cách) -> tách theo khoảng trắng như cũ.
            const tokens = CJK_RE.test(text) || KANA_RE.test(text) || HANGUL_RE.test(text) ? segmentCjkText(text) : text.split(/(\s+)/);
            // 🎨 TÔ MÀU TỪ VỰNG: token nào nằm trong từ vựng AI đã rút ra sẽ được tô theo độ quan trọng (3 > 2 > 1)
            const marks = (() => {
                if (!vocab || !vocab.length) return null;
                const low = text.toLowerCase(), m = new Array(tokens.length).fill(0); let pos = 0;
                const offs = tokens.map(t => { const o = pos; pos += t.length; return [o, pos]; });
                const isL = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
                vocab.forEach(({ key, tier }) => {
                    let from = 0, at; const latin = /^[\u0000-\u024f]+$/.test(key);
                    while ((at = low.indexOf(key, from)) > -1) {
                        const end = at + key.length;
                        if (!latin || (!isL(low[at - 1]) && !isL(low[end]))) offs.forEach(([x, y], i) => { if (x < end && y > at && tier > m[i]) m[i] = tier; });
                        from = end;
                    }
                });
                return m;
            })();
            const [selIdx, setSelIdx] = useState([]); // các chỉ số token đang được tô sáng
            const anchorRef = useRef(null); // chỉ số chữ ĐẦU TIÊN vừa bấm, chờ bấm chữ thứ 2 để chọn cả cụm
            const timerRef = useRef(null);
            useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
            const commit = (indices) => {
                const range = []; for (let k = Math.min(...indices); k <= Math.max(...indices); k++) range.push(k);
                const phrase = range.map(idx => tokens[idx].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).join('');
                anchorRef.current = null;
                setSelIdx([]);
                onWordClick(phrase, text);
            };
            const handleClick = (i) => {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (anchorRef.current === null) {
                    anchorRef.current = i;
                    setSelIdx([i]);
                    timerRef.current = setTimeout(() => commit([i]), 900); // không bấm gì thêm -> tra đúng 1 chữ này
                } else {
                    const a = anchorRef.current;
                    if (i === a) { commit([i]); return; } // bấm lại đúng chữ đầu -> tra 1 chữ đó luôn
                    const lo = Math.min(a, i), hi = Math.max(a, i);
                    setSelIdx(Array.from({length: hi - lo + 1}, (_, k) => lo + k));
                    commit([a, i]); // bấm chữ thứ 2 (bất kỳ vị trí nào) -> chọn trọn khoảng giữa 2 chữ rồi tra luôn
                }
            };
            return (<>{tokens.map((tok, i) => {
                const clean = tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                if (!clean) return <React.Fragment key={i}>{tok}</React.Fragment>;
                const isSel = selIdx.includes(i);
                const tier = marks ? marks[i] : 0;
                const tierCls = tier === 3 ? 'text-yellow-300 font-bold bg-yellow-500/20 border-b-2 border-yellow-400' : tier === 2 ? 'text-emerald-300 bg-emerald-500/15 border-b-2 border-emerald-400' : tier === 1 ? 'text-sky-300 bg-sky-500/10 border-b border-sky-400/70' : '';
                return <span key={i} onClick={() => handleClick(i)} className={`cursor-pointer rounded-sm ${tierCls} ${isSel ? 'bg-cyan-600 text-white ring-1 ring-cyan-300' : 'hover:bg-cyan-800/50 hover:text-cyan-300 active:bg-cyan-700'}`}>{tok}</span>;
            })}</>);
        };

        // 🆕 ẢNH THU PHÓNG / VUỐT TAY (pinch-zoom + kéo để xem rõ chữ trong ảnh sơ đồ, đồ thị...)
        // Hỗ trợ: chụm 2 ngón để zoom (điện thoại), lăn chuột để zoom (máy tính), kéo để di chuyển khi
        // đã phóng to, chạm/nháy đúp để reset về ban đầu, cộng thêm nút +/-/reset dự phòng cho ai không quen thao tác.
        const ZoomableImage = ({ src, onClose }) => {
            const { useState, useRef } = React;
            const [scale, setScale] = useState(1);
            const [pos, setPos] = useState({ x: 0, y: 0 });
            const [isGesturing, setIsGesturing] = useState(false);
            const gesture = useRef({ mode: null, startDist: 0, startScale: 1, startPos: { x: 0, y: 0 }, startTouch: { x: 0, y: 0 } });
            const lastTapRef = useRef(0);

            const clampScale = (s) => Math.min(5, Math.max(1, s));

            const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }); };

            const dist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

            const onTouchStart = (e) => {
                if (e.touches.length === 2) {
                    setIsGesturing(true);
                    gesture.current = { mode: 'pinch', startDist: dist(e.touches[0], e.touches[1]), startScale: scale, startPos: pos, startTouch: { x: 0, y: 0 } };
                } else if (e.touches.length === 1) {
                    setIsGesturing(true);
                    gesture.current = { mode: 'drag', startDist: 0, startScale: scale, startPos: pos, startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY } };
                }
            };
            const onTouchMove = (e) => {
                if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
                    e.preventDefault();
                    const newDist = dist(e.touches[0], e.touches[1]);
                    const newScale = clampScale(gesture.current.startScale * (newDist / (gesture.current.startDist || 1)));
                    setScale(newScale);
                } else if (gesture.current.mode === 'drag' && e.touches.length === 1 && scale > 1) {
                    e.preventDefault();
                    const dx = e.touches[0].clientX - gesture.current.startTouch.x;
                    const dy = e.touches[0].clientY - gesture.current.startTouch.y;
                    setPos({ x: gesture.current.startPos.x + dx, y: gesture.current.startPos.y + dy });
                }
            };
            const onTouchEnd = (e) => {
                if (e.touches.length === 0) {
                    setIsGesturing(false);
                    gesture.current.mode = null;
                    // Chạm đúp (2 lần trong 300ms) để reset nhanh về ban đầu
                    const now = Date.now();
                    if (now - lastTapRef.current < 300) resetZoom();
                    lastTapRef.current = now;
                    if (scale < 1.02) resetZoom();
                }
            };
            const onWheel = (e) => {
                e.preventDefault();
                setScale(s => { const ns = clampScale(s - e.deltaY * 0.0025); if (ns <= 1) setPos({ x: 0, y: 0 }); return ns; });
            };
            const onMouseDown = (e) => {
                if (scale <= 1) return;
                gesture.current = { mode: 'drag', startDist: 0, startScale: scale, startPos: pos, startTouch: { x: e.clientX, y: e.clientY } };
                setIsGesturing(true);
            };
            const onMouseMove = (e) => {
                if (gesture.current.mode !== 'drag' || !isGesturing) return;
                const dx = e.clientX - gesture.current.startTouch.x, dy = e.clientY - gesture.current.startTouch.y;
                setPos({ x: gesture.current.startPos.x + dx, y: gesture.current.startPos.y + dy });
            };
            const stopMouseDrag = () => { setIsGesturing(false); gesture.current.mode = null; };

            return (
                <div className="fixed inset-0 bg-black/95 z-[9998] flex items-center justify-center p-2 select-none" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    <div
                        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopMouseDrag} onMouseLeave={stopMouseDrag}
                    >
                        <img
                            src={src} alt="Xem ảnh phóng to" draggable={false}
                            onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2.2))}
                            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: isGesturing ? 'none' : 'transform 0.15s ease-out', cursor: scale > 1 ? 'grab' : 'zoom-in', touchAction: 'none' }}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 border border-zinc-700 rounded-full px-2 py-1.5">
                        <button onClick={() => setScale(s => clampScale(s - 0.5))} className="w-9 h-9 flex items-center justify-center text-white text-lg">➖</button>
                        <button onClick={resetZoom} className="px-3 h-9 flex items-center justify-center text-white text-[10px] font-black uppercase">Gốc</button>
                        <button onClick={() => setScale(s => clampScale(s + 0.5))} className="w-9 h-9 flex items-center justify-center text-white text-lg">➕</button>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/70 border border-zinc-600 text-white text-lg">✕</button>
                    <p className="absolute top-4 left-4 text-[9px] text-zinc-500 font-bold uppercase tracking-widest hidden sm:block">Chụm/lăn chuột để phóng to • Kéo để di chuyển • Nháy đúp để reset</p>
                </div>
            );
        };


        // ================= AI SƯ PHỤ + FLASHCARD SRS (module thêm mới) =================
        // Lưu offline-first ở localStorage, đồng bộ Firestore vào users/{uid}/srs/* (không đụng dữ liệu cũ).
        const SRS = (() => {
            const D = 864e5, INT = [10*60e3, D, 3*D, 7*D, 14*D, 30*D, 60*D];
            const dk = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(t));
            const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'c' + (h >>> 0).toString(36); };
            const norm = s => (s || '').toString().trim().toLowerCase();
            let LANG = 'ALL';
            const langOfText = t => { t = t || ''; if (/[\u3040-\u30ff]/.test(t)) return 'Tiếng Nhật'; if (/[\uac00-\ud7af]/.test(t)) return 'Tiếng Hàn'; if (/[\u4e00-\u9fff]/.test(t)) return 'Tiếng Trung'; if (/[\u0400-\u04ff]/.test(t)) return 'Tiếng Nga'; if (/[\u0600-\u06ff]/.test(t)) return 'Tiếng Ả Rập'; return 'Tiếng Anh / Latinh'; };
            const langOf = c => c.lang || langOfText(c.original);
            const LVX = [0, 40, 120, 250, 450, 700], lvOf = xp => { let l = 1; LVX.forEach((t, i) => { if (xp >= t) l = i + 1; }); return l; };
            let S = null, uid = null, db = null, tmr = null, busy = false, chain = 0;
            const vis = () => Object.values(S.cards).filter(c => LANG === 'ALL' || langOf(c) === LANG); const subs = new Set();
            const key = () => 'srs_v1_' + uid;
            const blank = () => ({ cards: {}, log: {}, quest: {}, streak: { count: 0, last: '' }, best: 0, pend: { spirit: 0, fame: 0, ct: 0 }, upd: 0 });
            const emit = () => subs.forEach(f => f());
            const persist = (push = true) => { S.upd = Date.now(); try { localStorage.setItem(key(), JSON.stringify(S)); } catch (e) {} if (push) { clearTimeout(tmr); tmr = setTimeout(cloudPush, 3000); } emit(); };
            const dayLog = () => { const k = dk(); return S.log[k] || (S.log[k] = { reviews: 0, correct: 0, secs: 0, quizC: 0, quizT: 0, lookups: 0, videos: 0 }); };
            const stateOf = c => c.reps === 0 ? 'New' : c.reviewLevel >= 7 ? 'Mastered' : c.reviewLevel >= 3 ? 'Review' : 'Learning';
            const touchStreak = () => { const t = dk(); if (S.streak.last === t) return; S.streak.count = S.streak.last === dk(Date.now() - D) ? S.streak.count + 1 : 1; S.streak.last = t; S.best = Math.max(S.best || 0, S.streak.count); };
            const DIFF = { n5: 1, n4: 2, n3: 3, n2: 4, n1: 5, hsk1: 1, hsk2: 2, hsk3: 3, hsk4: 4, hsk5: 5, hsk6: 5, a1: 1, a2: 2, b1: 3, b2: 4, c1: 5, c2: 5 };
            const add = (o, t, x = {}) => {
                if (!o || !norm(o)) return false;
                const id = hash(norm(o)), ex = S.cards[id], now = Date.now();
                if (ex) { let ch = false; if (!ex.lang && x.lang) { ex.lang = x.lang; ch = true; } [['translated', t], ['pinyin', x.pinyin], ['example', x.example], ['partOfSpeech', x.partOfSpeech]].forEach(([k, v]) => { if (!ex[k] && v) { ex[k] = String(v); ch = true; } }); if (ch) ex.updAt = now; return false; }
                S.cards[id] = { id, original: String(o).trim(), translated: String(t || x.meaning || '').trim(), pinyin: x.pinyin || '', example: x.example || '', partOfSpeech: x.partOfSpeech || '',
                    difficulty: DIFF[norm(x.level).replace(/\s+/g, '')] || 2, createdAt: now, nextReviewAt: now, reviewLevel: 0, state: 'New', reps: 0, lapses: 0, prio: 0, src: x.src || 'video', vid: x.vid || '', lang: x.lang || '', updAt: now };
                return true;
            };
            const migrate = (user) => { let n = 0;
                (user.videoNotes || []).forEach(v => {
                    const vl = (v.transcript && v.transcript.length) ? langOfText(v.transcript.join('')) : ''; (v.translations || []).forEach(t => { if (add(t.original, t.translated, { level: t.level, pinyin: t.pinyin, src: 'video', vid: v.link, lang: vl })) n++; });
                    Object.entries(v.wordCache || {}).forEach(([k, d]) => { if (d && add(k.split('|')[0], d.meaning, { ...d, src: 'lookup', vid: v.link })) n++; });
                }); return n; };
            const cloudPush = async () => {
                if (!db || !uid || !navigator.onLine) return;
                try {
                    const col = db.collection('users').doc(uid).collection('srs'), arr = Object.values(S.cards), n = Math.max(1, Math.ceil(arr.length / 400)), b = db.batch();
                    for (let i = 0; i < n; i++) b.set(col.doc('deck_' + i), { cards: arr.slice(i * 400, (i + 1) * 400), upd: S.upd });
                    const keep = Object.keys(S.log).sort().slice(-120), log = {}; keep.forEach(k => log[k] = S.log[k]);
                    b.set(col.doc('meta'), { log, quest: S.quest, streak: S.streak, best: S.best || 0, xp: S.xp || 0, shards: n, upd: S.upd });
                    await b.commit();
                } catch (e) { console.warn('SRS cloud:', e.code || e.message); }
            };
            const cloudPull = async () => {
                try {
                    const snap = await db.collection('users').doc(uid).collection('srs').get();
                    snap.forEach(d => { const v = d.data();
                        if (d.id === 'meta') {
                            Object.entries(v.log || {}).forEach(([k, l]) => { if (!S.log[k] || (l.reviews || 0) > S.log[k].reviews) S.log[k] = l; });
                            if ((v.quest?.date || '') > (S.quest.date || '')) S.quest = v.quest;
                            if ((v.streak?.last || '') > (S.streak.last || '')) S.streak = v.streak;
                            S.best = Math.max(S.best || 0, v.best || 0); S.xp = Math.max(S.xp || 0, v.xp || 0);
                        } else (v.cards || []).forEach(c => { const m = S.cards[c.id]; if (!m || (c.updAt || 0) > (m.updAt || 0)) S.cards[c.id] = c; });
                    });
                    persist(false);
                } catch (e) { /* offline hoặc chưa cấp rule: vẫn chạy bằng dữ liệu cục bộ */ }
            };
            const flush = async () => {
                const p = S.pend; if (busy || !db || !(p.spirit || p.fame || p.ct)) return; busy = true;
                const { spirit, fame, ct } = p;
                try {
                    const F = firebase.firestore.FieldValue, u = {}; if (spirit) u.spirit = F.increment(spirit); if (fame) u.fame = F.increment(fame);
                    if (Object.keys(u).length) await db.collection('users').doc(uid).update(u);
                    if (ct) { const g = await db.collection('guilds').where('members', 'array-contains', uid).limit(1).get(); if (!g.empty) await g.docs[0].ref.update({ exp: F.increment(ct) }); }
                    S.pend.spirit -= spirit; S.pend.fame -= fame; S.pend.ct -= ct; persist(false);
                } catch (e) { console.warn('SRS reward:', e.code || e.message); }
                busy = false;
            };
            const dueList = () => { const now = Date.now(), d = vis().filter(c => c.nextReviewAt <= now);
                const old = d.filter(c => c.reps > 0).sort((a, b) => (b.prio - a.prio) || (a.nextReviewAt - b.nextReviewAt));
                return [...old, ...d.filter(c => c.reps === 0).slice(0, 10)]; };
            const api = {
                subscribe: f => { subs.add(f); return () => subs.delete(f); },
                ready: () => !!S,
                init(user, fs) {
                    if (!user || !user.uid) return;
                    if (uid !== user.uid) { uid = user.uid; db = fs; try { S = { ...blank(), ...JSON.parse(localStorage.getItem(key()) || '{}') }; } catch (e) { S = blank(); } S.cards = S.cards || {}; S.pend = S.pend || { spirit: 0, fame: 0, ct: 0 };
                        migrate(user); persist(false); cloudPull().then(() => { migrate(user); persist(); flush(); }); }
                    else if (migrate(user)) persist();
                },
                addLookup(word, data, ctx) { if (!S || !data) return; if (add(word, data.meaning, { ...data, example: data.example || ctx || '', src: 'lookup' })) dayLog().lookups++; touchStreak(); persist(); },
                addMany(list, tx) { if (!S) return; const vl = tx ? langOfText(tx) : ''; (list || []).forEach(t => add(t.original, t.translated, { level: t.level, pinyin: t.pinyin, src: 'video', lang: vl })); dayLog().videos++; touchStreak(); persist(); },
                logQuiz(c, t) { if (!S) return; const L = dayLog(); L.quizC += c || 0; L.quizT += t || 0; touchStreak(); persist(); },
                startSession() { chain = 0; return dueList().filter(c => c.translated).slice(0, 40); },
                langOf, setLang(l) { LANG = l || 'ALL'; emit(); }, lang: () => LANG,
                langs() { const m = {}, now = Date.now(); Object.values(S.cards).forEach(c => { const k = langOf(c); (m[k] = m[k] || { k, n: 0, due: 0 }).n++; if (c.nextReviewAt <= now) m[k].due++; }); if (LANG !== 'ALL' && !m[LANG]) LANG = 'ALL'; return Object.values(m).sort((a, b) => b.n - a.n); },
                xpInfo() { const xp = S.xp || 0, lv = lvOf(xp); return { xp, lv, cur: LVX[lv - 1], next: LVX[lv] == null ? null : LVX[lv], max: lv >= LVX.length }; },
                addXp(n) { const b = lvOf(S.xp || 0); S.xp = (S.xp || 0) + n; const a = lvOf(S.xp); if (a > b) S.pend.spirit += 100 * a; persist(); flush(); return a > b ? a : 0; },
                grade(id, ok) {
                    const c = S.cards[id]; if (!c) return; const now = Date.now(), L = dayLog(); c.reps++; L.reviews++;
                    if (ok) { c.reviewLevel = Math.min(7, c.reviewLevel + 1); c.nextReviewAt = now + INT[c.reviewLevel - 1]; c.prio = Math.max(0, c.prio - 1); L.correct++; chain++; S.pend.spirit += 10 + (lvOf(S.xp || 0) >= 6 ? 5 : 0); if (chain % 10 === 0) S.pend.spirit += 50; }
                    else { c.lapses++; c.reviewLevel = c.reviewLevel >= 6 ? 3 : Math.floor(c.reviewLevel / 2); c.nextReviewAt = now + INT[0]; c.prio += 2; chain = 0; }
                    c.state = stateOf(c); c.updAt = now; touchStreak(); persist(); flush();
                },
                finish(secs) { const L = dayLog(); L.secs += Math.min(1800, Math.round(secs || 0)); let bonus = false;
                    if (dueList().length === 0 && L.reviews > 0 && !L.cleared) { L.cleared = 1; S.pend.fame += 100; bonus = true; }
                    persist(); flush(); return bonus; },
                quest() { const t = dk(); if (S.quest.date !== t) S.quest = { date: t, claimed: false }; const L = dayLog();
                    const items = [['Ôn 20 flashcard', L.reviews, 20], ['Xem 1 video', L.videos, 1], ['Đúng 15 câu quiz', L.quizC, 15], ['Tra 5 từ mới', L.lookups, 5]].map(([n, p, g]) => ({ n, p: Math.min(p, g), g, done: p >= g }));
                    return { items, all: items.every(i => i.done), claimed: !!S.quest.claimed }; },
                claim() { const q = api.quest(); if (!q.all || q.claimed) return false; S.quest.claimed = true; S.pend.spirit += 200; S.pend.fame += 50; S.pend.ct += 20; persist(); flush(); return true; },
                stats() {
                    const arr = vis(), now = Date.now(), eod = new Date(dk() + 'T23:59:59+07:00').getTime(), by = { New: 0, Learning: 0, Review: 0, Mastered: 0 };
                    arr.forEach(c => by[c.state]++);
                    const days = n => Array.from({ length: n }, (_, i) => dk(now - (n - 1 - i) * D));
                    const l30 = days(30).map(k => S.log[k] || { reviews: 0, correct: 0, secs: 0 });
                    const rv = l30.reduce((a, l) => a + l.reviews, 0), cr = l30.reduce((a, l) => a + l.correct, 0);
                    return { total: arr.length, by, due: dueList().length, dueToday: arr.filter(c => c.nextReviewAt <= eod).length, overdue: arr.filter(c => c.nextReviewAt < now - D && c.reps > 0).length,
                        retention: rv ? Math.round(cr / rv * 100) : null, secs14: days(14).map(k => Math.round(((S.log[k] || {}).secs || 0) / 60)), rev30: l30.map(l => l.reviews),
                        streak: S.streak.last === dk() || S.streak.last === dk(now - D) ? S.streak.count : 0, best: S.best || 0, today: dayLog() };
                },
                analyze(user) {
                    const arr = vis().filter(c => c.reps > 0), st = api.stats();
                    const weak = [...arr].filter(c => c.lapses > 0 || c.reviewLevel <= 1).sort((a, b) => (b.lapses - a.lapses) || (a.reviewLevel - b.reviewLevel)).slice(0, 6);
                    const strong = [...arr].filter(c => c.lapses === 0).sort((a, b) => b.reviewLevel - a.reviewLevel).slice(0, 6);
                    const g = {}; arr.filter(c => c.lapses > 0).forEach(c => { const p = (c.partOfSpeech || 'từ vựng').split(/[\/,(]/)[0].trim().toLowerCase() || 'từ vựng'; g[p] = (g[p] || 0) + c.lapses; });
                    const worstGroup = Object.entries(g).sort((a, b) => b[1] - a[1])[0]?.[0];
                    const hard = arr.filter(c => c.lapses >= 2 || (c.reps >= 2 && c.reviewLevel <= 1)).length;
                    let vid = null, best = 0; (user?.videoNotes || []).forEach(v => { const cs = vis().filter(c => c.vid === v.link); const w = cs.reduce((a, c) => a + c.lapses + (c.reviewLevel < 3 ? 1 : 0), 0); if (w > best) { best = w; vid = v; } });
                    const rate = st.retention;
                    return { weak, strong, worstGroup, hard, vid, rate, st,
                        comment: rate == null ? 'Đệ tử chưa ôn thẻ nào. Hãy khai mở Đại Đạo Ôn Tập để sư phụ bắt đầu theo dõi.' : rate >= 85 ? `Đạo tâm vững vàng, tỷ lệ nhớ ${rate}%. Có thể tăng tốc học từ mới.` : rate >= 60 ? `Tỷ lệ nhớ ${rate}%, tạm ổn. Cần ôn đều mỗi ngày để tránh quên.` : `Tỷ lệ nhớ chỉ ${rate}%, căn cơ còn yếu. Nên ôn lại từ khó trước khi học thêm.`,
                        advice: worstGroup ? `Đệ tử đang yếu nhóm ${worstGroup}. Đề xuất ôn lại ${Math.max(hard, weak.length)} từ khó${vid ? ' và xem lại 1 video liên quan' : ' và xem thêm 1 video mới'}.` : 'Chưa phát hiện điểm yếu rõ rệt. Đề xuất xem thêm 1 video mới để mở rộng vốn từ.' };
                }
            };
            return api;
        })();
        window.SRS = SRS;
        const SRS_PERKS = [
            { lv: 2, n: '💡 Gợi ý chữ cái đầu', d: 'Nút Gợi ý hiện chữ cái đầu của mỗi từ trong nghĩa' },
            { lv: 3, n: '📖 Gợi ý câu ví dụ', d: 'Bấm Gợi ý lần 2 để xem câu ví dụ có từ đó' },
            { lv: 4, n: '🔊 Nghe phát âm', d: 'Nút NGHE đọc to từ gốc (giọng đúng ngôn ngữ)' },
            { lv: 5, n: '🛡️ Bùa tha lỗi', d: '1 lần/phiên: trả lời sai mà không bị tính quên' },
            { lv: 6, n: '💎 Thưởng +50%', d: 'Mỗi từ nhớ đúng được thêm 5 Linh Thạch' }
        ];
        const STREAK_TITLES = [[365, 'Hóa Thần'], [100, 'Nguyên Anh'], [30, 'Kim Đan'], [7, 'Trúc Cơ'], [3, 'Luyện Khí']];
        const titleOf = n => (STREAK_TITLES.find(([d]) => n >= d) || [0, 'Phàm Nhân'])[1];

        const SrsBars = ({ data, color = '#eab308', labels }) => { const mx = Math.max(1, ...data), w = 100 / data.length;
            return <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">{data.map((v, i) => <rect key={i} x={i * w + 0.4} y={40 - (v / mx) * 38} width={w - 0.8} height={Math.max(0.5, (v / mx) * 38)} fill={color}><title>{(labels ? labels[i] + ': ' : '') + v}</title></rect>)}</svg>; };

        const SuPhuHub = ({ user, onBack, playSfx }) => {
            const { useState, useEffect, useRef } = React;
            const [, tick] = useState(0); const [tab, setTab] = useState('SUPHU'); const [sess, setSess] = useState(null); const [sum, setSum] = useState(null); const [msg, setMsg] = useState('');
            const t0 = useRef(0), retry = useRef(new Set());
            useEffect(() => SRS.subscribe(() => tick(x => x + 1)), []);
            useEffect(() => { SRS.init(user, firestore); tick(x => x + 1); }, [user.uid]);
            if (!SRS.ready()) return <div className="text-zinc-400 text-xs p-6">Đang khai mở Đại Đạo...</div>;
            const A = SRS.analyze(user), st = A.st, Q = SRS.quest(), online = navigator.onLine;
            const xi = SRS.xpInfo(), langs = SRS.langs(), curLang = SRS.lang();
            const strip = t => (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
            const judge = (inp, ans) => { const a = strip(inp); if (!a) return false;
                const alts = String(ans).split(/[;,\/()]|\bhoặc\b/).map(strip).filter(x => x.length > 0); alts.push(strip(ans));
                return alts.some(x => { if (x === a) return true; if (x.length > 3 && 1 - lev(a, x) / Math.max(a.length, x.length) >= 0.8) return true;
                    const A2 = a.split(' '), X = x.split(' '); if (X.length > 1) { const inter = X.filter(w => A2.includes(w)).length; if (2 * inter / (A2.length + X.length) >= 0.7) return true; } return false; }); };
            const mask = t => String(t || '').split(/\s+/).map(w => { const ch = [...w]; return ch[0] + '·'.repeat(Math.max(0, ch.length - 1)); }).join('  ');
            const speak = c => { try { const L = { 'Tiếng Nhật': 'ja-JP', 'Tiếng Trung': 'zh-CN', 'Tiếng Hàn': 'ko-KR', 'Tiếng Nga': 'ru-RU', 'Tiếng Ả Rập': 'ar-SA' }[SRS.langOf(c)] || 'en-US'; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(c.original); u.lang = L; speechSynthesis.speak(u); } catch (e) {} };
            const submit = () => { const cc = sess.q[sess.i]; const ok = judge(sess.typed, cc.translated); playSfx && playSfx(ok ? 'CORRECT' : 'WRONG'); setSess({ ...sess, res: { ok } }); };
            const giveUp = () => { playSfx && playSfx('WRONG'); setSess({ ...sess, res: { ok: false } }); };
            const askHint = () => { playSfx && playSfx('HINT'); setSess({ ...sess, hint: Math.min(xi.lv >= 3 ? 2 : 1, (sess.hint || 0) + 1) }); };
            const forgive = () => { playSfx && playSfx('SUCCESS'); setSess({ ...sess, forgiveUsed: true, res: { ok: false, forgiven: true } }); };
            const advance = () => { const cc = sess.q[sess.i], r = sess.res; if (!r) return; let q = [...sess.q], okN = sess.ok, badN = sess.bad, lu = 0;
                if (r.ok) { SRS.grade(cc.id, true); lu = SRS.addXp(sess.hint ? 6 : 10); okN++; }
                else if (r.forgiven) { q.push({ ...cc }); }
                else { SRS.grade(cc.id, false); lu = SRS.addXp(2); badN++; if (!retry.current.has(cc.id)) { retry.current.add(cc.id); q.push({ ...cc }); } }
                const i = sess.i + 1;
                if (i >= q.length) { const bonus = SRS.finish((Date.now() - t0.current) / 1000); setSum({ ok: okN, bad: badN, bonus, a: SRS.analyze(user) }); setSess(null); }
                else { setSess({ ...sess, q, i, ok: okN, bad: badN, typed: '', res: null, hint: 0, lu }); if (lu && playSfx) playSfx('LEVELUP'); } };
            const start = () => { const q = SRS.startSession(); if (!q.length) return setMsg('Hôm nay không còn thẻ cần ôn.'); retry.current = new Set(); t0.current = Date.now(); setSess({ q, i: 0, typed: '', res: null, hint: 0, ok: 0, bad: 0, forgiveUsed: false, lu: 0 }); setSum(null); setMsg(''); setTab('REVIEW'); };
            const answer = ok => { playSfx && playSfx(ok ? 'SUCCESS' : 'CLICK'); const c = sess.q[sess.i]; SRS.grade(c.id, ok);
                const q = [...sess.q]; if (!ok && !retry.current.has(c.id)) { retry.current.add(c.id); q.push(SRS.startSession ? { ...c } : c); }
                const i = sess.i + 1, ns = { ...sess, q, i, flip: false, ok: sess.ok + (ok ? 1 : 0), bad: sess.bad + (ok ? 0 : 1) };
                if (i >= q.length) { const bonus = SRS.finish((Date.now() - t0.current) / 1000); setSum({ ok: ns.ok, bad: ns.bad, bonus, a: SRS.analyze(user) }); setSess(null); } else setSess(ns); };
            const Card = ({ k, v, c = 'text-white' }) => <div className="bg-black/50 border border-zinc-800 p-2 text-center"><div className={'text-lg font-black ' + c}>{v}</div><div className="text-[9px] text-zinc-500 uppercase">{k}</div></div>;
            const nextMs = [3, 7, 30, 100, 365].find(d => d > st.streak);
            const pred = nextMs ? new Date(Date.now() + (nextMs - st.streak) * 864e5).toLocaleDateString('vi-VN') : null;
            const c = sess && sess.q[sess.i];
            return (
                <div className="w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-yellow-700/50 pb-2 mb-2">
                        <h2 className="text-lg font-black text-yellow-500 uppercase italic">AI Sư Phụ</h2>
                        <div className="flex items-center gap-2"><span className={'text-[9px] font-black ' + (online ? 'text-emerald-400' : 'text-orange-400')}>{online ? 'ONLINE' : 'OFFLINE'}</span>
                            <button onClick={onBack} className="bg-zinc-800 border border-zinc-600 text-zinc-300 px-3 py-1 text-[10px] font-black">QUAY LẠI</button></div>
                    </div>
                    <div className="flex gap-1 mb-2">{[['SUPHU', 'SƯ PHỤ'], ['REVIEW', 'ĐẠI ĐẠO ÔN TẬP'], ['STATS', 'THỐNG KÊ']].map(([k, n]) =>
                        <button key={k} onClick={() => setTab(k)} className={'flex-1 py-2 text-[10px] font-black border ' + (tab === k ? 'bg-yellow-500 text-black border-yellow-500' : 'border-zinc-700 text-zinc-400')}>{n}</button>)}</div>
                    {!sess && langs.length > 0 && <div className="flex gap-1 mb-2 overflow-x-auto pb-1 custom-scrollbar">{[{ k: 'ALL', n: langs.reduce((a, l) => a + l.n, 0), due: langs.reduce((a, l) => a + l.due, 0) }, ...langs].map(l => <button key={l.k} onClick={() => SRS.setLang(l.k)} className={'flex-shrink-0 px-2 py-1 text-[9px] font-black border whitespace-nowrap ' + (curLang === l.k ? 'bg-cyan-600 text-black border-cyan-400' : 'border-zinc-700 text-zinc-400')}>{l.k === 'ALL' ? '🌐 Tất cả' : l.k} · {l.n}{l.due ? ' (' + l.due + ' cần ôn)' : ''}</button>)}</div>}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 pb-16">
                        {tab === 'SUPHU' && <>
                            <div className="bg-gradient-to-br from-indigo-950 to-black border border-indigo-500/60 p-3 space-y-1">
                                <p className="text-[10px] font-black text-indigo-300 uppercase">Lời sư phụ</p>
                                <p className="text-xs text-white leading-relaxed">{A.comment}</p><p className="text-xs text-yellow-300 font-bold leading-relaxed">{A.advice}</p></div>
                            <div className="grid grid-cols-3 gap-2"><Card k="Tổng thẻ" v={st.total} /><Card k="Cần ôn" v={st.due} c="text-red-400" /><Card k="Thành thạo" v={st.by.Mastered} c="text-emerald-400" /></div>
                            <button onClick={start} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black uppercase">Vào Đại Đạo Ôn Tập ({st.due} thẻ)</button>
                            <div className="bg-black/50 border border-yellow-800/60 p-3 space-y-2">
                                <div className="flex justify-between items-center"><p className="text-[10px] font-black text-yellow-500 uppercase">Cảnh giới ôn luyện: Lv{xi.lv}{xi.max ? ' (TỐI ĐA)' : ''}</p><span className="text-[9px] text-zinc-500">{xi.xp} EXP{xi.next ? ' / ' + xi.next : ''}</span></div>
                                <div className="h-2 bg-zinc-800"><div className="h-2 bg-yellow-500" style={{ width: (xi.next ? Math.min(100, (xi.xp - xi.cur) / (xi.next - xi.cur) * 100) : 100) + '%' }} /></div>
                                <p className="text-[9px] text-zinc-500">Gõ đúng nghĩa +10 EXP (có gợi ý +6), gõ sai +2 EXP. Mỗi lần thăng cấp thưởng Linh Thạch và mở khóa chức năng:</p>
                                {SRS_PERKS.map(pk => <p key={pk.lv} className={'text-[10px] ' + (xi.lv >= pk.lv ? 'text-emerald-300' : 'text-zinc-600')}>{xi.lv >= pk.lv ? '✔' : '🔒 Lv' + pk.lv} <b>{pk.n}</b> - {pk.d}</p>)}
                            </div>
                            {msg && <p className="text-[10px] text-orange-300 text-center">{msg}</p>}
                            <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase mb-1">Nhiệm vụ hôm nay</p>
                                {Q.items.map((it, i) => <div key={i} className="flex justify-between text-[11px] py-0.5"><span className={it.done ? 'text-emerald-400 line-through' : 'text-zinc-300'}>{it.n}</span><span className="text-zinc-500">{it.p}/{it.g}</span></div>)}
                                <button disabled={!Q.all || Q.claimed} onClick={() => { if (SRS.claim()) setMsg('Nhận thưởng: +200 Linh Thạch, +50 Danh Vọng, +20 Công Trạng (nếu có tông môn).'); }} className="w-full mt-2 py-2 text-[10px] font-black bg-emerald-600 text-black disabled:bg-zinc-800 disabled:text-zinc-500">{Q.claimed ? 'ĐÃ NHẬN THƯỞNG' : Q.all ? 'NHẬN THƯỞNG' : 'CHƯA HOÀN THÀNH'}</button></div>
                            <div className="bg-black/50 border border-zinc-800 p-3 text-[11px] text-zinc-300 space-y-1">
                                <p><b className="text-yellow-500">Chuỗi tu luyện:</b> {st.streak} ngày · danh hiệu <b className="text-cyan-300">[{titleOf(st.streak)}]</b> · kỷ lục {st.best}</p>
                                <p><b className="text-yellow-500">Dự đoán đột phá:</b> {pred ? `giữ chuỗi đến ${pred} để đạt mốc ${nextMs} ngày [${titleOf(nextMs)}]` : 'Đã đạt cảnh giới cao nhất [Hóa Thần].'}</p></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/50 border border-red-900/60 p-2"><p className="text-[10px] font-black text-red-400 uppercase mb-1">Từ yếu nhất</p>{A.weak.length ? A.weak.map(w => <p key={w.id} className="text-[11px] text-zinc-300 truncate">{w.original} <span className="text-zinc-500">· sai {w.lapses}</span></p>) : <p className="text-[10px] text-zinc-600">Chưa có</p>}</div>
                                <div className="bg-black/50 border border-emerald-900/60 p-2"><p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Từ mạnh nhất</p>{A.strong.length ? A.strong.map(w => <p key={w.id} className="text-[11px] text-zinc-300 truncate">{w.original} <span className="text-zinc-500">· Lv{w.reviewLevel}</span></p>) : <p className="text-[10px] text-zinc-600">Chưa có</p>}</div></div>
                            <div className="bg-black/50 border border-cyan-900/60 p-3"><p className="text-[10px] font-black text-cyan-400 uppercase mb-1">Video nên xem</p>
                                {A.vid ? <p className="text-[11px] text-zinc-300 break-all">Xem lại: {(A.vid.summary || A.vid.link).slice(0, 80)}</p> : <p className="text-[11px] text-zinc-400">Chưa có video liên quan. Hãy học thêm 1 video mới ở mục Học Qua Video.</p>}</div>
                        </>}
                        {tab === 'REVIEW' && (sess ? <div className="space-y-3">
                            <div className="flex justify-between text-[10px] text-zinc-400 font-black"><span>{sess.i + 1}/{sess.q.length}</span><span className="text-emerald-400">Nhớ {sess.ok}</span><span className="text-red-400">Quên {sess.bad}</span></div>
                            {sess.lu ? <div className="bg-yellow-500 text-black text-center text-[11px] font-black py-1.5 animate-pulse">⚡ THĂNG CẤP! Cảnh giới Lv{sess.lu} · +{100 * sess.lu} Linh Thạch{SRS_PERKS.find(pk => pk.lv === sess.lu) ? ' · Mở khóa: ' + SRS_PERKS.find(pk => pk.lv === sess.lu).n : ''}</div> : null}
                            <div className="min-h-[200px] bg-zinc-950 border-2 border-yellow-600/70 p-5 flex flex-col items-center justify-center text-center select-none">
                                <p className="text-3xl font-black text-white break-words">{c.original}</p>
                                {c.pinyin && <p className="text-sm text-yellow-400 italic mt-1">{c.pinyin}</p>}
                                {xi.lv >= 4 && <button onClick={() => speak(c)} className="mt-2 text-[10px] border border-cyan-700 text-cyan-300 px-2 py-1 font-black">🔊 NGHE</button>}
                                {!sess.res && <p className="text-[10px] text-zinc-500 mt-3">Nhập nghĩa tiếng Việt của từ này</p>}
                                {!sess.res && sess.hint >= 1 && <p className="text-sm text-cyan-300 font-black tracking-widest mt-2">{mask(c.translated)}</p>}
                                {!sess.res && sess.hint >= 2 && c.example && <p className="text-xs text-zinc-400 italic mt-2">{c.example}</p>}
                                {sess.res && <div className="mt-3 space-y-1">
                                    <p className={'text-sm font-black ' + (sess.res.ok ? 'text-emerald-400' : 'text-red-400')}>{sess.res.ok ? '✔ CHÍNH XÁC' : sess.res.forgiven ? '🛡️ Bùa tha lỗi - từ này sẽ quay lại sau' : '✘ CHƯA ĐÚNG' + (sess.typed ? ' (bạn gõ: ' + sess.typed + ')' : '')}</p>
                                    <p className="text-lg text-cyan-300 font-bold">{c.translated}</p>
                                    {c.partOfSpeech && <p className="text-[10px] text-purple-300 uppercase">{c.partOfSpeech}</p>}
                                    {c.example && <p className="text-xs text-zinc-400 italic">{c.example}</p>}
                                </div>}
                            </div>
                            {!sess.res ? <>
                                <input autoFocus value={sess.typed || ''} onChange={e => setSess({ ...sess, typed: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Gõ nghĩa tiếng Việt rồi Enter..." className="w-full bg-black border border-yellow-600/60 p-3 text-sm text-white outline-none focus:border-yellow-400" />
                                <div className="flex gap-2">
                                    <button onClick={submit} className="flex-1 bg-yellow-500 text-black py-3 font-black text-xs">KIỂM TRA</button>
                                    {xi.lv >= 2 && <button onClick={askHint} className="px-3 border border-cyan-600 text-cyan-300 font-black text-[10px]">💡 GỢI Ý{xi.lv >= 3 ? ' (' + (sess.hint || 0) + '/2)' : ''}</button>}
                                </div>
                                <button onClick={giveUp} className="w-full text-[10px] text-zinc-500 py-1">Không nhớ - xem đáp án (tính là quên)</button>
                            </> : <div className="flex gap-2">
                                {!sess.res.ok && !sess.res.forgiven && xi.lv >= 5 && !sess.forgiveUsed && <button onClick={forgive} className="flex-1 border border-emerald-600 text-emerald-300 font-black text-[10px] py-3">🛡️ BÙA THA LỖI</button>}
                                <button onClick={advance} className="flex-[2] bg-emerald-600 text-black py-3 font-black text-xs">TIẾP THEO →</button>
                            </div>}
                        </div> : sum ? <div className="space-y-3">
                            <div className="bg-black/60 border border-yellow-600 p-3 text-center"><p className="text-yellow-500 font-black uppercase text-sm">Kết thúc phiên</p><p className="text-xs text-white mt-1">Nhớ {sum.ok} · Quên {sum.bad}{sum.bonus ? ' · +100 Danh Vọng vì ôn hết hôm nay' : ''}</p></div>
                            <div className="bg-indigo-950/60 border border-indigo-500/60 p-3 space-y-1 text-xs"><p className="text-white">{sum.a.comment}</p>
                                <p className="text-emerald-300"><b>Điểm mạnh:</b> {sum.a.strong.slice(0, 3).map(w => w.original).join(', ') || 'chưa có'}</p>
                                <p className="text-red-300"><b>Điểm yếu:</b> {sum.a.weak.slice(0, 3).map(w => w.original).join(', ') || 'chưa có'}</p>
                                <p className="text-yellow-300 font-bold">{sum.a.advice}</p></div>
                            <button onClick={() => { setSum(null); setTab('SUPHU'); }} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black">VỀ TRANG SƯ PHỤ</button></div>
                            : <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Card k="Cần ôn hôm nay" v={st.dueToday} c="text-yellow-400" /><Card k="Quá hạn" v={st.overdue} c="text-red-400" /><Card k="Đã thành thạo" v={st.by.Mastered} c="text-emerald-400" /><Card k="Tỷ lệ ghi nhớ" v={st.retention == null ? '--' : st.retention + '%'} c="text-cyan-300" /></div>
                                <p className="text-[11px] text-zinc-300 text-center">Chuỗi ôn tập: <b className="text-yellow-400">{st.streak} ngày</b> [{titleOf(st.streak)}]</p>
                                <button onClick={start} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black uppercase">Bắt đầu ôn ({st.due} thẻ)</button>{msg && <p className="text-[10px] text-orange-300 text-center">{msg}</p>}</div>)}
                        {tab === 'STATS' && <div className="space-y-3">
                            <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase mb-2">Trạng thái thẻ ({st.total})</p>
                                <div className="flex h-4 w-full overflow-hidden">{[['New', '#71717a'], ['Learning', '#f59e0b'], ['Review', '#06b6d4'], ['Mastered', '#10b981']].map(([k, col]) => <div key={k} style={{ width: (st.total ? st.by[k] / st.total * 100 : 0) + '%', background: col }} title={k} />)}</div>
                                <div className="grid grid-cols-2 gap-x-3 text-[10px] text-zinc-400 mt-2"><span>New: {st.by.New}</span><span>Learning (đang học): {st.by.Learning}</span><span>Review: {st.by.Review}</span><span>Mastered (đã thuộc): {st.by.Mastered}</span><span>Cần ôn: {st.due}</span><span>Tỷ lệ nhớ: {st.retention == null ? '--' : st.retention + '%'}</span></div></div>
                            <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase">Thời gian học 14 ngày (phút)</p><SrsBars data={st.secs14} color="#06b6d4" /></div>
                            <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase">Số thẻ đã ôn mỗi ngày (30 ngày)</p><SrsBars data={st.rev30} /></div>
                        </div>}
                    </div>
                </div>
            );
        };

        const ThienKieuApp = () => {
            const { useState, useEffect, useRef, useMemo } = React;
            
            const [appState, setAppState] = useState('LOADING'); 
            const [user, setUser] = useState(null);
            useEffect(() => { if (user && user.uid) { try { SRS.init(user, firestore); } catch (e) { console.warn('SRS init', e); } } }, [user && user.uid, user && (user.videoNotes || []).length]);
            // 🔐 SỬA LỖI ĐỒNG HỒ BXH BÁO "Lỗi kết nối (Rules?)" TRÊN MỘT SỐ TRÌNH DUYỆT/WEBVIEW:
            // Khác với "user" (hồ sơ Firestore, tải xong SAU khi đăng nhập), "authUid" chỉ phản ánh
            // việc Firebase Auth ĐÃ xác nhận đăng nhập xong (fbUser tồn tại) hay chưa. Các listener đọc
            // dữ liệu chung (users, guilds, meta/season...) phải đợi cờ này rồi mới được gọi - nếu gọi
            // ngay lúc component vừa mount (trước khi Auth kịp xác thực xong), Firestore Rules sẽ thấy
            // request.auth = null và từ chối, dù người dùng RÕ RÀNG đã đăng nhập. Lỗi này xảy ra ngẫu
            // nhiên tuỳ trình duyệt/thiết bị vì tốc độ khôi phục phiên đăng nhập từ bộ nhớ (IndexedDB)
            // nhanh/chậm khác nhau - đặc biệt chậm trên Safari iOS, WebView trong app khác (Zalo/Messenger...),
            // hoặc phiên trình duyệt mới hoàn toàn trên Windows.
            const [authUid, setAuthUid] = useState(null);
            const [allUsers, setAllUsers] = useState([]);
            const [allGuilds, setAllGuilds] = useState({});
            const [viewingUser, setViewingUser] = useState(null);
            
            const [viewGuildModal, setViewGuildModal] = useState(null);
            const [pwdModal, setPwdModal] = useState({ show: false, val: '', oldVal: '' });

            // Quản lý Modal nhận thưởng Mùa Giải
            const [seasonRewardModal, setSeasonRewardModal] = useState(null);

            // 🔥 KHÔI PHỤC CHUỖI ĐIỂM DANH: nếu bỏ lỡ quá 24h (không chơi hôm qua), thay vì âm thầm reset
            // về 1 như trước, hiện 3 lựa chọn: Học để khôi phục / Dùng Linh Thạch / Dùng Danh Vọng (Sao).
            const [streakRestoreModal, setStreakRestoreModal] = useState(null); // { oldStreak }

            // Auth State
            const [authMode, setAuthMode] = useState('login');
            const [username, setUsername] = useState('');
            const [password, setPassword] = useState('');
            const [showPwd, setShowPwd] = useState(false);
            
            // Quiz State
            const [activeQuiz, setActiveQuiz] = useState([]);
            const [curIdx, setCurIdx] = useState(0);
            const [correctAnswers, setCorrectAnswers] = useState(0);
            const [selectedOption, setSelectedOption] = useState(null);
            // 🆕 TÍNH NĂNG MỚI: hỗ trợ câu hỏi CHỌN NHIỀU ĐÁP ÁN (dạng đúng/sai nhiều ý) và câu hỏi ĐIỀN SỐ.
            // selectedOptions: dùng cho type='multi' - mảng song song với "o", mỗi phần tử true (Đúng) /
            // false (Sai) / undefined (chưa chọn) ứng với từng ý a/b/c/d.
            const [selectedOptions, setSelectedOptions] = useState([]);
            const [numericAnswer, setNumericAnswer] = useState(''); // dùng cho câu hỏi type = 'numeric'
            const [showExplanation, setShowExplanation] = useState(false);
            // 🆕 DỪNG LẠI SAU MỖI CÂU: không tự động chuyển câu nữa, người chơi tự bấm "Câu Tiếp Theo"
            // sau khi xem giải thích / bấm AI phân tích xong.
            const [aiExplainText, setAiExplainText] = useState('');
            const [aiExplainLoading, setAiExplainLoading] = useState(false);
            const [lightboxImg, setLightboxImg] = useState(null); // 🆕 xem ảnh câu hỏi phóng to (đồ thị, sơ đồ...)
            // 🆕 GỢI Ý KHI TRẢ LỜI SAI (câu 1 đáp án): đáp án sai bị loại khỏi danh sách, hiện bảng gợi ý,
            // người học được thử lại thay vì kết thúc câu ngay lập tức.
            const [eliminatedOptions, setEliminatedOptions] = useState([]);
            const [hintText, setHintText] = useState('');
            const [hintLoading, setHintLoading] = useState(false);

            // 🆕 CHỈNH SỬA ẢI: chỉnh sửa lại 1 Bí Tịch đã tạo (sửa câu hỏi, đính kèm ảnh, xoá/thêm câu)
            const [editingLibItem, setEditingLibItem] = useState(null); // { id, title, data, code } gốc đang sửa
            const [editDraftTitle, setEditDraftTitle] = useState('');
            const [editDraftQuestions, setEditDraftQuestions] = useState([]);
            const [editQIndex, setEditQIndex] = useState(null); // số thứ tự câu đang mở form sửa, hoặc 'new'
            const [editQDraft, setEditQDraft] = useState(null); // bản nháp câu hỏi đang sửa trong form con
            const [editQuizSaving, setEditQuizSaving] = useState(false);
            const [editAppendText, setEditAppendText] = useState(''); // dán thêm văn bản câu hỏi mới vào ải đang sửa
            const [editQImgUploading, setEditQImgUploading] = useState(false);

            // 🆕 BÀN PHÍM KÝ HIỆU TOÁN/LÝ: chèn ký hiệu (ω, π, √, Δ...) vào đúng ô đang gõ + đúng vị trí con trỏ
            const [showMathKeyboard, setShowMathKeyboard] = useState(false);
            const [activeMathTarget, setActiveMathTarget] = useState(null); // { node, get, set }
            const [stonesGained, setStonesGained] = useState(0);
            const [fameGained, setFameGained] = useState(0);
            
            // App State
            const [isAddingQuiz, setIsAddingQuiz] = useState(false);
            const [quizTitle, setQuizTitle] = useState('');
            const [rawQuizText, setRawQuizText] = useState('');
            const [importCode, setImportCode] = useState('');
            const [redeemingCode, setRedeemingCode] = useState(false); // 🛡️ chặn bấm liên tiếp nút THU khi đang xử lý mã
            const [quizImageAnalyzing, setQuizImageAnalyzing] = useState(false); // AI quét ảnh đề thi (OCR) khi tạo Bí Tịch
            const [quizTextAnalyzing, setQuizTextAnalyzing] = useState(false); // 🆕 AI phân tích Ngọc Giản (.txt/.docx) để tự tách câu nhiều đáp án đúng
            
            const [profileImage, setProfileImage] = useState('');
            const [profileBg, setProfileBg] = useState('');
            const [profileBio, setProfileBio] = useState('');
            const [newName, setNewName] = useState(''); 
            
            const [leaderboardTab, setLeaderboardTab] = useState('ALL');
            const [timeLeftStr, setTimeLeftStr] = useState('Đang tính toán...');
            const [guildTimeLeftStr, setGuildTimeLeftStr] = useState('Đang tính toán...');
            
            const [newGuildName, setNewGuildName] = useState('');
            const [joinGuildIdStr, setJoinGuildIdStr] = useState('');
            // SỬA LỖI: vừa tạo/vào tông môn xong bị hiện nhầm "đã diệt vong" do 2 listener (users & guilds)
            // đồng bộ không cùng lúc. Dùng mốc thời gian này để hiển thị "Đang đồng bộ..." thay vì báo diệt vong.
            const [guildSyncingUntil, setGuildSyncingUntil] = useState(0);
            const [inviteGuildMemberId, setInviteGuildMemberId] = useState('');
            const [guildTab, setGuildTab] = useState('INFO');
            const [editNotice, setEditNotice] = useState('');
            
            const [friendSearchUid, setFriendSearchUid] = useState('');
            const [globalSearchUid, setGlobalSearchUid] = useState('');
            
            const [isMuted, setIsMuted] = useState(false);
            const [audioErrors, setAudioErrors] = useState({}); // { BGM: true, CLICK: true, ... } khi 1 file audio load/play lỗi
            const [gachaResultText, setGachaResultText] = useState('');
            const [loadProgress, setLoadProgress] = useState(0);

            // 🎵 DANH SÁCH PHÁT TIÊN ÂM (nhạc nền): cho phép tải lên NHIỀU bài cùng lúc, tua, trộn bài,
            // bỏ qua bài (thay vì chỉ 1 bài lặp lại như trước).
            const [bgmPlaylist, setBgmPlaylist] = useState([{ id: 'default', name: 'Tiên Âm Mặc Định', url: AUDIO_URLS.BGM }]);
            const [bgmTrackIndex, setBgmTrackIndex] = useState(0);
            const [bgmShuffle, setBgmShuffle] = useState(false);
            const [bgmCurrentTime, setBgmCurrentTime] = useState(0);
            const [bgmDuration, setBgmDuration] = useState(0);
            const [showMusicPanel, setShowMusicPanel] = useState(false);
            const [showMenuPanel, setShowMenuPanel] = useState(false); // ☰ menu gom Tông Môn/Cửa Hàng/Nhạc/Âm Thanh, tránh tràn hàng top bar
            const bgmNextRef = useRef(() => {});

            // ✉️ EMAIL KHÔI PHỤC MẬT MÃ: đăng ký bằng Đạo Hiệu dùng email giả nội bộ nên không tự khôi
            // phục được. Cho phép liên kết thêm 1 email thật để gửi LIÊN KẾT khôi phục khi quên mật mã.
            const [recoveryEmailInput, setRecoveryEmailInput] = useState('');

            // ⏱️ THỜI GIAN ĐÃ HỌC (video): đếm số giây video đang thực sự phát trong phiên học hiện tại.
            const [videoStudySeconds, setVideoStudySeconds] = useState(0);
            const [videoShareCode, setVideoShareCode] = useState('');
            const [videoImportCode, setVideoImportCode] = useState('');

            // Video Learn State (Học qua Video)
            const [videoLink, setVideoLink] = useState('');
            const [videoApiKey, setVideoApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
            // 🔑 Key 2 (phụ) cho chế độ chạy song song 2 Key + bản nháp ô nhập ở Hồ Sơ
            const [geminiKey2, setGeminiKey2] = useState(() => localStorage.getItem('geminiApiKey2') || '');
            const [keyDraft1, setKeyDraft1] = useState(() => localStorage.getItem('geminiApiKey') || '');
            const [keyDraft2, setKeyDraft2] = useState(() => localStorage.getItem('geminiApiKey2') || '');
            const [showKeys, setShowKeys] = useState(false);
            const [keyTesting, setKeyTesting] = useState(false);
            const [, setPoolTick] = useState(0);
            useEffect(() => GeminiPool.subscribe(() => setPoolTick(t => t + 1)), []);
            useEffect(() => { setKeyDraft1(videoApiKey); }, [videoApiKey]);
            useEffect(() => { setKeyDraft2(geminiKey2); GeminiPool.setSecondary(geminiKey2); }, [geminiKey2]);
            useEffect(() => { if (appState !== 'PROFILE') return; const id = setInterval(() => setPoolTick(t => t + 1), 1000); return () => clearInterval(id); }, [appState]);
            const anyGeminiKey = videoApiKey.trim() || geminiKey2.trim(); // có ít nhất 1 Key là dùng được AI (Key 1 trống vẫn chạy bằng Key 2)
            const [videoAnalyzing, setVideoAnalyzing] = useState(false);
            const [vocabFileAnalyzing, setVocabFileAnalyzing] = useState(false); // 🆕 AI phân tích file .txt/.docx từ vựng (đồng bộ với Tải Ngọc Giản bên Ải Bí Tịch)
            const [videoResult, setVideoResult] = useState(null); // { summary, transcript: [{text}], translations: [{original, translated}] }
            const [playbackRate, setPlaybackRate] = useState(1);
            const [videoLandscapeMode, setVideoLandscapeMode] = useState(false); // chế độ xem ngang (chia đôi video + bảng từ vựng), xem enterVideoLandscape...
            const [supportedPlaybackRates, setSupportedPlaybackRates] = useState([1]); // các tốc độ mà chính video hiện tại hỗ trợ (tránh chọn tốc độ video không hỗ trợ -> lag/đứng hình)
            const [wordLookup, setWordLookup] = useState(null); // { word, loading, data:{meaning,partOfSpeech,usage,example,level,pinyin}, error }
            // 📖 BỘ NHỚ TRA TỪ: lưu lại các từ đã tra trong video hiện tại (key = "từ|câu ngữ cảnh") để
            // không phải gọi lại API khi bấm lại đúng từ đó, và để LƯU KÈM vào Bí Tịch (videoNotes) khi
            // lưu bài, giúp mở lại video đã lưu là thấy ngay bảng phân tích cũ, khỏi tra lại từ đầu.
            const [wordLookupCache, setWordLookupCache] = useState({});
            const [showPinyin, setShowPinyin] = useState(true); // 拼 bật/tắt hiện Pinyin dưới câu chữ Hán
            // Nhãn phiên âm theo ngôn ngữ video: có Kana -> Romaji (Nihongo), có Hangul -> Romaja, còn lại -> Pinyin
            const getPhoneticLabel = () => { const t = ((videoResult && videoResult.transcript) || []).join(''); if (/[\u3040-\u30ff]/.test(t)) return 'Romaji'; if (/[\uac00-\ud7af]/.test(t)) return 'Romaja'; return 'Pinyin'; };
            // 🎨 Danh sách từ vựng + độ quan trọng (importance 3/2/1 do AI chấm; video cũ chưa có thì chia theo thứ tự AI liệt kê)
            const vocabMarks = React.useMemo(() => {
                const tr = (videoResult && videoResult.translations) || [], n = tr.length;
                return tr.map((t, i) => {
                    const o = String(t.original || '').trim().toLowerCase();
                    if (!o || (/^[\u0000-\u024f]+$/.test(o) && o.length < 3)) return null;
                    let tier = Number(t.importance); if (!(tier >= 1 && tier <= 3)) tier = i < n / 3 ? 3 : i < 2 * n / 3 ? 2 : 1;
                    return { key: o, tier };
                }).filter(Boolean).sort((x, y) => y.key.length - x.key.length);
            }, [videoResult]);
            const [showTranslation, setShowTranslation] = useState(true); // 🇻🇳 bật/tắt hiện nghĩa tiếng Việt dưới mỗi câu trong Văn Bản (để không phải học chay 100% ngoại ngữ mà không có nghĩa kèm theo)
            // ✍️ LUYỆN VIẾT CHỮ: danh sách ký tự Hán rút ra từ từ vựng video hiện tại + ký tự đang chọn để luyện.
            const [writeCharModal, setWriteCharModal] = useState(false);
            const [writePracticeChar, setWritePracticeChar] = useState(null);
            // ✍️ Bộ nhớ nghĩa/cấp độ của từng chữ đã tra khi Luyện Viết Chữ, tránh gọi lại API khi quay lại đúng chữ đó.
            const [writeMeaningCache, setWriteMeaningCache] = useState({});
            // 🔄 ĐỒNG BỘ VĂN BẢN THEO VIDEO: chỉ số câu trong transcript đang tương ứng với thời điểm phát hiện tại,
            // dùng để tô sáng + tự cuộn tới đúng câu, giúp người học không bị lạc mất video đang nói tới đoạn nào.
            const [activeTranscriptIdx, setActiveTranscriptIdx] = useState(-1);
            const transcriptItemRefs = useRef({ portrait: [], landscape: [] });

            // ▶️ SỬA LỖI "DANH SÁCH PHÁT" KHÔNG PHÁT LẠI ĐƯỢC: trước đây bấm vào 1 mục trong Danh Sách
            // Phát chỉ setVideoLink(n.link) - nếu link đó TRÙNG với video đang mở sẵn (không đổi), React
            // không thấy currentYoutubeId thay đổi nên effect mount player KHÔNG chạy lại -> nếu trình phát
            // đang bị treo/dừng vì lý do gì đó, bấm "phát lại" không có tác dụng gì cả, coi như bị lỗi.
            // videoPlayNonce tăng lên mỗi lần người dùng bấm phát (dù cùng video hay khác video) để LUÔN ép
            // effect chạy lại và gắn lại trình phát từ đầu; forceReplayRef báo cho effect biết lần này là
            // "phát lại" nên phát từ đầu (giây 0) thay vì cố khôi phục vị trí xem dở trước đó.
            const [videoPlayNonce, setVideoPlayNonce] = useState(0);
            const forceReplayRef = useRef(false);

            // 🎓 ÔN TẬP TỪ VỰNG SAU KHI HỌC VIDEO: học xong không có gì để "luyện tập lại" ngay nên rất dễ quên.
            // Từ các cặp Câu gốc/Dịch nghĩa (videoResult.translations) tự sinh ra 1-2 "ải" trắc nghiệm ngắn
            // (tối đa 5 câu/ải) để ôn lại ngay từ vựng vừa học, không cần soạn quiz thủ công.
            const [videoQuizRounds, setVideoQuizRounds] = useState([]); // [[{term, options, correctIndex}], ...]
            const [videoQuizActive, setVideoQuizActive] = useState(false);
            const [videoQuizRoundIdx, setVideoQuizRoundIdx] = useState(0);
            const [videoQuizQIdx, setVideoQuizQIdx] = useState(0);
            const [videoQuizScore, setVideoQuizScore] = useState(0);
            const [videoQuizSelected, setVideoQuizSelected] = useState(null);
            const [videoQuizShowResult, setVideoQuizShowResult] = useState(false);
            const [videoQuizRoundReward, setVideoQuizRoundReward] = useState(null); // { stones, fame } - thưởng vừa nhận khi vượt xong 1 ải ôn tập video
            // 🏁 TỔNG KẾT ẢI ÔN TẬP VIDEO: gom kết quả từng ải để cuối cùng hiện bảng tổng kết (trước đây
            // vượt xong ải cuối là modal đóng ngay, không thấy tổng điểm/tổng thưởng).
            const [videoQuizRoundResults, setVideoQuizRoundResults] = useState([]); // [{ round, score, total, stones, fame }]
            const [videoQuizFinished, setVideoQuizFinished] = useState(false);
            const videoQuizPayingRef = useRef(false); // chặn bấm đúp nút nhận thưởng -> cộng thưởng 2 lần
            // 🆕 BÊ NGUYÊN CẤU TRÚC TỪ ẢI BÍ TỊCH VĂN BẢN sang Ải Ôn Tập Từ Vựng: gợi ý khi chọn sai (đáp án
            // sai biến mất + bảng gợi ý AI) và AI phân tích sau khi trả lời.
            const [videoQuizEliminated, setVideoQuizEliminated] = useState([]);
            const [videoHintText, setVideoHintText] = useState('');
            const [videoHintLoading, setVideoHintLoading] = useState(false);
            const [videoAiExplainText, setVideoAiExplainText] = useState('');
            const [videoAiExplainLoading, setVideoAiExplainLoading] = useState(false);
            const [videoSaveReward, setVideoSaveReward] = useState(null); // { stones, alreadySaved } - bảng THU HOẠCH hiện lên sau khi Lưu Bài Học Video (thay cho alert() cũ)
            const ytPlayerRef = useRef(null);
            
            // ============================================================
            // 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): toàn bộ state riêng cho tính năng lộ trình luyện thi có
            // sơ đồ cây (Đạo Đồ) kiểu Duolingo + Bát Quái Đồ (biểu đồ mạng nhện phân tích thực lực) +
            // Đạo Hữu Bảng (BXH thời gian luyện thi trong ngày, 4h00-23h00) + Bảng Phong Thưởng.
            // ============================================================
            const [examPathTab, setExamPathTab] = useState('TREE'); // 'TREE' | 'RADAR' | 'BOARD' | 'REWARDS'
            const [examPathWizMode, setExamPathWizMode] = useState('library'); // 'library' = từ Bí Tịch đã tải lên | 'subjects' = theo môn học cụ thể
            const [examPathWizDays, setExamPathWizDays] = useState(7);
            const [examPathWizDifficulty, setExamPathWizDifficulty] = useState('normal');
            const [examPathWizLibId, setExamPathWizLibId] = useState('');
            const [examPathWizSubjects, setExamPathWizSubjects] = useState([]); // mảng tên môn đã chọn/gõ
            const [examPathWizSubjectInput, setExamPathWizSubjectInput] = useState('');
            const [examPathGenerating, setExamPathGenerating] = useState(false);
            const [examPathActiveNodeId, setExamPathActiveNodeId] = useState(null); // node đang luyện (để trả điểm/tiến độ đúng chỗ khi vượt Ải)
            const [examPathViewNode, setExamPathViewNode] = useState(null); // node đang xem trước khi bấm "VÀO ẢI"
            const [examPathRadarAdvice, setExamPathRadarAdvice] = useState('');
            const [examPathRadarLoading, setExamPathRadarLoading] = useState(false);
            const [examPathRewardModal, setExamPathRewardModal] = useState(null); // { rank, titleName } - hiện sau khi Đạo Hữu Bảng chốt ngày
            const [examPathTimeLeftStr, setExamPathTimeLeftStr] = useState('Đang tính toán...');
            const [examPathWindowOpen, setExamPathWindowOpen] = useState(true); // có đang trong khung giờ 4h00-23h00 để tính điểm hay không
            // 🆕 SỬA HIỂU LẦM "BXH KHÔNG LÊN DÙ ĐÃ HỌC": true/false = lượt luyện thi Đạo Lộ vừa xong CÓ/
            // KHÔNG được cộng vào Đạo Hữu Bảng hôm nay (do ngoài khung giờ 4h-23h), null = lượt vừa rồi
            // không thuộc Đạo Lộ nên không liên quan. Hiện rõ ở màn RESULT thay vì im lặng khiến người
            // dùng tưởng bảng xếp hạng bị lỗi.
            const [examPathLastRunCounted, setExamPathLastRunCounted] = useState(null);
            // 🆕 BÙA NHÂN ĐÔI (x2_card) BẢN MỚI: chuỗi đếm ngược hiệu lực còn lại của lượt kích hoạt x2
            // hiện tại (rỗng nếu không có hiệu lực) - tính trong cùng vòng lặp 1 giây với các đếm ngược
            // mùa giải khác ở dưới, xem chỗ setX2BoostTimeLeftStr.
            const [x2BoostTimeLeftStr, setX2BoostTimeLeftStr] = useState('');
            const [showVictoryFx, setShowVictoryFx] = useState(false); // bật/tắt hiệu ứng pháo hoa CSS khi Chiến Thắng lớn
            // 🆕 SỬA "ĐOẠN KẾT CHƯA HOÀN THIỆN": trước đây hoàn thành TOÀN BỘ Đạo Lộ chỉ có 4 giây pháo hoa
            // rồi về thẳng màn RESULT bình thường của Ải cuối - không khác gì hoàn thành 1 Ải lẻ, không có
            // cảm giác "đã xong cả hành trình". Nay thêm hẳn 1 modal tổng kết riêng, ở lại tới khi người
            // dùng tự bấm đóng, thay vì chỉ thoáng qua rồi mất.
            const [examPathFinaleInfo, setExamPathFinaleInfo] = useState(null); // { title, totalNodes, days } hoặc null
            const examPathDailyMetaRef = useRef({ nextReset: null });
            const examPathNodeStartRef = useRef(null); // mốc thời gian bắt đầu luyện 1 Ải trong Đạo Lộ - dùng tính "thời gian luyện thi" cho Đạo Hữu Bảng

            const audioRefs = useRef({});
            const quizTimerRef = useRef(null); 

            const latestUser = useRef(user);
            const latestAllUsers = useRef(allUsers);
            const latestAllGuilds = useRef(allGuilds);
            const seasonMetaRef = useRef({ nextReset: null });
            const guildMetaRef = useRef({ nextReset: null });
            
            useEffect(() => { latestUser.current = user; }, [user]);
            useEffect(() => { latestAllUsers.current = allUsers; }, [allUsers]);
            useEffect(() => { latestAllGuilds.current = allGuilds; }, [allGuilds]);

            // 🔊 SỬA LỖI ÂM THANH (v2): tách hàm tạo audio ra riêng (initOneAudio) để dùng lại được cả lúc
            // mount LẪN lúc bấm "Tải Lại Âm Thanh" thủ công (reloadAllSfx) - trước đây chỉ tạo 1 LẦN DUY
            // NHẤT lúc mount nên nếu lỗi mạng thoáng qua làm hỏng 1 file, người dùng KHÔNG có cách nào tự
            // sửa mà không tải lại (F5) toàn bộ trang. Mỗi file audio giờ có tối đa 1 LẦN TỰ ĐỘNG THỬ LẠI
            // sau 1.5s nếu lỗi lần đầu (thường do mạng chập chờn), chỉ thật sự gắn cờ audioErrors khi cả
            // 2 lần đều thất bại.
            const initOneAudio = (key, srcOverride, _isRetry) => {
                const a = new Audio();
                a.preload = 'auto';
                a.onerror = () => {
                    if (key !== 'BGM') return; // SFX lỗi file -> playSfx tự dùng âm WebAudio, không cần báo lỗi
                    if (!_isRetry) { setTimeout(() => initOneAudio(key, srcOverride, true), 1500); return; }
                    setAudioErrors(prev => ({ ...prev, [key]: true }));
                    console.warn(`[Tiên Âm] Không tải được file "${key}": ${srcOverride || AUDIO_URLS[key]}`);
                };
                a.oncanplaythrough = () => setAudioErrors(prev => (prev[key] ? { ...prev, [key]: false } : prev));
                if (key === 'BGM') {
                    // Gắn sự kiện của Danh Sách Phát 1 LẦN DUY NHẤT lúc mount, dùng ref để luôn
                    // gọi đúng logic mới nhất (tránh lỗi "closure cũ" y hệt lỗi loa ở trên).
                    a.ontimeupdate = () => setBgmCurrentTime(a.currentTime);
                    a.onloadedmetadata = () => setBgmDuration(a.duration || 0);
                    a.onended = () => bgmNextRef.current();
                }
                a.src = srcOverride || AUDIO_URLS[key];
                audioRefs.current[key] = a;
                return a;
            };
            useEffect(() => {
                try {
                    if (typeof window !== 'undefined' && window.Audio) {
                        Object.keys(AUDIO_URLS).forEach(key => initOneAudio(key));
                        // 🔓 MỞ KHOÁ AUTOPLAY: trước đây gắn listener {once:true} rồi tự gỡ sau lần chạm/bấm
                        // phím ĐẦU TIÊN - nghĩa là Audio nào sinh ra SAU thời điểm đó (ví dụ do initOneAudio
                        // tự thử lại khi mạng chập chờn) sẽ không bao giờ được mở khoá nữa. Nay KHÔNG gỡ
                        // listener - giữ nghe suốt phiên - nhưng __unlockAudioElement tự bỏ qua (no-op) mọi
                        // Audio đã mở khoá rồi nên cực nhẹ, không tốn tài nguyên gì thêm.
                        const unlock = () => { window.__unlockAudioOnce(audioRefs.current); };
                        document.addEventListener('pointerdown', unlock);
                        document.addEventListener('keydown', unlock);
                        return () => { document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
                    }
                } catch(e) {}
            }, []);

            // 🔄 TẢI LẠI TOÀN BỘ ÂM THANH: dùng khi người dùng thấy dấu "!" báo lỗi trên nút ☰ (hoặc bấm
            // thủ công trong bảng Tiên Âm) - tạo lại MỌI đối tượng Audio từ đầu, không cần tải lại trang.
            const reloadAllSfx = () => {
                playSfx('CLICK');
                setAudioErrors({});
                Object.keys(AUDIO_URLS).forEach(key => {
                    const cur = audioRefs.current[key];
                    const freshAudio = initOneAudio(key, (cur && cur.src && !cur.src.startsWith('blob:')) ? null : (cur && cur.src));
                    // 🆕 SỬA LỖI ÂM THANH SAU RESET: Audio này VỪA được tạo mới nên chưa hề được "mở khoá"
                    // autoplay - mở khoá ngay trong cử chỉ bấm nút này (xem __unlockAudioElement ở đầu file).
                    if (window.__unlockAudioElement) window.__unlockAudioElement(freshAudio);
                });
                alert("Đã tải lại toàn bộ Tiên Âm & hiệu ứng (đã mở khoá lại quyền tự phát)!");
            };
            // 📤 TẢI LÊN FILE ÂM THANH RIÊNG cho 1 hiệu ứng cụ thể (y hệt cơ chế "Tải Lên Tiên Âm" của
            // Danh Sách Phát ở dưới, nhưng áp dụng cho TỪNG hiệu ứng CLICK/CORRECT/WRONG/HINT/VICTORY...):
            // hữu ích khi file mixkit mặc định bị chặn bởi mạng nội bộ/trường học, người dùng có thể tự
            // dùng file .mp3 sẵn có trên máy thay thế ngay, không cần Internet cho riêng file đó nữa.
            // Lưu ý: dùng URL.createObjectURL nên chỉ tồn tại trong phiên hiện tại (không đồng bộ thiết
            // bị khác), giống hệt hạn chế đã ghi chú sẵn ở handleBgmUpload bên dưới.
            const handleSfxUpload = (key, e) => {
                const file = e.target.files[0]; if (!file) return;
                playSfx('CLICK');
                const url = URL.createObjectURL(file);
                const freshAudio = initOneAudio(key, url);
                if (window.__unlockAudioElement) window.__unlockAudioElement(freshAudio); // 🆕 mở khoá Audio mới ngay trong cử chỉ bấm này
                setAudioErrors(prev => ({ ...prev, [key]: false }));
                alert(`Đã thay thế hiệu ứng "${key}" bằng file riêng của Ngài!`);
                e.target.value = '';
            };

            const playSfx = (key) => {
                window.__lastSfxAt = Date.now();
                if (isMuted) return;
                const a = audioRefs.current[key];
                if (!a || a.error || a.readyState < 2) { window.__synthSfx(key); return; }
                try { a.currentTime = 0; const pr = a.play(); if (pr && pr.catch) pr.catch(() => window.__synthSfx(key)); } catch (e) { window.__synthSfx(key); }
            };
            // 🎉 HIỆU ỨNG CHIẾN THẮNG LỚN: dùng khi hoàn thành TOÀN BỘ Đạo Lộ Tu Luyện Chi Lộ hoặc lọt Top
            // Đạo Hữu Bảng cuối ngày - phát LIÊN TIẾP 2 hiệu ứng (VICTORY rồi COMBO) để tạo cảm giác "to"
            // hơn 1 tiếng "đúng/sai" bình thường, kèm hiệu ứng pháo hoa CSS (xem ConfettiBurst) không phụ
            // thuộc file âm thanh/mạng nên luôn hiển thị được dù loa đang lỗi.
            const playVictoryFx = () => { playSfx('VICTORY'); setTimeout(() => playSfx('COMBO'), 350); };
            // 🆕 SỬA LỖI THIẾU ÂM THANH KHI HIỆN POPUP: hộp thoại alert()/confirm() tự vẽ (ở đầu file,
            // ngoài React) không thể gọi trực tiếp playSfx() vì nó không thấy được state/closure của
            // component. Nên "phơi" playSfx ra window để đoạn code vanilla JS đó gọi vào được.
            useEffect(() => { window.__sfxMuted = isMuted; });
            useEffect(() => { window.__playSfx = playSfx; return () => { if (window.__playSfx === playSfx) delete window.__playSfx; }; });
            const playBgm = () => {
                if (isMuted || !audioRefs.current['BGM']) return;
                audioRefs.current['BGM'].loop = bgmPlaylist.length <= 1;
                audioRefs.current['BGM'].volume = appState === 'VIDEO_LEARN' ? 0.05 : 0.25;
                audioRefs.current['BGM'].play().catch(() => setAudioErrors(prev => ({ ...prev, BGM: true })));
            };
            // SỬA LỖI LOA: bản cũ đọc biến "isMuted" trong closure ngay sau khi gọi setIsMuted() nên luôn
            // là giá trị CŨ (React không cập nhật state đồng bộ) -> lúc BẬT lại loa, playBgm() vẫn thấy
            // isMuted=true (cũ) nên tự thoát ra ngay, khiến nhạc "không kêu". Nay dùng functional update
            // để luôn thao tác đúng trên giá trị MỚI, không phụ thuộc closure cũ.
            const toggleMute = () => {
                setIsMuted(prevMuted => {
                    const nextMuted = !prevMuted;
                    const bgm = audioRefs.current['BGM'];
                    if (bgm) {
                        if (nextMuted) {
                            bgm.pause();
                        } else {
                            bgm.loop = false;
                            bgm.volume = appState === 'VIDEO_LEARN' ? 0.05 : 0.25;
                            bgm.play().catch(() => setAudioErrors(prev => ({ ...prev, BGM: true })));
                        }
                    }
                    return nextMuted;
                });
            };

            // SỬA LỖI CHÈN ÂM THANH: khi vào "Học Qua Video" (âm thanh video/TTS sẽ phát), tự động
            // hạ nhỏ tiếng nhạc nền xuống thay vì để 2 nguồn âm thanh chồng lên nhau; rời trang thì trả lại như cũ.
            useEffect(() => {
                const bgm = audioRefs.current['BGM'];
                if (!bgm) return;
                if (appState === 'VIDEO_LEARN') { bgm.volume = 0.05; }
                else if (!isMuted) { bgm.volume = 0.25; }
            }, [appState]);
            const changeAppState = (newState) => { playSfx('CLICK'); setAppState(newState); if (newState === 'GUILD') setGuildTab('INFO'); };

            // Phát hiện chuỗi điểm danh bị đứt (bỏ lỡ quá 24h): hiện modal 3 lựa chọn khôi phục thay vì
            // âm thầm reset về 1. Chỉ hiện khi có streak cũ > 0 và chưa chọn "Học để khôi phục" (đang chờ).
            // SỬA LỖI (modal khôi phục chuỗi hiện lặp / bấm rồi vẫn hiện):
            //  1) Trước đây modal chỉ đóng SAU khi `await update(...)` xong -> khi mạng chậm/offline hoặc Rules
            //     từ chối, promise treo/lỗi => modal không đóng, người dùng bấm nhiều lần => alert + trừ tiền lặp.
            //  2) Effect có 2 nhánh `return` mà KHÔNG đóng modal.
            // Nay: đóng modal NGAY khi bấm, khoá bấm lặp bằng ref, bắt lỗi (lỗi thì mở lại), và nhớ phiên đã xử lý.
            const streakRestoreBusyRef = React.useRef(false);
            const streakRestoreHandledRef = React.useRef(null); // lưu `${uid}:${lastPlayedDate}` đã xử lý trong phiên này
            useEffect(() => {
                const close = () => setStreakRestoreModal(prev => (prev === null ? prev : null));
                if (!user || !user.lastPlayedDate || !(user.streakCount > 0) || user.streakRestorePending) { close(); return; }
                const today = getVNSourceDate(new Date());
                const yesterday = getVNSourceDate(new Date(Date.now() - 86400000));
                if (user.lastPlayedDate === today || user.lastPlayedDate === yesterday) { close(); return; }
                if (streakRestoreHandledRef.current === `${user.uid}:${user.lastPlayedDate}` || safeGetItem('streakRestoreSkip') === `${user.uid}:${user.lastPlayedDate}`) return;
                setStreakRestoreModal(prev => (prev && prev.oldStreak === user.streakCount ? prev : { oldStreak: user.streakCount }));
            }, [user?.uid, user?.lastPlayedDate, user?.streakCount, user?.streakRestorePending]);

            const runStreakRestore = async (work, okMsg) => {
                if (streakRestoreBusyRef.current || !user) return;
                streakRestoreBusyRef.current = true;
                const key = `${user.uid}:${user.lastPlayedDate}`;
                streakRestoreHandledRef.current = key;
                setStreakRestoreModal(null); // đóng ngay, không chờ mạng
                try {
                    await work();
                    if (okMsg) setTimeout(() => alert(okMsg), 0);
                } catch (e) {
                    console.error('Khôi phục chuỗi lỗi:', e && e.code, e && e.message, e);
                    // KHÔNG mở lại modal (trước đây khiến người chơi kẹt, không vào được game). Ghi nhớ bỏ qua
                    // trên thiết bị này cho mốc lastPlayedDate hiện tại để vào game bình thường.
                    safeSetItem('streakRestoreSkip', key);
                    alert('Không thể khôi phục chuỗi (' + ((e && (e.code || e.message)) || 'lỗi không rõ') + '). Bạn vẫn có thể chơi bình thường; hãy học 1 Ải để tiếp tục.');
                } finally { streakRestoreBusyRef.current = false; }
            };
            const streakRestoreByStudy = () => {
                playSfx('CLICK');
                runStreakRestore(
                    () => firestore.collection('users').doc(user.uid).update({ streakRestorePending: true }),
                    "Hãy hoàn thành 1 Ải bất kỳ trong hôm nay để khôi phục chuỗi điểm danh!"
                );
            };
            const streakRestoreBySpirit = () => {
                const cost = Math.min((streakRestoreModal?.oldStreak || 1) * 20, 2000);
                if ((user.spirit || 0) < cost) return alert(`Không đủ Linh Thạch! Cần ${cost}💎.`);
                playSfx('SUCCESS');
                runStreakRestore(
                    () => firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(-cost), lastPlayedDate: getVNSourceDate(new Date(Date.now() - 86400000)) }),
                    `Đã dùng ${cost}💎 Linh Thạch khôi phục chuỗi điểm danh! Hãy hoàn thành 1 Ải hôm nay để nối tiếp.`
                );
            };
            const streakRestoreByFame = () => {
                const cost = Math.min((streakRestoreModal?.oldStreak || 1) * 5, 500);
                if ((user.fame || 0) < cost) return alert(`Không đủ Danh Vọng! Cần ${cost}⭐.`);
                playSfx('SUCCESS');
                runStreakRestore(
                    () => firestore.collection('users').doc(user.uid).update({ fame: firebase.firestore.FieldValue.increment(-cost), lastPlayedDate: getVNSourceDate(new Date(Date.now() - 86400000)) }),
                    `Đã dùng ${cost}⭐ Danh Vọng khôi phục chuỗi điểm danh! Hãy hoàn thành 1 Ải hôm nay để nối tiếp.`
                );
            };
            const streakRestoreDismiss = () => {
                playSfx('FAIL');
                runStreakRestore(() => firestore.collection('users').doc(user.uid).update({ streakCount: 0 }), null);
            };

            // Tải lên nhiều bài .mp3 cùng lúc -> thêm vào Danh Sách Phát thay vì thay thế hẳn bài cũ.
            const handleBgmUpload = (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                playSfx('CLICK');
                const newTracks = files.map((file, i) => ({ id: `up-${Date.now()}-${i}`, name: file.name.replace(/\.[^/.]+$/, ''), url: URL.createObjectURL(file) }));
                let newIndex = 0;
                setBgmPlaylist(prev => { newIndex = prev.length; return [...prev, ...newTracks]; });
                // Phát luôn bài đầu tiên vừa tải lên (thao tác thẳng lên thẻ audio, tránh đọc lại state
                // "bgmPlaylist" vừa setState ở trên vì closure của hàm này vẫn đang giữ giá trị CŨ).
                const bgm = audioRefs.current['BGM'];
                if (bgm) {
                    bgm.src = newTracks[0].url; bgm.load(); bgm.loop = false;
                    bgm.volume = appState === 'VIDEO_LEARN' ? 0.05 : 0.25;
                    setAudioErrors(prev => ({ ...prev, BGM: false }));
                    setBgmTrackIndex(newIndex);
                    if (!isMuted) bgm.play().catch(() => setAudioErrors(prev => ({ ...prev, BGM: true })));
                }
                alert(`Đã dung hợp ${files.length} Tiên Âm vào Danh Sách Phát!`);
                e.target.value = '';
            };

            // Phát 1 bài cụ thể trong Danh Sách Phát (dùng cho bấm chọn bài, Bài Tiếp, Bài Trước).
            const playBgmTrackAt = (idx) => {
                const bgm = audioRefs.current['BGM'];
                const track = bgmPlaylist[idx];
                if (!bgm || !track) return;
                if (bgm.src !== track.url) { bgm.src = track.url; bgm.load(); setAudioErrors(prev => ({ ...prev, BGM: false })); }
                bgm.loop = false;
                bgm.volume = appState === 'VIDEO_LEARN' ? 0.05 : 0.25;
                setBgmTrackIndex(idx);
                if (!isMuted) bgm.play().catch(() => setAudioErrors(prev => ({ ...prev, BGM: true })));
            };
            const bgmPickNextIndex = () => {
                if (bgmPlaylist.length <= 1) return bgmTrackIndex;
                if (bgmShuffle) { let r; do { r = Math.floor(Math.random() * bgmPlaylist.length); } while (r === bgmTrackIndex); return r; }
                return (bgmTrackIndex + 1) % bgmPlaylist.length;
            };
            const bgmNext = () => { playSfx('CLICK'); playBgmTrackAt(bgmPickNextIndex()); };
            const bgmPrev = () => { playSfx('CLICK'); if (bgmPlaylist.length === 0) return; playBgmTrackAt((bgmTrackIndex - 1 + bgmPlaylist.length) % bgmPlaylist.length); };
            const toggleBgmShuffle = () => { playSfx('CLICK'); setBgmShuffle(s => !s); };
            const seekBgm = (seconds) => { const bgm = audioRefs.current['BGM']; if (bgm) { bgm.currentTime = seconds; setBgmCurrentTime(seconds); } };
            // Ref luôn trỏ tới bản MỚI NHẤT của bgmNext để sự kiện "onended" (gắn 1 lần lúc mount) không
            // bao giờ bị kẹt closure cũ - tự động sang bài kế tiếp khi bài hiện tại phát xong.
            useEffect(() => { bgmNextRef.current = bgmNext; });

            useEffect(() => {
                if (appState !== 'LOADING') return;
                let p = 0; const t = setInterval(() => { p += Math.floor(Math.random() * 15) + 5; if(p > 90) p = 90; setLoadProgress(p); }, 300);
                return () => clearInterval(t);
            }, [appState]);

            useEffect(() => {
                let isMounted = true; const startTime = Date.now();
                const transitionTo = (state) => {
                    const elapsed = Date.now() - startTime; const remaining = Math.max(0, 300 - elapsed);
                    setTimeout(() => { if (!isMounted) return; setLoadProgress(100); setTimeout(() => { if (isMounted) setAppState(state); }, 100); }, remaining);
                };

                const loadingFallback = setTimeout(() => { if (isMounted) transitionTo('LOGIN'); }, 12000);

                const unsubscribeAuth = auth.onAuthStateChanged(async (fbUser) => {
                    clearTimeout(loadingFallback);
                    if (!isMounted) return;
                    setAuthUid(fbUser ? fbUser.uid : null);
                    if (fbUser) {
                        const userRef = firestore.collection('users').doc(fbUser.uid);
                        // SỬA LỖI TREO: tài khoản đăng nhập lần đầu (VD: Google) chưa có hồ sơ trên Firestore
                        // thì onSnapshot bên dưới không bao giờ nhận doc.exists=true -> kẹt mãi ở màn Loading.
                        // Nên kiểm tra và tự tạo hồ sơ mặc định trước khi lắng nghe.
                        (async () => { const existingSnap = await userRef.get().catch(() => null);
                        if (existingSnap && !existingSnap.exists) {
                            await userRef.set({
                                name: (fbUser.displayName || fbUser.email || 'vo danh').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || generateGameId(),
                                spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '',
                                library: [], videoNotes: [], inventory: [], friends: [], requests: [], guild: null, gameId: generateGameId(), lastActive: Date.now(),
                                photo: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${fbUser.uid}`,
                                rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                            }, { merge: true }).catch(() => {});
                        } else {
                            userRef.set({ lastActive: Date.now() }, { merge: true }).catch(()=>{});
                        }
                        })(); // không chặn việc mở onSnapshot bên dưới -> vào game nhanh hơn
                        // 🔑 ĐỒNG BỘ GEMINI API KEY QUA MỌI THIẾT BỊ (theo tài khoản, không theo trình duyệt):
                        // Lưu ý QUAN TRỌNG: Key này được đọc từ 1 subcollection RIÊNG "private/settings",
                        // KHÔNG lưu trực tiếp vào doc users/{uid} - vì doc đó bị firestore.collection('users')
                        // .onSnapshot(...) bên dưới gửi TOÀN BỘ field tới MỌI người chơi khác (để hiển thị Thiên
                        // Bảng). Nếu lưu Key ở đó, mọi người chơi khác sẽ vô tình nhận được API Key của Ngài.
                        // -> Bắt buộc phải giữ Key trong subcollection riêng này, không được gộp lên doc chính.
                        userRef.collection('private').doc('settings').onSnapshot(privDoc => {
                            if (isMounted && privDoc.exists) {
                                const pData = privDoc.data();
                                if (pData.geminiApiKey) { setVideoApiKey(pData.geminiApiKey); localStorage.setItem('geminiApiKey', pData.geminiApiKey); }
                                if (typeof pData.geminiApiKey2 === 'string') { setGeminiKey2(pData.geminiApiKey2); }
                            }
                        }, (err) => {
                            // Chưa cấu hình Firestore Rules cho subcollection "private" (hoặc mạng lỗi) ->
                            // im lặng bỏ qua, KHÔNG hiện banner lỗi đỏ. App vẫn chạy bình thường, chỉ là
                            // Key sẽ không đồng bộ qua thiết bị khác được (vẫn dùng bản lưu trong localStorage).
                            console.warn('Không đọc được Gemini Key riêng theo tài khoản (cần thêm Firestore Rules cho users/{uid}/private):', err.code || err.message);
                        });
                        let isFirstLoad = true;
                        userRef.onSnapshot(doc => {
                            if (doc.exists && isMounted) {
                                let data = doc.data();
                                if (!data.gameId) { const newGameId = generateGameId(); userRef.update({ gameId: newGameId }); data.gameId = newGameId; }
                                if (!data.requests) data.requests = [];
                                setUser({ ...data, uid: fbUser.uid });
                                if (isFirstLoad) { isFirstLoad = false; transitionTo('DASHBOARD'); }
                            }
                        });
                    } else { setUser(null); transitionTo('LOGIN'); }
                });

                return () => { isMounted = false; unsubscribeAuth(); clearTimeout(loadingFallback); };
            }, []);

            // 🔐 CÁC LISTENER DỮ LIỆU CHUNG (users, guilds, meta/season, meta/guildSeason) CHỈ ĐƯỢC PHÉP
            // GỌI SAU KHI "authUid" ĐÃ CÓ GIÁ TRỊ (Firebase Auth xác nhận xong đăng nhập) - xem ghi chú
            // đầy đủ ở chỗ khai báo state "authUid". Gọi sớm hơn (như trước đây, ngay khi component vừa
            // mount) khiến Firestore Rules thấy request.auth = null và từ chối một cách NGẪU NHIÊN tuỳ
            // tốc độ khôi phục phiên đăng nhập của từng trình duyệt/thiết bị - đây chính là nguyên nhân
            // lỗi "Lỗi kết nối (Rules?)" chỉ xảy ra trên một số máy/trình duyệt chứ không phải tất cả.
            useEffect(() => {
                if (!authUid) return;
                let isMounted = true;

                const unsubUsers = firestore.collection('users').onSnapshot(
                    snap => { if (!isMounted) return; const usersList = []; snap.forEach(doc => usersList.push({ ...doc.data(), uid: doc.id })); setAllUsers(usersList); },
                    e => console.error("Lỗi lắng nghe collection 'users' (kiểm tra Firestore Rules):", e)
                );
                const unsubGuilds = firestore.collection('guilds').onSnapshot(
                    snap => { if (!isMounted) return; const guildsDict = {}; snap.forEach(doc => guildsDict[doc.id] = { ...doc.data(), id: doc.id }); setAllGuilds(guildsDict); },
                    e => console.error("Lỗi lắng nghe collection 'guilds' (kiểm tra Firestore Rules):", e)
                );

                const seasonDocRef = firestore.collection('meta').doc('season');
                const guildDocRef = firestore.collection('meta').doc('guildSeason');
                // 🗺️ ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ): mốc reset riêng, LUÔN LÀ 4h00 SÁNG (giờ VN) kế tiếp
                // thay vì 1 khoảng thời gian cố định như 2 mùa giải trên, đúng yêu cầu "reset giải 4h-23h".
                const examPathDailyDocRef = firestore.collection('meta').doc('examPathDaily');

                seasonDocRef.get().then(doc => { if (!doc.exists) seasonDocRef.set({ nextReset: Date.now() + SEASON_DURATION }); }).catch(e => { console.error("Lỗi đọc/tạo meta/season (kiểm tra Firestore Rules cho collection 'meta'):", e); setTimeLeftStr('Lỗi kết nối (Rules?)'); });
                guildDocRef.get().then(doc => { if (!doc.exists) guildDocRef.set({ nextReset: Date.now() + GUILD_SEASON_DURATION }); }).catch(e => { console.error("Lỗi đọc/tạo meta/guildSeason (kiểm tra Firestore Rules cho collection 'meta'):", e); setGuildTimeLeftStr('Lỗi kết nối (Rules?)'); });
                examPathDailyDocRef.get().then(doc => { if (!doc.exists) examPathDailyDocRef.set({ nextReset: getNextExamPathResetTs() }); }).catch(e => { console.error("Lỗi đọc/tạo meta/examPathDaily (kiểm tra Firestore Rules cho collection 'meta'):", e); setExamPathTimeLeftStr('Lỗi kết nối (Rules?)'); });

                // SỬA LỖI: trước đây lỗi bị nuốt im lặng (không có callback lỗi) nên khi Firestore Rules
                // chặn đọc collection 'meta', đồng hồ đếm ngược kẹt vĩnh viễn ở "Đang tính toán..." mà
                // không ai biết vì sao. Giờ báo lỗi rõ ràng ra console + hiển thị luôn trên UI.
                const unsubSeason = seasonDocRef.onSnapshot(
                    doc => { if (doc.exists) seasonMetaRef.current = doc.data(); },
                    e => { console.error("Lỗi lắng nghe meta/season (kiểm tra Firestore Rules):", e); setTimeLeftStr('Lỗi kết nối (Rules?)'); }
                );
                const unsubGuild = guildDocRef.onSnapshot(
                    doc => { if (doc.exists) guildMetaRef.current = doc.data(); },
                    e => { console.error("Lỗi lắng nghe meta/guildSeason (kiểm tra Firestore Rules):", e); setGuildTimeLeftStr('Lỗi kết nối (Rules?)'); }
                );
                const unsubExamPathDaily = examPathDailyDocRef.onSnapshot(
                    doc => { if (doc.exists) examPathDailyMetaRef.current = doc.data(); },
                    e => { console.error("Lỗi lắng nghe meta/examPathDaily (kiểm tra Firestore Rules):", e); setExamPathTimeLeftStr('Lỗi kết nối (Rules?)'); }
                );

                return () => { isMounted = false; unsubUsers(); unsubGuilds(); unsubSeason(); unsubGuild(); unsubExamPathDaily(); };
            }, [authUid]);

            useEffect(() => {
                const timerInterval = setInterval(() => {
                    const now = Date.now();
                    const cUser = latestUser.current; const cAllUsers = latestAllUsers.current; const cAllGuilds = latestAllGuilds.current;

                    const seasonNextReset = seasonMetaRef.current.nextReset;
                    if (seasonNextReset && now >= seasonNextReset) {
                        // SỬA LỖI: nếu danh sách người chơi chưa kịp tải xong (VD: vừa mở app),
                        // đừng "giành" quyền reset kẻo mùa giải kết thúc mà không ai được cộng Linh Thạch.
                        // Đợi tick giây sau, khi có client nào đã có đủ dữ liệu, họ sẽ xử lý.
                        if (cAllUsers.length === 0) return;
                        const seasonDocRef = firestore.collection('meta').doc('season');
                        firestore.runTransaction(async (tx) => {
                            const doc = await tx.get(seasonDocRef);
                            const currentNextReset = doc.exists ? doc.data().nextReset : 0;
                            if (now < currentNextReset) return false; // Thiết bị khác đã xử lý reset này rồi
                            tx.set(seasonDocRef, { nextReset: now + SEASON_DURATION }, { merge: true });
                            return true;
                        }).then(claimed => {
                            if (!claimed) return;
                            // Thiết bị này "giành quyền" xử lý reset -> tính đúng Top 1/2/3 THẬT và cộng thẳng vào tài khoản họ
                            const sortedUsers = [...cAllUsers].filter(u => (u.seasonScore || 0) > 0).sort((a,b) => (b.seasonScore || 0) - (a.seasonScore || 0));
                            const rewardTiers = [{ s: 5000, f: 100 }, { s: 3000, f: 50 }, { s: 1000, f: 20 }];
                            const batch = firestore.batch();
                            sortedUsers.slice(0, 3).forEach((u, i) => {
                                batch.update(firestore.collection('users').doc(u.uid), {
                                    spirit: firebase.firestore.FieldValue.increment(rewardTiers[i].s),
                                    fame: firebase.firestore.FieldValue.increment(rewardTiers[i].f)
                                });
                                if (cUser && u.uid === cUser.uid) setSeasonRewardModal({ rank: i + 1, ...rewardTiers[i] });
                            });
                            cAllUsers.forEach(u => { if (u.seasonScore) batch.update(firestore.collection('users').doc(u.uid), { seasonScore: 0 }); });
                            batch.commit().catch(e => console.error("Lỗi phát thưởng mùa giải:", e));
                        }).catch(e => console.error("Lỗi transaction mùa giải:", e));
                    } else if (seasonNextReset) {
                        const diffMs = seasonNextReset - now;
                        setTimeLeftStr(`${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`);
                    }

                    const guildNextReset = guildMetaRef.current.nextReset;
                    if (guildNextReset && now >= guildNextReset) {
                        // Tương tự: đợi danh sách Tông môn tải xong trước khi chốt phát thưởng.
                        if (Object.keys(cAllGuilds).length === 0) return;
                        const guildDocRef = firestore.collection('meta').doc('guildSeason');
                        firestore.runTransaction(async (tx) => {
                            const doc = await tx.get(guildDocRef);
                            const currentNextReset = doc.exists ? doc.data().nextReset : 0;
                            if (now < currentNextReset) return false;
                            tx.set(guildDocRef, { nextReset: now + GUILD_SEASON_DURATION }, { merge: true });
                            return true;
                        }).then(claimed => {
                            if (!claimed) return;
                            const sortedGuilds = Object.values(cAllGuilds).sort((a,b) => { if (b.level !== a.level) return b.level - a.level; return (b.exp || 0) - (a.exp || 0); });
                            const guildRewardTiers = [5000, 3000, 1000];
                            const batch = firestore.batch();
                            sortedGuilds.slice(0, 3).forEach((g, i) => {
                                batch.update(firestore.collection('guilds').doc(g.id), { exp: firebase.firestore.FieldValue.increment(guildRewardTiers[i]) });
                            });
                            batch.commit().catch(e => console.error("Lỗi phát thưởng tông môn:", e));
                        }).catch(e => console.error("Lỗi transaction tông môn:", e));
                    } else if (guildNextReset) {
                        const diffMsG = guildNextReset - now;
                        setGuildTimeLeftStr(`${Math.floor(diffMsG / (24 * 3600000))}d ${Math.floor((diffMsG % (24 * 3600000)) / 3600000).toString().padStart(2, '0')}h ${Math.floor((diffMsG % 3600000) / 60000).toString().padStart(2, '0')}m ${Math.floor((diffMsG % 60000) / 1000).toString().padStart(2, '0')}s`);
                    }

                    // 🗺️ ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ): giống hệt mô hình reset mùa giải/tông môn ở trên,
                    // nhưng mốc reset LUÔN LÀ 4h00 sáng (giờ VN) kế tiếp thay vì 1 khoảng cố định. Top 3
                    // (điểm = phút luyện thi tích luỹ trong khung 4h-23h hôm đó) nhận 1 danh hiệu Phong
                    // Thái MIỄN PHÍ (không cộng Linh Thạch/Danh Vọng - đúng ý "thưởng NHỎ về phong thái").
                    const examPathNextReset = examPathDailyMetaRef.current.nextReset;
                    if (examPathNextReset && now >= examPathNextReset) {
                        if (cAllUsers.length === 0) return;
                        const examPathDailyDocRef = firestore.collection('meta').doc('examPathDaily');
                        firestore.runTransaction(async (tx) => {
                            const doc = await tx.get(examPathDailyDocRef);
                            const currentNextReset = doc.exists ? doc.data().nextReset : 0;
                            if (now < currentNextReset) return false; // Thiết bị khác đã xử lý reset này rồi
                            tx.set(examPathDailyDocRef, { nextReset: getNextExamPathResetTs(new Date(now)) }, { merge: true });
                            return true;
                        }).then(claimed => {
                            if (!claimed) return;
                            const sortedUsers = [...cAllUsers].filter(u => (u.examPathDailyScore || 0) > 0).sort((a, b) => (b.examPathDailyScore || 0) - (a.examPathDailyScore || 0));
                            const batch = firestore.batch();
                            sortedUsers.slice(0, 3).forEach((u, i) => {
                                const titleObj = EXAM_PATH_TITLES[i];
                                batch.update(firestore.collection('users').doc(u.uid), { examPathTitles: firebase.firestore.FieldValue.arrayUnion(titleObj.id) });
                                if (cUser && u.uid === cUser.uid) setExamPathRewardModal({ rank: i + 1, titleName: titleObj.name });
                            });
                            cAllUsers.forEach(u => { if (u.examPathDailyScore) batch.update(firestore.collection('users').doc(u.uid), { examPathDailyScore: 0 }); });
                            batch.commit().catch(e => console.error("Lỗi phát thưởng Đạo Hữu Bảng:", e));
                        }).catch(e => console.error("Lỗi transaction Đạo Hữu Bảng:", e));
                    } else if (examPathNextReset) {
                        const diffMsE = examPathNextReset - now;
                        setExamPathTimeLeftStr(`${Math.floor(diffMsE / 3600000)}h ${Math.floor((diffMsE % 3600000) / 60000)}m ${Math.floor((diffMsE % 60000) / 1000)}s`);
                    }
                    setExamPathWindowOpen(isExamPathWindowOpen(new Date(now)));

                    // 🆕 BÙA NHÂN ĐÔI: đếm ngược hiệu lực còn lại (dùng latestUser.current qua ref nên luôn
                    // đọc đúng dữ liệu mới nhất, không bị lỗi "đóng băng giá trị cũ" như closure state thường).
                    const x2ExpiresAt = cUser && cUser.x2BoostExpiresAt;
                    if (x2ExpiresAt && now < x2ExpiresAt) {
                        const diffMsX = x2ExpiresAt - now;
                        setX2BoostTimeLeftStr(`${Math.floor(diffMsX / 3600000)}h ${Math.floor((diffMsX % 3600000) / 60000).toString().padStart(2,'0')}m ${Math.floor((diffMsX % 60000) / 1000).toString().padStart(2,'0')}s`);
                    } else {
                        setX2BoostTimeLeftStr('');
                    }
                }, 1000);
                return () => clearInterval(timerInterval);
            }, []);

            const syncUserData = async (newData) => { if (user && user.uid) await firestore.collection('users').doc(user.uid).set(newData, { merge: true }).catch(()=>{}); };
            const handleLogout = async () => { if (await askConfirm("Tông chủ muốn rời khỏi Bí Cảnh sao?")) { playSfx('FAIL'); await auth.signOut(); } };

            const handleGoogleLogin = async () => {
                playSfx('CLICK');
                if (window.location.protocol === 'file:') return alert("Thiên Đạo cấm dùng Google Login khi chạy file offline! Hãy dùng App tạo Localhost!");
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    // Đã gỡ bỏ setCustomParameters khóa chết email để tu sĩ nào cũng vào được
                    // Dùng Popup sẽ tránh bị tải lại trang gây lag Bí Cảnh
                    await auth.signInWithPopup(provider);
                } catch(e) {
                    alert("Lỗi kết nối Mạng Xã Hội: " + e.message);
                }
            };

            // Dịch mã lỗi Firebase Auth sang tiếng Việt dễ hiểu thay vì hiện nguyên câu tiếng Anh khó hiểu.
            const translateAuthError = (e) => {
                const code = e?.code || '';
                if (code === 'auth/email-already-in-use') return 'Đạo hiệu này đã có người lập trước rồi! Hãy đổi Đạo hiệu khác hoặc thử Đăng nhập nếu đây chính là tài khoản của Ngài.';
                if (code === 'auth/weak-password') return 'Mật mã quá yếu! Cần ít nhất 6 ký tự.';
                if (code === 'auth/invalid-email') return 'Đạo hiệu không hợp lệ! Chỉ được dùng chữ cái không dấu (a-z) và số, không khoảng trắng, không ký tự đặc biệt.';
                if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential') return 'Đạo hiệu hoặc Mật mã không hợp lệ!';
                if (code === 'auth/operation-not-allowed') return 'Đăng nhập bằng Đạo hiệu/Mật mã hiện đang bị khoá phía máy chủ! Hãy báo cho quản trị viên bật lại mục "Email/Password" trong Firebase Authentication.';
                if (code === 'auth/network-request-failed') return 'Lỗi kết nối mạng! Kiểm tra lại đường truyền.';
                if (code === 'auth/too-many-requests') return 'Thử quá nhiều lần! Xin chờ ít phút rồi thử lại.';
                return 'Lỗi: ' + (e?.message || 'Không rõ nguyên nhân');
            };

            // Chuyển Đạo Hiệu (có thể chứa tiếng Việt có dấu, khoảng trắng...) thành chuỗi thuần
            // a-z0-9 an toàn để ghép vào email giả (fakeEmail) gửi lên Firebase Auth. TRƯỚC ĐÂY thiếu bước
            // này -> Đạo hiệu có dấu/khoảng trắng (VD: "Tiểu Long") sẽ tạo ra email không hợp lệ
            // (VD: "tiểu long@thienkieu.com") khiến Firebase luôn trả lỗi auth/invalid-email và
            // KHÔNG THỂ tạo tài khoản mới bằng Mật Mã, dù giao diện không báo rõ nguyên nhân thật sự.
            const slugifyName = (raw) => raw
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
                .replace(/đ/gi, 'd')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ''); // chỉ giữ lại chữ không dấu và số

            const handleEmailAuth = async () => {
                playSfx('CLICK');
                const cleanName = slugifyName(username);
                if (!cleanName || !password) return alert("Xin hãy nhập đủ thông tin!");
                if (cleanName.length < 3) return alert("Đạo hiệu cần ít nhất 3 ký tự chữ/số (không dấu, không khoảng trắng)!");
                const fakeEmail = `${cleanName}@thienkieu.com`; 
                if (authMode === 'register') {
                    if (allUsers.find(x => x.name === cleanName)) return alert("Đạo hiệu này đã tồn tại trên giang hồ!");
                    try {
                        const res = await auth.createUserWithEmailAndPassword(fakeEmail, password);
                        await firestore.collection('users').doc(res.user.uid).set({
                            name: cleanName, spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '', 
                            library: [], inventory: [], friends: [], requests: [], guild: null, gameId: generateGameId(), lastActive: Date.now(), 
                            photo: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${cleanName}`, rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                        });
                        alert("Lập phái thành công! Ngài được tặng 500💎 & 100⭐ làm quà Tân Thủ. Hãy Đăng nhập lại để vào Bí Cảnh."); setAuthMode('login'); setPassword('');
                    } catch(e) {
                        // TỰ KHÔI PHỤC: nếu Đạo hiệu báo "đã tồn tại" nhưng thật ra là do lần tạo trước bị
                        // gãy giữa chừng (tạo được tài khoản Auth nhưng chưa kịp lưu hồ sơ Firestore), thử
                        // đăng nhập luôn bằng đúng mật mã vừa nhập - nếu đúng là của Ngài thì phục hồi hồ sơ,
                        // nếu sai mật mã (tức là người khác đã lập Đạo hiệu này) thì mới báo lỗi thật.
                        if (e.code === 'auth/email-already-in-use') {
                            try {
                                const res2 = await auth.signInWithEmailAndPassword(fakeEmail, password);
                                const existingDoc = await firestore.collection('users').doc(res2.user.uid).get();
                                if (!existingDoc.exists) {
                                    await firestore.collection('users').doc(res2.user.uid).set({
                                        name: cleanName, spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '',
                                        library: [], inventory: [], friends: [], requests: [], guild: null, gameId: generateGameId(), lastActive: Date.now(),
                                        photo: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${cleanName}`, rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                                    });
                                    alert("Đã tìm thấy và khôi phục lại hồ sơ dở dang trước đó của Ngài! Hãy Đăng nhập lại."); setAuthMode('login'); setPassword('');
                                } else {
                                    alert("Đạo hiệu này của chính Ngài rồi, chỉ cần Đăng nhập là vào được!"); setAuthMode('login'); setPassword('');
                                }
                                await auth.signOut();
                                return;
                            } catch (e2) { /* sai mật mã -> đúng là người khác đã dùng tên này, rơi xuống báo lỗi bên dưới */ }
                        }
                        alert(translateAuthError(e));
                    }
                } else {
                    try { await auth.signInWithEmailAndPassword(fakeEmail, password); playBgm(); } catch(e) { alert(translateAuthError(e)); }
                }
            };

            // 🗺️ Dọn examPathActiveNodeId khi vào 1 Ải THƯỜNG (không thuộc Đạo Lộ) từ Tàng Kinh Các, phòng
            // trường hợp còn sót giá trị cũ từ lần "🚪 Bỏ ải" giữa chừng 1 node Tu Luyện Chi Lộ trước đó -
            // tránh quiz thường bị tính nhầm điểm/tiến độ vào Đạo Lộ.
            const handleEnterQuiz = (quizData) => { playSfx('CLICK'); setExamPathActiveNodeId(null); startFreshQuiz(quizData); };

            const startFreshQuiz = (quizData) => {
                let mixedQuestions = shuffleArray(quizData).map(q => {
                    // 🆕 câu hỏi ĐIỀN SỐ (type = 'numeric') không có lựa chọn A/B/C/D nên không cần xáo trộn.
                    if (q.type === 'numeric') return { ...q };
                    const isCorrectIdx = (idx) => Array.isArray(q.c) ? q.c.includes(idx) : idx === q.c;
                    let options = q.o.map((text, idx) => ({ text, isCorrect: isCorrectIdx(idx) }));
                    let shuffledOptions = shuffleArray(options);
                    let newO = shuffledOptions.map(x => x.text);
                    // 🆕 câu hỏi CHỌN NHIỀU ĐÁP ÁN (type = 'multi'): c là MẢNG các chỉ số đúng sau khi xáo trộn.
                    let newC = q.type === 'multi'
                        ? shuffledOptions.reduce((arr, x, i) => { if (x.isCorrect) arr.push(i); return arr; }, [])
                        : shuffledOptions.findIndex(x => x.isCorrect);
                    return { ...q, o: newO, c: newC };
                });
                setActiveQuiz(mixedQuestions); setCurIdx(0); setCorrectAnswers(0); setSelectedOption(null); setSelectedOptions([]); setNumericAnswer(''); setShowExplanation(false); setAiExplainText(''); setEliminatedOptions([]); setHintText('');
                changeAppState('QUIZ');
            };

            // 🆕 TÁCH RIÊNG phần TÍNH THƯỞNG (thu thập số liệu) khỏi phần LƯU/CHUYỂN CÂU: giờ người chơi phải
            // tự bấm "Câu Tiếp Theo" / "Xem Kết Quả" (dừng lại sau mỗi câu để đọc giải thích / xin AI phân
            // tích) thay vì tự động nhảy câu sau 800ms-1000ms như trước.
            const finalizeAnswer = (isCorrect) => {
                setCorrectAnswers(prev => prev + (isCorrect ? 1 : 0));
                if (isCorrect) playSfx('CORRECT'); else playSfx('WRONG');
                setShowExplanation(true);
                setAiExplainText(''); // câu mới -> xoá giải thích AI của câu trước
            };

            // 🆕 Người chơi chủ động bấm để sang câu tiếp theo, hoặc chốt kết quả nếu là câu cuối cùng.
            const continueAfterAnswer = async () => {
                if (curIdx < activeQuiz.length - 1) {
                    setCurIdx(c => c + 1); setSelectedOption(null); setSelectedOptions([]); setNumericAnswer(''); setShowExplanation(false); setAiExplainText(''); setEliminatedOptions([]); setHintText('');
                    return;
                }
                // Câu cuối cùng -> tính thưởng & lưu kết quả (logic y hệt bản cũ, chỉ khác là chạy khi bấm nút
                // thay vì tự động sau 1s).
                const finalCorrectCount = correctAnswers;
                let currentInventory = [...(user.inventory || [])];
                let gainedStones = 0, gainedFame = 0;

                if (finalCorrectCount === 0) {
                    gainedStones = 0; gainedFame = 0;
                } else {
                    gainedStones = finalCorrectCount * 50;
                    gainedFame = (finalCorrectCount === activeQuiz.length) ? 50 : 0;
                    const rankBonus = getRankBonusPercent(user.rank);
                    if (rankBonus > 0) gainedStones = Math.round(gainedStones * (1 + rankBonus / 100));
                    // 🆕 BÙA NHÂN ĐÔI BẢN MỚI: không còn "tiêu 1 thẻ trong túi đồ tại đây" - thẻ đã bị tiêu
                    // NGAY LÚC KÍCH HOẠT (xem activateX2BoostAction). Ở đây chỉ cần kiểm tra hiệu lực x2
                    // (x2BoostExpiresAt) còn hạn hay không, để nhân đôi cho MỌI lượt trong 2 giờ đó chứ
                    // không chỉ đúng 1 lượt kế tiếp như trước.
                    if (user.x2BoostExpiresAt && Date.now() < user.x2BoostExpiresAt) { gainedStones *= 2; }
                }

                setStonesGained(gainedStones); setFameGained(gainedFame);
                if (finalCorrectCount > 0) playSfx('SUCCESS'); else playSfx('FAIL');

                // 🗺️ TU LUYỆN CHI LỘ: nếu Ải vừa vượt qua thuộc 1 node trong Đạo Lộ (examPathActiveNodeId),
                // cập nhật % thành thạo (bestScore) + trạng thái node đó + MỞ KHOÁ Ải kế tiếp nếu đạt (>=50%
                // đúng), rồi cộng "thời gian luyện thi" của lượt này vào Đạo Hữu Bảng hôm nay - CHỈ cộng nếu
                // đang trong khung giờ 4h00-23h00 (xem isExamPathWindowOpen), đúng như yêu cầu "reset giải từ
                // 4h-23h". Thời gian được chặn trần ở 2 phút/câu để tránh gian lận bằng cách bỏ tab mở lâu.
                let examPathUpdate = null, examPathJustCompleted = false, examPathFinaleData = null;
                if (examPathActiveNodeId && user.examPath && user.examPath.nodes) {
                    const scorePercent = Math.round((finalCorrectCount / activeQuiz.length) * 100);
                    const nodes = user.examPath.nodes.map(n => ({ ...n }));
                    const idx = nodes.findIndex(n => n.id === examPathActiveNodeId);
                    if (idx > -1) {
                        nodes[idx].bestScore = Math.max(nodes[idx].bestScore || 0, scorePercent);
                        nodes[idx].lastAttemptAt = Date.now();
                        const passed = scorePercent >= 50;
                        if (passed) {
                            nodes[idx].status = 'done';
                            if (idx + 1 < nodes.length && nodes[idx + 1].status === 'locked') nodes[idx + 1].status = 'unlocked';
                        } else if (nodes[idx].status === 'locked') {
                            nodes[idx].status = 'unlocked';
                        }
                        examPathUpdate = { ...user.examPath, nodes };
                        if (!user.examPath.completedAt && nodes.every(n => n.status === 'done')) {
                            examPathUpdate.completedAt = Date.now();
                            examPathJustCompleted = true;
                            // 🆕 chụp lại dữ liệu NGAY LÚC NÀY vì sau khi cập nhật Firestore, user.examPath cũ
                            // (trong closure) có thể không còn khớp state mới nhất - chụp trước cho chắc.
                            examPathFinaleData = { title: user.examPath.title, totalNodes: nodes.length, days: user.examPath.days };
                        }
                    }
                }

                try {
                    try { SRS.logQuiz(finalCorrectCount, activeQuiz.length); } catch (e) {}
                    let updatePayload = {
                        spirit: firebase.firestore.FieldValue.increment(gainedStones),
                        fame: firebase.firestore.FieldValue.increment(gainedFame),
                        seasonScore: firebase.firestore.FieldValue.increment(finalCorrectCount),
                        inventory: currentInventory,
                        currentSession: firebase.firestore.FieldValue.delete()
                    };
                    if (examPathUpdate) {
                        updatePayload.examPath = examPathUpdate;
                        const windowOpenNow = isExamPathWindowOpen();
                        setExamPathLastRunCounted(windowOpenNow); // 🆕 để màn RESULT báo rõ lý do nếu không được cộng điểm
                        if (windowOpenNow) {
                            const elapsedMin = Math.max(0.2, Math.min((Date.now() - (examPathNodeStartRef.current || Date.now())) / 60000, activeQuiz.length * 2));
                            updatePayload.examPathDailyScore = firebase.firestore.FieldValue.increment(Math.round(elapsedMin * 10) / 10);
                        }
                    } else {
                        setExamPathLastRunCounted(null); // lượt vừa rồi không thuộc Đạo Lộ Tu Luyện Chi Lộ
                    }

                    if (finalCorrectCount > 0) {
                        let streakUpdates;
                        if (user.streakRestorePending) {
                            streakUpdates = { streakCount: (user.streakCount || 0) + 1, lastPlayedDate: getVNSourceDate(new Date()) };
                            updatePayload.streakRestorePending = firebase.firestore.FieldValue.delete();
                        } else {
                            streakUpdates = calculateStreak(user);
                        }
                        updatePayload.streakCount = streakUpdates.streakCount;
                        updatePayload.lastPlayedDate = streakUpdates.lastPlayedDate;

                        if (streakUpdates.streakCount > (user.streakCount || 0)) {
                            setTimeout(() => alert(`🔥 Ngài đã thắp sáng chuỗi điểm danh: ${streakUpdates.streakCount} ngày!`), 500);
                        }
                    }

                    await firestore.collection('users').doc(user.uid).update(updatePayload);

                    if (user.guild && finalCorrectCount > 0 && allGuilds[user.guild]) {
                        const guildData = allGuilds[user.guild];
                        await firestore.collection('guilds').doc(guildData.id).update({ exp: firebase.firestore.FieldValue.increment(finalCorrectCount) });
                    }
                    // 🎉 Vừa hoàn thành TOÀN BỘ Đạo Lộ (mọi Ải đều đã "done") -> hiệu ứng Chiến Thắng lớn +
                    // modal tổng kết riêng (ở lại tới khi tự đóng, không chỉ thoáng qua như pháo hoa).
                    if (examPathJustCompleted) { playVictoryFx(); setShowVictoryFx(true); setTimeout(() => setShowVictoryFx(false), 4000); setExamPathFinaleInfo(examPathFinaleData); }
                    changeAppState('RESULT');
                } catch (e) { console.error("Lỗi đồng bộ thiên cơ:", e); alert("Mất kết nối mạng! Tiến trình có thể chưa được lưu."); }
            };

            // 🆕 Câu hỏi 1 đáp án: bấm SAI -> loại đáp án đó khỏi danh sách + hiện bảng gợi ý, KHÔNG kết
            // thúc câu ngay (được thử lại). Bấm ĐÚNG -> chấm điểm như cũ.
            // 🛡️ SỬA LỖI TÍNH GIAN ĐIỂM: trước đây cho đoán tới khi đúng thì thôi, nên với câu 4 lựa chọn,
            // sai 3 lần thì lựa chọn cuối cùng CHẮC CHẮN đúng (không phải thực lực) mà vẫn được tính là
            // "câu đúng" khi cộng tổng thưởng. Giờ giới hạn: SAI ĐỦ 2 LẦN trên 1 câu sẽ tự động tính SAI
            // luôn (hiện đáp án đúng), không cho đoán ăn may thêm nữa.
            const handleAnswerSelect = (optionIndex) => {
                if (showExplanation || eliminatedOptions.includes(optionIndex)) return;
                const qData = activeQuiz[curIdx];
                if (optionIndex === qData.c) {
                    setSelectedOption(optionIndex);
                    finalizeAnswer(true);
                } else {
                    playSfx('WRONG');
                    const newElim = [...eliminatedOptions, optionIndex];
                    setEliminatedOptions(newElim);
                    setHintText(''); // reset gợi ý AI cũ (nếu có) để nhắc người học có thể xin gợi ý mới
                    if (newElim.length >= 2) { setSelectedOption(optionIndex); finalizeAnswer(false); }
                }
            };

            // 🆕 "Bó tay, xem đáp án": dùng khi đã đoán sai vài lần và muốn xem đáp án đúng luôn (tính là sai).
            const handleGiveUpQuestion = () => {
                if (showExplanation) return;
                setSelectedOption(null);
                finalizeAnswer(false);
            };

            // 🆕 XIN GỢI Ý AI: gợi ý ngắn gọn giúp định hướng suy nghĩ mà KHÔNG được tiết lộ đáp án đúng.
            const handleRequestAiHint = async () => {
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); return; }
                const qData = activeQuiz[curIdx];
                setHintLoading(true);
                try {
                    const remainingOpts = qData.o.filter((_, i) => !eliminatedOptions.includes(i) && i !== qData.c);
                    const prompt = `Đây là 1 câu hỏi trắc nghiệm:\n"${qData.q}"\nCác lựa chọn còn lại (đã ẩn đáp án đúng, không được đoán ra): ${qData.o.map((t,i)=>`${String.fromCharCode(65+i)}. ${t}`).join('; ')}\nNgười học vừa chọn sai các lựa chọn: ${eliminatedOptions.map(i=>String.fromCharCode(65+i)).join(', ') || '(chưa có)'}.\nHãy đưa ra 1 GỢI Ý ngắn gọn (2-3 câu) giúp người học định hướng cách suy nghĩ/công thức cần dùng để tự tìm ra đáp án đúng. TUYỆT ĐỐI KHÔNG được nói thẳng đáp án đúng là gì, chỉ gợi mở cách làm.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    setHintText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
                } catch (err) {
                    setHintText('❌ Lỗi khi lấy gợi ý: ' + shortErr(err.message));
                } finally {
                    setHintLoading(false);
                }
            };

            // 🆕 Câu hỏi ĐÚNG/SAI NHIỀU Ý: bấm nút Đ hoặc S cho từng ý, chưa chấm điểm ngay.
            // selectedOptions[optionIndex] = true (đã chọn Đúng) / false (đã chọn Sai) / undefined (chưa chọn).
            const setMultiRowAnswer = (optionIndex, val) => {
                if (showExplanation) return;
                setSelectedOptions(prev => { const arr = [...prev]; arr[optionIndex] = val; return arr; });
            };

            // 🆕 Chấm điểm câu ĐÚNG/SAI NHIỀU Ý: phải chọn Đ/S cho ĐỦ tất cả các ý và ĐÚNG hết mới tính đúng.
            const handleSubmitMultiAnswer = () => {
                if (showExplanation) return;
                const total = activeQuiz[curIdx].o.length;
                for (let i = 0; i < total; i++) {
                    if (selectedOptions[i] !== true && selectedOptions[i] !== false) { alert("Xin hãy chọn Đúng hoặc Sai cho TẤT CẢ các ý!"); return; }
                }
                const correctSet = Array.isArray(activeQuiz[curIdx].c) ? activeQuiz[curIdx].c : [];
                let isCorrect = true;
                for (let i = 0; i < total; i++) { if (selectedOptions[i] !== correctSet.includes(i)) { isCorrect = false; break; } }
                finalizeAnswer(isCorrect);
            };

            // 🆕 Chấm điểm câu ĐIỀN SỐ: so sánh số học (chấp nhận sai số nhỏ do làm tròn) thay vì so chuỗi cứng nhắc.
            const handleSubmitNumericAnswer = () => {
                if (showExplanation) return;
                if (!numericAnswer || !numericAnswer.trim()) { alert("Xin hãy nhập đáp án!"); return; }
                const userNum = parseFloat(String(numericAnswer).replace(',', '.'));
                const correctNum = parseFloat(String(activeQuiz[curIdx].c).replace(',', '.'));
                let isCorrect;
                if (!isNaN(userNum) && !isNaN(correctNum)) { isCorrect = Math.abs(userNum - correctNum) < 0.01; }
                else { isCorrect = String(numericAnswer).trim().toLowerCase() === String(activeQuiz[curIdx].c).trim().toLowerCase(); }
                finalizeAnswer(isCorrect);
            };

            // 🆕 AI PHÂN TÍCH: gọi Gemini giải thích tại sao đáp án đúng lại đúng / vì sao lựa chọn của
            // người chơi lại sai, dùng chung API Key Gemini đã lưu ở mục Học Qua Video.
            const handleAiExplainQuestion = async () => {
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); return; }
                const qData = activeQuiz[curIdx];
                setAiExplainLoading(true); setAiExplainText('');
                try {
                    let userAnswerDesc = '', correctAnswerDesc = '';
                    if (qData.type === 'multi') {
                        const correctSet = Array.isArray(qData.c) ? qData.c : [];
                        userAnswerDesc = qData.o.map((t, i) => `${String.fromCharCode(65+i)}: ${selectedOptions[i] === true ? 'Đúng' : selectedOptions[i] === false ? 'Sai' : 'chưa chọn'}`).join('; ');
                        correctAnswerDesc = qData.o.map((t, i) => `${String.fromCharCode(65+i)}: ${correctSet.includes(i) ? 'Đúng' : 'Sai'}`).join('; ');
                    } else if (qData.type === 'numeric') {
                        userAnswerDesc = numericAnswer || '(bỏ trống)';
                        correctAnswerDesc = String(qData.c);
                    } else {
                        userAnswerDesc = selectedOption !== null ? `${String.fromCharCode(65+selectedOption)}. ${qData.o[selectedOption]}` : '(chưa chọn)';
                        correctAnswerDesc = `${String.fromCharCode(65+qData.c)}. ${qData.o[qData.c]}`;
                    }
                    const optionsText = (qData.o && qData.o.length > 0) ? `Các lựa chọn/ý:\n${qData.o.map((t,i)=>`${String.fromCharCode(65+i)}. ${t}`).join('\n')}\n` : '';
                    const prompt = `Đây là 1 câu hỏi trắc nghiệm/bài tập:\n"${qData.q}"\n${optionsText}Đáp án đúng: ${correctAnswerDesc}\nNgười học đã trả lời: ${userAnswerDesc}\nHãy giải thích ngắn gọn, dễ hiểu bằng tiếng Việt (khoảng 4-7 câu, có thể kèm công thức/phép tính ngắn gọn nếu cần) TẠI SAO đáp án đúng lại đúng. Nếu người học trả lời sai, giải thích thêm vì sao lựa chọn của họ sai. Đi thẳng vào giải thích, không chào hỏi rườm rà.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    setAiExplainText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
                } catch (err) {
                    setAiExplainText('❌ Lỗi khi phân tích: ' + shortErr(err.message));
                } finally {
                    setAiExplainLoading(false);
                }
            };


            const handleChangeNameAction = async () => {
                playSfx('CLICK');
                const clean = newName.toLowerCase().trim();
                if (!clean || clean.length < 3) return alert("Đạo hiệu quá ngắn hoặc không hợp lệ!");
                if (/[\W_]/g.test(clean)) return alert("Đạo hiệu chỉ được chứa chữ và số!");
                if ((user.spirit || 0) < 1000 || (user.fame || 0) < 100) return alert("Hao tổn nguyên thần! Ngài không đủ Linh Thạch hoặc Danh Vọng để thực hiện!");
                if (allUsers.find(x => x.name === clean)) return alert("Đạo hiệu này đã được tu sĩ khác sử dụng!");
                if (!await askConfirm(`Xác nhận đổi Đạo hiệu thành [${clean}]? Phí tổn: 1000💎 & 100⭐.`)) return;

                try {
                    await firestore.collection('users').doc(user.uid).update({ name: clean, spirit: firebase.firestore.FieldValue.increment(-1000), fame: firebase.firestore.FieldValue.increment(-100) });
                    alert("Thay tên đổi họ thành công! Vận mệnh đã xoay chuyển!"); setNewName('');
                } catch(e) { alert("Lỗi kết nối Thiên Đạo!"); }
            };

            // ĐỔI MẬT MÃ - SỬA LỖI: bản cũ chỉ có ô Mật Mã Mới nên hay dính lỗi "auth/requires-recent-login"
            // (Firebase yêu cầu xác thực lại gần đây trước khi đổi mật mã nhạy cảm). Nay bắt buộc nhập Mật Mã
            // CŨ để tự XÁC THỰC LẠI (reauthenticate) ngay tại chỗ trước khi đổi, tránh lỗi trên hoàn toàn -
            // trừ tài khoản chỉ đăng nhập bằng Google (không có mật mã cũ) thì bỏ qua bước này.
            const confirmChangePassword = async () => {
                playSfx('CLICK');
                const newPass = pwdModal.val;
                const oldPass = pwdModal.oldVal;
                if (newPass.length < 6) return alert("Mật mã quá ngắn, thiên đạo không cho phép! (Cần ít nhất 6 ký tự)");
                const fbUser = auth.currentUser;
                if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
                const hasPasswordProvider = (fbUser.providerData || []).some(p => p.providerId === 'password');
                try {
                    if (hasPasswordProvider) {
                        if (!oldPass) return alert("Xin nhập Mật Mã CŨ để xác thực trước khi đổi!");
                        const cred = firebase.auth.EmailAuthProvider.credential(fbUser.email, oldPass);
                        try { await fbUser.reauthenticateWithCredential(cred); }
                        catch (e2) { return alert(e2.code === 'auth/wrong-password' || e2.code === 'auth/invalid-credential' ? "Mật Mã CŨ không đúng!" : "Xác thực thất bại: " + shortErr(e2.message)); }
                    }
                    await fbUser.updatePassword(newPass);
                    playSfx('SUCCESS'); alert("Đổi Mật Mã thành công! Khí tức đã được che giấu an toàn."); setPwdModal({ show: false, val: '', oldVal: '' });
                } catch(e) {
                    if (e.code === 'auth/requires-recent-login') { alert("Ngài đã bế quan quá lâu! Xin hãy đăng xuất và đăng nhập lại trước khi đổi mật mã."); setPwdModal({ show: false, val: '', oldVal: '' }); } 
                    else { alert("Lỗi đổi mật mã: " + shortErr(e.message)); }
                }
            };

            // Quên Mật Khẩu ngay trong Hồ Sơ (đã đăng nhập, có sẵn Email Khôi Phục đã lưu).
            const forgotPasswordFromProfile = async () => {
                playSfx('CLICK');
                if (!user.recoveryEmail) return alert("Ngài chưa thiết lập Email Khôi Phục! Hãy lưu Email Khôi Phục ở bên dưới trước.");
                try {
                    await auth.sendPasswordResetEmail(user.recoveryEmail);
                    alert(`Đã gửi Liên Kết đổi Mật Mã tới ${user.recoveryEmail}! Hãy kiểm tra hộp thư.`);
                    setPwdModal({ show: false, val: '', oldVal: '' });
                } catch (e) { alert("Gửi email thất bại: " + shortErr(e.message)); }
            };

            const saveProfileAction = async () => { await firestore.collection('users').doc(user.uid).update({ photo: profileImage, bgImage: profileBg, bio: profileBio.trim() }); playSfx('SUCCESS'); changeAppState('DASHBOARD'); };

            // 🔗 LIÊN KẾT TÀI KHOẢN GOOGLE: tài khoản tạo bằng Đạo Hiệu/Mật Mã dùng email giả nội bộ
            // (...@thienkieu.com) nên KHÔNG THỂ lấy lại mật mã qua email nếu quên. Liên kết thêm Google
            // vào chính tài khoản hiện tại (linkWithPopup, không tạo tài khoản mới) để có đường lui: sau
            // này chỉ cần bấm "Đăng nhập Google" là vào lại đúng nhân vật cũ, không sợ mất tài khoản.
            const handleLinkGoogleAccount = async () => {
                playSfx('CLICK');
                if (window.location.protocol === 'file:') return alert("Thiên Đạo cấm dùng Google Login khi chạy file offline! Hãy dùng App tạo Localhost!");
                const fbUser = auth.currentUser;
                if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    await fbUser.linkWithPopup(provider);
                    playSfx('SUCCESS');
                    alert("Liên kết Google thành công! Từ nay Ngài có thể đăng nhập lại bằng nút Google nếu quên Mật Mã, không sợ mất tài khoản.");
                } catch (e) {
                    if (e.code === 'auth/credential-already-in-use') alert("Tài khoản Google này đã được liên kết với một Đạo Hiệu khác rồi! Hãy dùng tài khoản Google khác, hoặc đăng nhập thẳng bằng Google để vào Đạo Hiệu đó.");
                    else if (e.code === 'auth/provider-already-linked') alert("Đạo Hiệu này đã liên kết Google rồi!");
                    else if (e.code === 'auth/popup-closed-by-user') { /* người dùng tự đóng popup, khỏi báo lỗi */ }
                    else alert("Liên kết thất bại: " + (e.message || 'Không rõ nguyên nhân'));
                }
            };
            const isGoogleLinked = (auth.currentUser?.providerData || []).some(p => p.providerId === 'google.com');

            // ✉️ LIÊN KẾT EMAIL KHÔI PHỤC: đăng ký bằng Đạo Hiệu dùng email GIẢ nội bộ (...@thienkieu.com)
            // nên Firebase không có cách nào gửi mail thật tới Ngài. Đổi hẳn email đăng nhập thật của
            // Ngài sang email THẬT này (updateEmail) rồi lưu lại vào Firestore để lúc "Quên Mật Khẩu" ở
            // màn Đăng Nhập tra ra đúng email mà gửi LIÊN KẾT khôi phục qua (Firebase tự lo phần gửi mail).
            const handleLinkRecoveryEmail = async () => {
                playSfx('CLICK');
                const clean = recoveryEmailInput.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return alert("Email không hợp lệ!");
                const fbUser = auth.currentUser;
                if (!fbUser) return alert("Không tìm thấy nguyên thần (User không tồn tại)!");
                try {
                    await fbUser.updateEmail(clean);
                    await firestore.collection('users').doc(user.uid).update({ recoveryEmail: clean });
                    playSfx('SUCCESS');
                    alert(`Đã lưu Email Khôi Phục: ${clean}! Từ nay nếu quên Mật Mã, hãy bấm "Quên Mật Khẩu?" ở màn Đăng Nhập để nhận Liên Kết khôi phục qua email này.`);
                    setRecoveryEmailInput('');
                } catch (e) {
                    if (e.code === 'auth/email-already-in-use') alert("Email này đã được dùng cho một tài khoản khác!");
                    else if (e.code === 'auth/requires-recent-login') alert("Ngài đã bế quan quá lâu! Xin hãy đăng xuất và đăng nhập lại rồi thử lại.");
                    else alert("Lỗi lưu Email: " + shortErr(e.message));
                }
            };

            // Quên Mật Khẩu (ở màn Đăng Nhập, chưa cần đăng nhập): tra Đạo Hiệu -> tìm recoveryEmail đã
            // lưu trong Firestore -> nhờ Firebase gửi LIÊN KẾT đặt lại mật khẩu thẳng tới email đó.
            const handleForgotPassword = async () => {
                playSfx('CLICK');
                const clean = slugifyName(username);
                if (!clean) return alert("Xin hãy nhập Đạo Hiệu vào ô phía trên trước, rồi bấm Quên Mật Khẩu!");
                const found = allUsers.find(x => x.name === clean);
                const recEmail = found?.recoveryEmail;
                if (!recEmail) return alert("Đạo Hiệu này chưa thiết lập Email Khôi Phục! Hãy đăng nhập rồi vào Khắc Họa Chân Ngã (Hồ Sơ) để thêm Email, hoặc dùng nút Đăng Nhập Google nếu đã liên kết trước đó.");
                try {
                    await auth.sendPasswordResetEmail(recEmail);
                    alert(`Đã gửi Liên Kết khôi phục Mật Mã tới ${recEmail}! Hãy kiểm tra hộp thư (kể cả mục Spam).`);
                } catch (e) {
                    alert("Gửi email khôi phục thất bại: " + shortErr(e.message));
                }
            };

            const handleGachaRoll = async () => {
                if (user.spirit < 200) return alert("Không đủ 200 Linh Thạch!");
                playSfx('GACHA');
                const roll = Math.random(); let rewardText = ""; let spiritChange = -200; let fameChange = 0; let newInv = [...(user.inventory || [])];
                if (roll < 0.4) { rewardText = "Nổ Lô! Lỗ chỏng vó! Trả lại 50 LT."; spiritChange += 50; } 
                else if (roll < 0.7) { rewardText = "Tiểu Duyên! Nhận 300 LT."; spiritChange += 300; } 
                else if (roll < 0.9) { rewardText = "Thiên Đạo Chúc Phúc! +80 Sao."; fameChange += 80; } 
                else {
                    if (!newInv.includes('x2_card')) { rewardText = "KỲ NGỘ! Nhận Bùa x2 vĩnh viễn!"; newInv.push('x2_card'); } 
                    else { rewardText = "Linh Mạch Bạo Phát! Nhận 1500 LT!"; spiritChange += 1500; }
                }
                setGachaResultText(rewardText); 
                await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(spiritChange), fame: firebase.firestore.FieldValue.increment(fameChange), inventory: newInv });
                setTimeout(() => setGachaResultText(''), 3000);
            };

            const searchUserAction = () => {
                playSfx('CLICK'); const term = globalSearchUid.trim().toLowerCase();
                if (!term) return alert("Tông chủ hãy nhập ID hoặc Tên cần tra cứu!");
                const foundUser = allUsers.find(x => x.gameId === term || x.name.toLowerCase() === term || x.uid.toLowerCase() === term);
                if (foundUser) { setViewingUser(foundUser); changeAppState('VIEW_PROFILE'); setGlobalSearchUid(''); } 
                else { alert("Đại Lục rộng lớn, không tìm thấy tu sĩ nào trùng khớp!"); }
            };

            const addFriendAction = async () => {
                if (!friendSearchUid) return alert("Xin hãy nhập ID hoặc Tên của Đạo hữu!");
                const term = friendSearchUid.trim().toLowerCase();
                const targetUser = allUsers.find(x => x.gameId === term || x.name.toLowerCase() === term);
                if (!targetUser) return alert("Không tìm thấy người này trên Đại Lục!");
                if (targetUser.uid === user.uid) return alert("Không thể tự kết duyên với chính mình!");
                if (user.friends?.includes(targetUser.uid)) return alert("Người này đã có trong danh sách Đạo hữu!");
                const alreadySent = targetUser.requests?.find(r => r.fromUid === user.uid && r.type === 'friend');
                if (alreadySent) return alert("Đã gửi thần thức cầu kết giao trước đó rồi, đang chờ hồi âm!");

                const newReq = { id: Date.now(), type: 'friend', fromUid: user.uid, fromName: user.name };
                await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });
                alert("Đã gửi thư kết giao! Vui lòng chờ đối phương chấp nhận."); setFriendSearchUid('');
            };

            const addRandomFriendAction = async () => {
                const strangersList = allUsers.filter(x => x.uid !== user.uid && !(user.friends?.includes(x.uid)) && !(x.requests?.some(r => r.fromUid === user.uid)));
                if (strangersList.length === 0) return alert("Toàn đại lục hiện không còn ai để kết duyên hoặc đã gửi thư hết rồi!");
                const randomTarget = strangersList[Math.floor(Math.random() * strangersList.length)];
                const newReq = { id: Date.now(), type: 'friend', fromUid: user.uid, fromName: user.name };
                await firestore.collection('users').doc(randomTarget.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });
                alert(`Đã gửi thư kết duyên tới [${randomTarget.name}]! Chờ đối phương hồi âm.`);
            };

            const sendFriendReqToUser = async (targetUser) => {
                playSfx('CLICK');
                if (targetUser.uid === user.uid) return alert("Không thể tự kết duyên với chính mình!");
                if (user.friends?.includes(targetUser.uid)) return alert("Người này đã là Đạo hữu của ngài từ trước!");
                const alreadySent = targetUser.requests?.find(r => r.fromUid === user.uid && r.type === 'friend');
                if (alreadySent) return alert("Đã gửi thần thức cầu kết giao rồi, xin kiên nhẫn chờ hồi âm!");

                const newReq = { id: Date.now(), type: 'friend', fromUid: user.uid, fromName: user.name };
                await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });
                alert(`Đã truyền thư cầu kết giao đến [${targetUser.name}]!`); playSfx('SUCCESS');
            };

            const acceptFriendReq = async (req) => {
                playSfx('SUCCESS');
                const updatedReqs = user.requests.filter(r => r.id !== req.id);
                await firestore.collection('users').doc(user.uid).update({ friends: firebase.firestore.FieldValue.arrayUnion(req.fromUid), requests: updatedReqs });
                const targetDoc = await firestore.collection('users').doc(req.fromUid).get();
                if(targetDoc.exists) { await firestore.collection('users').doc(req.fromUid).update({ friends: firebase.firestore.FieldValue.arrayUnion(user.uid) }); }
                alert(`Đã kết duyên cùng ${req.fromName}!`);
            };

            const acceptGuildReq = async (req) => {
                if (user.guild) return alert("Ngài đã có Tông môn rồi! Phải rời môn phái hiện tại trước khi gia nhập phái mới.");
                const guildDoc = await firestore.collection('guilds').doc(req.guildId).get();
                if (!guildDoc.exists) { alert("Tông môn này đã bị diệt vong hoặc giải tán!"); rejectReq(req.id); return; }
                const gData = guildDoc.data();
                if (gData.members.length >= gData.level * 5) { alert("Tông môn này đã hết chỗ!"); rejectReq(req.id); return; }
                playSfx('SUCCESS');
                await firestore.collection('guilds').doc(req.guildId).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });
                const updatedReqs = user.requests.filter(r => r.id !== req.id);
                await firestore.collection('users').doc(user.uid).update({ guild: req.guildName, requests: updatedReqs });
                alert(`Đã gia nhập [${req.guildName}] thành công!`);
            };

            const rejectReq = async (reqId) => { playSfx('FAIL'); const updatedReqs = (user.requests || []).filter(r => r.id !== reqId); await firestore.collection('users').doc(user.uid).update({ requests: updatedReqs }); };

            const createGuildAction = async () => {
                if (user.spirit < 500) return alert("Không đủ 500 Linh Thạch!");

                // Lọc bỏ ký tự đặc biệt có thể làm sập Firestore Document ID
                const safeName = newGuildName.trim().replace(/[\/\.\#\$\[\]]/g, '');
                if (!safeName || allGuilds[safeName]) return alert("Tên Tông môn không hợp lệ hoặc đã tồn tại trên giang hồ!");

                const newGId = generateGuildId();
                await firestore.collection('guilds').doc(safeName).set({ name: safeName, level: 1, members: [user.uid], leader: user.uid, guildId: newGId, notice: "Chào mừng đến với tông môn!" });
                await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(-500), guild: safeName });
                setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: cho 8s để listener guilds đồng bộ, tránh hiện nhầm "diệt vong"

                playSfx('SUCCESS');
                alert(`Khai tông lập phái thành công! Mã mời của Tông môn là: ${newGId}`);
                setNewGuildName(''); // Dọn dẹp ô nhập liệu
            };

            const joinGuildByCodeAction = async () => {
                const term = joinGuildIdStr.trim();
                if (!term) return alert("Xin hãy nhập Mã Tông Môn hoặc Tên bang!");

                const targetGuild = Object.values(allGuilds).find(g => g.guildId === term || g.name === term);
                if (!targetGuild) return alert("Không tìm thấy Tông Môn nào có mã này!");
                if (targetGuild.members.length >= targetGuild.level * 5) return alert("Tông môn này đã đầy người!");
                if (targetGuild.members.includes(user.uid)) return alert("Ngài đã ở trong Tông môn này rồi, đừng tẩu hỏa nhập ma!");

                await firestore.collection('guilds').doc(targetGuild.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });
                await firestore.collection('users').doc(user.uid).update({ guild: targetGuild.name });
                setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: chờ đồng bộ, tránh hiện nhầm "diệt vong"

                playSfx('SUCCESS');
                alert(`Đã quy phục [${targetGuild.name}] thành công!`);
                setJoinGuildIdStr(''); // Dọn dẹp ô nhập liệu
            };

            // BỔ SUNG HÀM CÒN THIẾU: nút "QUY PHỤC" trong danh sách Thế Lực gọi hàm này nhưng
            // trước đây chưa từng được định nghĩa -> bấm vào sẽ báo lỗi (ReferenceError) ngay lập tức.
            const joinGuildAction = async (guildObj) => {
                if (!guildObj) return;
                if (user.guild) return alert("Ngài đã có Tông môn rồi, hãy rời khỏi trước khi gia nhập nơi khác!");
                if (guildObj.members.length >= guildObj.level * 5) return alert("Tông môn này đã đầy người!");
                if (guildObj.members.includes(user.uid)) return alert("Ngài đã ở trong Tông môn này rồi!");

                try {
                    await firestore.collection('guilds').doc(guildObj.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });
                    await firestore.collection('users').doc(user.uid).update({ guild: guildObj.name });
                    setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: chờ đồng bộ, tránh hiện nhầm "diệt vong"

                    playSfx('SUCCESS');
                    alert(`Đã quy phục [${guildObj.name}] thành công!`);
                } catch (e) {
                    alert("Lỗi gia nhập Tông môn: " + e.message);
                }
            };

            const inviteToGuildAction = async (guildObj) => {
                const term = inviteGuildMemberId.trim(); if (!term) return alert("Nhập ID Đạo hữu cần lôi kéo!");
                const targetUser = allUsers.find(u => u.gameId === term);
                if (!targetUser) return alert("Không tìm thấy tu sĩ này trên giang hồ!");
                if (targetUser.guild) return alert("Đạo hữu này đã có Tông môn rồi!");
                if (guildObj.members.length >= guildObj.level * 5) return alert("Tông môn đã đầy, không thể chứa thêm!");
                const alreadySent = targetUser.requests?.find(r => r.guildId === guildObj.name && r.type === 'guild');
                if (alreadySent) return alert("Đã gửi chiếu thư mời gia nhập bang phái cho tu sĩ này rồi!");

                const newReq = { id: Date.now(), type: 'guild', fromUid: user.uid, fromName: user.name, guildId: guildObj.name, guildName: guildObj.name };
                await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });
                alert(`Đã gửi chiếu thư mời [${targetUser.name}] gia nhập bang! Vui lòng chờ họ quy phục.`); setInviteGuildMemberId(''); playSfx('SUCCESS');
            };

            const leaveOrKickGuildAction = async (guildObj, kickMemberUid = null) => {
                if (kickMemberUid) {
                    const kickedUser = allUsers.find(x => x.uid === kickMemberUid || x.name === kickMemberUid);
                    const kickName = kickedUser ? kickedUser.name : "Kẻ Này";
                    if (!await askConfirm(`Trục xuất [${kickName}] khỏi Tông môn?`)) return;
                    const newMembersList = guildObj.members.filter(x => x !== kickMemberUid);
                    await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList });
                    if (kickedUser) { await firestore.collection('users').doc(kickedUser.uid).update({ guild: null }); }
                    playSfx('FAIL');
                } else {
                    if (!await askConfirm("Phản bội Tông môn sẽ bị thiên lôi giáng phạt mất 500 LT, tiếp tục?")) return;
                    if (user.spirit < 500) return alert("Không đủ tài sản để nộp phạt!");
                    const newMembersList = guildObj.members.filter(m => m !== user.uid && m !== user.name);
                    if (newMembersList.length === 0) { await firestore.collection('guilds').doc(guildObj.id).delete(); } 
                    else { 
                        let newLeader = guildObj.leader; if (guildObj.leader === user.uid || guildObj.leader === user.name) newLeader = newMembersList[0]; 
                        await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList, leader: newLeader }); 
                    }
                    await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(-500), guild: null }); playSfx('FAIL');
                }
            };

            // ⚰️ KHAI TỬ TÔNG MÔN: Bang Chủ giải tán thẳng Tông môn (miễn phí, không phạt) - cần thiết để
            // dọn dẹp các bang lập ra lúc test/thử nghiệm, tránh database chất đầy bang "ma" không ai dùng.
            // Xóa hẳn document guild + gỡ "guild" khỏi TOÀN BỘ thành viên trong 1 lượt (batch), không cần
            // từng người tự rời.
            const dissolveGuildAction = async (guildObj) => {
                const isLeaderNow = (guildObj.leader === user.uid || guildObj.leader === user.name);
                if (!isLeaderNow) return alert("Chỉ Bang Chủ mới có quyền Khai Tử Tông Môn!");
                if (!await askConfirm(`Khai Tử VĨNH VIỄN Tông Môn [${guildObj.name}]? Toàn bộ thành viên sẽ bị đuổi ra, KHÔNG THỂ hoàn tác!`)) return;
                try {
                    const batch = firestore.batch();
                    (guildObj.members || []).forEach(memberUidOrName => {
                        const memberData = allUsers.find(u => u.uid === memberUidOrName || u.name === memberUidOrName);
                        if (memberData) batch.update(firestore.collection('users').doc(memberData.uid), { guild: null });
                    });
                    batch.delete(firestore.collection('guilds').doc(guildObj.id));
                    await batch.commit();
                    playSfx('FAIL');
                    alert(`Đã khai tử Tông Môn [${guildObj.name}]!`);
                    changeAppState('DASHBOARD');
                } catch (e) { alert("Khai tử thất bại: " + shortErr(e.message)); }
            };

            const updateGuildNoticeAction = async (gObj) => {
                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                if (!isLeader) return alert("Chỉ Bang Chủ mới có quyền này!");
                await firestore.collection('guilds').doc(gObj.id).update({ notice: editNotice.trim() });
                playSfx('SUCCESS'); alert("Đã ban bố thông báo mới cho toàn tông môn!");
            };

            const upgradeGuildLevelAction = async (gObj) => {
                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                if (!isLeader) return alert("Chỉ Bang Chủ mới có quyền này!");
                if (gObj.level >= 5) return alert("Tông môn đã đạt đỉnh cấp!");
                let reqRankLevel = gObj.level + 1; let reqCount = 3; let qualifiedMembers = 0;
                gObj.members.forEach(memberUid => {
                    const memberData = allUsers.find(u => u.uid === memberUid || u.name === memberUid);
                    if (memberData && memberData.rank) { const rObj = RANKS.find(r => r.id === memberData.rank); if (rObj && rObj.level >= reqRankLevel) qualifiedMembers++; }
                });
                const reqRankName = RANKS.find(r => r.level === reqRankLevel)?.name || 'Không rõ';
                if (qualifiedMembers < reqCount) { playSfx('FAIL'); return alert(`Chưa đủ môn đồ! Để lên Cấp ${gObj.level + 1}, Tông môn cần ít nhất ${reqCount} môn đồ đạt cảnh giới [${reqRankName}] trở lên. (Hiện có: ${qualifiedMembers}/${reqCount})`); }
                await firestore.collection('guilds').doc(gObj.id).update({ level: gObj.level + 1 });
                playSfx('SUCCESS'); alert(`Đột phá Tông môn Cấp ${gObj.level + 1} thành công! Uy phong vang dội!`);
            };

            const buyGuildPerkAction = async (gObj, perkType, val, costSpirit) => {
                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                if (!isLeader) return alert("Càn rỡ! Ngươi không phải Bang Chủ, lấy tư cách gì mà tu sửa Tông Môn?");
                if (costSpirit > 0 && (user.spirit || 0) < costSpirit) return alert("Ngài không đủ Linh Thạch để đài thọ cho Tông môn!");
                if (costSpirit > 0 && !await askConfirm(`Tiêu hao ${costSpirit} 💎 từ kho riêng của ngài để nâng cấp Tông môn?`)) return;
                await firestore.collection('guilds').doc(gObj.id).update({ [perkType]: val });
                if (costSpirit > 0) { await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(-costSpirit) }); }
                playSfx('SUCCESS'); alert("Trang hoàng Tông môn thành công!");
            };

            const buyGuildPerkWithExpAction = async (gObj, perkType, val, costExp) => {
                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                if (!isLeader) return alert("Càn rỡ! Ngươi không phải Bang Chủ!");
                if ((gObj.exp || 0) < costExp) return alert(`Tông môn không đủ Công Trạng! Cần ${costExp} điểm.`);
                if (!await askConfirm(`Tiêu hao ${costExp} Công Trạng để đổi báu vật này cho Tông môn?`)) return;
                await firestore.collection('guilds').doc(gObj.id).update({ [perkType]: val, exp: firebase.firestore.FieldValue.increment(-costExp) });
                playSfx('SUCCESS'); alert("Tuyệt vời! Tông môn đã được thăng cấp báu vật!");
            };

            const exchangeGuildExpAction = async (gObj, cost, type, value, itemName) => {
                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                if (!isLeader) return alert("Càn rỡ! Chỉ Bang Chủ mới có quyền mở Thánh Khố rút Công Trạng!");
                if ((gObj.exp || 0) < cost) return alert(`Tông môn không đủ Công Trạng! Cần ${cost} điểm.`);
                if (!await askConfirm(`Rút ${cost} Công Trạng của Tông môn để lấy [${itemName}] cho bản thân?`)) return;
                
                await firestore.collection('guilds').doc(gObj.id).update({ exp: firebase.firestore.FieldValue.increment(-cost) });
                let updates = {};
                if (type === 'spirit') { updates.spirit = firebase.firestore.FieldValue.increment(value); } 
                else if (type === 'x2') { updates.inventory = firebase.firestore.FieldValue.arrayUnion('x2_card', 'x2_card'); } 
                else if (type === 'item') {
                    if (user.inventory?.includes(value)) { alert("Ngài đã có vật phẩm này, đền bù 2000 Linh Thạch!"); updates.spirit = firebase.firestore.FieldValue.increment(2000); } 
                    else { updates.inventory = firebase.firestore.FieldValue.arrayUnion(value); }
                }
                await firestore.collection('users').doc(user.uid).update(updates); playSfx('SUCCESS'); alert(`Trao đổi thành công! Nhận được: ${itemName}`);
            };

            // 🎬 TÍNH NĂNG HỌC QUA VIDEO: tóm tắt ý chính + dịch thuật song ngữ
            // Vì đây là app tĩnh (không có server riêng), nên không thể tự tải phụ đề YouTube/Bilibili
            // trực tiếp từ trình duyệt (bị chặn CORS). Do đó người dùng dán TRANSCRIPT/PHỤ ĐỀ của video vào,
            // AI (Gemini - miễn phí) sẽ tóm tắt + dịch thuật. Link video chỉ dùng để lưu lại tham khảo.
            const saveGeminiKey = (key) => {
                setVideoApiKey(key); localStorage.setItem('geminiApiKey', key);
                // Ghi vào subcollection riêng "private/settings" (KHÔNG phải doc users/{uid} chính) để
                // không bị lộ cho người chơi khác qua listener bảng xếp hạng - xem ghi chú ở onAuthStateChanged.
                if (user?.uid) firestore.collection('users').doc(user.uid).collection('private').doc('settings').set({ geminiApiKey: key }, { merge: true }).catch(()=>{});
            };
            const saveGeminiKey2 = (key) => {
                setGeminiKey2(key); GeminiPool.setSecondary(key);
                if (user?.uid) firestore.collection('users').doc(user.uid).collection('private').doc('settings').set({ geminiApiKey2: key }, { merge: true }).catch(()=>{});
            };
            const handleSaveKey = (n) => {
                const raw = (n === 1 ? keyDraft1 : keyDraft2).trim();
                if (raw && raw.length < 20) return alert("Key quá ngắn, hãy kiểm tra lại (Key Gemini thường bắt đầu bằng AIza...).");
                const other = (n === 1 ? geminiKey2 : videoApiKey).trim();
                if (raw && raw === other) return alert("Hai Key đang trùng nhau! Hãy dùng 2 Key khác nhau (nên thuộc 2 dự án Google khác nhau).");
                if (n === 1) saveGeminiKey(raw); else saveGeminiKey2(raw);
                playSfx('SUCCESS');
            };
            const handleTestKeys = async () => {
                const slots = [[1, videoApiKey.trim()], [2, geminiKey2.trim()]].filter(s => s[1]);
                if (!slots.length) return alert("Chưa có Key nào để thử.");
                setKeyTesting(true);
                let res = [];
                try { res = await Promise.all(slots.map(s => geminiTestKey(s[1]))); } finally { setKeyTesting(false); }
                const label = { ok: '✓ Hoạt động tốt', quota: '⏳ Hợp lệ nhưng đang hết lượt tạm thời (tự nghỉ ~1 phút)', invalid: '✗ Key không hợp lệ' };
                alert(slots.map((s, i) => 'Key ' + s[0] + ': ' + (label[res[i].kind] || ('⚠ ' + res[i].msg))).join('\n'));
            };

            // Nạp YouTube IFrame API 1 lần duy nhất, rồi khởi tạo player mỗi khi videoId đổi HOẶC khi
            // chuyển vào/ra Chế Độ Ngang (vì khung ngang portal ra ngoài body dùng 1 id div khác hẳn với
            // khung dọc, nên phải gắn lại player vào đúng div đang hiển thị). Trước khi huỷ player cũ, lưu
            // lại thời điểm đang xem + đang phát hay không, rồi phục hồi lại ngay sau khi player mới sẵn
            // sàng -> chuyển dọc/ngang không bị tua về đầu video.
            const currentYoutubeId = extractYouTubeId(videoLink);
            useEffect(() => {
                if (appState !== 'VIDEO_LEARN' || !currentYoutubeId) return;
                let cancelled = false;
                let savedTime = 0, wasPlaying = false;
                if (forceReplayRef.current) {
                    // "PHÁT LẠI" từ Danh Sách Phát: luôn coi như phát mới lại từ đầu, không cố khôi phục
                    // vị trí xem dở cũ (kể cả khi bấm lại đúng video đang mở sẵn để "hồi sinh" player bị treo).
                    forceReplayRef.current = false;
                    savedTime = 0; wasPlaying = true;
                } else if (ytPlayerRef.current) {
                    try { savedTime = ytPlayerRef.current.getCurrentTime() || 0; } catch (e) {}
                    try { wasPlaying = ytPlayerRef.current.getPlayerState() === 1; } catch (e) {}
                }
                const mountId = videoLandscapeMode ? 'yt-player-mount-landscape' : 'yt-player-mount';
                const mount = () => {
                    if (cancelled) return;
                    if (ytPlayerRef.current && ytPlayerRef.current.destroy) { try { ytPlayerRef.current.destroy(); } catch(e){} }
                    if (!document.getElementById(mountId)) return;
                    ytPlayerRef.current = new window.YT.Player(mountId, {
                        width: '100%', height: '100%',
                        videoId: currentYoutubeId,
                        playerVars: { rel: 0, modestbranding: 1 },
                        events: {
                            onReady: (e) => {
                                // SỬA LỖI LAG 2X/3X: không phải video YouTube nào cũng hỗ trợ hết mọi tốc độ.
                                // Ép setPlaybackRate(3) lên video chỉ hỗ trợ tối đa 2x khiến trình phát bị lỗi/đứng
                                // hình (trông như "lag"). Nay đọc đúng danh sách tốc độ video này hỗ trợ trước,
                                // rồi mới áp dụng, đồng thời chỉ hiện nút bấm cho tốc độ THỰC SỰ dùng được.
                                let rates = [1];
                                try { rates = e.target.getAvailablePlaybackRates() || [1]; } catch(err) {}
                                if (!rates.includes(1)) rates = [1, ...rates];
                                setSupportedPlaybackRates(rates);
                                const safeRate = rates.includes(playbackRate) ? playbackRate : 1;
                                setPlaybackRate(safeRate);
                                e.target.setPlaybackRate(safeRate);
                                // SỬA LỖI: trước đây playVideo() bị lồng bên trong "if (savedTime > 1)", nên khi
                                // "phát lại" từ đầu (savedTime = 0) thì wasPlaying=true cũng bị bỏ qua luôn, video
                                // nạp xong nhưng KHÔNG tự phát -> giống hệt hiện tượng "không mở lại được".
                                // Nay tách riêng: seekTo chỉ chạy khi có vị trí cũ cần khôi phục, còn playVideo
                                // chạy độc lập bất cứ khi nào cần tự phát (phục hồi phiên cũ HOẶC phát lại từ đầu).
                                if (savedTime > 1) e.target.seekTo(savedTime, true);
                                if (wasPlaying) e.target.playVideo();
                            }
                        }
                    });
                };
                if (window.YT && window.YT.Player) { mount(); }
                else {
                    if (!document.getElementById('yt-iframe-api-script')) {
                        const tag = document.createElement('script');
                        tag.id = 'yt-iframe-api-script'; tag.src = 'https://www.youtube.com/iframe_api';
                        document.head.appendChild(tag);
                    }
                    const prevReady = window.onYouTubeIframeAPIReady;
                    window.onYouTubeIframeAPIReady = () => { if (prevReady) prevReady(); mount(); };
                }
                return () => { cancelled = true; };
            }, [appState, currentYoutubeId, videoLandscapeMode, videoPlayNonce]);

            // AN TOÀN: rời khỏi màn Học Qua Video vì bất kỳ lý do gì thì luôn tắt Chế Độ Ngang, tuyệt đối
            // không để kẹt lại trạng thái ngang khi quay lại Tàng Kinh Các hay các màn khác.
            useEffect(() => { if (appState !== 'VIDEO_LEARN') setVideoLandscapeMode(false); }, [appState]);

            // ⏱️ ĐẾM THỜI GIAN ĐÃ HỌC: mỗi giây kiểm tra video có đang thực sự phát không (getPlayerState===1)
            // rồi mới cộng dồn, tránh tính cả lúc dừng/thoát app. Reset về 0 khi đổi sang video khác.
            useEffect(() => { setVideoStudySeconds(0); }, [currentYoutubeId]);
            useEffect(() => {
                if (appState !== 'VIDEO_LEARN') return;
                const t = setInterval(() => {
                    try { if (ytPlayerRef.current && ytPlayerRef.current.getPlayerState && ytPlayerRef.current.getPlayerState() === 1) setVideoStudySeconds(s => s + 1); } catch (e) {}
                }, 1000);
                return () => clearInterval(t);
            }, [appState]);
            const formatStudyTime = (secs) => { const m = Math.floor(secs / 60), s = secs % 60; return `${m} phút ${s} giây`; };

            // 🔄 ĐỒNG BỘ VĂN BẢN THEO VIDEO: mỗi giây kiểm tra thời điểm đang phát (getCurrentTime), so với
            // mảng "transcriptTime" (thời điểm bắt đầu ước lượng của từng câu, do AI trả về) để biết câu nào
            // đang được nói tới, rồi tô sáng đúng câu đó trong bảng Văn Bản (cả khung dọc lẫn khung ngang).
            useEffect(() => {
                if (appState !== 'VIDEO_LEARN' || !videoResult?.transcriptTime?.length) { setActiveTranscriptIdx(-1); return; }
                const times = videoResult.transcriptTime;
                const tick = () => {
                    try {
                        const pl = ytPlayerRef.current; if (!pl || !pl.getCurrentTime) return;
                        const cur = pl.getCurrentTime(); let lo = 0, hi = times.length - 1, idx = -1;
                        while (lo <= hi) { const m = (lo + hi) >> 1; if (typeof times[m] === 'number' && times[m] <= cur + 0.3) { idx = m; lo = m + 1; } else hi = m - 1; }
                        setActiveTranscriptIdx(prev => prev === idx ? prev : idx);
                    } catch (e) {}
                };
                const t = setInterval(tick, 250);
                return () => clearInterval(t);
            }, [appState, videoResult, currentYoutubeId]);

            // Câu đang active đổi -> tự cuộn khung Văn Bản (dọc lẫn ngang) tới đúng câu đó, không để người
            // học phải tự dò tay theo lời nói trong lúc mắt còn đang xem video.
            useEffect(() => {
                if (activeTranscriptIdx < 0) return;
                if (Date.now() - (window.__trUserScroll || 0) < 4000) return; // người dùng đang tự cuộn
                ['portrait', 'landscape'].forEach(loc => {
                    const el = transcriptItemRefs.current[loc]?.[activeTranscriptIdx];
                    if (!el || !el.offsetParent) return;
                    // chỉ cuộn đúng khung chứa phụ đề (không dùng scrollIntoView vì nó kéo cả trang/video => giật)
                    let box = el.parentElement;
                    while (box && !(box.scrollHeight > box.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
                    if (!box) return;
                    const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
                    if (er.top > br.top + box.clientHeight * 0.2 && er.bottom < br.bottom - box.clientHeight * 0.3) return; // đang nằm trong vùng giữa -> không cuộn
                    box.scrollTo({ top: Math.max(0, box.scrollTop + (er.top - br.top) - (box.clientHeight / 2 - er.height / 2)), behavior: 'smooth' });
                });
            }, [activeTranscriptIdx]);

            const changePlaybackRate = (rate) => {
                playSfx('CLICK'); setPlaybackRate(rate);
                if (ytPlayerRef.current && ytPlayerRef.current.setPlaybackRate) ytPlayerRef.current.setPlaybackRate(rate);
            };

            // 🔄 CHẾ ĐỘ NGANG (v2 - SỬA LỖI): bản trước dùng Fullscreen API + screen.orientation.lock('landscape')
            // của trình duyệt. Hai API này KHÔNG đáng tin cậy trong WebView/APK đóng gói (nhiều WebView chặn
            // hẳn Fullscreen API, hoặc cho vào được nhưng không cho ra -> kẹt ngang vĩnh viễn, nút bấm coi
            // như "không phản hồi"). Đổi sang cách AN TOÀN HƠN: không đụng tới trạng thái xoay máy thật của hệ
            // điều hành, mà chỉ XOAY GIẢ bằng CSS transform: rotate(90deg) một khung overlay full màn hình -
            // cách này chạy được ở MỌI trình duyệt/WebView vì chỉ là CSS thuần, không phụ thuộc API nào, và
            // luôn có nút "✕ THOÁT NGANG" để tắt state videoLandscapeMode, quay lại dọc ngay lập tức, chắc chắn.
            // Khung overlay chia đôi: bên trái là video (KHÔNG remount lại player, chỉ đổi CSS bọc ngoài -
            // tránh mất vị trí đang xem), bên phải là bảng Văn Bản/Dịch Thuật để vừa xem vừa học từ vựng.
            const toggleVideoLandscapeMode = () => { playSfx('CLICK'); setVideoLandscapeMode(v => !v); };

            // ▶️ DANH SÁCH PHÁT: bấm vào 1 Bí Tịch Video đã lưu để nạp lại link đó vào khung xem +
            // hiện lại luôn Tóm Tắt/Dịch Thuật đã lưu, khỏi phải phân tích lại AI tốn API.
            const loadSavedVideoNote = (n) => {
                playSfx('CLICK');
                forceReplayRef.current = true; // luôn phát lại từ đầu, kể cả khi bấm lại đúng video đang mở
                setVideoLink(n.link);
                // SỬA LỖI: nạp lại đúng "transcript" đã lưu (trước đây luôn để rỗng -> mất Văn Bản khi mở lại)
                // và nạp lại "wordCache" đã tra trước đó -> bấm lại từ cũ hiện NGAY, không cần tra lại.
                setVideoResult({ summary: n.summary, translations: n.translations || [], transcript: n.transcript || [], isCjk: n.isCjk || false, transcriptPinyin: n.transcriptPinyin || [], transcriptTranslation: n.transcriptTranslation || [], transcriptTime: n.transcriptTime || [] });
                setWordLookupCache(n.wordCache || {});
                setVideoQuizActive(false); setVideoQuizRounds([]); setVideoShareCode(n.code || '');
                setVideoPlayNonce(k => k + 1); // ép effect gắn lại player dù currentYoutubeId không đổi
            };

            // Tra 1 từ/cụm từ: tạm dừng video ngay, gọi Gemini hỏi riêng nghĩa - từ loại/ngữ pháp -
            // hoàn cảnh sử dụng - ví dụ, dựa trên câu ngữ cảnh chứa từ đó để trả lời đúng nghĩa trong bài.
            // ✍️ Gom toàn bộ chữ Hán DUY NHẤT xuất hiện trong Từ Vựng đã phân tích của video hiện tại,
            // dùng làm danh sách để chọn luyện viết (chỉ lấy chữ Hán CJK, bỏ qua chữ Latinh/số/dấu câu).
            const getVideoHanziList = () => {
                const pool = (videoResult?.translations || []).map(t => t.original || '').join('');
                const uniq = Array.from(new Set(Array.from(pool).filter(ch => CJK_RE.test(ch))));
                return uniq;
            };

            const lookupWordAction = async (word, contextSentence) => {
                if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) ytPlayerRef.current.pauseVideo();
                playSfx('CLICK');
                const cacheKey = `${word}|${contextSentence || ''}`;
                // 💾 Đã tra từ này trong video đang xem rồi (kể cả từ lần trước, nếu Bí Tịch đã lưu có kèm
                // bộ nhớ tra từ) -> hiện lại NGAY, không gọi API/không cần "phân tích lại" như trước.
                if (wordLookupCache[cacheKey]) { setWordLookup({ word, loading: false, data: wordLookupCache[cacheKey], error: null }); return; }
                if (!anyGeminiKey) return alert("Ngài cần nhập API Key (Gemini) trước!");
                setWordLookup({ word, loading: true, data: null, error: null });
                try {
                    const prompt = `Từ/cụm từ: "${word}"\nCâu ngữ cảnh: "${contextSentence || ''}"\nHãy giải nghĩa từ trên trong đúng ngữ cảnh câu này cho người Việt đang học ngoại ngữ. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"meaning": "nghĩa tiếng Việt trong ngữ cảnh này", "partOfSpeech": "từ loại/chức năng ngữ pháp (VD: danh từ, động từ, thành ngữ...)", "usage": "giải thích ngắn hoàn cảnh/cách dùng từ này", "example": "1 câu ví dụ khác có dùng từ này kèm dịch nghĩa", "pinyin": "cách đọc Latinh của từ này nếu là chữ tượng hình (Pinyin có dấu thanh cho tiếng Trung, Romaji Hepburn đọc theo âm Nhật cho tiếng Nhật - KHÔNG dùng Pinyin cho chữ Nhật...); để chuỗi rỗng nếu ngôn ngữ gốc đã là chữ Latinh", "level": "trình độ của từ này theo khung phổ biến nhất của ngôn ngữ đó (VD: HSK1-HSK6 cho tiếng Trung, N5-N1 cho tiếng Nhật, A1-C2 cho tiếng Anh/Âu); để 'Không rõ' nếu không xác định được"}`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
                    if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
                    const parsed = JSON.parse(raw);
                    setWordLookup({ word, loading: false, data: parsed, error: null });
                    setWordLookupCache(prev => ({ ...prev, [cacheKey]: parsed })); playSfx('DING'); try { SRS.addLookup(word, parsed, contextSentence); } catch (e) {}
                } catch (e) {
                    setWordLookup({ word, loading: false, data: null, error: shortErr(e.message) });
                }
            };

            // SỬA LỖI THEO YÊU CẦU: bỏ hẳn khâu bắt buộc dán Phụ đề/Transcript tay.
            // Gemini API hỗ trợ nhận thẳng link YouTube qua "file_data.file_uri" (server Google tự tải và
            // xem/nghe video, không dính lỗi CORS phía trình duyệt) -> chỉ cần dán link là phân tích được luôn.
            // Lưu ý: tính năng đọc link YouTube trực tiếp hiện chỉ hỗ trợ chắc chắn cho YouTube; các nguồn
            // khác (Bilibili...) có thể không phân tích được, khi đó Gemini sẽ báo lỗi rõ ràng qua alert.
            const analyzeVideoAction = async () => {
                if (!anyGeminiKey) return alert("Ngài cần nhập API Key (Gemini) trước! Lấy miễn phí tại aistudio.google.com/apikey");
                if (!videoLink.trim()) return alert("Ngài cần dán Link Video (YouTube) vào trước đã!");
                playSfx('CLICK');
                setVideoAnalyzing(true);
                setVideoResult(null); setVideoShareCode('');
                setWordLookupCache({}); // video mới -> xoá bộ nhớ tra từ của video cũ
                setVideoQuizActive(false); setVideoQuizRounds([]); // xoá ải ôn tập cũ khi phân tích video mới
                try {
                    // 📏 SỬA LỖI "ẢI QUÁ NGẮN": trước đây chỉ xin 8-15 từ vựng nên nhiều video học được rất ít
                    // từ mới. Giờ xin ÍT NHẤT 20 từ vựng/video (nhiều hơn nếu video dài/nhiều nội dung) để
                    // các ải ôn tập sinh ra sau đó có đủ nội dung, không còn qua loa.
                    // 拼 THÊM PINYIN: nếu video dùng chữ tượng hình (Hán/Kana), Gemini trả kèm mảng
                    // "transcriptPinyin" - phiên âm Latinh song song từng câu với "transcript", để bật/tắt
                    // hiện phía dưới câu chữ Hán trong Văn Bản (không có ở ngôn ngữ khác thì để mảng rỗng).
                    // 🇻🇳 THÊM DỊCH NGHĨA TỪNG CÂU TRONG VĂN BẢN: trước đây "Văn Bản" chỉ hiện 100% nguyên văn
                    // ngôn ngữ gốc (kèm Pinyin nếu là chữ Hán) mà KHÔNG có nghĩa tiếng Việt đi kèm -> rất khó
                    // nhớ vì phải bấm tra từng từ một mới hiểu được cả câu. Giờ xin thêm mảng "transcriptTranslation"
                    // dịch nghĩa tiếng Việt song song từng câu, áp dụng cho MỌI ngôn ngữ (không chỉ tiếng có chữ tượng hình).
                    const prompt = `Bạn là trợ lý học ngoại ngữ, có thể xử lý bất kỳ ngôn ngữ nói nào trong video (Trung, Nhật, Hàn, Anh, Nga, Ả Rập, v.v). Hãy xem và nghe kỹ TOÀN BỘ video được cung cấp bên dưới TỪ ĐẦU ĐẾN CUỐI, sau đó trả lời DUY NHẤT bằng JSON hợp lệ (không markdown, không bọc trong \`\`\`json, không giải thích thêm), theo đúng cấu trúc:\n{"summary": "Tóm tắt ý chính của video bằng tiếng Việt, khoảng 4-6 câu", "language": "tên ngôn ngữ gốc của video (VD: Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Nga, Tiếng Ả Rập, Tiếng Anh...)", "isCjk": true/false (true nếu ngôn ngữ gốc dùng chữ tượng hình Hán/Kana, cần Pinyin/Romaji), "transcript": ["câu 1 bằng ngôn ngữ gốc của video", "câu 2...", "BẮT BUỘC chép LIÊN TỤC theo đúng trình tự thời gian TỪ ĐẦU ĐẾN CUỐI video, KHÔNG được bỏ đoạn giữa hay chỉ chọn lọc rời rạc - phải phủ kín toàn bộ nội dung nói trong video (có thể gộp các câu quá ngắn/lặp/đệm lại cho gọn, trung bình khoảng 1 câu mỗi 4-10 giây tuỳ mật độ nói của video, video càng dài thì transcript càng nhiều câu, không giới hạn số câu)"], "transcriptTime": [số giây (number, tính từ đầu video) ước lượng ĐÚNG thời điểm câu đó BẮT ĐẦU vang lên trong video, tương ứng theo thứ tự với từng câu trong "transcript", PHẢI tăng dần đều theo đúng thứ tự], "transcriptPinyin": ["phiên âm Latinh (Pinyin có dấu thanh cho tiếng Trung, Romaji cho tiếng Nhật [Romaji Hepburn của tiếng Nhật (nihongo rōmaji, VD: watashi wa gakusei desu) - TUYỆT ĐỐI KHÔNG dùng Pinyin hay âm Hán Việt cho chữ Nhật; kanji phải đọc theo âm Nhật (On/Kun)], Romaja cho tiếng Hàn) của ĐÚNG từng câu tương ứng trong \\"transcript\\" theo thứ tự, chỉ điền nếu isCjk=true, ngược lại để mảng rỗng []"], "transcriptTranslation": ["nghĩa tiếng Việt (dịch sát nghĩa, dễ hiểu) của ĐÚNG từng câu tương ứng trong \\"transcript\\" theo thứ tự, LUÔN điền đủ cho mọi ngôn ngữ để người học không phải đọc chay ngôn ngữ gốc mà không hiểu nghĩa"], "translations": [{"original": "câu/cụm từ/khái niệm gốc bằng ngôn ngữ của video", "translated": "nghĩa tiếng Việt, giải thích ngắn nếu là khái niệm", \"importance\": số 3, 2 hoặc 1 (3 = từ then chốt/rất quan trọng với nội dung video, 2 = quan trọng, 1 = ít quan trọng hơn; chỉ điền SỐ, không để trong ngoặc kép), "level": "trình độ của từ này (VD: HSK1-HSK6 cho tiếng Trung, N5-N1 cho tiếng Nhật, TOPIK1-TOPIK6 cho tiếng Hàn, A1-C2 cho tiếng Anh/Âu/Nga; để 'Không rõ' nếu không xác định được)"}, ... ÍT NHẤT 20 từ vựng/khái niệm quan trọng và hay nhất trong video để học (nhiều hơn nếu video có nhiều nội dung đáng học), không cần liệt kê hết cả bài]}\nNếu video KHÔNG có tiếng nói rõ ràng để phân tích ngôn ngữ, vẫn cố gắng phân tích tối đa nội dung nghe/thấy được, đừng bỏ trống.`;

                    const data = await geminiGenerateContent(anyGeminiKey, [
                        { file_data: { file_uri: videoLink.trim() } },
                        { text: prompt }
                    ]);

                    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                    // Thanh tẩy mọi tà khí Markdown để lấy đúng lõi JSON
                    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const startIndex = raw.indexOf('{');
                    const endIndex = raw.lastIndexOf('}');
                    if (startIndex !== -1 && endIndex !== -1) {
                        raw = raw.substring(startIndex, endIndex + 1);
                    }

                    const parsed = JSON.parse(raw);
                    setVideoResult(parsed);
                    playSfx('SUCCESS');
                } catch (e) {
                    alert("Phân tích thất bại! Chi tiết: " + shortErr(e.message));
                } finally {
                    setVideoAnalyzing(false);
                }
            };

            // 📤 MÃ BÍ TỊCH VIDEO NGẮN GỌN (SỬA LỖI MÃ QUÁ DÀI): trước đây mã chia sẻ được nén cả link +
            // tóm tắt + toàn bộ từ vựng bằng LZString thành 1 chuỗi rất dài (dễ tràn dòng/khó chép tay/khó
            // đọc). Nay đổi cách làm: dữ liệu đầy đủ được lưu thẳng lên Tàng Kinh Các (Firestore, collection
            // "videoShares"), còn "Mã Bí Tịch" đưa cho người khác chỉ còn là 1 con số NGẪU NHIÊN 12 CHỮ SỐ
            // (dùng làm khoá tra cứu doc trên Firestore) - ngắn, dễ đọc, dễ chép tay, không còn tràn dòng.
            const isShortVideoCode = (code) => /^\d{10,12}$/.test(String(code || '').trim());
            const generateAndStoreVideoShareCode = async (payload) => {
                let code, exists = true, attempts = 0;
                do {
                    code = String(Math.floor(1e11 + Math.random() * 9e11)); // luôn ra đúng 12 chữ số
                    try { exists = (await firestore.collection('videoShares').doc(code).get()).exists; }
                    catch (e) { exists = false; }
                    attempts++;
                } while (exists && attempts < 5);
                await firestore.collection('videoShares').doc(code).set({ ...payload, createdAt: Date.now() }).catch(()=>{});
                return code;
            };

            // Nhận Linh Thạch khi lưu bài học video (chỉ tính lần đầu lưu 1 link video, tránh spam nút để
            // farm vô hạn). Bùa Nhân Đôi (x2_card) cũng được áp dụng ở đây, giống hệt lúc thắng 1 ải.
            const saveVideoNoteAction = async () => {
                if (!videoResult || !user) return;
                const alreadySaved = (user.videoNotes || []).some(n => n.link === videoLink.trim());
                let gainedSpirit = 0;
                if (!alreadySaved) {
                    gainedSpirit = 100;
                    // 🆕 BÙA NHÂN ĐÔI BẢN MỚI: kiểm tra hiệu lực theo thời gian (x2BoostExpiresAt) thay vì
                    // tiêu 1 thẻ trong túi đồ tại đây - thẻ đã bị tiêu lúc kích hoạt (activateX2BoostAction).
                    if (user.x2BoostExpiresAt && Date.now() < user.x2BoostExpiresAt) { gainedSpirit *= 2; }
                }
                const noteCode = await generateAndStoreVideoShareCode({ link: videoLink.trim(), summary: videoResult.summary, translations: videoResult.translations || [], transcript: videoResult.transcript || [], isCjk: videoResult.isCjk || false, transcriptPinyin: videoResult.transcriptPinyin || [], transcriptTranslation: videoResult.transcriptTranslation || [], transcriptTime: videoResult.transcriptTime || [] });
                const updatePayload = {
                    videoNotes: firebase.firestore.FieldValue.arrayUnion({
                        id: Date.now(), link: videoLink.trim(), summary: videoResult.summary,
                        translations: videoResult.translations || [], savedAt: Date.now(), code: noteCode,
                        // SỬA LỖI MẤT DỮ LIỆU: trước đây không lưu "transcript" (Văn Bản bấm từ) và bộ nhớ
                        // tra từ (wordLookupCache) -> mở lại Bí Tịch đã lưu là mất trắng phần Văn Bản + phải
                        // tra lại từ đầu. Giờ lưu kèm cả 2 để mở lại là thấy nguyên như lúc học.
                        // Đồng thời lưu kèm isCjk/transcriptPinyin/transcriptTranslation (trước đây bị rớt
                        // khi lưu -> mở lại mất luôn Pinyin + nút Luyện Viết Chữ), để mở lại thấy đủ y như lúc học.
                        transcript: videoResult.transcript || [],
                        isCjk: videoResult.isCjk || false,
                        transcriptPinyin: videoResult.transcriptPinyin || [],
                        transcriptTranslation: videoResult.transcriptTranslation || [],
                        transcriptTime: videoResult.transcriptTime || [],
                        wordCache: wordLookupCache
                    }),
                    studySeconds: firebase.firestore.FieldValue.increment(videoStudySeconds)
                };
                if (gainedSpirit > 0) { updatePayload.spirit = firebase.firestore.FieldValue.increment(gainedSpirit); }
                await firestore.collection('users').doc(user.uid).update(updatePayload).catch(()=>{});
                try { SRS.addMany(videoResult.translations || [], (videoResult.transcript || []).join('')); } catch (e) {}
                setVideoShareCode(noteCode);
                playSfx('SUCCESS');
                // 🏆 Thay cho alert() cũ: hiện bảng THU HOẠCH + Phong Thần Bảng TOP 5 giống hệt lúc Vượt Ải,
                // để việc Học Qua Video cũng có cảm giác "nhận thưởng" rõ ràng và biết ngay mình đang xếp hạng bao nhiêu.
                setVideoSaveReward({ stones: gainedSpirit, alreadySaved });
            };

            const shareVideoNoteAction = async (note) => {
                playSfx('CLICK');
                let code = note.code;
                // Mã cũ (định dạng nén LZString dài, lưu từ trước khi cập nhật) hoặc chưa có mã sẵn
                // -> sinh mã số ngắn mới rồi cập nhật luôn lại vào Tàng Kinh Các để lần sau dùng lại mã ngắn này.
                if (!isShortVideoCode(code)) {
                    code = await generateAndStoreVideoShareCode({ link: note.link, summary: note.summary, translations: note.translations || [], transcript: note.transcript || [], isCjk: note.isCjk || false, transcriptPinyin: note.transcriptPinyin || [], transcriptTranslation: note.transcriptTranslation || [], transcriptTime: note.transcriptTime || [] });
                    if (user) {
                        const updatedNotes = (user.videoNotes || []).map(x => x.id === note.id ? { ...x, code } : x);
                        firestore.collection('users').doc(user.uid).update({ videoNotes: updatedNotes }).catch(()=>{});
                    }
                }
                navigator.clipboard.writeText(code);
                alert(`Đã chép Mã Bí Tịch Video: ${code}`);
            };

            const importVideoCodeAction = async () => {
                playSfx('CLICK');
                const code = videoImportCode.trim();
                if (!code) return alert("Xin dán Mã Bí Tịch Video vào trước!");
                try {
                    let parsed;
                    if (isShortVideoCode(code)) {
                        // Mã số ngắn mới: tra thẳng trên Tàng Kinh Các (Firestore) theo mã số làm khoá.
                        const doc = await firestore.collection('videoShares').doc(code).get();
                        if (!doc.exists) throw new Error('không tìm thấy mã');
                        parsed = doc.data();
                    } else {
                        // Mã cũ (định dạng nén dài) - vẫn hỗ trợ đọc để không hỏng các mã đã chia sẻ trước khi cập nhật.
                        parsed = JSON.parse(LZString.decompressFromEncodedURIComponent(code));
                        if (parsed.ty !== 'video') throw new Error('sai định dạng');
                    }
                    if (!parsed.link) throw new Error('sai định dạng');
                    setVideoLink(parsed.link);
                    setVideoResult({ summary: parsed.summary, translations: parsed.translations || [], transcript: parsed.transcript || [], isCjk: parsed.isCjk || false, transcriptPinyin: parsed.transcriptPinyin || [], transcriptTranslation: parsed.transcriptTranslation || [], transcriptTime: parsed.transcriptTime || [] });
                    setWordLookupCache({});
                    setVideoQuizActive(false); setVideoQuizRounds([]); setVideoImportCode('');
                    playSfx('SUCCESS');
                    alert("Đã nạp Bí Tịch Video từ Mã chia sẻ!");
                } catch (e) {
                    alert("Mã Bí Tịch Video không hợp lệ hoặc đã bị hỏng!");
                    playSfx('WRONG');
                }
            };

            // Tự sinh nhiều "ải" trắc nghiệm ôn từ vựng từ danh sách dịch thuật của video vừa học.
            // Mỗi câu hỏi: cho "Câu gốc", chọn đúng "Dịch nghĩa" trong 4 lựa chọn (nếu đủ dữ liệu).
            // SỬA LỖI NỘI DUNG ẢI QUÁ NGẮN: trước đây cứng 5 câu/ải và TỐI ĐA 2 ải -> nếu video có > 10
            // từ vựng thì phần dư bị ÂM THẦM VỨT BỎ, không được ôn tới (VD video có 15-20 từ chỉ ôn được 10).
            // Giờ dùng HẾT toàn bộ từ vựng đã phân tích, chia thành các ải đều nhau ~6 câu/ải, không giới hạn số ải.
            const VOCAB_QUESTIONS_PER_ROUND = 6;
            // 🆕 ĐỒNG BỘ TÍNH NĂNG "TẢI NGỌC GIẢN" (.TXT/.DOCX) SANG HỌC QUA VIDEO: trước đây mục này chỉ
            // tạo được từ vựng bằng cách phân tích video, không có cách nào tải file danh sách từ vựng có
            // sẵn lên như bên Ải Bí Tịch. Dùng lại đúng cơ chế AI đọc hiểu văn bản (parseAiQuizJson,
            // sanitizeAiMathText) để tách cặp "từ - nghĩa" rồi gộp thẳng vào Từ Vựng của video đang xem.
            const analyzeVocabTextWithAI = async (rawText) => {
                const prompt = `Đây là văn bản thô trích xuất từ 1 file danh sách từ vựng (.txt hoặc .docx), có thể trình bày dưới nhiều kiểu khác nhau (gạch đầu dòng, đánh số, bảng, dấu hai chấm, dấu gạch ngang, tab...). Hãy đọc hiểu và tách thành các cặp "từ/cụm từ gốc - nghĩa/bản dịch". Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo đúng cấu trúc:\n{"translations": [{"original": "từ hoặc cụm từ gốc", "translated": "nghĩa/bản dịch tương ứng"}]}\nBỏ qua phần không phải từ vựng (tiêu đề, hướng dẫn, số trang...). Tối đa 60 cặp.\n\nVĂN BẢN:\n"""${rawText.slice(0, 15000)}"""`;
                const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const parsed = parseAiQuizJson(rawResp);
                const list = (parsed.translations || []).map(t => ({ original: sanitizeAiMathText(t.original || '').trim(), translated: sanitizeAiMathText(t.translated || '').trim() })).filter(t => t.original && t.translated);
                if (list.length < 2) throw new Error('AI không tách được đủ từ vựng (cần tối thiểu 2 cặp) từ file này.');
                return list;
            };

            const handleVocabFileUpload = (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung phía trên để AI đọc file từ vựng!"); e.target.value = ''; return; }
                const ext = file.name.split('.').pop().toLowerCase();
                const process = async (rawText) => {
                    if (!rawText || !rawText.trim()) { alert("File từ vựng trống rỗng!"); return; }
                    playSfx('CLICK');
                    setVocabFileAnalyzing(true);
                    try {
                        const added = await analyzeVocabTextWithAI(rawText);
                        setVideoResult(prev => ({
                            summary: prev?.summary || 'Bộ từ vựng nhập từ Ngọc Giản (.txt/.docx).',
                            translations: [...(prev?.translations || []), ...added],
                            transcript: prev?.transcript || [], isCjk: prev?.isCjk || false,
                            transcriptPinyin: prev?.transcriptPinyin || [], transcriptTranslation: prev?.transcriptTranslation || [], transcriptTime: prev?.transcriptTime || []
                        }));
                        playSfx('SUCCESS');
                        alert(`AI đã thêm ${added.length} cặp từ vựng từ file! Kéo xuống bấm "🧠 ÔN TẬP TỪ VỰNG" để vào ải ngay.`);
                    } catch (err) {
                        alert("AI phân tích file từ vựng thất bại! Chi tiết: " + shortErr(err.message));
                    } finally {
                        setVocabFileAnalyzing(false); e.target.value = '';
                    }
                };
                if (ext === 'docx') {
                    if (typeof mammoth === 'undefined') { alert("Thần thú Mammoth chưa tỉnh giấc, xin chờ lát nữa!"); e.target.value = ''; return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => { mammoth.extractRawText({ arrayBuffer: ev.target.result }).then(res => process(res.value)).catch(() => alert("Lỗi dịch ngọc giản Docx!")); };
                    reader.readAsArrayBuffer(file);
                } else {
                    const reader = new FileReader();
                    reader.onload = (ev) => { process(ev.target.result); };
                    reader.readAsText(file);
                }
            };

            const buildVideoVocabQuiz = (translations) => {
                const pool = (translations || []).filter(t => t?.original && t?.translated);
                if (pool.length < 2) return [];
                const shuffledPool = shuffleArray(pool);
                const questions = shuffledPool.map((t) => {
                    const distractors = shuffleArray(pool.filter(x => x !== t)).slice(0, 3).map(x => x.translated);
                    const options = shuffleArray([t.translated, ...distractors]);
                    return { term: t.original, options, correctIndex: options.indexOf(t.translated) };
                });
                const rounds = [];
                for (let i = 0; i < questions.length; i += VOCAB_QUESTIONS_PER_ROUND) rounds.push(questions.slice(i, i + VOCAB_QUESTIONS_PER_ROUND));
                return rounds; // dùng HẾT, không còn giới hạn 2 ải/5 câu như trước
            };

            const startVideoVocabReview = () => {
                playSfx('CLICK');
                const rounds = buildVideoVocabQuiz(videoResult?.translations);
                if (rounds.length === 0) return alert("Chưa đủ từ vựng để tạo ải ôn tập! Cần ít nhất 2 mục Dịch Thuật.");
                setVideoQuizRounds(rounds); setVideoQuizRoundIdx(0); setVideoQuizQIdx(0);
                setVideoQuizScore(0); setVideoQuizSelected(null); setVideoQuizShowResult(false); setVideoQuizActive(true);
                setVideoQuizRoundReward(null); setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText('');
                setVideoQuizRoundResults([]); setVideoQuizFinished(false); videoQuizPayingRef.current = false;
            };

            // 🆕 Bấm SAI -> loại đáp án đó + hiện bảng gợi ý (KHÔNG kết thúc câu ngay), giống hệt Ải Bí Tịch.
            // Bấm ĐÚNG -> chấm điểm và dừng lại chờ bấm "Câu Tiếp" (như cũ).
            // 🛡️ SỬA LỖI TÍNH GIAN ĐIỂM (đồng bộ với Ải Bí Tịch): sai đủ 2 lần trên 1 câu -> tự động tính
            // SAI luôn, không cho đoán ăn may đáp án cuối cùng còn lại.
            const selectVideoQuizAnswer = (optIdx) => {
                if (videoQuizSelected !== null || videoQuizEliminated.includes(optIdx)) return;
                const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
                if (optIdx === q.correctIndex) {
                    setVideoQuizSelected(optIdx); setVideoQuizScore(s => s + 1); playSfx('CORRECT');
                } else {
                    playSfx('WRONG');
                    const newElim = [...videoQuizEliminated, optIdx];
                    setVideoQuizEliminated(newElim);
                    setVideoHintText('');
                    if (newElim.length >= 2) { setVideoQuizSelected(optIdx); }
                }
            };

            // 🆕 "Bó tay, xem đáp án": tính là chưa trả lời đúng nhưng vẫn cho xem đáp án & đi tiếp.
            const handleVideoGiveUp = () => { setVideoQuizSelected(-1); playSfx('WRONG'); };

            // 🆕 XIN GỢI Ý AI cho từ vựng đang ôn (không được lộ nghĩa đúng)
            const handleVideoRequestHint = async () => {
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung bên dưới!"); return; }
                const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
                setVideoHintLoading(true);
                try {
                    const prompt = `Đây là 1 câu hỏi ôn từ vựng: "${q.term}"\nCác lựa chọn nghĩa: ${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('; ')}\nNgười học vừa chọn sai: ${videoQuizEliminated.map(i=>String.fromCharCode(65+i)).join(', ') || '(chưa có)'}.\nHãy đưa ra 1 GỢI Ý ngắn gọn (1-2 câu) giúp người học liên tưởng/nhớ lại nghĩa đúng của từ này. TUYỆT ĐỐI KHÔNG được nói thẳng đáp án đúng.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    setVideoHintText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
                } catch (err) {
                    setVideoHintText('❌ Lỗi khi lấy gợi ý: ' + shortErr(err.message));
                } finally {
                    setVideoHintLoading(false);
                }
            };

            // 🆕 AI PHÂN TÍCH sau khi trả lời xong 1 câu ôn từ vựng
            const handleVideoAiExplain = async () => {
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung bên dưới!"); return; }
                const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
                setVideoAiExplainLoading(true); setVideoAiExplainText('');
                try {
                    const userAnswerDesc = videoQuizSelected === -1 ? '(đã bỏ cuộc, xem đáp án)' : `${String.fromCharCode(65+videoQuizSelected)}. ${q.options[videoQuizSelected]}`;
                    const prompt = `Đây là 1 câu hỏi ôn từ vựng:\n"${q.term}"\nCác lựa chọn nghĩa: ${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('; ')}\nĐáp án đúng: ${String.fromCharCode(65+q.correctIndex)}. ${q.options[q.correctIndex]}\nNgười học đã trả lời: ${userAnswerDesc}\nHãy giải thích ngắn gọn (2-4 câu) bằng tiếng Việt lý do nghĩa đúng là như vậy, có thể kèm ví dụ hoặc mẹo ghi nhớ. Đi thẳng vào giải thích, không chào hỏi rườm rà.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    setVideoAiExplainText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
                } catch (err) {
                    setVideoAiExplainText('❌ Lỗi khi phân tích: ' + shortErr(err.message));
                } finally {
                    setVideoAiExplainLoading(false);
                }
            };

            const nextVideoQuizQuestion = () => {
                playSfx('CLICK');
                const round = videoQuizRounds[videoQuizRoundIdx];
                if (videoQuizQIdx + 1 < round.length) { setVideoQuizQIdx(i => i + 1); setVideoQuizSelected(null); setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText(''); }
                else { setVideoQuizShowResult(true); }
            };

            // 🎁 SỬA LỖI: trước đây vượt xong ải ôn tập video KHÔNG được thưởng gì cả (khác hẳn Ải Bí Tịch
            // văn bản, hễ đúng câu là +50 Linh Thạch/câu, đúng hết ải +50 Danh Vọng). Giờ đồng bộ đúng công
            // thức thưởng với Ải Bí Tịch: mỗi câu đúng +50 Linh Thạch, làm đúng hết cả ải +50 Danh Vọng,
            // có cộng thêm % thưởng Đột Phá Cảnh Giới và nhân đôi nếu đang có Bùa Nhân Đôi, y hệt Ải Bí Tịch.
            // 🧮 Công thức thưởng 1 ải ôn tập video (dùng CHUNG cho màn kết quả ải để xem trước VÀ lúc phát thưởng thật,
            // đảm bảo con số người chơi thấy = con số thực nhận).
            const calcVideoQuizRoundReward = (score, total) => {
                let stones = score * 50;
                const fame = (total > 0 && score === total) ? 50 : 0;
                if (stones > 0 && user) {
                    const rankBonus = getRankBonusPercent(user.rank);
                    if (rankBonus > 0) stones = Math.round(stones * (1 + rankBonus / 100));
                    // 🆕 BÙA NHÂN ĐÔI BẢN MỚI: kiểm tra hiệu lực theo thời gian, không tiêu thẻ tại đây nữa.
                    if (user.x2BoostExpiresAt && Date.now() < user.x2BoostExpiresAt) stones *= 2;
                }
                return { stones, fame };
            };

            // 🎁 Bấm nút ở màn kết quả ải: phát thưởng ải vừa xong, ghi vào bảng tổng kết, rồi sang ải kế tiếp.
            // Nếu là ải CUỐI -> chuyển sang màn TỔNG KẾT (videoQuizFinished) thay vì đóng modal đột ngột.
            const nextVideoQuizRound = async () => {
                if (videoQuizPayingRef.current) return; // đang xử lý, bỏ qua bấm đúp
                videoQuizPayingRef.current = true;
                playSfx('CLICK');
                try {
                    const round = videoQuizRounds[videoQuizRoundIdx];
                    const { stones, fame } = calcVideoQuizRoundReward(videoQuizScore, round.length);
                    if (stones > 0 && user) {
                        try {
                            await firestore.collection('users').doc(user.uid).update({
                                spirit: firebase.firestore.FieldValue.increment(stones),
                                fame: firebase.firestore.FieldValue.increment(fame)
                            });
                        } catch (e) { console.error("Lỗi phát thưởng ải ôn tập video:", e); }
                    }
                    setVideoQuizRoundReward({ stones, fame });
                    setVideoQuizRoundResults(prev => [...prev, { round: videoQuizRoundIdx + 1, score: videoQuizScore, total: round.length, stones, fame }]);
                    if (videoQuizRoundIdx + 1 < videoQuizRounds.length) {
                        setVideoQuizRoundIdx(i => i + 1); setVideoQuizQIdx(0); setVideoQuizScore(0);
                        setVideoQuizSelected(null); setVideoQuizShowResult(false);
                        setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText('');
                    } else {
                        setVideoQuizShowResult(false);
                        setVideoQuizFinished(true);
                        playSfx('SUCCESS');
                    }
                } finally { videoQuizPayingRef.current = false; }
            };

            // Đóng bảng tổng kết ôn tập video
            const closeVideoQuizSummary = () => {
                playSfx('CLICK');
                setVideoQuizActive(false); setVideoQuizFinished(false);
                setVideoQuizRoundResults([]); setVideoQuizRoundReward(null);
            };

            // 🆕 Chuyển JSON câu hỏi (do AI trả về) thành các dòng văn bản theo đúng định dạng
            // "Câu.../A.../Đáp án:" mà parseRawQuizText() hiểu — dùng chung cho cả quét ảnh (OCR)
            // VÀ phân tích Ngọc Giản (.txt/.docx), tránh lặp code 2 nơi.
            const quizJsonToLines = (questions) => {
                const lines = [];
                questions.forEach((qq, i) => {
                    lines.push(`Câu ${i + 1}: ${sanitizeAiMathText(qq.q)}`);
                    if (qq.type === 'numeric') {
                        lines.push(`Đáp án: ${qq.c}`);
                    } else {
                        (qq.o || []).forEach((opt, oi) => lines.push(`${String.fromCharCode(65 + oi)}. ${sanitizeAiMathText(opt)}`));
                        if (qq.type === 'multi' && Array.isArray(qq.c)) {
                            lines.push(`Đáp án: ${qq.c.map(idx => String.fromCharCode(65 + idx)).join(',')}`);
                        } else {
                            lines.push(`Đáp án: ${String.fromCharCode(65 + (qq.c || 0))}`);
                        }
                    }
                });
                return lines;
            };

            // 🆕 Bóc JSON ra khỏi phản hồi thô của Gemini (lỡ có kèm ```json hay chữ thừa)
            const parseAiQuizJson = (rawResp) => {
                let raw = (rawResp || '').replace(/```json/gi, '').replace(/```/g, '').trim();
                const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
                if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
                return JSON.parse(raw);
            };

            // 🆕 PHÂN TÍCH NGỌC GIẢN (FILE .TXT/.DOCX) BẰNG AI: trước đây chỉ đổ thẳng chữ thô vào ô văn
            // bản rồi dò bằng regex cứng nhắc, nên KHÔNG tự nhận ra câu hỏi dạng "đúng/sai nhiều ý" nếu
            // file gốc không gõ đúng y hệt cú pháp "Đáp án: A,C". Giờ dùng AI đọc hiểu ngữ nghĩa để tự
            // tách đúng loại câu hỏi (1 đáp án / nhiều đáp án đúng-sai / điền số), y hệt tính năng quét ảnh.
            const analyzeQuizTextWithAI = async (rawText) => {
                const prompt = `Đây là văn bản thô trích xuất từ 1 file đề thi/bài tập (.txt hoặc .docx), định dạng có thể lộn xộn. Hãy đọc hiểu và tách thành các câu hỏi. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo đúng cấu trúc:\n{"title": "tên gợi ý ngắn gọn cho bộ câu hỏi này", "questions": [{"q": "nội dung câu hỏi", "type": "single", "o": ["đáp án A", "đáp án B", "đáp án C", "đáp án D"], "c": 0}]}\nTrong đó "type" là một trong 3 giá trị:\n- "single": trắc nghiệm chỉ có 1 đáp án đúng (mặc định) -> "o" là mảng 2-4 lựa chọn, "c" là chỉ số đáp án đúng (0=A,1=B,2=C,3=D).\n- "multi": câu hỏi dạng liệt kê nhiều mệnh đề con a/b/c/d mà MỖI Ý CÓ THỂ ĐÚNG HOẶC SAI ĐỘC LẬP (dạng "đúng/sai" 4 ý của đề Vật Lý/Hoá/Sinh chương trình mới) -> RẤT QUAN TRỌNG: phải tự nhận ra dạng này dựa vào Ý NGHĨA từng mệnh đề, dù văn bản gốc không hề ghi chữ "đúng/sai" hay không theo đúng cú pháp mẫu. "o" là mảng các mệnh đề, "c" là MẢNG chỉ số các mệnh đề ĐÚNG (VD [0,2]).\n- "numeric": câu hỏi yêu cầu tính ra một con số cụ thể, không có lựa chọn để chọn -> "o" là mảng RỖNG [], "c" là đáp án số dạng chuỗi.\nNếu văn bản có sẵn đáp án (in đậm, ghi chú, để ở cuối bài, có gạch chân...) thì dùng đúng đáp án đó; nếu không thấy thì tự suy luận theo kiến thức. Bỏ qua phần không phải câu hỏi (tiêu đề, hướng dẫn làm bài, tên trường...). Tối đa 40 câu.\n\nVĂN BẢN:\n"""${rawText.slice(0, 15000)}"""`;
                const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const parsed = parseAiQuizJson(rawResp);
                if (!parsed.questions || parsed.questions.length === 0) throw new Error('AI không tách được câu hỏi nào từ file này.');
                return parsed;
            };

            const handleFileUpload = (e) => {
                const file = e.target.files[0]; if(!file) return;
                const ext = file.name.split('.').pop().toLowerCase();

                // 🆕 Xử lý chung sau khi đã có văn bản thô (từ .txt hoặc đã dịch từ .docx): ưu tiên nhờ AI
                // phân tích để tự tách đúng câu nhiều đáp án đúng; nếu chưa có API Key thì dán thô như cũ.
                const processRawText = async (rawText, defaultTitle) => {
                    if (!rawText || !rawText.trim()) { alert("Ngọc giản trống rỗng!"); return; }
                    if (anyGeminiKey) {
                        playSfx('CLICK');
                        setQuizTextAnalyzing(true);
                        try {
                            const parsed = await analyzeQuizTextWithAI(rawText);
                            if (!quizTitle.trim()) setQuizTitle(parsed.title || defaultTitle);
                            const lines = quizJsonToLines(parsed.questions);
                            setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + lines.join('\n') : lines.join('\n'));
                            playSfx('SUCCESS');
                            alert(`AI đã đọc và tự nhận diện được ${parsed.questions.length} câu hỏi (kể cả câu nhiều đáp án đúng)! Xin rà soát lại nội dung bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.`);
                        } catch (err) {
                            setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + rawText : rawText);
                            alert("AI phân tích thất bại nên đã dán thô văn bản để ngài tự chỉnh sửa. Chi tiết: " + shortErr(err.message));
                        } finally {
                            setQuizTextAnalyzing(false);
                        }
                    } else {
                        setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + rawText : rawText);
                        playSfx('CLICK');
                        alert("Đã đọc được thiên cơ từ file! Lưu ý: chưa nhập API Key (Gemini) nên KHÔNG tự tách được câu nhiều đáp án đúng — vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (miễn phí) rồi tải lại file để AI tự phân tích chính xác hơn. Ngài cũng có thể tự chỉnh sửa văn bản bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.");
                    }
                };

                if (ext === 'docx') {
                    if (typeof mammoth === 'undefined') return alert("Thần thú Mammoth chưa tỉnh giấc, xin chờ lát nữa!");
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        mammoth.extractRawText({ arrayBuffer: ev.target.result }).then(res => {
                            processRawText(res.value, file.name.replace(/\.docx$/i, ''));
                        }).catch(() => alert("Lỗi dịch ngọc giản Docx!"));
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    const reader = new FileReader();
                    reader.onload = (ev) => { processRawText(ev.target.result, file.name.replace(/\.[^.]+$/, '')); };
                    reader.readAsText(file);
                }
            };

            const importQuizCodeAction = async () => {
                if (redeemingCode) return; // 🛡️ đang xử lý rồi, bấm thêm cũng bỏ qua (chống nhập trùng khi mạng chậm)
                const trimmedCode = importCode.trim();
                if (!trimmedCode) return alert("Xin nhập Mã Bí Tịch / Code quà trước đã!");
                setRedeemingCode(true);
                playSfx('CLICK');
                try {
                    const upperCode = trimmedCode.toUpperCase();
                    if (GIFT_CODES[upperCode]) {
                        if (user.usedCodes?.includes(upperCode)) { alert("Mã quà tặng này ngài đã sử dụng rồi!"); return; }
                        const giftVal = GIFT_CODES[upperCode];
                        await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(giftVal.s), fame: firebase.firestore.FieldValue.increment(giftVal.f), usedCodes: firebase.firestore.FieldValue.arrayUnion(upperCode) });
                        alert(`Thu hoạch: +${giftVal.s} LT, +${giftVal.f} ⭐`); playSfx('SUCCESS');
                    } else {
                        try {
                            const parsedData = JSON.parse(LZString.decompressFromEncodedURIComponent(trimmedCode));
                            await firestore.collection('users').doc(user.uid).update({ library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: parsedData.t, data: parsedData.d, code: trimmedCode }) });
                            alert("Đã thu nạp Bí Tịch thành công!"); playSfx('SUCCESS');
                        } catch(e) { alert("Mã Bí tịch không hợp lệ hoặc đã bị hỏng!"); playSfx('WRONG'); return; }
                    }
                    setImportCode('');
                } catch (e) {
                    alert("Có lỗi khi kết nối máy chủ, xin thử lại! Chi tiết: " + shortErr(e.message));
                    playSfx('WRONG');
                } finally {
                    setRedeemingCode(false);
                }
            };

            // 📷 QUÉT ẢNH ĐỀ THI BẰNG AI: dùng chung Gemini API Key với mục Học Qua Video (đã có sẵn),
            // gửi ảnh (jpg/png...) cho Gemini Vision đọc chữ (OCR) + tự tách câu hỏi/đáp án, rồi đổ thẳng
            // vào ô văn bản theo đúng định dạng "Câu... / A. / Đáp án:" mà createQuizAction() đang hiểu,
            // để người chế tác chỉ cần rà soát lại rồi bấm LƯU TRỮ, khỏi phải gõ tay từng câu.
            const handleQuizImageUpload = async (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); e.target.value = ''; return; }
                playSfx('CLICK');
                setQuizImageAnalyzing(true);
                try {
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = () => reject(new Error('Không đọc được ảnh'));
                        reader.readAsDataURL(file);
                    });
                    const mimeType = file.type || 'image/jpeg';
                    const prompt = `Đây là ảnh chụp một đề thi/bài tập (có thể viết tay hoặc in, gồm trắc nghiệm 1 đáp án, dạng đúng/sai nhiều ý, hoặc câu hỏi điền số/tính toán). Hãy đọc kỹ toàn bộ chữ và ký hiệu Toán/Lý/Hoá trong ảnh (OCR, giữ nguyên đúng ký hiệu như ω, π, Δ, √, số mũ, chỉ số dưới...) rồi trích xuất thành các câu hỏi. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, không giải thích thêm, theo đúng cấu trúc:\n{"title": "tên gợi ý ngắn gọn cho bộ câu hỏi này", "questions": [{"q": "nội dung câu hỏi", "type": "single", "o": ["đáp án A", "đáp án B", "đáp án C", "đáp án D"], "c": 0}]}\nTrong đó "type" là một trong 3 giá trị:\n- "single": trắc nghiệm chỉ có 1 đáp án đúng (mặc định) -> "o" là mảng 2-4 lựa chọn, "c" là chỉ số đáp án đúng (0=A,1=B,2=C,3=D).\n- "multi": câu hỏi dạng liệt kê nhiều ý a/b/c/d và có TỪ 2 Ý ĐÚNG TRỞ LÊN (VD dạng "đúng/sai" của đề Vật Lý/Hoá có 4 ý) -> "o" là mảng các ý, "c" là MẢNG các chỉ số ý đúng (VD [0,2]).\n- "numeric": câu hỏi yêu cầu tính toán ra một con số cụ thể (không có lựa chọn A/B/C/D để chọn) -> "o" là mảng RỖNG [], "c" là đáp án số dạng chuỗi (VD "12.5").\nNếu ảnh không đánh dấu rõ đáp án đúng, hãy tự suy luận đáp án hợp lý nhất theo kiến thức. Chỉ lấy tối đa 30 câu, bỏ qua chữ không liên quan tới câu hỏi.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [
                        { inline_data: { mime_type: mimeType, data: base64Data } },
                        { text: prompt }
                    ]);
                    const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const parsed = parseAiQuizJson(rawResp);
                    if (!parsed.questions || parsed.questions.length === 0) throw new Error('Không đọc được câu hỏi nào trong ảnh, ảnh có thể mờ hoặc không đúng định dạng đề thi.');
                    if (!quizTitle.trim()) setQuizTitle(parsed.title || 'Bí Tịch Từ Ảnh');
                    const lines = quizJsonToLines(parsed.questions);
                    setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + lines.join('\n') : lines.join('\n'));
                    playSfx('SUCCESS');
                    alert(`AI đã đọc được ${parsed.questions.length} câu hỏi từ ảnh! Xin rà soát lại nội dung bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.`);
                } catch (err) {
                    alert("Đọc ảnh thất bại! Chi tiết: " + shortErr(err.message));
                } finally {
                    setQuizImageAnalyzing(false);
                    e.target.value = '';
                }
            };

            // 🆕 Đánh dấu ô nhập đang được focus để bàn phím ký hiệu biết chèn vào đâu
            const bindMathFocus = (getter, setter) => (e) => setActiveMathTarget({ node: e.target, get: getter, set: setter });

            // 🆕 Chèn 1 ký hiệu Toán/Lý vào đúng vị trí con trỏ của ô đang gõ dở
            const insertMathSymbol = (sym) => {
                if (!activeMathTarget) { alert("Xin bấm vào 1 ô nhập câu hỏi/đáp án trước, rồi chọn ký hiệu để chèn vào nhé!"); return; }
                const { node, get, set } = activeMathTarget;
                const val = get() || '';
                const start = node.selectionStart ?? val.length;
                const end = node.selectionEnd ?? start;
                const newVal = val.slice(0, start) + sym + val.slice(end);
                set(newVal);
                requestAnimationFrame(() => { try { node.focus(); node.selectionStart = node.selectionEnd = start + sym.length; } catch (e) {} });
            };

            const createQuizAction = async () => {
                if (!quizTitle || !rawQuizText) return alert("Xin hãy điền đầy đủ Tên và Nội dung!");
                const questionList = parseRawQuizText(rawQuizText);
                if (questionList.length === 0) return alert("Sai định dạng! Không tìm thấy câu hỏi nào.");
                const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: quizTitle, d: questionList }));
                await firestore.collection('users').doc(user.uid).update({ library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: quizTitle, data: questionList, code: compressedCode }) });
                setIsAddingQuiz(false); setRawQuizText(''); setQuizTitle('');
                navigator.clipboard.writeText(compressedCode); alert("Đã khắc ghi Bí Tịch và sao chép Mã để chia sẻ!"); playSfx('SUCCESS');
            };

            // ============================================================
            // 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): sinh Đạo Đồ (sơ đồ cây các Ải theo ngày) từ 1 trong 2
            // nguồn - (A) "library": chia nhỏ 1 Bí Tịch ĐÃ CÓ SẴN trong Tàng Kinh Các ra nhiều ngày, hoặc
            // (B) "subjects": nhờ AI soạn HẲN bộ câu hỏi mới theo từng môn học, từ cơ bản tới nâng cao.
            // ============================================================
            // (A) Chia đều 1 danh sách câu hỏi có sẵn thành các Ải theo ngày - THUẦN CLIENT, không cần
            // API Key vẫn dùng được (chỉ riêng phần ĐẶT TÊN/GẮN CHỦ ĐỀ mới cần AI, xem tagNodeTopicsWithAI).
            // Hết câu hỏi trước khi đủ số ngày yêu cầu -> tự XÁO LẠI VÀ LẶP VÒNG 2 (ôn tập có chọn lọc)
            // thay vì cắt cụt lộ trình, rất hợp lý cho việc ôn thi (lặp lại giãn cách giúp nhớ lâu hơn).
            const buildNodesFromQuestions = (questions, days, difficultyId) => {
                const diff = getExamDifficulty(difficultyId);
                const total = questions.length;
                const perDay = Math.min(total, Math.max(3, diff.qPerDay));
                let pool = shuffleArray(questions); let idx = 0;
                const nextChunk = (n) => {
                    const out = [];
                    while (out.length < n) {
                        if (idx >= pool.length) { pool = shuffleArray(questions); idx = 0; }
                        out.push(pool[idx]); idx++;
                    }
                    return out;
                };
                const nodes = []; let seenSoFar = [];
                for (let day = 1; day <= days; day++) {
                    const chunk = nextChunk(Math.min(perDay, total));
                    seenSoFar = seenSoFar.concat(chunk);
                    nodes.push({ id: `d${day}-lesson`, day, title: `Ngày ${day}`, type: 'lesson', topics: [], questions: chunk, status: day === 1 ? 'unlocked' : 'locked', bestScore: null, lastAttemptAt: null });
                    if (diff.reviewEvery > 0 && day % diff.reviewEvery === 0 && day < days) {
                        nodes.push({ id: `d${day}-review`, day, title: `Ôn Tập - Ngày ${day}`, type: 'review', topics: [], questions: shuffleArray(seenSoFar).slice(0, Math.min(8, seenSoFar.length)), status: 'locked', bestScore: null, lastAttemptAt: null });
                    }
                    if (diff.bossEvery > 0 && day % diff.bossEvery === 0) {
                        nodes.push({ id: `d${day}-boss`, day, title: `Ải Boss - Chặng ${Math.ceil(day / diff.bossEvery)}`, type: 'boss', topics: [], questions: shuffleArray(seenSoFar).slice(0, Math.min(12, seenSoFar.length)), status: 'locked', bestScore: null, lastAttemptAt: null });
                    }
                }
                return nodes;
            };
            // Gắn tiêu đề hấp dẫn + 1-3 nhãn chủ đề (dùng để vẽ Bát Quái Đồ) cho từng Ải bằng AI, gộp
            // TẤT CẢ node vào 1 LẦN GỌI DUY NHẤT để tiết kiệm lượt. Không có API Key -> vẫn hoạt động,
            // chỉ là dùng nhãn "Tổng Quát" chung chung thay vì nhãn chi tiết theo từng chủ đề thật.
            const tagNodeTopicsWithAI = async (nodes, apiKey) => {
                if (!apiKey) return nodes.map(n => ({ ...n, topics: [n.type === 'boss' ? 'Tổng Ôn' : 'Chủ Đề Chung'] }));
                const brief = nodes.map((n, i) => `#${i} (${n.type}): ` + n.questions.slice(0, 6).map(q => q.q).join(' | ')).join('\n');
                const prompt = `Dưới đây là danh sách các "Ải" luyện thi, mỗi dòng là 1 ải kèm vài câu hỏi mẫu bên trong. Với MỖI ải, hãy đặt 1 tiêu đề ngắn gọn hấp dẫn (dưới 6 từ, tiếng Việt) mô tả đúng nội dung chính, và gắn 1-3 nhãn chủ đề ngắn (1-3 từ, VD "Đại Số", "Ngữ Pháp Thì", "Cách Mạng Pháp"...) dùng để vẽ biểu đồ mạng nhện thực lực. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown:\n{"items":[{"i":0,"title":"...","topics":["..."]}]}\n\nDANH SÁCH:\n${brief.slice(0, 12000)}`;
                try {
                    const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
                    const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const parsed = parseAiQuizJson(rawResp);
                    const map = {}; (parsed.items || []).forEach(it => map[it.i] = it);
                    return nodes.map((n, i) => map[i] ? { ...n, title: map[i].title || n.title, topics: (map[i].topics && map[i].topics.length) ? map[i].topics : ['Tổng Quát'] } : { ...n, topics: ['Tổng Quát'] });
                } catch (e) {
                    return nodes.map(n => ({ ...n, topics: ['Tổng Quát'] })); // AI lỗi -> Đạo Lộ vẫn tạo được bình thường, chỉ thiếu nhãn chủ đề đẹp
                }
            };
            // (B) Nhờ AI soạn HẲN bộ câu hỏi mới theo từng môn học được chọn, đi từ CƠ BẢN (lấy gốc) tới
            // NÂNG CAO qua từng ngày. Giới hạn 14 ngày/lượt gọi AI để tránh phản hồi quá dài bị cắt - nếu
            // người học chọn nhiều ngày hơn, các ngày còn lại tự LẶP LẠI CÓ XÁO TRỘN làm ngày ôn tập bổ
            // sung thay vì gọi AI thêm nhiều lần (tốn quota + dễ lỗi).
            const generateSubjectPathWithAI = async (subjects, days, difficultyId, apiKey) => {
                const diff = getExamDifficulty(difficultyId);
                const aiDays = Math.min(days, 14);
                const prompt = `Hãy soạn 1 lộ trình ôn luyện thi kéo dài ${aiDays} ngày cho các môn: ${subjects.join(', ')}. Mức độ khó: "${diff.name}" (khoảng ${diff.qPerDay} câu hỏi mỗi ngày, đi từ CƠ BẢN/LẤY GỐC ở các ngày đầu tới NÂNG CAO ở các ngày cuối). Bám sát chương trình phổ thông Việt Nam, đúng thứ tự độ khó tăng dần qua các ngày. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"days":[{"day":1,"title":"tên ngắn gọn nội dung ngày 1","topics":["chủ đề 1","chủ đề 2"],"questions":[{"q":"...","type":"single","o":["A","B","C","D"],"c":0}]}]}\nMỗi ngày cần khoảng ${diff.qPerDay} câu (loại "single" 1 đáp án đúng là chủ yếu; có thể dùng "numeric" - "o":[] và "c" là chuỗi số - cho câu tính toán Toán/Lý/Hoá; dùng "multi" - "c" là MẢNG chỉ số đúng - cho câu đúng/sai nhiều ý).`;
                const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
                const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const parsed = parseAiQuizJson(rawResp);
                if (!parsed.days || parsed.days.length === 0) throw new Error('AI không tạo được lộ trình nào.');
                const rawNodes = parsed.days.map(d => ({
                    day: d.day, title: d.title || `Ngày ${d.day}`, topics: (d.topics && d.topics.length) ? d.topics : ['Tổng Quát'],
                    questions: (d.questions || []).map(q => ({ q: q.q, type: q.type || 'single', o: q.o || [], c: q.c }))
                })).filter(d => d.questions.length > 0);
                if (rawNodes.length === 0) throw new Error('AI không tạo được câu hỏi nào.');
                const nodes = [];
                for (let day = 1; day <= days; day++) {
                    const src = rawNodes[(day - 1) % rawNodes.length];
                    const isRepeatPass = day > rawNodes.length;
                    nodes.push({
                        id: `sd${day}-lesson`, day, title: isRepeatPass ? `Ôn Lại - ${src.title}` : src.title, type: isRepeatPass ? 'review' : 'lesson',
                        topics: src.topics, questions: isRepeatPass ? shuffleArray(src.questions) : src.questions,
                        status: day === 1 ? 'unlocked' : 'locked', bestScore: null, lastAttemptAt: null
                    });
                    if (diff.bossEvery > 0 && day % diff.bossEvery === 0) {
                        const bossQs = shuffleArray(nodes.flatMap(n => n.questions)).slice(0, 12);
                        nodes.push({ id: `sd${day}-boss`, day, title: `Ải Boss - Chặng ${Math.ceil(day / diff.bossEvery)}`, type: 'boss', topics: [...new Set(nodes.flatMap(n => n.topics))].slice(0, 4), questions: bossQs, status: 'locked', bestScore: null, lastAttemptAt: null });
                    }
                }
                return nodes;
            };
            // Điều phối chính: đọc lựa chọn từ Nghi Thức Khai Mở (wizard state), gọi đúng hàm sinh Đạo Đồ
            // rồi lưu thẳng vào user.examPath trên Firestore.
            const startExamPathAction = async () => {
                if (examPathWizMode === 'library' && !examPathWizLibId) { playSfx('FAIL'); return alert("Xin chọn 1 Bí Tịch đã có trong Tàng Kinh Các làm nguồn đề!"); }
                if (examPathWizMode === 'subjects' && examPathWizSubjects.length === 0) { playSfx('FAIL'); return alert("Xin chọn hoặc nhập ít nhất 1 môn học!"); }
                if (examPathWizMode === 'subjects' && !anyGeminiKey) { playSfx('FAIL'); return alert("Chế độ 'Theo Môn Học' cần AI soạn câu hỏi mới nên bắt buộc có API Key (Gemini)! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (miễn phí), hoặc chọn chế độ 'Từ Bí Tịch Có Sẵn' nếu chưa có Key."); }
                playSfx('CLICK');
                setExamPathGenerating(true);
                try {
                    let nodes, title;
                    if (examPathWizMode === 'library') {
                        const libItem = (user.library || []).find(l => String(l.id) === String(examPathWizLibId));
                        if (!libItem) throw new Error('Không tìm thấy Bí Tịch đã chọn.');
                        nodes = buildNodesFromQuestions(libItem.data, examPathWizDays, examPathWizDifficulty);
                        nodes = await tagNodeTopicsWithAI(nodes, anyGeminiKey);
                        title = `${libItem.title}`;
                    } else {
                        nodes = await generateSubjectPathWithAI(examPathWizSubjects, examPathWizDays, examPathWizDifficulty, anyGeminiKey);
                        title = examPathWizSubjects.join(' + ');
                    }
                    const examPath = { active: true, title, source: examPathWizMode, days: Number(examPathWizDays), difficulty: examPathWizDifficulty, createdAt: Date.now(), nodes };
                    await firestore.collection('users').doc(user.uid).update({ examPath });
                    playSfx('SUCCESS');
                    setExamPathTab('TREE');
                    alert(`Đã khai mở Đạo Lộ "${title}" - ${nodes.length} Ải chờ Ngài chinh phục!`);
                } catch (e) {
                    playSfx('FAIL');
                    alert("Khai mở Đạo Lộ thất bại! Chi tiết: " + shortErr(e.message));
                } finally {
                    setExamPathGenerating(false);
                }
            };
            const resetExamPathAction = async () => {
                if (!(await askConfirm("Huỷ Đạo Lộ hiện tại và khai mở lộ trình MỚI? Toàn bộ tiến độ cũ sẽ mất."))) return;
                playSfx('FAIL');
                await firestore.collection('users').doc(user.uid).update({ examPath: firebase.firestore.FieldValue.delete() });
                setExamPathTab('TREE');
            };
            // Vào 1 Ải cụ thể trong Đạo Đồ - dùng LẠI đúng luồng QUIZ/RESULT sẵn có (startFreshQuiz), chỉ
            // đánh dấu examPathActiveNodeId để continueAfterAnswer() biết đường cộng điểm/tiến độ đúng chỗ.
            const startExamPathNode = (node) => {
                if (node.status === 'locked') { playSfx('WRONG'); return alert("Ải này còn đang khoá! Hãy hoàn thành các Ải phía trước trước đã."); }
                playSfx('CLICK');
                setExamPathActiveNodeId(node.id);
                examPathNodeStartRef.current = Date.now();
                startFreshQuiz(node.questions);
            };
            // Bát Quái Đồ: xin AI viết 1 đoạn nhận xét ngắn dựa trên % thành thạo THUẦN CLIENT đã tính sẵn
            // (computeTopicMastery) - AI chỉ viết LỜI KHUYÊN, không tính lại điểm, nên luôn nhất quán.
            const getExamPathAiAdvice = async () => {
                if (!anyGeminiKey) { playSfx('FAIL'); return alert("Cần API Key (Gemini) để AI viết nhận xét! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key miễn phí."); }
                const mastery = computeTopicMastery(user.examPath);
                if (Object.keys(mastery).length === 0) { playSfx('FAIL'); return alert("Chưa có dữ liệu! Hãy hoàn thành ít nhất 1 Ải trước đã."); }
                playSfx('CLICK');
                setExamPathRadarLoading(true);
                try {
                    const prompt = `Đây là % thành thạo của 1 học sinh theo từng chủ đề (0-100): ${JSON.stringify(mastery)}. Hãy viết 1 đoạn NHẬN XÉT NGẮN (khoảng 3-4 câu, tiếng Việt, giọng khích lệ như một vị Sư Phụ trong truyện tu tiên) chỉ ra chủ đề đang YẾU NHẤT cần ôn thêm và chủ đề đã VỮNG nhất, kèm 1 lời khuyên hành động cụ thể tiếp theo. KHÔNG dùng markdown, chỉ trả về đoạn văn thuần.`;
                    const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    setExamPathRadarAdvice(text.trim() || 'Chưa nhận được nhận xét, thử lại sau nhé.');
                } catch (e) {
                    alert("Lỗi xin nhận xét AI: " + shortErr(e.message));
                } finally {
                    setExamPathRadarLoading(false);
                }
            };
            // 🏅 Chọn/gỡ danh hiệu Phong Thái Đạo Hữu đã nhận được (giống hệt cơ chế Khung Tên ở SHOP)
            const setExamPathActiveTitle = (titleId) => { playSfx('CLICK'); syncUserData({ examPathActiveTitle: titleId }); };

            // ============================================================
            // 🆕 CHỈNH SỬA ẢI: mở/sửa/lưu 1 Bí Tịch đã có trong Tàng Kinh Các.
            // Lý do thêm: trước đây nếu 1 câu hỏi bị lỗi (thiếu ảnh sơ đồ, sai đáp án, nhập nhầm...) thì
            // không có cách nào sửa lại ngoài xoá cả bộ và tạo lại từ đầu.
            // ============================================================

            // Mở màn hình sửa cho 1 Bí Tịch trong thư viện
            const openLibraryEditor = (item) => {
                playSfx('CLICK');
                setEditingLibItem(item);
                setEditDraftTitle(item.title);
                // deep-clone để không sửa trực tiếp lên state gốc trước khi bấm Lưu
                setEditDraftQuestions(JSON.parse(JSON.stringify(item.data || [])));
                setEditQIndex(null); setEditQDraft(null); setEditAppendText('');
                changeAppState('QUIZ_EDIT');
            };

            // Mở form sửa 1 câu hỏi cụ thể (index số hoặc 'new' để thêm câu mới)
            const startEditQuestion = (index) => {
                playSfx('CLICK');
                if (index === 'new') {
                    setEditQDraft({ q: '', type: 'single', o: ['', '', '', ''], c: 0, img: '' });
                } else {
                    const src = editDraftQuestions[index];
                    setEditQDraft(JSON.parse(JSON.stringify(src)));
                }
                setEditQIndex(index);
            };

            const cancelEditQuestion = () => { setEditQIndex(null); setEditQDraft(null); };

            // 🆕 Đổi kiểu câu hỏi trong form sửa (chuẩn hoá lại o/c cho phù hợp kiểu mới)
            const switchEditQType = (newType) => {
                setEditQDraft(prev => {
                    if (!prev) return prev;
                    if (newType === 'single') {
                        let o = (prev.o || []).slice(0, 4); while (o.length < 4) o.push('');
                        return { ...prev, type: 'single', o, c: typeof prev.c === 'number' ? prev.c : 0 };
                    }
                    if (newType === 'multi') {
                        let o = (prev.o || []).slice(0, 6); while (o.length < 4) o.push('');
                        return { ...prev, type: 'multi', o, c: Array.isArray(prev.c) ? prev.c : [] };
                    }
                    return { ...prev, type: 'numeric', o: [], c: typeof prev.c === 'string' ? prev.c : '' };
                });
            };

            // Lưu câu hỏi đang sửa trong form con vào mảng nháp editDraftQuestions (chưa ghi lên Firestore)
            const saveEditQuestionDraft = () => {
                if (!editQDraft) return;
                const q = { ...editQDraft, q: (editQDraft.q || '').trim() };
                if (!q.q) return alert("Xin hãy nhập nội dung câu hỏi!");
                if (q.type === 'single') {
                    q.o = (q.o || []).map(x => (x || '').trim()).filter(Boolean);
                    if (q.o.length < 2) return alert("Câu 1 đáp án cần ít nhất 2 lựa chọn!");
                    if (q.c >= q.o.length) q.c = 0;
                } else if (q.type === 'multi') {
                    const trimmed = (q.o || []).map(x => (x || '').trim());
                    const keepIdx = trimmed.map((x,i)=>x?i:-1).filter(i=>i!==-1);
                    if (keepIdx.length < 2) return alert("Câu Đúng/Sai nhiều ý cần ít nhất 2 ý!");
                    const oldCorrect = Array.isArray(q.c) ? q.c : [];
                    q.o = keepIdx.map(i => trimmed[i]);
                    q.c = keepIdx.map((oldI, newI) => oldCorrect.includes(oldI) ? newI : -1).filter(i => i !== -1);
                } else if (q.type === 'numeric') {
                    q.o = [];
                    if (q.c === '' || q.c === null || q.c === undefined || isNaN(parseFloat(String(q.c).replace(',', '.')))) return alert("Xin hãy nhập đáp án số hợp lệ!");
                    q.c = String(q.c).trim();
                }
                setEditDraftQuestions(prev => {
                    const arr = [...prev];
                    if (editQIndex === 'new') arr.push(q); else arr[editQIndex] = q;
                    return arr;
                });
                setEditQIndex(null); setEditQDraft(null);
            };

            const deleteEditQuestionAt = async (index) => {
                if (!(await askConfirm("Bạn xóa câu hỏi này?"))) return;
                setEditDraftQuestions(prev => prev.filter((_, i) => i !== index));
            };

            // 🆕 Dán thêm văn bản câu hỏi mới (định dạng "Câu.../A./Đáp án:") để nối thêm vào ải đang sửa
            const appendTextToEditAction = () => {
                const added = parseRawQuizText(editAppendText);
                if (added.length === 0) return alert("Không tìm thấy câu hỏi hợp lệ nào trong đoạn văn bản vừa dán!");
                setEditDraftQuestions(prev => [...prev, ...added]);
                setEditAppendText('');
                playSfx('SUCCESS');
                alert(`Đã thêm ${added.length} câu hỏi mới! Đừng quên bấm LƯU THAY ĐỔI ở cuối trang.`);
            };

            // 🆕 Tải ảnh minh hoạ (sơ đồ, đồ thị...) lên cho câu hỏi đang sửa trong form con
            const handleEditQImageUpload = async (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (!/^image\//.test(file.type)) { alert("Chỉ nhận file ảnh!"); e.target.value = ''; return; }
                setEditQImgUploading(true);
                try {
                    const dataUrl = await compressImageFile(file);
                    setEditQDraft(prev => ({ ...prev, img: dataUrl }));
                } catch (err) {
                    alert("Tải ảnh thất bại: " + (err.message || 'lỗi không rõ'));
                } finally {
                    setEditQImgUploading(false); e.target.value = '';
                }
            };

            // Lưu toàn bộ thay đổi (tên + danh sách câu hỏi) của Bí Tịch đang sửa vào Firestore
            const saveLibraryEditAction = async () => {
                if (!editDraftTitle.trim()) return alert("Xin hãy nhập tên Bí Tịch!");
                if (editDraftQuestions.length === 0) return alert("Bí Tịch cần ít nhất 1 câu hỏi!");
                setEditQuizSaving(true);
                try {
                    const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: editDraftTitle.trim(), d: editDraftQuestions }));
                    const newItem = { id: editingLibItem.id, title: editDraftTitle.trim(), data: editDraftQuestions, code: compressedCode };
                    const newLibrary = (user.library || []).map(x => x.id === editingLibItem.id ? newItem : x);
                    await firestore.collection('users').doc(user.uid).update({ library: newLibrary });
                    playSfx('SUCCESS'); alert("Đã lưu thay đổi cho Bí Tịch!");
                    setEditingLibItem(null); changeAppState('DASHBOARD');
                } catch (err) {
                    alert("Lưu thất bại! " + (err.message || 'Lỗi không rõ'));
                } finally {
                    setEditQuizSaving(false);
                }
            };

            // 🆕 THOÁT CHỈNH SỬA: nếu có thay đổi chưa lưu -> hỏi LƯU / HỦY thay đổi (hủy = giữ nguyên như lúc chưa sửa)
            const exitLibraryEditor = async () => {
                if (editQDraft) {
                    if (!(await askConfirm("Câu hỏi đang sửa chưa lưu. Bỏ thay đổi của câu này và thoát?"))) return;
                    cancelEditQuestion();
                }
                const orig = editingLibItem || {};
                const dirty = editDraftTitle !== orig.title || JSON.stringify(editDraftQuestions) !== JSON.stringify(orig.data || []);
                if (dirty) {
                    const choice = await window.askChoice("Bạn có thay đổi chưa lưu. Muốn lưu hay hủy thay đổi?\n(Hủy: các câu hỏi trở về như lúc chưa chỉnh sửa)");
                    if (choice === 'stay') return;
                    if (choice === 'save') { await saveLibraryEditAction(); return; }
                    setEditDraftTitle(orig.title || ''); setEditDraftQuestions(JSON.parse(JSON.stringify(orig.data || [])));
                }
                setEditingLibItem(null); changeAppState('DASHBOARD');
            };

            const buyItemAction = async (price, itemId, currencyType = 'spirit', category = 'other') => {
                const todayDateStr = getVNSourceDate(new Date());
                let dailyRecord = user.dailyPurchases || { date: todayDateStr, count: 0, x2: 0 };
                if (dailyRecord.date !== todayDateStr) { dailyRecord = { date: todayDateStr, count: 0, x2: 0 }; }
                if (itemId === 'x2_card') { if ((dailyRecord.x2 || 0) >= 2) return alert("Đã đổi tối đa 2 Bùa Nhân Đôi hôm nay! Khí huyết hao tổn, mai hãy quay lại."); }
                if ((user[currencyType] || 0) < price) { return alert(`Thiếu ${currencyType === 'spirit' ? 'Linh Thạch' : 'Danh Vọng'}!`); }
                playSfx('SUCCESS');
                if (itemId === 'x2_card') dailyRecord.x2 = (dailyRecord.x2 || 0) + 1; else if (category === 'tran_bao') dailyRecord.count += 1;
                await firestore.collection('users').doc(user.uid).update({ [currencyType]: firebase.firestore.FieldValue.increment(-price), inventory: firebase.firestore.FieldValue.arrayUnion(itemId), dailyPurchases: dailyRecord });
            };

            // 🆕 KÍCH HOẠT BÙA NHÂN ĐÔI (bản mới): trước đây thẻ x2_card bị tiêu ÂM THẦM ngay tại thời điểm
            // nhận thưởng của lượt Vượt Ải/Lưu Video KẾ TIẾP - không có bước "kích hoạt" nào cả, người chơi
            // không chủ động chọn được LÚC NÀO nhân đôi phát huy tác dụng. Nay đổi thành: bấm nút "Kích Hoạt"
            // ngay trong Pháp Bảo Các -> tiêu 1 thẻ trong túi đồ NGAY LÚC BẤM, đổi lại 2 GIỜ hiệu lực nhân đôi
            // áp dụng cho MỌI lượt Vượt Ải/Lưu Bài Học Video trong 2 giờ đó (xem x2BoostExpiresAt được đọc ở
            // continueAfterAnswer/saveVideoNoteAction/nextVideoQuizRound). Giới hạn 2 thẻ/ngày vẫn giữ nguyên
            // ở buyItemAction phía trên - đây chỉ là bước TIÊU thẻ đã mua, không mua thêm.
            const activateX2BoostAction = async () => {
                if (!user) return;
                const now = Date.now();
                if (user.x2BoostExpiresAt && now < user.x2BoostExpiresAt) { playSfx('WRONG'); return alert("Bùa Nhân Đôi đang có hiệu lực rồi, không thể kích hoạt chồng thêm lượt nữa!"); }
                const idx = (user.inventory || []).indexOf('x2_card');
                if (idx === -1) { playSfx('WRONG'); return alert("Ngài chưa sở hữu Bùa Nhân Đôi nào! Hãy đổi ở Pháp Bảo Các trước."); }
                const newInventory = [...user.inventory]; newInventory.splice(idx, 1);
                try {
                    await firestore.collection('users').doc(user.uid).update({ inventory: newInventory, x2BoostExpiresAt: now + (2 * 60 * 60 * 1000) });
                    playSfx('VICTORY');
                    alert("🧧 Đã kích hoạt Bùa Nhân Đôi! Linh Thạch nhận được từ Vượt Ải & Lưu Bài Học Video sẽ được NHÂN ĐÔI trong 2 giờ tới.");
                } catch (e) { alert("Kích hoạt thất bại! Mất kết nối mạng, thử lại sau."); }
            };

            // 🔒 KHÓA BẬC ĐỘT PHÁ: chỉ được đột phá TUẦN TỰ từng cảnh giới kế tiếp, không cho nhảy cóc dù
            // đủ Linh Thạch/Danh Vọng cho cảnh giới cao hơn (trước đây có thể mua thẳng cảnh giới bất kỳ).
            const breakthroughRankAction = async (rankObj) => {
                const currentRank = RANKS.find(r => r.id === user.rank) || RANKS[0];
                if (rankObj.level <= currentRank.level) return alert("Ngài đã vượt qua cảnh giới này rồi!");
                if (rankObj.level !== currentRank.level + 1) {
                    const nextRank = RANKS.find(r => r.level === currentRank.level + 1);
                    return alert(`Phải đột phá TUẦN TỰ từng cảnh giới! Cảnh giới tiếp theo của Ngài là [${nextRank ? nextRank.name : '???'}].`);
                }
                if (rankObj.price && user.spirit < rankObj.price) return alert("Thiếu Linh Thạch để đột phá!");
                if (rankObj.reqFame && user.fame < rankObj.reqFame) return alert("Thiếu Danh Vọng để độ kiếp!");
                playSfx('SUCCESS'); 
                await firestore.collection('users').doc(user.uid).update({ spirit: firebase.firestore.FieldValue.increment(-rankObj.price), fame: firebase.firestore.FieldValue.increment(-rankObj.reqFame + 100), rank: rankObj.id }); 
                alert(`Đột phá [${rankObj.name}] thành công! Thiên địa chấn động! Từ nay Linh Thạch kiếm được +${rankObj.bonusPercent}% vĩnh viễn.`);
            };

            // 🏆 BXH tổng theo Season Score, KHÔNG phụ thuộc tab đang chọn ở màn Thiên Bảng (sửa lỗi cũ:
            // bảng TOP 5 ở màn Kết Quả từng bị trống trơn nếu lần trước ngài xem tab DANH VỌNG/ĐẠO HỮU).
            // Dùng chung cho mọi màn "kết quả sau khi học": Vượt Ải, Ôn Tập Từ Vựng Video, Lưu Bài Video.
            const topSeasonList = useMemo(() => [...allUsers].sort((a,b) => (b.seasonScore || 0) - (a.seasonScore || 0)), [allUsers]);

            const leaderboardRenderList = useMemo(() => {
                let sortedList = [...allUsers].sort((a,b) => (b.seasonScore || 0) - (a.seasonScore || 0));
                if (leaderboardTab === 'FRIENDS' && user) { sortedList = sortedList.filter(p => user.friends?.includes(p.uid) || p.uid === user.uid); }
                else if (leaderboardTab === 'FAME') { sortedList = [...allUsers].sort((a,b) => (b.fame || 0) - (a.fame || 0)); }
                return sortedList;
            }, [allUsers, leaderboardTab, user]);

            const guildLeaderboardRenderList = useMemo(() => {
                return Object.values(allGuilds).sort((a,b) => { if (b.level !== a.level) return b.level - a.level; return (b.exp || 0) - (a.exp || 0); });
            }, [allGuilds]);
            // 🗺️ Đạo Hữu Bảng (Tu Luyện Chi Lộ): xếp theo "thời gian luyện thi" tích luỹ hôm nay (phút),
            // chỉ tính người có điểm > 0 để bảng không rợp toàn số 0.
            const examPathBoardList = useMemo(() => [...allUsers].filter(u => (u.examPathDailyScore || 0) > 0).sort((a, b) => (b.examPathDailyScore || 0) - (a.examPathDailyScore || 0)), [allUsers]);
            const examPathTopicMastery = useMemo(() => computeTopicMastery(user?.examPath), [user?.examPath]);
            // === GIAO DIỆN (JSX) BẮT ĐẦU TỪ ĐÂY ===
            if (appState === 'LOADING') {
                return (
                    <div className="h-full flex flex-col items-center justify-center bg-black animate-fadeIn relative">
                        <div className="absolute inset-0 bg-[url('https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif')] bg-cover bg-center opacity-30"></div>
                        <div className="relative z-10 w-full max-w-xs px-6 text-center">
                            <h1 className="text-4xl font-black text-yellow-500 font-playfair italic mb-8 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] tracking-widest">THIÊN KIÊU</h1>
                            <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-3 drop-shadow-[0_0_5px_#00ffff]">Dung Hợp Nguyên Thần... {loadProgress}%</p>
                            <div className="w-full bg-zinc-900 h-2 border border-zinc-700 overflow-hidden rounded-full shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                                <div className="bg-gradient-to-r from-cyan-700 to-cyan-300 h-full transition-all duration-300 ease-out" style={{ width: `${loadProgress}%` }}></div>
                            </div>
                            <p className="text-zinc-600 text-[8px] italic mt-4">Thiên Đạo đang vận chuyển linh khí, xin kiên nhẫn...</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className={`w-full h-full flex flex-col items-center relative bg-black overflow-hidden animate-fadeIn ${user?.appTheme || ''}`} style={{ backgroundImage: user?.bgImage ? `url(${user.bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    {user?.bgImage && <div className="absolute inset-0 bg-black/90 z-0"></div>}

                    {/* MODAL NHẬN QUÀ SỰ KIỆN MÙA GIẢI */}
                    {seasonRewardModal && (
                        <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-zinc-900 border-2 border-cyan-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(6,182,212,0.3)]">
                                <h3 className="text-2xl font-black text-cyan-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#00ffff]">Tổng Kết Mùa Giải</h3>
                                <p className="text-zinc-300 text-[11px] mb-6 italic">Chúc mừng! Ngài đã xuất sắc lọt TOP {seasonRewardModal.rank} Thiên Bảng mùa trước!</p>
                                <div className="flex justify-center items-center gap-6 mb-6 bg-black/50 p-4 border border-cyan-900/50">
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl mb-2">💎</span>
                                        <span className="text-cyan-400 font-black text-xl">+{seasonRewardModal.s}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl mb-2">⭐</span>
                                        <span className="text-yellow-500 font-black text-xl">+{seasonRewardModal.f}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSeasonRewardModal(null)} className="w-full bg-cyan-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">LÃNH THƯỞNG</button>
                            </div>
                        </div>
                    )}

                    {/* 🗺️ TỔNG KẾT ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ) - hiện khi vừa chốt hạng Top 3 ngày hôm qua,
                        y hệt cơ chế seasonRewardModal ở trên nhưng thưởng là 1 Danh Hiệu Phong Thái (miễn phí). */}
                    {examPathRewardModal && (
                        <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-zinc-900 border-2 border-emerald-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                                <h3 className="text-2xl font-black text-emerald-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#10b981]">Tổng Kết Đạo Hữu Bảng</h3>
                                <p className="text-zinc-300 text-[11px] mb-6 italic">Chúc mừng! Ngài đã lọt TOP {examPathRewardModal.rank} Đạo Hữu Bảng hôm qua, nhận được danh hiệu:</p>
                                <div className="flex justify-center items-center mb-6 bg-black/50 p-4 border border-emerald-900/50">
                                    <span className="text-lg mb-1">🏅</span>
                                    <span className="text-emerald-300 font-black text-sm ml-2">{examPathRewardModal.titleName}</span>
                                </div>
                                <button onClick={() => setExamPathRewardModal(null)} className="w-full bg-emerald-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">LÃNH DANH HIỆU</button>
                            </div>
                        </div>
                    )}
                    {showVictoryFx && <ConfettiBurst />}
                    {/* 🆕 MODAL TỔNG KẾT ĐẠO LỘ HOÀN THÀNH: đứng riêng, ở lại tới khi người dùng tự bấm
                        "TIẾP TỤC" - khắc phục cảm giác "đoạn kết cụt lủn" trước đây (chỉ có 4s pháo hoa). */}
                    {examPathFinaleInfo && (
                        <div className="absolute inset-0 bg-black/95 z-[310] flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-zinc-900 border-2 border-yellow-500 p-6 w-full max-w-sm text-center shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                                <span className="text-5xl block mb-3">🏆</span>
                                <h3 className="text-2xl font-black text-yellow-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_6px_#eab308]">Hoàn Thành Đạo Lộ!</h3>
                                <p className="text-zinc-300 text-[11px] mb-1 italic">Ngài đã chinh phục trọn vẹn Đạo Lộ:</p>
                                <p className="text-white text-sm font-black mb-4">"{examPathFinaleInfo.title}"</p>
                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <div className="bg-black/50 border border-yellow-900/50 p-3"><span className="block text-lg font-black text-yellow-300">{examPathFinaleInfo.totalNodes}</span><span className="text-[8px] text-zinc-500 uppercase">Ải Đã Vượt</span></div>
                                    <div className="bg-black/50 border border-yellow-900/50 p-3"><span className="block text-lg font-black text-yellow-300">{examPathFinaleInfo.days}</span><span className="text-[8px] text-zinc-500 uppercase">Ngày Lộ Trình</span></div>
                                </div>
                                <p className="text-zinc-500 text-[9px] mb-4 italic">Hãy khai mở 1 Đạo Lộ mới ở tab ĐẠO ĐỒ để tiếp tục tu luyện, hoặc xem Bát Quái Đồ để biết điểm mạnh/yếu của mình!</p>
                                <button onClick={() => setExamPathFinaleInfo(null)} className="w-full bg-yellow-600 text-black py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">TIẾP TỤC</button>
                            </div>
                        </div>
                    )}


                    {videoSaveReward && (
                        <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-zinc-900 border-2 border-cyan-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(6,182,212,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <h3 className="text-2xl font-black text-cyan-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#00ffff]">Đã Lưu Bí Tịch Video!</h3>
                                <p className="text-zinc-400 text-[11px] mb-6 italic">{videoSaveReward.alreadySaved ? 'Bài học này đã lưu từ trước, không nhận thêm Linh Thạch.' : 'Bài học mới đã nhập vào Tàng Kinh Các!'}</p>
                                <div className="bg-black border border-zinc-800 p-4 mb-2 relative mt-2 shadow-inner">
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                                    <div className="flex justify-center items-center pt-3">
                                        <div className="flex flex-col items-center"><span className="text-3xl mb-2">💎</span><span className="text-xl font-black text-white drop-shadow-[0_0_2px_#fff]">{videoSaveReward.stones > 0 ? `+${videoSaveReward.stones}` : 0}</span></div>
                                    </div>
                                </div>
                                <MiniLeaderboard list={topSeasonList} currentUser={user} />
                                <button onClick={() => setVideoSaveReward(null)} className="w-full mt-6 bg-cyan-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">TIẾP TỤC</button>
                            </div>
                        </div>
                    )}

                    {/* MODAL SOI TÔNG MÔN */}
                    {viewGuildModal && (
                        <div className="absolute inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-fadeIn">
                            <div className={`bg-zinc-900 border border-yellow-500 p-6 w-full max-w-sm text-center shadow-[0_0_30px_rgba(234,179,8,0.2)] ${viewGuildModal.theme||''} ${viewGuildModal.aura||''}`}>
                                <h3 className={`text-2xl font-black uppercase mb-1 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] ${viewGuildModal.frame ? 'frame-'+viewGuildModal.frame : ''} inline-block px-4 py-2`} style={{ color: viewGuildModal.color || '#eab308' }}>
                                    {viewGuildModal.beast ? viewGuildModal.beast + ' ' : ''}{viewGuildModal.name}
                                </h3>
                                <p className="text-[10px] text-zinc-400 font-bold mb-4 tracking-widest mt-2 uppercase">Thế Lực Cấp {viewGuildModal.level}</p>
                                <div className="bg-black border border-zinc-700 p-3 mb-4 text-left">
                                    <p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">Cáo Thị Tông Môn:</p>
                                    <p className="text-[11px] text-zinc-300 italic font-playfair">{viewGuildModal.notice || "Chưa có thông báo nào."}</p>
                                </div>
                                <div className="bg-black border border-zinc-700 p-3 mb-4 text-left max-h-40 overflow-y-auto custom-scrollbar">
                                    <p className="text-[9px] text-cyan-400 font-black mb-2 uppercase">Môn Đồ ({viewGuildModal.members.length}/{viewGuildModal.level*5}):</p>
                                    {viewGuildModal.members.map(uid => {
                                        const mData = allUsers.find(x => x.uid === uid || x.name === uid) || { name: uid };
                                        const isLeader = (uid === viewGuildModal.leader || mData.name === viewGuildModal.leader);
                                        return (
                                            <div key={uid} className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => { setViewingUser(mData); changeAppState('VIEW_PROFILE'); setViewGuildModal(null); }}>
                                                <UserName u={mData} cls="text-[10px]" />
                                                {isLeader && <span className="text-[8px] text-yellow-500 bg-yellow-900/30 px-1 border border-yellow-700">Bang Chủ</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                                <button onClick={() => setViewGuildModal(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white py-3 text-[10px] font-black uppercase transition-colors border border-zinc-700">Đóng Lại</button>
                            </div>
                        </div>
                    )}

                    {/* MODAL ĐỔI MẬT KHẨU */}
                    {pwdModal.show && (
                        <div className="absolute inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-zinc-900 border border-red-500 p-6 w-full max-w-sm text-center shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                                <h3 className="text-red-500 font-black text-lg mb-2 uppercase tracking-widest">Đổi Mật Mã Phong Ấn</h3>
                                {(auth.currentUser?.providerData || []).some(p => p.providerId === 'password') && (
                                    <input type="password" className="w-full bg-black border border-red-900 p-3 text-sm text-white mb-2 outline-none focus:border-red-500 transition-colors text-center" placeholder="Mật mã CŨ..." value={pwdModal.oldVal} onChange={e => setPwdModal({...pwdModal, oldVal: e.target.value})} />
                                )}
                                <input type="password" className="w-full bg-black border border-red-900 p-3 text-sm text-white mb-1 outline-none focus:border-red-500 transition-colors text-center" placeholder="Gõ mật mã mới..." value={pwdModal.val} onChange={e => setPwdModal({...pwdModal, val: e.target.value})} />
                                <p className="text-[9px] text-cyan-500 mt-2 mb-4 cursor-pointer font-bold hover:text-cyan-300" onClick={forgotPasswordFromProfile}>Quên Mật Mã Cũ? Gửi Liên Kết Qua Email</p>
                                <div className="flex gap-2">
                                    <button onClick={confirmChangePassword} className="flex-1 bg-red-900 text-white py-3 text-[10px] font-black uppercase hover:bg-red-700">XÁC NHẬN</button>
                                    <button onClick={() => setPwdModal({show: false, val: '', oldVal: ''})} className="flex-1 bg-zinc-800 text-zinc-400 py-3 text-[10px] font-black uppercase">HỦY BỎ</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HỘP THƯ */}
                    {appState === 'MAIL' && user && (
                        <div className="w-full max-w-sm h-[85vh] bg-zinc-900 border border-yellow-700/50 p-5 flex flex-col shadow-2xl animate-fadeIn mt-[10vh] mx-auto z-[60]">
                            <h2 className="text-yellow-500 font-black text-center text-xl italic mb-4 font-playfair border-b border-yellow-700/30 pb-3">Bồ Câu Truyền Tin</h2>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {!user.requests || user.requests.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 text-center italic mt-10">Khí tức bình yên, không có thư từ nào.</p>
                                ) : user.requests.map(req => (
                                    <div key={req.id} className="bg-black border border-zinc-700 p-3 shadow-md hover:border-yellow-600/50 transition-colors">
                                        {req.type === 'friend' && (
                                            <>
                                                <p className="text-[11px] text-zinc-300 mb-3 leading-relaxed"><span className="text-yellow-400 font-bold cursor-pointer hover:text-white hover:underline decoration-yellow-600" onClick={() => { playSfx('CLICK'); const senderData = allUsers.find(u => u.uid === req.fromUid); if (senderData) { setViewingUser(senderData); changeAppState('VIEW_PROFILE'); } else { alert("Đạo hữu đã quy ẩn!"); } }}>[{req.fromName}]</span> muốn kết duyên Đạo hữu cùng ngài.</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => acceptFriendReq(req)} className="flex-1 bg-green-800 text-green-200 py-2 text-[10px] font-black uppercase hover:bg-green-600 border border-green-600">Chấp Nhận</button>
                                                    <button onClick={() => rejectReq(req.id)} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-[10px] font-black uppercase hover:bg-red-900 hover:text-red-200 border border-zinc-700">Từ Chối</button>
                                                </div>
                                            </>
                                        )}
                                        {req.type === 'guild' && (
                                            <>
                                                <p className="text-[11px] text-zinc-300 mb-3 leading-relaxed"><span className="text-yellow-400 font-bold cursor-pointer hover:text-white hover:underline decoration-yellow-600" onClick={() => { playSfx('CLICK'); const senderData = allUsers.find(u => u.uid === req.fromUid); if (senderData) { setViewingUser(senderData); changeAppState('VIEW_PROFILE'); } else { alert("Đạo hữu đã quy ẩn!"); } }}>[{req.fromName}]</span> mời ngài quy thuận Tông môn <span className="text-cyan-400 font-black">[{req.guildName}]</span>.</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => acceptGuildReq(req)} className="flex-1 bg-cyan-800 text-cyan-200 py-2 text-[10px] font-black uppercase hover:bg-cyan-600 border border-cyan-600">Quy Phục</button>
                                                    <button onClick={() => rejectReq(req.id)} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-[10px] font-black uppercase hover:bg-red-900 hover:text-red-200 border border-zinc-700">Từ Chối</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-4 text-[11px] font-black text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors uppercase tracking-widest">ĐÓNG HỘP THƯ</button>
                        </div>
                    )}

                    {/* TOP BAR */}
                    {user && appState !== 'LOGIN' && appState !== 'QUIZ' && appState !== 'MAIL' && (
                        <div className={`safe-top absolute top-0 inset-x-0 max-w-lg mx-auto h-16 bg-zinc-950 border-b-2 flex items-center justify-between px-3 z-50 transition-all duration-300 ${user.aura ? user.aura : 'border-yellow-700/40 shadow-[0_0_15px_rgba(184,134,11,0.2)]'}`}>
                            {appState !== 'DASHBOARD' ? (
                                <button onClick={()=>{ playSfx('CLICK'); setVideoResult(null); changeAppState('DASHBOARD'); }} className="flex items-center gap-2 text-zinc-300 hover:text-white pr-2 shrink-0" title="Quay lại Bí Cảnh">
                                    <span className="text-2xl leading-none">←</span>
                                </button>
                            ) : (
                            <div className="flex items-center gap-2 cursor-pointer" onClick={()=>{ setProfileImage(user.photo); setProfileBg(user.bgImage||''); setProfileBio(user.bio||''); setNewName(''); changeAppState('PROFILE'); }}>
                                <img src={user.photo} className={`w-10 h-10 object-cover ${user.frame ? 'frame-'+user.frame : 'border-2 border-yellow-500'}`} alt="avatar" />
                                <div className="leading-tight">
                                    <UserName u={latestUser.current} cls="text-[12px] tracking-wide" />
                                    <div className="text-[10px] streak-fire font-black mt-1">🔥 {user.streakCount||0}</div>
                                </div>
                            </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="text-right text-[10px] font-black mr-1 leading-tight">
                                    <span className="text-cyan-400 drop-shadow-[0_0_2px_#00ffff]" title={(user.spirit||0).toLocaleString('vi-VN')}>💎 {formatNumber(user.spirit)}</span><br/>
                                    <span className="text-yellow-500 drop-shadow-[0_0_2px_#eab308]" title={(user.fame||0).toLocaleString('vi-VN')}>⭐ {formatNumber(user.fame)}</span>
                                </div>
                                <div className="relative">
                                    <button onClick={()=>{ playSfx('CLICK'); changeAppState('MAIL'); }} className="text-xl hover:scale-110">✉️</button>
                                    {user.requests && user.requests.length > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_5px_red]">{user.requests.length}</span>}
                                </div>
                                {/* SỬA LỖI GIAO DIỆN RỐI/TRÀN HÀNG: gom các nút chức năng ít dùng (Tông Môn, Cửa
                                    Hàng, Nhạc, Âm thanh) vào 1 nút ☰ duy nhất thay vì xếp hàng ngang dễ tràn/chồng
                                    lên thanh tên khi màn hình nhỏ hoặc thêm icon mới. */}
                                <div className="relative">
                                    <button onClick={()=>{ playSfx('CLICK'); setShowMenuPanel(v=>!v); }} className="text-xl hover:scale-110">☰</button>
                                    {/* 🆕 SỬA LỖI ÂM THANH: trước đây dấu "!" chỉ báo lỗi riêng nhạc nền (BGM), khiến
                                        người dùng không biết các hiệu ứng CLICK/CORRECT/WRONG... cũng đang lỗi. Giờ
                                        báo hễ CÒN 1 hiệu ứng bất kỳ bị lỗi là hiện dấu "!", bấm vào 🎵 Tiên Âm để
                                        thấy nút "Tải Lại Âm Thanh" sửa nhanh. */}
                                    {!isMuted && Object.values(audioErrors).some(Boolean) && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-black px-1 rounded-full animate-pulse shadow-[0_0_5px_red]">!</span>}
                                </div>
                            </div>

                            {/* 🆕 SỬA LỖI KHUNG MÁY TÍNH: đổi "fixed" (neo theo góc MÀN HÌNH thật) thành "absolute"
                                và ĐẶT VÀO BÊN TRONG thanh top bar (đã giới hạn max-w-lg) để 2 bảng này luôn bám
                                sát đúng vị trí nút ☰/nhạc bên dưới, thay vì bay lạc ra góc phải màn hình rộng
                                trên máy tính trong khi nội dung app lại nằm co cụm ở giữa. */}
                            {showMenuPanel && (
                                <div className="safe-top absolute top-16 right-2 z-[70] w-48 bg-zinc-950 border-2 border-yellow-700 shadow-[0_0_20px_rgba(184,134,11,0.3)] p-2 space-y-1 animate-fadeIn">
                                    <button onClick={()=>{ setShowMenuPanel(false); changeAppState('GUILD'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🏯</span> Tông Môn</button>
                                    <button onClick={()=>{ setShowMenuPanel(false); changeAppState('EXAM_PATH'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🗺️</span> Tu Luyện Chi Lộ</button>
                                    <button onClick={()=>{ setShowMenuPanel(false); changeAppState('SHOP'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🛍️</span> Cửa Hàng</button>
                                    <button onClick={()=>{ playSfx('CLICK'); setShowMenuPanel(false); setShowMusicPanel(true); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🎵</span> Tiên Âm</button>
                                    <button onClick={()=>{ setShowMenuPanel(false); toggleMute(); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">{isMuted ? '🔇' : '🔊'}</span> {isMuted ? 'Bật Âm Thanh' : 'Tắt Âm Thanh'}</button>
                                </div>
                            )}
                            {/* 🎵 TAB NHỎ DANH SÁCH PHÁT TIÊN ÂM: phát/tạm dừng, bài trước/sau, trộn bài, tua bài, tải thêm nhạc */}
                            {showMusicPanel && (
                                <div className="safe-top absolute top-16 right-2 z-[70] w-64 bg-zinc-950 border-2 border-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.3)] p-3 space-y-2 animate-fadeIn">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">🎵 Danh Sách Phát</p>
                                        <button onClick={()=>setShowMusicPanel(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
                                    </div>
                                    <p className="text-[10px] text-white font-bold truncate">{bgmPlaylist[bgmTrackIndex]?.name || '---'}</p>
                                    <input type="range" className="w-full accent-cyan-500" min="0" max={bgmDuration || 0} step="0.1" value={Math.min(bgmCurrentTime, bgmDuration || 0)} onChange={e=>seekBgm(Number(e.target.value))} />
                                    <div className="flex justify-between text-[8px] text-zinc-500 font-bold -mt-1">
                                        <span>{Math.floor(bgmCurrentTime/60)}:{String(Math.floor(bgmCurrentTime%60)).padStart(2,'0')}</span>
                                        <span>{Math.floor((bgmDuration||0)/60)}:{String(Math.floor((bgmDuration||0)%60)).padStart(2,'0')}</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 pt-1">
                                        <button onClick={toggleBgmShuffle} className={`text-lg ${bgmShuffle ? 'text-cyan-400' : 'text-zinc-600'}`} title="Trộn bài">🔀</button>
                                        <button onClick={bgmPrev} className="text-xl text-white hover:text-cyan-400" title="Bài trước">⏮</button>
                                        <button onClick={toggleMute} className="text-2xl text-white hover:text-cyan-400" title="Phát/Tạm dừng">{isMuted ? '▶️' : '⏸️'}</button>
                                        <button onClick={bgmNext} className="text-xl text-white hover:text-cyan-400" title="Bài tiếp">⏭</button>
                                    </div>
                                    {bgmPlaylist.length > 1 && (
                                        <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 border-t border-zinc-800 pt-2">
                                            {bgmPlaylist.map((t, i) => (
                                                <p key={t.id} onClick={()=>playBgmTrackAt(i)} className={`text-[9px] truncate cursor-pointer px-1 py-0.5 ${i===bgmTrackIndex ? 'text-cyan-400 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}>{i===bgmTrackIndex ? '▶ ' : ''}{t.name}</p>
                                            ))}
                                        </div>
                                    )}
                                    <label className="w-full block text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[9px] font-black uppercase cursor-pointer border border-zinc-700">+ Tải Thêm Tiên Âm<input type="file" accept="audio/*" multiple className="hidden" onChange={handleBgmUpload} /></label>
                                    {/* 🆕 SỬA LỖI "ÂM THANH VẪN BỊ LỖI": nút tải lại toàn bộ + danh sách từng hiệu
                                        ứng cho phép thay file riêng khi 1 URL mixkit cụ thể bị chặn/lỗi mạng. */}
                                    <div className="border-t border-zinc-800 pt-2 space-y-1">
                                        <button onClick={reloadAllSfx} className="w-full text-center bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 py-2 text-[9px] font-black uppercase border border-cyan-700">🔄 Tải Lại Âm Thanh</button>
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase pt-1">Hiệu ứng riêng lẻ:</p>
                                        <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1">
                                            {Object.keys(AUDIO_URLS).filter(k => k !== 'BGM').map(k => (
                                                <div key={k} className="flex items-center justify-between gap-2">
                                                    <span className={`text-[9px] font-bold flex-1 ${audioErrors[k] ? 'text-red-500' : 'text-zinc-400'}`}>{audioErrors[k] ? '⚠️ ' : ''}{k}</span>
                                                    <label className="text-[8px] text-cyan-400 hover:text-cyan-200 cursor-pointer font-black uppercase px-2 py-1 border border-cyan-800">Đổi File<input type="file" accept="audio/*" className="hidden" onChange={e=>handleSfxUpload(k, e)} /></label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {audioErrors.BGM && !isMuted && appState !== 'LOGIN' && (
                        <div className="fixed top-14 left-0 right-0 z-40 mx-auto max-w-sm bg-red-950/95 border border-red-600 text-red-200 text-[10px] px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
                            <span>⚠️ Nhạc nền không phát được (link ngoài bị chặn). Hãy tự tải 1 bài nhạc .mp3 lên ở Cài Đặt.</span>
                            <button onClick={() => setAudioErrors(prev => ({ ...prev, BGM: false }))} className="text-red-300 font-black px-1">✕</button>
                        </div>
                    )}

                    <div className={`relative z-10 w-full h-full flex flex-col items-center ${appState==='LOGIN' ? 'justify-center' : 'pt-16'}`}>
                        
                        {/* LOGIN - ĐÃ KHÔI PHỤC NÚT HIỆN ẨN MẬT KHẨU */}
                        {appState === 'LOGIN' && (
                            <div className="w-full max-w-sm bg-zinc-900 border-2 border-yellow-600 p-8 text-center shadow-[0_0_40px_rgba(255,223,0,0.15)] animate-fadeIn">
                                <h1 className="text-4xl font-black text-yellow-500 font-playfair italic mb-2 drop-shadow-[0_0_8px_rgba(255,223,0,0.5)]">THIÊN KIÊU</h1>
                                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-6">{authMode==='login' ? 'Đăng Nhập' : 'Khai Sơn Lập Phái (Tạo Tài Khoản)'}</p>
                                <div className="space-y-4 mb-6">
                                    <input className="w-full bg-black border border-yellow-700 p-4 text-sm text-center text-yellow-500 font-bold outline-none focus:border-yellow-400 transition-colors" placeholder="Danh Xưng (Đạo Hiệu)" value={username} onChange={e=>setUsername(e.target.value)} />
                                    {authMode === 'register' && <p className="text-[9px] text-zinc-500 italic -mt-2">Chỉ dùng chữ không dấu (a-z) và số, không khoảng trắng. VD: "tieulong99"</p>}
                                    <div className="relative w-full flex items-center">
                                        <input className="w-full bg-black border border-yellow-700 p-4 text-sm text-center text-yellow-500 font-bold outline-none focus:border-yellow-400 transition-colors" type={showPwd ? "text" : "password"} placeholder="Mật Mã Phong Ấn" value={password} onChange={e=>setPassword(e.target.value)} />
                                        <button onClick={()=>setShowPwd(!showPwd)} className="absolute right-4 text-zinc-500 hover:text-yellow-500 text-lg transition-colors">{showPwd ? '👁️' : '🙈'}</button>
                                    </div>
                                </div>
                                <button onClick={handleEmailAuth} className="w-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 text-black py-4 font-black text-sm uppercase mb-4 hover:scale-105 shadow-lg">{authMode==='login' ? 'VÀO BÍ CẢNH' : 'LẬP TÀI KHOẢN'}</button>
                                <div className="relative flex py-4 items-center"><div className="flex-grow border-t border-zinc-700"></div><span className="flex-shrink-0 mx-4 text-[9px] text-zinc-500 uppercase font-black tracking-widest">Hoặc</span><div className="flex-grow border-t border-zinc-700"></div></div>
                                <button onClick={handleGoogleLogin} className="w-full bg-white text-black py-3 font-black text-xs uppercase flex items-center justify-center gap-2 hover:scale-105 shadow-md">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                    DU NHẬP BẰNG GOOGLE
                                </button>
                                <p className="text-[10px] text-zinc-400 mt-6 cursor-pointer uppercase font-bold tracking-wider hover:text-white" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login' ? 'Chưa có thế lực? Khai Sơn Ngay' : 'Đã có tài khoản? Đăng nhập'}</p>
                                {authMode === 'login' && <p className="text-[9px] text-cyan-500/80 mt-2 cursor-pointer font-bold tracking-wider hover:text-cyan-300" onClick={handleForgotPassword}>Quên Mật Khẩu?</p>}
                            </div>
                        )}

                        {/* DASHBOARD */}
                        {appState === 'DASHBOARD' && user && (
                            <div className="w-full max-w-lg h-[80vh] flex flex-col p-3 animate-fadeIn">
                                <div className="flex justify-between items-center border-b border-yellow-700/50 pb-2 mb-3">
                                    <h2 className="text-xl font-black text-yellow-500 uppercase italic">Tàng Kinh Các</h2>
                                    <button onClick={()=>changeAppState('LEADERBOARD')} className="bg-yellow-500 text-black px-4 py-2 font-black text-[10px] shadow-[0_0_10px_rgba(234,179,8,0.4)] hover:bg-white transition-colors">THIÊN BẢNG</button>
                                </div>
                                <button onClick={handleGachaRoll} className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-400 p-4 text-white font-black text-xs uppercase mb-1 shadow-[0_0_15px_rgba(129,140,248,0.4)] hover:scale-[1.02] transition-transform">TẠO HÓA KHÍ VẬN (-200 💎)</button>
                                {gachaResultText && <div className="text-center text-[10px] text-yellow-300 font-bold mb-3 animate-fadeIn">{gachaResultText}</div>}
                                
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-20 mt-2">
                                    <div className="flex gap-2 bg-black p-2 border border-zinc-800">
                                        <input disabled={redeemingCode} className="flex-1 bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-yellow-500 disabled:opacity-50" placeholder="Mã Bí Tịch / Code quà..." value={importCode} onChange={e=>setImportCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') importQuizCodeAction();}} />
                                        <button onClick={importQuizCodeAction} disabled={redeemingCode} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-wait text-black px-5 font-black text-[10px]">{redeemingCode ? '...' : 'THU'}</button>
                                    </div>
                                        <button onClick={() => { playSfx('CLICK'); changeAppState('SUPHU'); }} className="w-full bg-gradient-to-r from-yellow-900/50 to-indigo-900/50 border border-yellow-500 text-yellow-300 py-3 text-[11px] font-black tracking-widest">AI SƯ PHỤ · ĐẠI ĐẠO ÔN TẬP</button>
                                        <button onClick={() => { playSfx('CLICK'); changeAppState('VIDEO_LEARN'); }} className="w-full bg-cyan-900/40 border border-cyan-500 text-cyan-300 py-3 text-[11px] font-black tracking-widest hover:bg-cyan-800 transition-colors">📹 HỌC QUA VIDEO TIÊN ÂM</button>
                                        <button onClick={() => { playSfx('CLICK'); changeAppState('EXAM_PATH'); }} className="w-full bg-emerald-900/40 border border-emerald-500 text-emerald-300 py-3 text-[11px] font-black tracking-widest hover:bg-emerald-800 transition-colors relative">🗺️ TU LUYỆN CHI LỘ {user.examPath?.active && !user.examPath?.completedAt && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_5px_red]">ĐANG LUYỆN</span>}</button>
                                    <button onClick={()=>{ playSfx('CLICK'); setIsAddingQuiz(!isAddingQuiz); }} className="w-full border border-dashed border-yellow-500/50 text-yellow-500 py-3 text-[11px] font-black tracking-widest">{isAddingQuiz ? 'HỦY CHẾ TẠO' : '+ TẠO BÍ TỊCH MỚI'}</button>
                                    
                                    {isAddingQuiz && (
                                        <div className="bg-zinc-900/90 p-4 space-y-3 border border-yellow-500/40 animate-fadeIn">
                                            <label className={`w-full border py-3 text-[10px] font-black uppercase text-center block mb-2 ${quizTextAnalyzing ? 'bg-indigo-900/20 border-indigo-800 text-indigo-600 cursor-wait' : 'bg-indigo-900/50 border-indigo-500 text-indigo-300 cursor-pointer'}`}>{quizTextAnalyzing ? '🔮 AI ĐANG PHÂN TÍCH FILE...' : 'TẢI NGỌC GIẢN (.TXT, .DOCX)'}<input type="file" accept=".txt,.docx" className="hidden" onChange={handleFileUpload} disabled={quizTextAnalyzing} /></label>
                                            <label className={`w-full border py-3 text-[10px] font-black uppercase text-center block mb-2 ${quizImageAnalyzing ? 'bg-purple-900/20 border-purple-800 text-purple-600 cursor-wait' : 'bg-purple-900/50 border-purple-500 text-purple-300 cursor-pointer'}`}>{quizImageAnalyzing ? '🔮 AI ĐANG ĐỌC ẢNH...' : '📷 QUÉT ẢNH ĐỀ THI (AI)'}<input type="file" accept="image/*" className="hidden" onChange={handleQuizImageUpload} disabled={quizImageAnalyzing} /></label>
                                            <input className="w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-yellow-500" placeholder="Tên Bí Tịch..." value={quizTitle} onChange={e=>setQuizTitle(e.target.value)} />
                                            <div className="text-[9px] text-zinc-500 leading-relaxed bg-black/40 border border-zinc-800 p-2">
                                                <p><b className="text-zinc-300">1 đáp án (mặc định):</b> Đáp án: A</p>
                                                <p><b className="text-zinc-300">Nhiều đáp án đúng:</b> Đáp án: A,C</p>
                                                <p><b className="text-zinc-300">Điền số (không cần A/B/C/D):</b> Đáp án: 12.5</p>
                                            </div>
                                            <textarea className="w-full h-32 bg-black border border-zinc-700 p-3 text-xs text-zinc-300 outline-none focus:border-yellow-500 custom-scrollbar" placeholder={"Câu 1: Câu hỏi...?\nA. Lựa chọn 1...\nB. Lựa chọn 2...\nĐáp án: A (hoặc A,C nếu nhiều đáp án; hoặc chỉ ghi số nếu là câu tính toán)"} value={rawQuizText} onChange={e=>setRawQuizText(e.target.value)} onFocus={bindMathFocus(()=>rawQuizText, setRawQuizText)} />
                                            <button onClick={()=>setShowMathKeyboard(true)} className="w-full border border-cyan-600 text-cyan-400 py-2 text-[10px] font-black uppercase">🔣 Bàn Phím Ký Hiệu Toán/Lý</button>
                                            <button onClick={createQuizAction} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px]">LƯU TRỮ VÀ CHÉP MÃ</button>
                                        </div>
                                    )}
                                    <div className="space-y-3 lib-grid">
                                        {user.library?.length > 0 ? user.library.map(s => (
                                            <div key={s.id} className="bg-black/80 border border-zinc-800 p-4 flex justify-between items-center hover:border-zinc-600 transition-colors">
                                                <div className="flex-1 mr-3 overflow-hidden"><p className="text-sm font-black text-white uppercase truncate">{s.title}</p><p className="text-[10px] text-zinc-500 font-bold mt-1">SỐ ẢI: <span className="text-yellow-500">{s.data.length}</span></p></div>
                                                <div className="flex gap-3">
                                                    <button onClick={()=>openLibraryEditor(s)} className="text-cyan-500 text-xl" title="Chỉnh sửa ải">✏️</button>
                                                    <button onClick={()=>{ playSfx('CLICK'); navigator.clipboard.writeText(s.code); alert("Đã chép mã bí tịch để chia sẻ!"); }} className="text-yellow-600 text-xl">📤</button>
                                                    <button onClick={async ()=>{ if(await askConfirm("Hủy bí tịch này?")){ firestore.collection('users').doc(user.uid).update({library: user.library.filter(x=>x.id!==s.id)}); playSfx('FAIL'); } }} className="text-red-800 text-xl">🗑️</button>
                                                    <button onClick={()=>handleEnterQuiz(s.data)} className="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500 px-4 py-2 text-[10px] font-black transition-all">VÀO ẢI</button>
                                                </div>
                                            </div>
                                        )) : <p className="text-[11px] text-zinc-600 text-center py-6 italic">Tàng Kinh Các trống rỗng...</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): lộ trình ôn thi có sơ đồ cây (Đạo Đồ) kiểu Duolingo,
                            Bát Quái Đồ phân tích thực lực, Đạo Hữu Bảng (BXH thời gian luyện thi 4h-23h) và
                            Bảng Phong Thưởng. Xem toàn bộ logic ở khu vực "TU LUYỆN CHI LỘ" phía trên. */}
                        {appState === 'EXAM_PATH' && user && (
                            <div className="w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn">
                                <div className="flex justify-between items-center border-b border-emerald-700/50 pb-2 mb-3">
                                    <h2 className="text-xl font-black text-emerald-400 uppercase italic">Tu Luyện Chi Lộ</h2>
                                    <button onClick={()=>changeAppState('DASHBOARD')} className="text-zinc-500 hover:text-white text-xl px-2">✕</button>
                                </div>
                                <div className="flex justify-around text-[9px] font-black uppercase border-b border-zinc-800 mb-3">
                                    <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('TREE'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='TREE'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>ĐẠO ĐỒ</button>
                                    <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('RADAR'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='RADAR'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>BÁT QUÁI ĐỒ</button>
                                    <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('BOARD'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='BOARD'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>ĐẠO HỮU BẢNG</button>
                                    <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('REWARDS'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='REWARDS'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>PHONG THƯỞNG</button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
                                    {/* ===== TAB: ĐẠO ĐỒ (nghi thức khai mở HOẶC sơ đồ cây nếu đã có Đạo Lộ) ===== */}
                                    {examPathTab === 'TREE' && (
                                        !user.examPath?.active ? (
                                            <div className="space-y-4 animate-fadeIn">
                                                <p className="text-[10px] text-zinc-400 text-center italic px-2">Khai mở 1 lộ trình luyện thi có sơ đồ cây, mỗi ngày 1 Ải, xen kẽ ôn tập & Ải Boss, AI hỗ trợ phân tích thực lực sau mỗi chặng.</p>
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">1. Nguồn Đề</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={()=>{ playSfx('CLICK'); setExamPathWizMode('library'); }} className={`p-3 border text-[10px] font-black uppercase ${examPathWizMode==='library'?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>📖 Từ Bí Tịch Có Sẵn</button>
                                                        <button onClick={()=>{ playSfx('CLICK'); setExamPathWizMode('subjects'); }} className={`p-3 border text-[10px] font-black uppercase ${examPathWizMode==='subjects'?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>📚 Theo Môn Học</button>
                                                    </div>
                                                </div>
                                                {examPathWizMode === 'library' ? (
                                                    <div>
                                                        <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">Chọn Bí Tịch trong Tàng Kinh Các</p>
                                                        {user.library?.length > 0 ? (
                                                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                                {user.library.map(s => (
                                                                    <div key={s.id} onClick={()=>{ playSfx('CLICK'); setExamPathWizLibId(s.id); }} className={`p-2 border text-[10px] font-bold cursor-pointer flex justify-between ${String(examPathWizLibId)===String(s.id)?'border-emerald-500 bg-emerald-900/20 text-emerald-300':'border-zinc-800 text-zinc-400'}`}>
                                                                        <span className="truncate mr-2">{s.title}</span><span className="text-zinc-600 flex-shrink-0">{s.data.length} câu</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p className="text-[10px] text-zinc-600 italic text-center py-3">Chưa có Bí Tịch nào - hãy tạo 1 bộ trong Tàng Kinh Các trước!</p>}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">Chọn/Nhập Môn Học</p>
                                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                                            {EXAM_SUBJECT_SUGGESTIONS.map(sub => (
                                                                <button key={sub} onClick={()=>{ playSfx('CLICK'); setExamPathWizSubjects(p => p.includes(sub) ? p.filter(x=>x!==sub) : [...p, sub]); }} className={`px-2.5 py-1.5 border text-[9px] font-bold ${examPathWizSubjects.includes(sub)?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>{sub}</button>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input className="flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-emerald-500" placeholder="Môn khác..." value={examPathWizSubjectInput} onChange={e=>setExamPathWizSubjectInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && examPathWizSubjectInput.trim()){ setExamPathWizSubjects(p=>[...p, examPathWizSubjectInput.trim()]); setExamPathWizSubjectInput(''); } }} />
                                                            <button onClick={()=>{ if(examPathWizSubjectInput.trim()){ setExamPathWizSubjects(p=>[...p, examPathWizSubjectInput.trim()]); setExamPathWizSubjectInput(''); } }} className="bg-zinc-800 text-zinc-300 px-4 text-[10px] font-black">+</button>
                                                        </div>
                                                        {examPathWizSubjects.length > 0 && <p className="text-[9px] text-emerald-400 mt-2">Đã chọn: {examPathWizSubjects.join(', ')}</p>}
                                                        {!anyGeminiKey && <p className="text-[9px] text-orange-400 mt-2 italic">⚠️ Cần API Key (Gemini) ở mục Học Qua Video để AI soạn câu hỏi mới.</p>}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">2. Số Ngày Học: <span className="text-emerald-400">{examPathWizDays} ngày</span></p>
                                                    <input type="range" min="3" max="30" value={examPathWizDays} onChange={e=>setExamPathWizDays(Number(e.target.value))} className="w-full accent-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">3. Độ Khó</p>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {EXAM_DIFFICULTY.map(d => (
                                                            <div key={d.id} onClick={()=>{ playSfx('CLICK'); setExamPathWizDifficulty(d.id); }} className={`difficulty-chip ${examPathWizDifficulty===d.id?'active':''}`} style={{ borderColor: d.color, color: examPathWizDifficulty===d.id?d.color:'#71717a' }}>
                                                                <div className="text-lg">{d.icon}</div><div className="text-[8px] font-black uppercase mt-1">{d.name}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 italic mt-2 text-center">{getExamDifficulty(examPathWizDifficulty).desc}</p>
                                                </div>
                                                <button onClick={startExamPathAction} disabled={examPathGenerating} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-wait text-black py-4 font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)]">{examPathGenerating ? '🔮 AI ĐANG KHAI MỞ ĐẠO LỘ...' : '⚡ KHAI MỞ ĐẠO LỘ'}</button>
                                            </div>
                                        ) : (
                                            <div className="animate-fadeIn">
                                                <div className="flex justify-between items-center mb-4 bg-black/40 border border-emerald-900/50 p-3">
                                                    <div className="overflow-hidden"><p className="text-[11px] font-black text-white truncate max-w-[180px]">{user.examPath.title}</p><p className="text-[9px] text-zinc-500 font-bold mt-1">{getExamDifficulty(user.examPath.difficulty).icon} {getExamDifficulty(user.examPath.difficulty).name} · {user.examPath.nodes.length} Ải</p></div>
                                                    <button onClick={resetExamPathAction} className="text-[9px] text-red-500 font-black uppercase border border-red-900 px-2 py-1.5 flex-shrink-0">Huỷ Đạo Lộ</button>
                                                </div>
                                                {user.examPath.completedAt && <div className="bg-yellow-900/20 border border-yellow-600 p-3 text-center mb-4"><p className="text-yellow-400 text-[11px] font-black">🎉 ĐÃ HOÀN THÀNH TOÀN BỘ ĐẠO LỘ! 🎉</p></div>}
                                                <div className="exam-path-track has-final pt-2 pb-8">
                                                    {user.examPath.nodes.map((n, i) => {
                                                        const pos = n.type === 'boss' ? 'pos-mid' : (i % 2 === 0 ? 'pos-left' : 'pos-right');
                                                        const cls = n.status === 'done' ? 'exam-node-done' : n.status === 'unlocked' ? 'exam-node-unlocked' : 'exam-node-locked';
                                                        const icon = n.status === 'locked' ? '🔒' : n.type === 'boss' ? '👹' : n.type === 'review' ? '🔁' : (n.status === 'done' ? '⭐' : '▶️');
                                                        return (
                                                            <div key={n.id} className={`exam-node-wrap ${pos}`}>
                                                                <div className="relative flex flex-col items-center">
                                                                    <button onClick={()=>{ if(n.status==='locked'){ playSfx('WRONG'); } else { playSfx('CLICK'); setExamPathViewNode(n); } }} className={`exam-node-btn ${cls} ${n.type==='boss'?'exam-node-boss':''} ${n.type==='review'?'exam-node-review':''}`}>{icon}</button>
                                                                    <span className="exam-node-label">{n.title}{n.bestScore!=null && <span className="block text-emerald-400">{n.bestScore}%</span>}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* 🏆 ĐÍCH ĐẾN: nút cuối sơ đồ cây. Khoá tới khi vượt hết Ải; xong hết -> phát sáng, bấm để xem lại tổng kết. */}
                                                    {(() => {
                                                        const epNodes = user.examPath.nodes;
                                                        const doneCount = epNodes.filter(x => x.status === 'done').length;
                                                        const allDone = epNodes.length > 0 && doneCount === epNodes.length;
                                                        return (
                                                            <div className="exam-node-wrap pos-mid" style={{ marginTop: 14, marginBottom: 40 }}>
                                                                <div className="relative flex flex-col items-center">
                                                                    <button onClick={() => {
                                                                        if (allDone) { playSfx('SUCCESS'); setExamPathFinaleInfo({ title: user.examPath.title, totalNodes: epNodes.length, days: user.examPath.days }); }
                                                                        else { playSfx('WRONG'); alert(`Còn ${epNodes.length - doneCount} Ải nữa là chạm tới ĐẠO THÀNH! Cố lên!`); }
                                                                    }} className={`exam-node-btn exam-node-final ${allDone ? 'exam-node-final-done' : 'exam-node-locked'}`}>{allDone ? '🏆' : '🔒'}</button>
                                                                    <span className="exam-node-label" style={{ color: allDone ? '#facc15' : undefined }}>ĐẠO THÀNH<span className={`block ${allDone ? 'text-yellow-300' : 'text-zinc-500'}`}>{allDone ? 'ĐÃ VIÊN MÃN' : `${doneCount}/${epNodes.length} Ải`}</span></span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )
                                    )}
                                    {/* ===== TAB: BÁT QUÁI ĐỒ (biểu đồ mạng nhện phân tích thực lực) ===== */}
                                    {examPathTab === 'RADAR' && (
                                        <div className="animate-fadeIn space-y-4">
                                            {!user.examPath?.active ? (
                                                <p className="text-[11px] text-zinc-600 text-center py-10 italic">Hãy khai mở 1 Đạo Lộ ở tab ĐẠO ĐỒ trước!</p>
                                            ) : Object.keys(examPathTopicMastery).length === 0 ? (
                                                <p className="text-[11px] text-zinc-600 text-center py-10 italic">Chưa có dữ liệu - hoàn thành ít nhất 1 Ải để xem Bát Quái Đồ!</p>
                                            ) : (
                                                <>
                                                    <RadarChart data={examPathTopicMastery} />
                                                    <button onClick={getExamPathAiAdvice} disabled={examPathRadarLoading} className="w-full border border-indigo-500 text-indigo-300 py-3 text-[10px] font-black uppercase disabled:opacity-50">{examPathRadarLoading ? '🔮 AI ĐANG PHÂN TÍCH...' : '🔮 XIN SƯ PHỤ AI NHẬN XÉT'}</button>
                                                    {examPathRadarAdvice && <div className="bg-indigo-950/40 border border-indigo-800 p-3 text-[11px] text-indigo-200 italic leading-relaxed animate-fadeIn">{examPathRadarAdvice}</div>}
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {/* ===== TAB: ĐẠO HỮU BẢNG (BXH thời gian luyện thi 4h00-23h00, reset mỗi ngày) ===== */}
                                    {examPathTab === 'BOARD' && (
                                        <div className="animate-fadeIn space-y-3">
                                            <div className="bg-black/60 border border-emerald-600/50 p-3 text-center">
                                                <p className="text-[9px] text-emerald-400 font-black uppercase mb-1">{examPathWindowOpen ? '🟢 Đang Tính Điểm (4h00-23h00)' : '🔴 Ngoài Khung Giờ Tính Điểm'}</p>
                                                <p className="text-[9px] text-zinc-400">Chốt hạng & làm mới sau: <span className="text-yellow-400 font-mono">{examPathTimeLeftStr}</span></p>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 text-center italic">Điểm = số phút luyện thi tích luỹ trong khung giờ 4h00-23h00 hôm nay.</p>
                                            {/* 🆕 NÊU RÕ PHẦN THƯỞNG: trước đây chỉ có 1 dòng chữ chung chung "Top 3 nhận Danh Hiệu Phong Thái
                                                miễn phí!", không nói rõ TỪNG hạng nhận danh hiệu gì - khác với Phong Thần Bảng đã có sẵn dải
                                                thưởng rõ ràng (+5000/+3000/+1000 CT theo từng Top). Nay thêm dải xem trước tương tự, lấy đúng
                                                dữ liệu từ EXAM_PATH_TITLES để không thể lệch với danh hiệu thật sự phát ra. */}
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-yellow-900/20 border border-yellow-600 p-2"><span className="block text-base">🥇</span><span className="text-[8px] text-yellow-400 font-black block">TOP 1</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[0].name}</span></div>
                                                <div className="bg-gray-800/30 border border-gray-400 p-2"><span className="block text-base">🥈</span><span className="text-[8px] text-gray-300 font-black block">TOP 2</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[1].name}</span></div>
                                                <div className="bg-orange-900/20 border border-orange-500 p-2"><span className="block text-base">🥉</span><span className="text-[8px] text-orange-400 font-black block">TOP 3</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[2].name}</span></div>
                                            </div>
                                            <p className="text-[8px] text-zinc-600 text-center italic">Danh hiệu miễn phí, không cộng thêm Linh Thạch/Danh Vọng - chọn hiển thị ở tab PHONG THƯỞNG.</p>
                                            <div className="space-y-2">
                                                {examPathBoardList.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-6 italic">Chưa ai luyện thi hôm nay - hãy là người đầu tiên!</p>}
                                                {examPathBoardList.map((p, i) => (
                                                    <div key={p.uid} className={`flex justify-between items-center p-3 border ${i===0?'border-yellow-500 bg-yellow-900/10':i===1?'border-gray-400 bg-gray-800/20':i===2?'border-orange-500 bg-orange-900/10':'border-zinc-800 bg-black/40'} ${p.uid===user.uid?'border-l-4 border-l-cyan-400':''}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden"><span className="text-[13px] font-black w-6 text-center text-zinc-400 flex-shrink-0">#{i+1}</span><img src={p.photo} className="w-9 h-9 object-cover border border-zinc-700 flex-shrink-0" alt="avatar" /><UserName u={p} cls="text-[11px] truncate" /></div>
                                                        <span className="text-emerald-400 font-black text-[12px] flex-shrink-0 ml-2">⏱️ {(p.examPathDailyScore||0).toFixed(1)}p</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* ===== TAB: BẢNG PHONG THƯỞNG (danh hiệu đã nhận từ Đạo Hữu Bảng) ===== */}
                                    {examPathTab === 'REWARDS' && (
                                        <div className="animate-fadeIn space-y-3">
                                            <p className="text-[10px] text-zinc-400 text-center italic px-2 mb-2">Danh Hiệu Phong Thái nhận được từ Đạo Hữu Bảng - chọn 1 để hiển thị cạnh tên (hoặc gỡ bất kỳ lúc nào).</p>
                                            <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                                <div className="bg-yellow-900/20 border border-yellow-600 p-2"><span className="block text-lg">🥇</span><span className="text-[9px] text-yellow-400 font-black">TOP 1</span></div>
                                                <div className="bg-gray-800/30 border border-gray-400 p-2"><span className="block text-lg">🥈</span><span className="text-[9px] text-gray-300 font-black">TOP 2</span></div>
                                                <div className="bg-orange-900/20 border border-orange-500 p-2"><span className="block text-lg">🥉</span><span className="text-[9px] text-orange-400 font-black">TOP 3</span></div>
                                            </div>
                                            <div className="space-y-2">
                                                <div onClick={()=>setExamPathActiveTitle(null)} className={`p-3 border cursor-pointer text-[10px] font-bold ${!user.examPathActiveTitle?'border-emerald-500 text-emerald-300 bg-emerald-900/20':'border-zinc-800 text-zinc-500'}`}>Không hiển thị danh hiệu</div>
                                                {EXAM_PATH_TITLES.map(t => {
                                                    const owned = (user.examPathTitles||[]).includes(t.id);
                                                    return (
                                                        <div key={t.id} onClick={()=> owned && setExamPathActiveTitle(t.id)} className={`p-3 border flex justify-between items-center text-[10px] font-bold ${!owned?'border-zinc-900 text-zinc-700 opacity-50':user.examPathActiveTitle===t.id?'border-emerald-500 bg-emerald-900/20 cursor-pointer':'border-zinc-800 text-zinc-400 cursor-pointer'}`}>
                                                            <span className={t.class}>{t.name}</span>
                                                            <span>{owned ? (user.examPathActiveTitle===t.id?'✅':'') : '🔒'}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Xem trước 1 Ải trong Đạo Đồ trước khi VÀO ẢI */}
                        {examPathViewNode && (
                            <div className="absolute inset-0 bg-black/90 z-[250] flex items-center justify-center p-4 animate-fadeIn" onClick={()=>setExamPathViewNode(null)}>
                                <div className="bg-zinc-900 border-2 border-emerald-600 p-6 w-full max-w-sm text-center" onClick={e=>e.stopPropagation()}>
                                    <h3 className="text-lg font-black text-emerald-400 mb-1 uppercase">{examPathViewNode.title}</h3>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase mb-4">{examPathViewNode.type === 'boss' ? '👹 Ải Boss Tổng Kết' : examPathViewNode.type === 'review' ? '🔁 Ải Ôn Tập' : '📖 Ải Thường'} · {examPathViewNode.questions.length} câu</p>
                                    {examPathViewNode.topics?.length > 0 && <div className="flex flex-wrap gap-1 justify-center mb-4">{examPathViewNode.topics.map(t => <span key={t} className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-1">{t}</span>)}</div>}
                                    {examPathViewNode.bestScore != null && <p className="text-[10px] text-yellow-500 font-black mb-4">Điểm tốt nhất: {examPathViewNode.bestScore}%</p>}
                                    <div className="flex gap-2">
                                        <button onClick={()=>setExamPathViewNode(null)} className="flex-1 bg-zinc-800 text-zinc-400 py-3 text-[10px] font-black uppercase">Đóng</button>
                                        <button onClick={()=>{ const n = examPathViewNode; setExamPathViewNode(null); startExamPathNode(n); }} className="flex-1 bg-emerald-600 text-black py-3 text-[10px] font-black uppercase">VÀO ẢI</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🆕 CHỈNH SỬA ẢI: sửa tên/câu hỏi/đáp án/ảnh minh hoạ của 1 Bí Tịch đã tạo */}
                        {appState === 'QUIZ_EDIT' && user && editingLibItem && (
                            <div className="w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn">
                                <div className="flex justify-between items-center border-b border-cyan-700/50 pb-2 mb-3">
                                    <h2 className="text-lg font-black text-cyan-400 uppercase italic truncate flex-1">✏️ Chỉnh Sửa Ải</h2>
                                    <button onClick={exitLibraryEditor} className="text-zinc-500 hover:text-white text-xl px-2">✕</button>
                                </div>

                                {/* ====== FORM SỬA 1 CÂU HỎI (hiện khi đang sửa/thêm câu) ====== */}
                                {editQDraft ? (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 pb-4">
                                        <button onClick={cancelEditQuestion} className="text-[10px] text-zinc-500 hover:text-white font-black uppercase mb-1">← Quay Lại Danh Sách</button>
                                        <textarea className="math-text w-full h-24 bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 custom-scrollbar" placeholder="Nội dung câu hỏi..." value={editQDraft.q} onChange={e=>setEditQDraft(prev=>({...prev, q: e.target.value}))} onFocus={bindMathFocus(()=>editQDraft.q, v=>setEditQDraft(prev=>({...prev, q: v})))} />
                                        <button onClick={()=>setShowMathKeyboard(true)} className="w-full border border-cyan-600 text-cyan-400 py-1.5 text-[9px] font-black uppercase">🔣 Bàn Phím Ký Hiệu Toán/Lý</button>

                                        <div className="flex gap-2">
                                            {[['single','1 Đáp Án'],['multi','Đúng/Sai Nhiều Ý'],['numeric','Điền Số']].map(([tv,tl]) => (
                                                <button key={tv} onClick={()=>switchEditQType(tv)} className={`flex-1 py-2 text-[9px] font-black uppercase border ${editQDraft.type===tv ? 'bg-cyan-600 border-cyan-400 text-black' : 'border-zinc-700 text-zinc-400'}`}>{tl}</button>
                                            ))}
                                        </div>

                                        {/* --- Ảnh minh hoạ --- */}
                                        <div className="bg-black/40 border border-zinc-800 p-3 space-y-2">
                                            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Ảnh minh hoạ (sơ đồ, đồ thị...)</p>
                                            {editQDraft.img && (
                                                <div className="relative inline-block">
                                                    <img src={editQDraft.img} className="max-h-32 border border-zinc-700 cursor-zoom-in" onClick={()=>setLightboxImg(editQDraft.img)} alt="preview" />
                                                    <button onClick={()=>setEditQDraft(prev=>({...prev, img:''}))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-700 text-white text-xs font-black rounded-full">✕</button>
                                                </div>
                                            )}
                                            <label className={`block text-center py-2 text-[10px] font-black uppercase border cursor-pointer ${editQImgUploading ? 'border-zinc-700 text-zinc-600 cursor-wait' : 'border-cyan-600 text-cyan-400'}`}>{editQImgUploading ? 'Đang tải ảnh...' : (editQDraft.img ? '📷 Đổi Ảnh Khác' : '📷 Tải Ảnh Lên')}<input type="file" accept="image/*" className="hidden" disabled={editQImgUploading} onChange={handleEditQImageUpload} /></label>
                                        </div>

                                        {/* --- 1 Đáp Án --- */}
                                        {editQDraft.type === 'single' && (
                                            <div className="space-y-2">
                                                {editQDraft.o.map((optText, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <button onClick={()=>setEditQDraft(prev=>({...prev, c:i}))} className={`w-8 h-8 flex-shrink-0 border text-[10px] font-black ${editQDraft.c===i ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>{String.fromCharCode(65+i)}</button>
                                                        <input className="math-text flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={`Lựa chọn ${String.fromCharCode(65+i)}...`} value={optText} onChange={e=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=e.target.value; return {...prev,o};})} onFocus={bindMathFocus(()=>editQDraft.o[i], v=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=v; return {...prev,o};}))} />
                                                    </div>
                                                ))}
                                                <p className="text-[9px] text-zinc-600 italic">Bấm vào chữ cái để đánh dấu đáp án đúng.</p>
                                            </div>
                                        )}

                                        {/* --- Đúng/Sai Nhiều Ý --- */}
                                        {editQDraft.type === 'multi' && (
                                            <div className="space-y-2">
                                                {editQDraft.o.map((optText, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <button onClick={()=>setEditQDraft(prev=>{const c=Array.isArray(prev.c)?[...prev.c]:[]; const idx=c.indexOf(i); if(idx>-1) c.splice(idx,1); else c.push(i); return {...prev,c};})} className={`w-8 h-8 flex-shrink-0 border text-[9px] font-black uppercase ${Array.isArray(editQDraft.c)&&editQDraft.c.includes(i) ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>{Array.isArray(editQDraft.c)&&editQDraft.c.includes(i) ? 'Đ' : 'S'}</button>
                                                        <input className="math-text flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={`Ý ${String.fromCharCode(65+i)}...`} value={optText} onChange={e=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=e.target.value; return {...prev,o};})} onFocus={bindMathFocus(()=>editQDraft.o[i], v=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=v; return {...prev,o};}))} />
                                                        {editQDraft.o.length > 2 && <button onClick={()=>setEditQDraft(prev=>{const o=prev.o.filter((_,idx)=>idx!==i); const c=(Array.isArray(prev.c)?prev.c:[]).map(x=>x>i?x-1:x).filter(x=>x!==i); return {...prev,o,c};})} className="text-red-700 text-lg px-1">✕</button>}
                                                    </div>
                                                ))}
                                                {editQDraft.o.length < 6 && <button onClick={()=>setEditQDraft(prev=>({...prev, o:[...prev.o,'']}))} className="text-[9px] text-cyan-500 font-black uppercase">+ Thêm Ý</button>}
                                                <p className="text-[9px] text-zinc-600 italic">Bấm nút chữ cái để chuyển đổi Đ (Đúng) / S (Sai) cho từng ý.</p>
                                            </div>
                                        )}

                                        {/* --- Điền Số --- */}
                                        {editQDraft.type === 'numeric' && (
                                            <input className="math-text w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 text-center" placeholder="Đáp án số đúng (VD: 12.5)..." value={editQDraft.c} onChange={e=>setEditQDraft(prev=>({...prev, c: e.target.value}))} onFocus={bindMathFocus(()=>editQDraft.c, v=>setEditQDraft(prev=>({...prev, c: v})))} />
                                        )}

                                        <button onClick={saveEditQuestionDraft} className="w-full bg-cyan-600 hover:bg-cyan-400 text-black py-3 font-black text-[11px] uppercase mt-2">Lưu Câu Hỏi Này</button>
                                    </div>
                                ) : (
                                    <>
                                        <input className="w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 mb-3" placeholder="Tên Bí Tịch..." value={editDraftTitle} onChange={e=>setEditDraftTitle(e.target.value)} />
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 pb-3">
                                            {editDraftQuestions.map((q, i) => (
                                                <div key={i} className="bg-black/70 border border-zinc-800 p-3 flex items-center gap-2">
                                                    <span className="text-[10px] text-zinc-600 font-black flex-shrink-0">#{i+1}</span>
                                                    {q.img && <img src={q.img} className="w-8 h-8 object-cover flex-shrink-0 border border-zinc-700" alt="" />}
                                                    <p className="math-text flex-1 text-[11px] text-zinc-300 truncate">{q.q}</p>
                                                    <span className="text-[8px] px-1.5 py-0.5 border border-zinc-700 text-zinc-500 uppercase font-black flex-shrink-0">{q.type === 'multi' ? 'Đ/S' : q.type === 'numeric' ? 'Số' : '1ĐA'}</span>
                                                    <button onClick={()=>startEditQuestion(i)} className="text-cyan-500 text-sm flex-shrink-0">✏️</button>
                                                    <button onClick={()=>deleteEditQuestionAt(i)} className="text-red-700 text-sm flex-shrink-0">🗑️</button>
                                                </div>
                                            ))}
                                            {editDraftQuestions.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-6 italic">Chưa có câu hỏi nào...</p>}

                                            <button onClick={()=>startEditQuestion('new')} className="w-full border border-dashed border-cyan-500/50 text-cyan-400 py-3 text-[11px] font-black tracking-widest mt-2">+ Thêm Câu Hỏi Mới</button>

                                            <div className="bg-zinc-900/60 border border-zinc-800 p-3 space-y-2 mt-2">
                                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Hoặc dán thêm nhiều câu cùng lúc (định dạng: Câu.../A.../Đáp án:)</p>
                                                <textarea className="w-full h-20 bg-black border border-zinc-700 p-2 text-[11px] text-zinc-300 outline-none focus:border-cyan-500 custom-scrollbar" placeholder={"Câu 5: Câu hỏi mới...?\nA. ...\nĐáp án: A"} value={editAppendText} onChange={e=>setEditAppendText(e.target.value)} onFocus={bindMathFocus(()=>editAppendText, setEditAppendText)} />
                                                <button onClick={appendTextToEditAction} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 text-[10px] font-black uppercase">Thêm Vào Danh Sách</button>
                                            </div>
                                        </div>
                                        <button onClick={saveLibraryEditAction} disabled={editQuizSaving} className="w-full bg-yellow-500 hover:bg-white disabled:opacity-50 disabled:cursor-wait text-black py-3 font-black text-[11px] uppercase mt-2">{editQuizSaving ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}</button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* HỌC QUA VIDEO */}
                        {appState === 'VIDEO_LEARN' && user && (
                            <div id="vl-root" className="w-full max-w-lg h-[80vh] flex flex-col p-4 animate-fadeIn">
                                <div className="flex justify-between items-center border-b border-cyan-700/50 pb-2 mb-3">
                                    <h2 className="text-xl font-black text-cyan-400 uppercase italic">Thính Kính Trình Học</h2>
                                    <button onClick={() => { setVideoResult(null); setVideoQuizActive(false); setVideoQuizRounds([]); changeAppState('DASHBOARD'); }} className="bg-zinc-800 text-zinc-400 px-4 py-2 font-black text-[10px] hover:text-white transition-colors">TRỞ VỀ</button>
                                </div>

                                <div id="vl-body" className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                                    {!videoApiKey && (
                                        <div className="bg-black border border-cyan-800 p-3 space-y-2">
                                            <p className="text-[10px] text-cyan-300 font-bold">Cần API Key Gemini (miễn phí) để phân tích. Lấy tại <span className="underline">aistudio.google.com/apikey</span>, rồi dán vào đây:</p>
                                            <input className="w-full bg-zinc-900 border border-cyan-700 p-2 text-xs text-white outline-none" placeholder="Dán Gemini API Key..." value={videoApiKey} onChange={e=>saveGeminiKey(e.target.value)} />
                                        </div>
                                    )}

                                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Link Video (ưu tiên YouTube để phân tích + xem trực tiếp):</p>
                                    {/* ✕ NÚT XOÁ NHANH: trước đây đổi link phải tự bấm xoá từng ký tự rất mất thời gian,
                                        giờ chỉ cần bấm ✕ là xoá sạch để dán link mới ngay lập tức. */}
                                    <div className="relative">
                                        <input className="w-full bg-black border border-cyan-700 p-3 pr-9 text-sm text-white outline-none focus:border-cyan-400 transition-colors" placeholder="Dán link YouTube vào đây..." value={videoLink} onChange={e=>setVideoLink(e.target.value)} />
                                        {videoLink && (
                                            <button onClick={() => setVideoLink('')} title="Xoá link" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full text-sm font-black">✕</button>
                                        )}
                                    </div>

                                    {/* 📥 NHẬP MÃ BÍ TỊCH VIDEO: dán mã người khác chia sẻ để có ngay bài phân tích, khỏi tốn API */}
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Mã Bí Tịch Video (nếu có)..." value={videoImportCode} onChange={e=>setVideoImportCode(e.target.value)} />
                                        <button onClick={importVideoCodeAction} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-4 text-[10px] font-black uppercase">Nhập</button>
                                    </div>

                                    {/* 🆕 ĐỒNG BỘ VỚI ẢI BÍ TỊCH: tải thẳng file Ngọc Giản từ vựng (.txt/.docx) lên đây,
                                        không cần phải có video mới ôn tập được — AI tự tách "từ - nghĩa" từ file. */}
                                    <label className={`w-full border py-2.5 text-[10px] font-black uppercase text-center block ${vocabFileAnalyzing ? 'bg-indigo-900/20 border-indigo-800 text-indigo-600 cursor-wait' : 'bg-indigo-900/50 border-indigo-500 text-indigo-300 cursor-pointer'}`}>{vocabFileAnalyzing ? '🔮 AI ĐANG PHÂN TÍCH FILE...' : '📁 TẢI NGỌC GIẢN TỪ VỰNG (.TXT, .DOCX)'}<input type="file" accept=".txt,.docx" className="hidden" onChange={handleVocabFileUpload} disabled={vocabFileAnalyzing} /></label>

                                    {/* KHUNG XEM VIDEO THẬT + NÚT TỐC ĐỘ PHÁT + CHẾ ĐỘ NGANG (chỉ hiện khi ĐANG Ở CHẾ ĐỘ DỌC;
                                        khi bật Chế Độ Ngang, khung này ẩn đi và khung landscape-fs bên dưới (portal ra
                                        ngoài document.body) đảm nhiệm, tránh 2 trình phát YouTube chạy trùng lúc) */}
                                    {currentYoutubeId && !videoLandscapeMode && (
                                        <div className="bg-black border border-cyan-800" id="yt-player-wrap">
                                            <div className="w-full aspect-video bg-black" id="yt-player-mount"></div>
                                            <div className="flex items-center justify-between gap-1 p-2 bg-zinc-900 border-t border-cyan-900 flex-wrap">
                                                <span className="text-[9px] text-zinc-500 font-black uppercase pl-1">Tốc Độ:</span>
                                                <div className="flex gap-1 flex-wrap">
                                                    {supportedPlaybackRates.map(rate => (
                                                        <button key={rate} onClick={() => changePlaybackRate(rate)} className={`px-2 py-1 text-[10px] font-black border ${playbackRate === rate ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}>{rate}x</button>
                                                    ))}
                                                </div>
                                                <button onClick={toggleVideoLandscapeMode} className="px-2 py-1 text-[10px] font-black border bg-zinc-800 border-cyan-700 text-cyan-300 hover:bg-cyan-800 hover:text-white flex items-center gap-1">⛶ CHẾ ĐỘ NGANG</button>
                                            </div>
                                        </div>
                                    )}
                                    {currentYoutubeId && videoLandscapeMode && (
                                        <div className="bg-black border border-cyan-800 p-6 text-center">
                                            <p className="text-[10px] text-cyan-400 font-bold animate-pulse">Đang xem ở Chế Độ Ngang...</p>
                                        </div>
                                    )}

                                    {/* CHẾ ĐỘ NGANG - RENDER RA NGOÀI (Portal thẳng vào document.body) để tránh bị kẹt
                                        trong khung cha có giới hạn chiều cao/transform, đảm bảo LUÔN phủ kín đúng màn hình
                                        thật và LUÔN có nút Thoát rõ ràng, không bao giờ bị kẹt lại ở trạng thái ngang. */}
                                    {currentYoutubeId && videoLandscapeMode && ReactDOM.createPortal(
                                        <div className="landscape-fs use-app-vh flex">
                                            <div className="h-full flex-[3] bg-black relative" id="yt-player-mount-landscape"></div>
                                            <div className="h-full flex-[2] min-w-0 bg-zinc-900 border-l-2 border-cyan-700 flex flex-col overflow-hidden">
                                                <div className="flex items-center justify-between gap-1 p-2 bg-zinc-900 border-b border-cyan-900 flex-wrap flex-shrink-0">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {supportedPlaybackRates.map(rate => (
                                                            <button key={rate} onClick={() => changePlaybackRate(rate)} className={`px-2 py-1 text-[9px] font-black border ${playbackRate === rate ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{rate}x</button>
                                                        ))}
                                                    </div>
                                                    <button onClick={toggleVideoLandscapeMode} className="px-2 py-1 text-[9px] font-black border bg-red-900/70 border-red-500 text-red-200 hover:bg-red-600 hover:text-white">✕ THOÁT NGANG</button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                                    {videoResult ? (
                                                        <>
                                                            <div className="bg-black/60 border border-zinc-800 p-2">
                                                                <p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">Tóm Tắt:</p>
                                                                <p className="text-[10px] text-zinc-300 italic leading-snug">{videoResult.summary}</p>
                                                            </div>
                                                            {videoResult.transcript?.length > 0 && (
                                                                <div className="bg-black/60 border border-cyan-800 p-2">
                                                                    <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                                                                        <p className="text-[9px] text-cyan-400 font-black uppercase">Phụ Đề (bấm từ để tra nghĩa):</p>
                                                                        <div className="flex gap-1">
                                                                            {videoResult.isCjk && <button onClick={()=>setShowPinyin(v=>!v)} className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${showPinyin ? 'bg-yellow-600 border-yellow-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>拼 {getPhoneticLabel()}</button>}
                                                                            <button onClick={()=>setShowTranslation(v=>!v)} className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${showTranslation ? 'bg-green-600 border-green-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>🇻🇳 Dịch</button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1.5 leading-relaxed">
                                                                        {videoResult.transcript.map((sentence, i) => (
                                                                            <div key={i} ref={el => { transcriptItemRefs.current.landscape[i] = el; }}
                                                                                 className={`transition-colors duration-300 -mx-1 px-1 py-0.5 rounded ${i === activeTranscriptIdx ? 'bg-cyan-800/40 border-l-2 border-yellow-400' : ''}`}>
                                                                                {showPinyin && videoResult.transcriptPinyin?.[i] && <p className="text-[9px] text-yellow-400 italic leading-tight">{videoResult.transcriptPinyin[i]}</p>}
                                                                                <p className="text-[11px] text-white">
                                                                                    <ClickableSentence text={sentence} onWordClick={lookupWordAction} vocab={vocabMarks} />
                                                                                </p>
                                                                                {showTranslation && videoResult.transcriptTranslation?.[i] && <p className="text-[9px] text-green-400/90 italic leading-tight mt-0.5">{videoResult.transcriptTranslation[i]}</p>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(videoResult.translations || []).length > 0 && (
                                                                <div className="bg-black/60 border border-zinc-800 p-2 space-y-2">
                                                                    <p className="text-[9px] text-green-400 font-black mb-1 uppercase">Từ Vựng / Dịch Thuật:</p>
                                                                    {videoResult.translations.map((t, i) => (
                                                                        <div key={i} className="text-[10px] pb-1.5 border-b border-zinc-800 last:border-0">
                                                                            <p className="text-cyan-300 font-bold"><ClickableSentence text={t.original} onWordClick={lookupWordAction} /> {t.level && t.level !== 'Không rõ' && <span className="text-[8px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1 ml-1">{t.level}</span>}</p>
                                                                            <p className="text-zinc-400">{t.translated}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* ⏱️ THỜI GIAN ĐÃ HỌC + nút LƯU/CHIA SẺ ngay trong Chế Độ Ngang, khỏi phải Thoát Ngang mới lưu được */}
                                                            <p className="text-[9px] text-zinc-500 font-bold text-center">⏱️ Đã học: <span className="text-cyan-400">{formatStudyTime(videoStudySeconds)}</span></p>
                                                            <div className="flex gap-1">
                                                                <button onClick={saveVideoNoteAction} className="flex-1 bg-gradient-to-r from-green-800 to-cyan-800 text-white py-2.5 text-[9px] font-black uppercase">LƯU BÍ TỊCH</button>
                                                                {videoShareCode && <button onClick={()=>{ navigator.clipboard.writeText(videoShareCode); playSfx('CLICK'); alert("Đã chép Mã Bí Tịch Video!"); }} className="bg-yellow-600 text-black px-3 text-[9px] font-black uppercase">📤</button>}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <p className="text-[10px] text-zinc-600 italic text-center py-6">Chưa có dữ liệu Phân Tích. Hãy Thoát Ngang rồi bấm "Phân Tích" trước để có bảng từ vựng ở đây.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    )}

                                    <button onClick={analyzeVideoAction} disabled={videoAnalyzing} className="w-full bg-cyan-700 hover:bg-cyan-500 disabled:opacity-50 text-white py-3 font-black text-[10px] uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                        {videoAnalyzing ? 'Đang Phân Tích Tiên Âm...' : 'Phân Tích'}
                                    </button>

                                    {videoResult && (
                                        <>
                                            <div className="bg-black border border-zinc-700 p-3">
                                                <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">Tóm Tắt Ý Chính:</p>
                                                <p className="text-sm text-zinc-300 italic">{videoResult.summary}</p>
                                            </div>

                                            {videoResult.transcript?.length > 0 && (
                                                <div className="bg-zinc-900 border border-cyan-700/60 p-3">
                                                    <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                                                        <p className="text-[10px] text-cyan-400 font-black uppercase">Văn Bản (bấm vào từ để tra nghĩa):</p>
                                                        <div className="flex gap-1">
                                                            {videoResult.isCjk && <button onClick={()=>{ playSfx('CLICK'); setShowPinyin(v=>!v); }} className={`text-[9px] font-black px-2 py-1 border uppercase ${showPinyin ? 'bg-yellow-600 border-yellow-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>拼 {getPhoneticLabel()}</button>}
                                                            <button onClick={()=>{ playSfx('CLICK'); setShowTranslation(v=>!v); }} className={`text-[9px] font-black px-2 py-1 border uppercase ${showTranslation ? 'bg-green-600 border-green-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>🇻🇳 Dịch</button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-zinc-500 mb-2 italic">Video sẽ tự tạm dừng khi bạn tra từ. Bấm chữ đầu rồi bấm chữ cuối của cụm để tra cả cụm từ (VD: bấm 因 rồi bấm 为 để tra 因为).</p>
                                                    <div className="flex flex-wrap gap-2 text-[9px] mb-2"><span className="text-yellow-300 border-b-2 border-yellow-400 bg-yellow-500/20 px-1">Rất quan trọng</span><span className="text-emerald-300 border-b-2 border-emerald-400 bg-emerald-500/15 px-1">Quan trọng</span><span className="text-sky-300 border-b border-sky-400/70 bg-sky-500/10 px-1">Bổ trợ</span></div>
                                                    <div className="space-y-1.5 leading-relaxed">
                                                        {videoResult.transcript.map((sentence, i) => (
                                                            <div key={i} ref={el => { transcriptItemRefs.current.portrait[i] = el; }}
                                                                 className={`transition-colors duration-300 -mx-1.5 px-1.5 py-0.5 rounded ${i === activeTranscriptIdx ? 'bg-cyan-800/40 border-l-2 border-yellow-400' : ''}`}>
                                                                {showPinyin && videoResult.transcriptPinyin?.[i] && <p className="text-[11px] text-yellow-400 italic leading-tight">{videoResult.transcriptPinyin[i]}</p>}
                                                                <p className="text-sm text-white">
                                                                    <ClickableSentence text={sentence} onWordClick={lookupWordAction} vocab={vocabMarks} />
                                                                </p>
                                                                {showTranslation && videoResult.transcriptTranslation?.[i] && <p className="text-[11px] text-green-400/90 italic leading-tight mt-0.5">{videoResult.transcriptTranslation[i]}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-zinc-900 border border-zinc-700 p-3">
                                                <p className="text-[10px] text-green-400 font-black mb-1 uppercase">Dịch Thuật Song Ngữ:</p>
                                                <p className="text-[9px] text-zinc-500 mb-2 italic">Bấm vào từ trong Câu gốc để AI giải nghĩa từ đó đúng theo ngữ cảnh câu này.</p>
                                                <div className="space-y-2">
                                                    {(videoResult.translations || []).map((t, i) => (
                                                        <div key={i}>
                                                            <p className="text-xs text-white"><span className="text-cyan-300 font-bold">Câu gốc:</span> <ClickableSentence text={t.original} onWordClick={lookupWordAction} /> {t.level && t.level !== 'Không rõ' && <span className="text-[9px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1.5 py-0.5 ml-1 font-black uppercase">{t.level}</span>}</p>
                                                            <p className="text-xs text-zinc-400"><span className="text-green-400 font-bold">Dịch nghĩa:</span> {t.translated}</p>
                                                            {i < videoResult.translations.length - 1 && <hr className="border-zinc-800 mt-2" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ⏱️ THỜI GIAN ĐÃ HỌC video này trong phiên hiện tại */}
                                            <p className="text-[9px] text-zinc-500 font-bold text-center">⏱️ Thời gian đã học: <span className="text-cyan-400">{formatStudyTime(videoStudySeconds)}</span></p>

                                            {/* ÔN TẬP TỪ VỰNG QUA ẢI: học xong video là ôn liền, tránh quên ngay */}
                                            <button onClick={startVideoVocabReview} className="w-full bg-gradient-to-r from-purple-800 to-cyan-700 text-white py-3 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                                🧠 ÔN TẬP TỪ VỰNG ({Math.max(1, Math.ceil((videoResult.translations || []).length / VOCAB_QUESTIONS_PER_ROUND))} Ải)
                                            </button>

                                            {/* ✍️ LUYỆN VIẾT CHỮ: chỉ hiện khi video dùng chữ tượng hình và có ít nhất 1 chữ Hán rút được từ Từ Vựng */}
                                            {videoResult.isCjk && getVideoHanziList().length > 0 && (
                                                <button onClick={() => { playSfx('CLICK'); setWritePracticeChar(null); setWriteCharModal(true); }} className="w-full bg-gradient-to-r from-pink-800 to-yellow-700 text-white py-3 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                                                    ✍️ LUYỆN VIẾT CHỮ ({getVideoHanziList().length} Chữ)
                                                </button>
                                            )}

                                            <div className="flex gap-2">
                                                <button onClick={saveVideoNoteAction} className="flex-1 bg-gradient-to-r from-green-800 to-cyan-800 text-white py-4 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform">LƯU BÍ TỊCH VÀO TÀNG KINH CÁC</button>
                                                {videoShareCode && <button onClick={()=>{ navigator.clipboard.writeText(videoShareCode); playSfx('CLICK'); alert("Đã chép Mã Bí Tịch Video!"); }} className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 text-[11px] font-black uppercase" title="Chép Mã Chia Sẻ">📤</button>}
                                            </div>
                                        </>
                                    )}

                                    {user.videoNotes?.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">🎵 Danh Sách Phát (bấm để phát lại):</p>
                                            <div className="space-y-2">
                                                {user.videoNotes.map(n => (
                                                    <div key={n.id} className={`bg-black/80 border p-3 flex justify-between items-center cursor-pointer transition-colors ${videoLink === n.link ? 'border-cyan-400 bg-cyan-950/40' : 'border-zinc-800 hover:border-cyan-700'}`} onClick={()=>loadSavedVideoNote(n)}>
                                                        <p className="text-[11px] text-zinc-300 truncate flex-1 mr-2 flex items-center gap-2"><span className="text-cyan-400">▶</span>{n.summary}</p>
                                                        <button onClick={(e)=>{ e.stopPropagation(); shareVideoNoteAction(n); }} className="text-yellow-600 text-lg mr-2" title="Chép Mã chia sẻ">📤</button>
                                                        <button onClick={async (e)=>{ e.stopPropagation(); if(await askConfirm("Xóa bí tịch này?")){ firestore.collection('users').doc(user.uid).update({videoNotes: user.videoNotes.filter(x=>x.id!==n.id)}); playSfx('FAIL'); } }} className="text-red-800 text-lg">🗑️</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* MODAL ẢI ÔN TỪ VỰNG SAU VIDEO */}
                        {/* 🎨 ĐỒNG BỘ UI: khung ải ôn tập video dùng ĐÚNG cấu trúc như Ải Bí Tịch văn bản
                            (viền indigo, nền ảnh động huyền ảo, khung cuộn riêng chống tràn nền, gợi ý khi
                            chọn sai, AI phân tích sau khi trả lời). */}
                        {videoQuizActive && videoQuizRounds.length > 0 && (
                            <div className="fixed inset-0 bg-black/90 z-[998] flex items-center justify-center p-4">
                                <div className="w-full max-w-sm h-[85vh] flex flex-col border border-indigo-500/50 p-6 shadow-[0_0_30px_rgba(79,70,229,0.2),inset_0_0_20px_rgba(79,70,229,0.3)] relative animate-fadeIn rounded-xl overflow-hidden" style={{ backgroundImage: 'url(https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                                    <div className="relative z-10 flex flex-col h-full min-h-0">
                                        {videoQuizFinished ? (
                                            (() => {
                                                const rs = videoQuizRoundResults;
                                                const sumCorrect = rs.reduce((a, r) => a + r.score, 0);
                                                const sumTotal = rs.reduce((a, r) => a + r.total, 0);
                                                const sumStones = rs.reduce((a, r) => a + r.stones, 0);
                                                const sumFame = rs.reduce((a, r) => a + r.fame, 0);
                                                const rate = sumTotal > 0 ? sumCorrect / sumTotal : 0;
                                                const pct = Math.round(rate * 100);
                                                const perfect = sumTotal > 0 && sumCorrect === sumTotal;
                                                const verdict = perfect ? { icon: '🏆', text: 'HOÀN HẢO! Ngài đã nhớ trọn vẹn từ vựng của video này.', cls: 'text-yellow-400' }
                                                    : rate >= 0.8 ? { icon: '🎖️', text: 'Xuất sắc! Chỉ còn vài từ nữa là thuộc lòng.', cls: 'text-green-400' }
                                                    : rate >= 0.6 ? { icon: '📜', text: 'Khá tốt! Ôn thêm một lượt nữa sẽ nhớ chắc hơn.', cls: 'text-cyan-400' }
                                                    : { icon: '🌱', text: 'Cần ôn thêm — xem lại bảng Dịch Thuật rồi thử lại nhé!', cls: 'text-orange-400' };
                                                return (
                                                    <div className="text-center flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 animate-fadeIn">
                                                        {perfect && <ConfettiBurst />}
                                                        <span className="text-5xl block mb-2">{verdict.icon}</span>
                                                        <h3 className="text-xl font-black text-cyan-400 uppercase italic mb-1 font-playfair drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Hoàn Tất Ôn Tập</h3>
                                                        <p className={`text-[11px] font-bold italic mb-4 ${verdict.cls}`}>{verdict.text}</p>
                                                        <p className="text-4xl font-black mb-1"><span className={rate >= 0.6 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{sumCorrect}</span><span className="text-zinc-600"> / {sumTotal}</span></p>
                                                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4">Chính xác {pct}% · {rs.length} Ải</p>
                                                        <div className="bg-black border border-zinc-800 p-4 mb-4 relative mt-6 shadow-inner">
                                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest whitespace-nowrap">TỔNG THU HOẠCH</div>
                                                            <div className="flex justify-around items-center pt-3">
                                                                <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className="text-lg font-black text-white drop-shadow-[0_0_2px_#fff]">{sumStones > 0 ? `+${sumStones}` : 0}</span></div>
                                                                <div className="h-10 w-px bg-zinc-800"></div>
                                                                <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className="text-lg font-black text-yellow-500 drop-shadow-[0_0_2px_#eab308]">{sumFame > 0 ? `+${sumFame}` : 0}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5 mb-2 text-left">
                                                            {rs.map(r => (
                                                                <div key={r.round} className={`flex justify-between items-center px-3 py-2 border text-[11px] font-black ${r.score === r.total ? 'border-yellow-600/70 bg-yellow-900/10 text-yellow-300' : 'border-zinc-800 bg-black/50 text-zinc-300'}`}>
                                                                    <span className="uppercase">Ải {r.round} {r.score === r.total && '🌟'}</span>
                                                                    <span>{r.score}/{r.total}</span>
                                                                    <span className="text-cyan-300">💎 {r.stones > 0 ? `+${r.stones}` : 0}{r.fame > 0 ? ` · ⭐ +${r.fame}` : ''}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <MiniLeaderboard list={topSeasonList} currentUser={user} />
                                                        <div className="flex gap-2 mt-6">
                                                            <button onClick={startVideoVocabReview} className="flex-1 border border-indigo-500 text-indigo-300 py-3 font-black text-[10px] uppercase hover:bg-indigo-900/30">🔁 Ôn Lại</button>
                                                            <button onClick={closeVideoQuizSummary} className="flex-1 bg-cyan-700 hover:bg-cyan-500 text-white py-3 font-black text-[10px] uppercase">Đóng</button>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : !videoQuizShowResult ? (
                                            <>
                                                <div className="flex justify-between items-center mb-4 border-b border-indigo-500/30 pb-3 gap-2 flex-shrink-0">
                                                    <span className="text-[11px] font-black text-indigo-300 uppercase truncate flex-1">Ải {videoQuizRoundIdx+1}/{videoQuizRounds.length} · Câu {videoQuizQIdx+1}/{videoQuizRounds[videoQuizRoundIdx].length}</span>
                                                    <span className="text-[11px] font-black text-green-400 uppercase whitespace-nowrap">Đúng: {videoQuizScore}</span>
                                                    <button onClick={async ()=>{ if(await askConfirm("Bỏ ải ôn tập?")){ playSfx('FAIL'); setVideoQuizActive(false); } }} className="text-red-400 text-lg hover:scale-110 ml-2 p-1">🚪</button>
                                                </div>
                                                <div key={`${videoQuizRoundIdx}-${videoQuizQIdx}`} className="slide-in-right w-full flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                                    <p className="text-lg text-white font-bold mb-6 leading-loose min-h-[60px] text-center break-words [overflow-wrap:anywhere] drop-shadow-[0_0_2px_#000]">{videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].term}</p>
                                                    <div className="space-y-4">
                                                        {videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].options.map((opt, i) => {
                                                            // 🆕 Đáp án đã bị loại do chọn sai -> ẨN HẲN trong lúc đang làm, chỉ hiện lại khi đã có kết quả (đúng/bỏ cuộc)
                                                            if (videoQuizSelected === null && videoQuizEliminated.includes(i)) return null;
                                                            let cls = "bg-black/60 border border-indigo-500/40 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-900/40 shadow-[0_0_10px_rgba(79,70,229,0.1)]";
                                                            if (videoQuizSelected !== null) {
                                                                if (i === videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].correctIndex) cls = "bg-green-900/60 border border-green-400 text-green-300 scale-[1.02] shadow-[0_0_15px_rgba(74,222,128,0.4)] font-black";
                                                                else if (i === videoQuizSelected || videoQuizEliminated.includes(i)) cls = "bg-red-900/60 border border-red-500 text-red-300 font-bold";
                                                                else cls = "bg-black/50 border border-zinc-800 text-zinc-500 opacity-40";
                                                            }
                                                            return (<button key={i} disabled={videoQuizSelected!==null} onClick={()=>selectVideoQuizAnswer(i)} className={`w-full text-left p-4 text-sm break-words [overflow-wrap:anywhere] ${cls}`}><span className="text-[11px] font-black mr-3 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + i)}.</span>{opt}</button>);
                                                        })}
                                                    </div>

                                                    {/* 🆕 BẢNG GỢI Ý: hiện ngay khi chọn sai ít nhất 1 lần, thay cho đáp án vừa biến mất */}
                                                    {videoQuizSelected === null && videoQuizEliminated.length > 0 && (
                                                        <div className="bg-orange-950/40 border border-orange-500/50 p-3 space-y-2 animate-fadeIn mt-4">
                                                            <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">❌ Đã loại {videoQuizEliminated.length} đáp án sai — thử lại nhé!</p>
                                                            {videoHintText && <p className="text-[12px] text-orange-100 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-t border-orange-500/30 pt-2">{videoHintText}</p>}
                                                            <div className="flex gap-2">
                                                                <button onClick={handleVideoRequestHint} disabled={videoHintLoading} className="flex-1 bg-orange-900/50 border border-orange-500 text-orange-300 py-2 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{videoHintLoading ? '💡 Đang nghĩ...' : (videoHintText ? '💡 Gợi Ý Khác' : '💡 Xin Gợi Ý AI')}</button>
                                                                <button onClick={handleVideoGiveUp} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">🏳️ Xem Đáp Án</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 🆕 DỪNG LẠI SAU KHI TRẢ LỜI: xem AI phân tích (tuỳ chọn) rồi tự bấm để đi tiếp */}
                                                    {videoQuizSelected !== null && (
                                                        <div className="mt-5 pt-4 border-t border-indigo-500/20 space-y-3">
                                                            {videoAiExplainText && <div className="bg-black/70 border border-purple-500/40 p-3 text-[12px] text-purple-200 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-40 overflow-y-auto custom-scrollbar">{videoAiExplainText}</div>}
                                                            <div className="flex gap-2">
                                                                <button onClick={handleVideoAiExplain} disabled={videoAiExplainLoading} className="flex-1 bg-purple-900/50 border border-purple-500 text-purple-300 py-3 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{videoAiExplainLoading ? '🔮 Đang phân tích...' : (videoAiExplainText ? '🔮 Phân Tích Lại' : '🔮 AI Phân Tích')}</button>
                                                                <button onClick={nextVideoQuizQuestion} className="flex-1 bg-cyan-700 hover:bg-cyan-500 text-white py-3 text-[10px] font-black uppercase">
                                                                    {videoQuizQIdx + 1 < videoQuizRounds[videoQuizRoundIdx].length ? 'Câu Tiếp ➡' : 'Xem Kết Quả Ải 🏆'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                                <h3 className="text-xl font-black text-cyan-400 uppercase italic mb-4 font-playfair drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Kết Thúc Ải {videoQuizRoundIdx+1}</h3>
                                                <p className="text-3xl font-black mb-6"><span className={videoQuizScore > 0 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{videoQuizScore}</span><span className="text-zinc-600"> / {videoQuizRounds[videoQuizRoundIdx].length}</span></p>
                                                {videoQuizScore === videoQuizRounds[videoQuizRoundIdx].length && <p className="text-yellow-400 text-[11px] font-black uppercase tracking-widest mb-2 animate-pulse">🌟 Ải Hoàn Hảo! 🌟</p>}
                                                {(() => {
                                                    const rw = calcVideoQuizRoundReward(videoQuizScore, videoQuizRounds[videoQuizRoundIdx].length);
                                                    return (
                                                        <div className="bg-black border border-zinc-800 p-4 mb-6 relative mt-6 shadow-inner">
                                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                                                            <div className="flex justify-around items-center pt-3">
                                                                <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className="text-lg font-black text-white drop-shadow-[0_0_2px_#fff]">{rw.stones > 0 ? `+${rw.stones}` : 0}</span></div>
                                                                <div className="h-10 w-px bg-zinc-800"></div>
                                                                <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className="text-lg font-black text-yellow-500 drop-shadow-[0_0_2px_#eab308]">{rw.fame > 0 ? `+${rw.fame}` : 0}</span></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <button onClick={nextVideoQuizRound} className="w-full bg-cyan-700 hover:bg-cyan-500 text-white py-3 font-black text-[11px] uppercase">
                                                    {videoQuizRoundIdx + 1 < videoQuizRounds.length ? 'Nhận Thưởng & Vào Ải Tiếp' : 'Nhận Thưởng & Xem Tổng Kết 🏁'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL KHÔI PHỤC CHUỖI ĐIỂM DANH: 3 lựa chọn khi bỏ lỡ quá 24h */}
                        {streakRestoreModal && user && (
                            <div className="fixed inset-0 bg-black/85 z-[997] flex items-center justify-center p-4">
                                <div className="w-full max-w-sm bg-zinc-950 border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.35)] p-5 space-y-3 animate-fadeIn text-center">
                                    <p className="text-3xl">🔥💔</p>
                                    <h3 className="text-lg font-black text-orange-400 uppercase">Chuỗi Điểm Danh Sắp Đứt!</h3>
                                    <p className="text-[11px] text-zinc-400">Ngài đã bỏ lỡ hơn 24h! Chuỗi <span className="text-orange-400 font-black">{streakRestoreModal.oldStreak} ngày</span> sẽ mất nếu không khôi phục.</p>
                                    <div className="space-y-2 pt-2 text-left">
                                        <button onClick={streakRestoreByStudy} className="w-full bg-cyan-800 hover:bg-cyan-600 text-white py-3 text-[10px] font-black uppercase">📖 Học 1 Ải Hôm Nay Để Khôi Phục (Miễn Phí)</button>
                                        <button onClick={streakRestoreBySpirit} className="w-full bg-blue-900 hover:bg-blue-700 text-white py-3 text-[10px] font-black uppercase">💎 Dùng {Math.min(streakRestoreModal.oldStreak * 20, 2000)} Linh Thạch</button>
                                        <button onClick={streakRestoreByFame} className="w-full bg-yellow-800 hover:bg-yellow-600 text-white py-3 text-[10px] font-black uppercase">⭐ Dùng {Math.min(streakRestoreModal.oldStreak * 5, 500)} Danh Vọng</button>
                                        <button onClick={streakRestoreDismiss} className="w-full text-zinc-500 hover:text-red-400 py-2 text-[9px] font-black uppercase">Bỏ Qua, Chấp Nhận Mất Chuỗi</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODAL TRA TỪ: nghĩa - từ loại/ngữ pháp - hoàn cảnh sử dụng - ví dụ
                            SỬA LỖI (Chế Độ Ngang): trước đây modal này z-[999] và nằm trong cây DOM bình
                            thường, trong khi khung .landscape-fs lại là 1 portal ra thẳng document.body với
                            z-index 9990 -> khi đang ở Chế Độ Ngang, modal bị khung landscape đè lên, bấm từ
                            coi như "không có phản hồi" dù thực ra nó vẫn mở, chỉ là bị che khuất phía sau.
                            Sửa bằng cách portal luôn modal này ra document.body (giống hệt cách landscape-fs
                            đang làm) + nâng z-index lên 9995 (cao hơn 9990 nhưng vẫn thấp hơn banner lỗi 9999)
                            để nó LUÔN nổi lên trên cùng, dù đang ở chế độ dọc hay chế độ ngang. */}
                        {wordLookup && ReactDOM.createPortal(
                            <div className="fixed inset-0 bg-black/80 z-[9997] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setWordLookup(null)}>
                                <div className="w-full sm:max-w-sm bg-zinc-950 border-t-2 sm:border-2 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.4)] p-4 space-y-3 animate-fadeIn" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center border-b border-cyan-800 pb-2">
                                        <div>
                                            <h3 className="text-lg font-black text-cyan-300">{wordLookup.word}</h3>
                                            {wordLookup.data?.pinyin && <p className="text-[11px] text-yellow-400 font-bold italic">{wordLookup.data.pinyin}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {wordLookup.data?.level && wordLookup.data.level !== 'Không rõ' && <span className="text-[9px] font-black uppercase bg-purple-900/60 border border-purple-500 text-purple-300 px-2 py-1">{wordLookup.data.level}</span>}
                                            <button onClick={() => setWordLookup(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
                                        </div>
                                    </div>
                                    {wordLookup.loading && <p className="text-xs text-zinc-400 italic py-4 text-center">Đang tra cứu Tiên Điển...</p>}
                                    {wordLookup.error && <p className="text-xs text-red-400 py-2">Lỗi tra từ: {wordLookup.error}</p>}
                                    {wordLookup.data && (
                                        <div className="space-y-2 text-xs">
                                            <p><span className="text-yellow-500 font-black uppercase">Nghĩa: </span><span className="text-white">{wordLookup.data.meaning}</span></p>
                                            <p><span className="text-purple-400 font-black uppercase">Từ loại/Ngữ pháp: </span><span className="text-white">{wordLookup.data.partOfSpeech}</span></p>
                                            <p><span className="text-cyan-400 font-black uppercase">Hoàn cảnh sử dụng: </span><span className="text-white">{wordLookup.data.usage}</span></p>
                                            <p><span className="text-green-400 font-black uppercase">Ví dụ: </span><span className="text-white">{wordLookup.data.example}</span></p>
                                        </div>
                                    )}
                                    <button onClick={() => { setWordLookup(null); if (ytPlayerRef.current?.playVideo) ytPlayerRef.current.playVideo(); }} className="w-full bg-cyan-700 hover:bg-cyan-500 text-white py-2 text-[10px] font-black uppercase">Đóng &amp; Tiếp Tục Xem</button>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* ✍️ MODAL LUYỆN VIẾT CHỮ: bước 1 chọn 1 chữ Hán trong danh sách từ vựng video, bước 2
                            hiện khung viết HanziWriter cho đúng chữ đó (component CharacterWritePractice). */}
                        {writeCharModal && ReactDOM.createPortal(
                            <div className="fixed inset-0 bg-black/85 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setWriteCharModal(false)}>
                                <div className="w-full sm:max-w-sm bg-zinc-950 border-t-2 sm:border-2 border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.35)] p-4 space-y-3 animate-fadeIn max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center border-b border-pink-800 pb-2">
                                        <h3 className="text-base font-black text-pink-300 uppercase tracking-wide">✍️ Luyện Viết Chữ</h3>
                                        <button onClick={() => setWriteCharModal(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
                                    </div>

                                    {!writePracticeChar ? (
                                        <>
                                            <p className="text-[10px] text-zinc-400 italic">Chọn 1 chữ trong Từ Vựng của video này để luyện viết theo đúng thứ tự nét:</p>
                                            <div className="grid grid-cols-6 gap-2">
                                                {getVideoHanziList().map((ch, i) => (
                                                    <button key={i} onClick={() => { playSfx('CLICK'); setWritePracticeChar(ch); }} className="aspect-square bg-black border border-pink-700/60 hover:border-pink-400 hover:bg-pink-900/30 text-white text-xl font-bold flex items-center justify-center transition-colors">{ch}</button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center mb-1">
                                                <button onClick={() => setWritePracticeChar(null)} className="text-[10px] text-pink-400 font-black uppercase">‹ Chọn Chữ Khác</button>
                                                <span className="text-[9px] text-zinc-500 font-bold">{getVideoHanziList().indexOf(writePracticeChar) + 1} / {getVideoHanziList().length}</span>
                                            </div>
                                            <CharacterWritePractice
                                                char={writePracticeChar}
                                                playSfx={playSfx}
                                                apiKey={anyGeminiKey}
                                                meaningCache={writeMeaningCache}
                                                onMeaningFetched={(ch, data) => setWriteMeaningCache(prev => ({ ...prev, [ch]: data }))}
                                                onAutoAdvance={() => { const list = getVideoHanziList(); const idx = list.indexOf(writePracticeChar); setWritePracticeChar(list[(idx + 1) % list.length]); }}
                                            />
                                            {/* ✍️ NÚT CHUYỂN CHỮ THỦ CÔNG: viết xong sẽ TỰ ĐỘNG sang chữ tiếp theo, nhưng vẫn giữ nút
                                                này để Ngài chủ động bỏ qua/sang chữ khác bất cứ lúc nào không cần đợi. */}
                                            <button onClick={() => { playSfx('CLICK'); const list = getVideoHanziList(); const idx = list.indexOf(writePracticeChar); setWritePracticeChar(list[(idx + 1) % list.length]); }} className="w-full mt-2 bg-gradient-to-r from-pink-700 to-yellow-600 hover:scale-[1.02] transition-transform text-white py-2.5 text-[10px] font-black uppercase">Chữ Tiếp Theo ⏭</button>
                                        </>
                                    )}
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* PROFILE */}
                        {appState === 'SUPHU' && user && (<SuPhuHub user={user} onBack={() => changeAppState('DASHBOARD')} playSfx={playSfx} />)}
                        {appState === 'PROFILE' && user && (
                            <div className="w-full h-[85vh] max-w-sm bg-zinc-900 border border-yellow-700/50 p-6 text-center overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn">
                                <h2 className="text-yellow-500 font-black uppercase text-xl mb-6 tracking-widest">Khắc Họa Chân Ngã</h2>
                                <div className="relative inline-block mb-4"><img src={profileImage} className={`w-24 h-24 object-cover ${user.frame?'frame-'+user.frame:'border-2 border-yellow-500'} ${user.aura||''}`} alt="avatar" /></div><br/>
                                
                                <div className="flex justify-center gap-2 mb-4">
                                    <label className="flex flex-col items-center justify-center text-[9px] bg-zinc-800 hover:bg-zinc-700 px-4 py-2 font-bold uppercase cursor-pointer transition-colors border border-zinc-700">
                                        <span>Đổi Ảnh</span>
                                        <span className="text-[7px] text-zinc-400 lowercase font-normal mt-0.5">(avatar)</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e=>{ const file = e.target.files[0]; if(file){ if(file.size > 1.5 * 1024 * 1024) return alert("Dung lượng quá lớn!"); const reader = new FileReader(); reader.onload = ev => setProfileImage(ev.target.result); reader.readAsDataURL(file); } }}/>
                                    </label>
                                    <label className="flex flex-col items-center justify-center text-[9px] bg-indigo-900 hover:bg-indigo-700 px-4 py-2 font-bold uppercase cursor-pointer transition-colors border border-indigo-500 text-indigo-200">
                                        <span>Truyền Tiên Âm</span>
                                        <span className="text-[7px] text-indigo-400 lowercase font-normal mt-0.5">(nhạc nền mp3)</span>
                                        <input type="file" className="hidden" accept="audio/*,video/mp4" onChange={handleBgmUpload}/>
                                    </label>
                                </div>

                                <div className="mt-6 bg-black border border-cyan-900/50 p-3 flex justify-between items-center">
                                    <span className="text-[10px] text-zinc-400 font-black uppercase">ID: <span className="text-cyan-400 text-xs">{user.gameId || user.uid}</span></span>
                                    <button onClick={()=>{navigator.clipboard.writeText(user.gameId || user.uid); alert("Đã chép ID!");}} className="bg-zinc-800 px-3 py-2 text-[9px] text-white font-black">COPY</button>
                                </div>
                                <div className="mt-6 text-left space-y-3 bg-black/40 p-4 border border-zinc-800">
                                    <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Đạo Hiệu Mới</p>
                                    <input className="w-full bg-zinc-900 border border-zinc-700 p-3 text-sm text-white mb-1 outline-none" placeholder="Nhập Đạo Hiệu..." value={newName} onChange={e=>setNewName(e.target.value)} />
                                    <p className="text-[9px] text-zinc-500 font-bold">Phí: <span className="text-cyan-400">1000 LT</span> & <span className="text-yellow-500">100 ⭐</span>.</p>
                                    <button onClick={handleChangeNameAction} className="w-full bg-cyan-900 text-cyan-200 border border-cyan-600 py-3 text-[10px] font-black uppercase">Đổi Đạo Hiệu</button>
                                </div>
                                <div className="mt-6 bg-black/40 border border-cyan-900/60 p-3 text-left space-y-2">
                                    <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">🔑 API Key Gemini · Song Kiếm</p>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed">Nhập 2 Key khác nhau: Key nào không gọi được (hết lượt, sai, treo, máy chủ bận) thì AI tự chuyển ngay sang Key còn lại. Hạn mức chỉ cộng dồn khi 2 Key thuộc 2 dự án Google khác nhau (tạo tại aistudio.google.com/apikey). Key 1 dùng chung với mục Học Qua Video.</p>
                                    <div className="flex gap-1">
                                        <button onClick={() => GeminiPool.setMode('parallel')} className={'flex-1 py-2 text-[9px] font-black uppercase border ' + (GeminiPool.getMode() === 'parallel' ? 'bg-cyan-600 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700')}>Song song (chia đều)</button>
                                        <button onClick={() => GeminiPool.setMode('backup')} className={'flex-1 py-2 text-[9px] font-black uppercase border ' + (GeminiPool.getMode() === 'backup' ? 'bg-cyan-600 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700')}>Key 2 dự phòng</button>
                                    </div>
                                    {[1, 2].map(n => {
                                        const draft = n === 1 ? keyDraft1 : keyDraft2;
                                        const saved = n === 1 ? videoApiKey : geminiKey2;
                                        const stt = GeminiPool.statusOf(saved.trim());
                                        const le = GeminiPool.lastOf(saved.trim());
                                        return (
                                            <div key={n} className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase">{n === 1 ? 'Key 1 (chính)' : 'Key 2 (phụ)'}</span>
                                                    <span className={'text-[9px] font-black ' + stt.cls}>{stt.text}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <input type={showKeys ? 'text' : 'password'} autoComplete="off" spellCheck={false} className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="AIza..." value={draft} onChange={e => (n === 1 ? setKeyDraft1(e.target.value) : setKeyDraft2(e.target.value))} />
                                                    <button onClick={() => handleSaveKey(n)} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-3 text-[10px] font-black uppercase">Lưu</button>
                                                </div>
                                                {le && <p className="text-[9px] text-zinc-500 break-words">Lỗi gần nhất: {le}</p>}
                                            </div>
                                        );
                                    })}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => setShowKeys(s => !s)} className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">{showKeys ? 'Ẩn Key' : 'Hiện Key'}</button>
                                        <button onClick={handleTestKeys} disabled={keyTesting} className="flex-1 bg-indigo-900 border border-indigo-500 text-indigo-200 py-2 text-[10px] font-black uppercase disabled:opacity-50">{keyTesting ? 'Đang thử...' : 'Thử Key'}</button>
                                    </div>
                                    <p className="text-[9px] text-emerald-400 font-bold">{GeminiPool.summary(videoApiKey)}</p>
                                </div>
                                <div className="mt-6 bg-black/40 border border-red-900/50 p-3">
                                   <p className="text-[10px] text-red-500 font-black mb-2 uppercase">Bảo Mật</p>
                                    <button onClick={() => { playSfx('CLICK'); setPwdModal({show: true, val: '', oldVal: ''}); }} className="w-full bg-red-900/40 text-red-300 border border-red-600 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white">Đổi Mật Mã</button>
                                    <div className="mt-3 pt-3 border-t border-red-900/30">
                                        <p className="text-[9px] text-zinc-500 font-bold mb-2 leading-relaxed">Liên kết Google để có đường lui, tránh mất tài khoản nếu quên Mật Mã (bắt buộc nếu là tài khoản khách/tự tạo):</p>
                                        {isGoogleLinked ? (
                                            <p className="w-full bg-green-900/30 text-green-400 border border-green-700 py-3 text-[10px] font-black uppercase tracking-widest text-center">✓ ĐÃ LIÊN KẾT GOOGLE</p>
                                        ) : (
                                            <button onClick={handleLinkGoogleAccount} className="w-full bg-white text-black py-3 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">🔗 LIÊN KẾT TÀI KHOẢN GOOGLE</button>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-red-900/30">
                                        {user.recoveryEmail ? (
                                            <p className="w-full bg-green-900/30 text-green-400 border border-green-700 py-3 text-[10px] font-black uppercase tracking-widest text-center">✉️ Email Khôi Phục: {user.recoveryEmail}</p>
                                        ) : (
                                            <>
                                                <p className="text-[9px] text-zinc-500 font-bold mb-2 leading-relaxed">Hoặc thêm Email thật để nhận LIÊN KẾT khôi phục Mật Mã qua mail nếu quên:</p>
                                                <div className="flex gap-2">
                                                    <input className="flex-1 bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-cyan-500" placeholder="ban@email.com" value={recoveryEmailInput} onChange={e=>setRecoveryEmailInput(e.target.value)} />
                                                    <button onClick={handleLinkRecoveryEmail} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-4 text-[10px] font-black uppercase">Lưu</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 h-16 bg-black border border-zinc-800 overflow-hidden flex items-center justify-center relative">{profileBg ? <img src={profileBg} className="w-full h-full object-cover opacity-60"/> : <span className="text-[10px] text-zinc-600 font-playfair italic">Chưa thiết lập ảo cảnh nền</span>}</div>
                                <label className="text-[9px] bg-zinc-800 px-4 py-2 font-bold uppercase mt-2 cursor-pointer inline-block border border-zinc-700">Đổi Ảo Cảnh Nền<input type="file" className="hidden" accept="image/*" onChange={e=>{ const file = e.target.files[0]; if(file){ if(file.size > 1.5 * 1024 * 1024) return alert("Dung lượng quá lớn!"); const reader = new FileReader(); reader.onload = ev => setProfileBg(ev.target.result); reader.readAsDataURL(file); } }}/></label>
                                <div className="mt-6 text-left">
                                    <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase tracking-widest">Di ngôn:</p>
                                    <textarea className="w-full bg-black border border-zinc-800 p-3 text-xs italic text-zinc-300 outline-none" rows="3" value={profileBio} onChange={e=>setProfileBio(e.target.value)} maxLength="100" placeholder="Viết di ngôn..."/>
                                </div>
                                <button onClick={saveProfileAction} className="w-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 text-black py-4 mt-6 text-[11px] font-black uppercase hover:scale-[1.02] shadow-lg">LƯU LẠI ẤN KÝ</button>
                                <button onClick={handleLogout} className="w-full mt-4 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">ĐĂNG XUẤT</button>
                                <button onClick={()=>changeAppState('DASHBOARD')} className="mt-6 text-[10px] text-zinc-500 font-bold uppercase hover:text-white pb-1 block mx-auto">ĐÓNG HỒ SƠ</button>
                            </div>
                        )}

                        {/* XEM PROFILE NGƯỜI KHÁC */}
                        {appState === 'VIEW_PROFILE' && viewingUser && (
                            <div className="w-full max-w-xs bg-zinc-900 border border-yellow-500/50 p-6 text-center shadow-2xl animate-fadeIn">
                                <img src={viewingUser.photo} className={`w-28 h-28 mx-auto object-cover mb-4 ${viewingUser.frame ? 'frame-'+viewingUser.frame : 'border-2 border-yellow-500'} ${viewingUser.aura||''}`} alt="avatar" />
                                <div className="inline-block bg-black px-3 py-1 border border-yellow-500 text-yellow-500 text-[10px] font-black uppercase mb-4 shadow-[0_0_5px_rgba(234,179,8,0.2)]">{RANKS.find(r => r.id === viewingUser.rank)?.name || 'Vô Danh'}</div>
                                <div><UserName u={viewingUser} cls="text-2xl tracking-wider drop-shadow-[0_0_5px_currentColor]" /></div>
                                <div className="flex items-center justify-center gap-2 mt-3">
                                    <span className="text-[10px] text-zinc-400 font-black bg-black px-3 py-2 border border-cyan-900 uppercase">ID: <span className="text-cyan-400">{viewingUser.gameId || viewingUser.uid}</span></span>
                                    <button onClick={()=>{navigator.clipboard.writeText(viewingUser.gameId || viewingUser.uid); alert("Đã chép ID!");}} className="text-[10px] font-black bg-zinc-800 text-white px-3 py-2 uppercase">Chép</button>
                                </div>
                                {viewingUser.guild && <div className="text-[11px] text-cyan-400 font-black mt-3 uppercase tracking-widest">🏯 Bang Phái: {viewingUser.guild}</div>}
                                <div className="bg-black border border-zinc-800 p-3 mt-5 text-left shadow-inner">
                                    <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">Di Ngôn:</p>
                                    <p className="text-[12px] text-zinc-400 italic font-playfair">"{viewingUser.bio || 'Kẻ vô danh.'}"</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-5 text-[11px] font-black text-left">
                                    <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Linh Thạch</span><span className="text-white">💎 {viewingUser.spirit || 0}</span></div>
                                    <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Danh Vọng</span><span className="text-yellow-500">⭐ {viewingUser.fame || 0}</span></div>
                                    <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Xếp Hạng</span><span className="text-green-400">🏆 {viewingUser.seasonScore || 0}</span></div>
                                    <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Đăng Nhập</span><span className="streak-fire">🔥 {viewingUser.streakCount || 0}</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button onClick={() => sendFriendReqToUser(viewingUser)} className="bg-yellow-600 text-black py-3 text-[10px] font-black uppercase transition-colors">Kết Giao</button>
                                    <button onClick={() => changeAppState('DASHBOARD')} className="bg-zinc-800 text-white py-3 text-[10px] font-black uppercase border border-zinc-700">ĐÓNG LẠI</button>
                                </div>
                            </div>
                        )}

                        {/* SHOP (CÁ NHÂN) - THÊM BÁN MÀU NỀN */}
                        {appState === 'SHOP' && user && (
                            <div className="w-full max-w-sm h-[85vh] bg-zinc-900 border border-yellow-700/50 p-5 flex flex-col shadow-2xl animate-fadeIn">
                                <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-4 font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">PHÁP BẢO CÁC</h2>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
                                    
                                    {/* MỤC MỚI: MÀU NỀN ẢO CẢNH */}
                                    <div><p className="text-[11px] text-pink-400 font-black border-l-4 border-pink-400 pl-2 mb-3 uppercase tracking-widest">Ảo Cảnh Nền (💎)</p>
                                        {APP_THEMES.map(theme => (
                                            <div key={theme.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 bg-zinc-900 border border-zinc-500 ${theme.id}`}></div>
                                                    <span className="text-[11px] font-black uppercase text-white">{theme.name}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[9px] text-pink-400 font-black">{theme.price} 💎</span>
                                                    {user.appTheme === theme.id ? 
                                                        <button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> 
                                                        : (user.inventory?.includes(theme.id) ? 
                                                            <button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: theme.id}); }} className="bg-pink-600 text-white px-3 py-1 text-[9px] font-black">Dùng</button> 
                                                            : <button onClick={()=>buyItemAction(theme.price, theme.id, 'spirit', 'appTheme')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div><p className="text-[11px] text-cyan-400 font-black border-l-4 border-cyan-400 pl-2 mb-3 uppercase tracking-widest">Trân Bảo (💎)</p>
                                        {ITEMS.map(item => (
                                            <div key={item.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                                <span className="text-xs font-black text-white">{item.icon} {item.name} {item.id==='x2_card'&&<span className="text-[8px] text-zinc-500 block mt-1">(Còn {2-(user.dailyPurchases?.date===getVNSourceDate(new Date())?(user.dailyPurchases.x2||0):0)}/2 lượt)</span>}{item.desc && <span className="text-[9px] text-zinc-500 font-normal italic block mt-1 normal-case">{item.desc}</span>}</span>
                                                {/* 🆕 Bùa Nhân Đôi giờ có 3 trạng thái riêng: (1) đang có hiệu lực -> hiện đếm ngược thay vì nút mua,
                                                    (2) đã mua nhưng chưa kích hoạt -> hiện nút "Kích Hoạt", (3) chưa có thẻ nào -> hiện nút mua như cũ. */}
                                                {item.id === 'x2_card' ? (
                                                    (user.x2BoostExpiresAt && user.x2BoostExpiresAt > Date.now()) ? (
                                                        <span className="text-[9px] text-emerald-400 font-black text-right whitespace-nowrap">🧧 Còn hiệu lực<br/>{x2BoostTimeLeftStr}</span>
                                                    ) : (user.inventory || []).includes('x2_card') ? (
                                                        <button onClick={activateX2BoostAction} className="bg-emerald-700 text-white px-4 py-2 text-[10px] font-black hover:bg-emerald-600 animate-pulse">Kích Hoạt</button>
                                                    ) : (
                                                        <button onClick={()=>buyItemAction(item.price, item.id, 'spirit')} className="bg-zinc-800 text-white px-4 py-2 text-[10px] font-black hover:bg-cyan-700">{item.price} LT</button>
                                                    )
                                                ) : (
                                                    user.inventory?.includes(item.id) ? <span className="text-[9px] text-zinc-600 font-bold italic">Đã Sở Hữu</span> : <button onClick={()=>buyItemAction(item.price, item.id, 'spirit')} className="bg-zinc-800 text-white px-4 py-2 text-[10px] font-black hover:bg-cyan-700">{item.price} LT</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div><p className="text-[11px] text-indigo-400 font-black border-l-4 border-indigo-400 pl-2 mb-3 uppercase tracking-widest">Hào Quang Cá Nhân (💎)</p>
                                        {PERSONAL_AURAS.filter(a => a.price !== 99999).map(a => (
                                            <div key={a.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                                <div className="flex items-center gap-3"><div className={`w-8 h-8 bg-zinc-900 border ${a.class}`}></div><span className="text-[11px] font-black uppercase text-white">{a.name}</span></div>
                                                <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-indigo-400 font-black">{a.price} 💎</span>
                                                    {user.aura === a.class ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({aura: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(a.id) ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({aura: a.class}); }} className="bg-indigo-600 text-white px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(a.price, a.id, 'spirit', 'aura')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div><p className="text-[11px] text-yellow-500 font-black border-l-4 border-yellow-500 pl-2 mb-3 uppercase tracking-widest">Danh Hiệu (⭐)</p>
                                        {NAME_FRAMES.filter(f => f.price !== 99999).map(f => (
                                            <div key={f.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                                <span className={`text-[12px] font-black uppercase ${f.class}`}>{f.name}</span>
                                                <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-yellow-500 font-black">{f.price} ⭐</span>
                                                    {user.nameFrame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameFrame: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(f.id) ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameFrame: f.id}); }} className="bg-yellow-600 text-black px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(f.price, f.id, 'fame')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Đổi</button>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div><p className="text-[11px] text-cyan-400 font-black border-l-4 border-cyan-400 pl-2 mb-3 uppercase tracking-widest">Màu Tên (💎)</p>
                                        {NAME_COLORS.map(c => (
                                            <div key={c.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center hover:border-cyan-900/50 transition-colors">
                                                <span className="text-[12px] font-black uppercase" style={{color: c.color}}>{c.name}</span>
                                                <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-cyan-400 font-black">{c.price} 💎</span>
                                                    {user.nameColor === c.color ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameColor: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(c.id) ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameColor: c.color}); }} className="bg-cyan-700 text-white px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(c.price, c.id, 'spirit', 'color')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div><p className="text-[11px] text-yellow-500 font-black border-l-4 border-yellow-500 pl-2 mb-3 uppercase tracking-widest">Khung Ảnh (⭐)</p>
                                        {FRAMES.map(f => (
                                            <div key={f.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center hover:border-yellow-900/50 transition-colors">
                                                <div className="flex items-center gap-3"><div className={`w-8 h-8 bg-zinc-900 frame-${f.id}`}></div><span className="text-[11px] font-black uppercase" style={{color: f.color}}>{f.name}</span></div>
                                                <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-yellow-500 font-black">{f.price} ⭐</span>
                                                    {user.frame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({frame: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(f.id) ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({frame: f.id}); }} className="bg-yellow-600 text-black px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(f.price, f.id, 'fame')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Đổi</button>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div><p className="text-[11px] text-zinc-400 font-black border-l-4 border-zinc-500 pl-2 mb-3 uppercase tracking-widest">Cảnh Giới (💎/⭐)</p>
                                        {(() => { const curRankLv = (RANKS.find(x => x.id === user.rank) || RANKS[0]).level; return RANKS.map(r => (
                                            <div key={r.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                                <div><p className="text-[12px] font-black uppercase" style={{color: r.color}}>{r.name}</p>{r.price > 0 && <p className="text-[9px] text-zinc-500 font-bold mt-1">{r.price} LT {r.reqFame > 0 ? `| ${r.reqFame} ⭐` : ''}</p>}<p className="text-[8px] text-cyan-500 font-bold mt-0.5">Công dụng: +{r.bonusPercent}% Linh Thạch mỗi Ải</p></div>
                                                {user.rank === r.id ? <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-3 py-1 border border-yellow-500/30">Đã Đạt Tới</span> : r.level === curRankLv + 1 ? <button onClick={()=>breakthroughRankAction(r)} className="bg-yellow-600 text-black px-3 py-2 text-[9px] font-black hover:bg-yellow-500 shadow-md">ĐỘT PHÁ</button> : <span className="text-[9px] text-zinc-600 bg-zinc-900 px-3 py-2 border border-zinc-800" title="Phải đột phá tuần tự từng cảnh giới">🔒 Khóa</span>}
                                            </div>
                                        )); })()}
                                    </div>
                                </div>
                                <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-3 text-[11px] font-black uppercase text-zinc-400 hover:text-white transition-colors">RỜI KHỎI PHÁP BẢO CÁC</button>
                            </div>
                        )}

                        {/* GUILD */}
                        {appState === 'GUILD' && user && (
                            <div className="w-full max-w-sm h-[80vh] bg-zinc-900 border border-yellow-700/50 p-6 flex flex-col shadow-2xl animate-fadeIn">
                                <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-8 uppercase font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Thế Lực Phân Tranh</h2>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                                    {!user.guild ? (
                                        <div className="space-y-8 mt-2">
                                            <div className="bg-black p-5 border border-zinc-800 shadow-lg">
                                                <p className="text-[11px] font-black text-yellow-500 mb-3 uppercase tracking-widest">Lập Tông Môn (-500 💎)</p>
                                                <input className="w-full bg-zinc-900 border border-zinc-700 p-3 text-sm text-white mb-3 outline-none focus:border-yellow-500" placeholder="Nhập Tôn hiệu tông môn..." value={newGuildName} onChange={e=>setNewGuildName(e.target.value)} />
                                                <button onClick={createGuildAction} className="w-full bg-yellow-600 text-black py-3 text-[11px] font-black hover:bg-yellow-500 shadow-md">KHAI SƠN LẬP PHÁI</button>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-cyan-400 mb-3 uppercase tracking-widest border-l-4 border-cyan-400 pl-2">Gia Nhập Bằng Mã</p>
                                                <div className="flex gap-2 mb-6 bg-black p-2 border border-zinc-800">
                                                    <input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Mã Tông Môn..." value={joinGuildIdStr} onChange={e=>setJoinGuildIdStr(e.target.value)} />
                                                    <button onClick={joinGuildByCodeAction} className="bg-cyan-700 text-white px-3 text-[10px] font-black uppercase">VÀO BANG</button>
                                                </div>
                                                <p className="text-[11px] font-black text-yellow-500 mb-3 uppercase tracking-widest border-l-4 border-yellow-500 pl-2">Danh Sách Thế Lực</p>
                                                <div className="space-y-2">
                                                    {Object.values(allGuilds).length > 0 ? Object.values(allGuilds).map(g => (
                                                        <div key={g.name} className="flex justify-between items-center bg-black border border-zinc-800 p-4 hover:border-cyan-900/50 transition-colors">
                                                            <div className="leading-tight"><span className="text-sm font-black text-white uppercase">{g.beast ? g.beast+' ' : ''}{g.name}</span><br/><span className="text-[9px] text-zinc-500 font-bold mt-1 inline-block">Cấp {g.level} | {g.members.length}/{g.level*5} môn đồ</span></div>
                                                            <button onClick={()=>joinGuildAction(g)} className="bg-cyan-900 text-cyan-400 border border-cyan-700 px-4 py-2 text-[9px] font-black hover:bg-cyan-800 hover:text-white">QUY PHỤC</button>
                                                        </div>
                                                    )) : <p className="text-[11px] text-zinc-600 italic text-center">Đại lục chưa có thế lực nào...</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full">
                                            {(()=>{ 
                                                const gObj = allGuilds[user.guild]; 
                                                if(!gObj) {
                                                    // SỬA LỖI: vừa tạo/gia nhập tông môn xong, listener 'guilds' có thể chưa kịp đồng bộ về máy
                                                    // -> đừng vội báo "diệt vong", chờ vài giây rồi mới kết luận thật sự không có bang.
                                                    if (Date.now() < guildSyncingUntil) {
                                                        return (<div className="text-center mt-10"><p className="text-[12px] text-cyan-400 font-black uppercase mb-4 leading-relaxed animate-pulse">Đang đồng bộ Tông môn...</p></div>);
                                                    }
                                                    return (<div className="text-center mt-10"><p className="text-[12px] text-red-500 font-black uppercase mb-4 leading-relaxed">Tông môn này đã bị diệt vong!</p><button onClick={()=>{ playSfx('CLICK'); firestore.collection('users').doc(user.uid).update({guild: null}); }} className="bg-red-900 text-white px-6 py-3 font-black text-[10px] uppercase">Rời Khỏi Phế Tích</button></div>);
                                                }
                                                const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                                                return (
                                                    <div className="flex-1">
                                                        <div className="flex justify-around border-b border-yellow-700/50 mb-4 pb-2">
                                                            <button onClick={()=>{ playSfx('CLICK'); setGuildTab('INFO'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='INFO'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>THÔNG TIN</button>
                                                            <button onClick={()=>{ playSfx('CLICK'); setGuildTab('MEMBERS'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='MEMBERS'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>MÔN ĐỒ</button>
                                                            <button onClick={()=>{ playSfx('CLICK'); setGuildTab('SHOP'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='SHOP'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>PHÚC LỢI BANG</button>
                                                        </div>
                                                        {guildTab === 'INFO' && (
                                                            <div className={`p-5 mb-4 text-center ${gObj.theme || 'bg-black border border-zinc-800'} ${gObj.aura || ''}`}>
                                                                <h3 className={`text-2xl font-black uppercase mb-1 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] ${gObj.frame ? 'frame-'+gObj.frame : ''} inline-block px-4 py-2`} style={{ color: gObj.color || '#eab308' }}>{gObj.beast ? gObj.beast + ' ' : ''}{gObj.name}</h3>
                                                                <div className="text-[10px] text-zinc-300 font-bold mb-4 tracking-widest mt-2">CẤP ĐỘ {gObj.level} ({gObj.members.length}/{gObj.level*5})</div>
                                                                <div className="bg-black/80 border border-yellow-700/50 p-2 mb-4 cursor-pointer hover:bg-yellow-900/40 inline-block mx-auto rounded" onClick={()=>{navigator.clipboard.writeText(gObj.guildId || gObj.name); alert("Đã copy Mã Tông Môn!");}}><span className="text-[9px] text-zinc-400 uppercase font-black">Mã Tông Môn: </span><span className="text-yellow-400 font-bold text-[11px] tracking-widest">{gObj.guildId || "---"}</span></div>
                                                                <div className="bg-black/60 border border-zinc-700 p-3 mb-4 text-left"><p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">CÁO THỊ TÔNG MÔN:</p><p className="text-[11px] text-zinc-300 italic font-playfair">{gObj.notice || "Chưa có thông báo."}</p></div>
                                                                {gObj.level < 5 ? (<div className="bg-black/60 border border-zinc-700 p-3 text-center"><span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-2">Độ kiếp thăng cấp {gObj.level + 1}</span><span className="text-[10px] text-zinc-300 font-bold">Cần 3 môn đồ đạt <span className="text-yellow-500">{RANKS.find(r=>r.level === gObj.level + 1)?.name || 'Cao hơn'}</span></span></div>) : <div className="text-[12px] text-yellow-500 font-black mb-2 streak-fire uppercase tracking-widest py-2 border border-yellow-500/30 bg-yellow-900/10">Đỉnh Cấp Tông Môn</div>}
                                                                <button onClick={()=>leaveOrKickGuildAction(gObj)} className="w-full mt-6 border border-red-900 bg-black text-red-500 py-3 text-[10px] font-black hover:bg-red-900 hover:text-white transition-colors uppercase tracking-widest">Phản Bội Tông Môn (-500💎)</button>
                                                                {isLeader && <button onClick={()=>dissolveGuildAction(gObj)} className="w-full mt-2 border border-red-700 bg-red-950/40 text-red-400 py-3 text-[10px] font-black hover:bg-red-800 hover:text-white transition-colors uppercase tracking-widest">⚰️ Khai Tử Tông Môn (Miễn Phí)</button>}
                                                            </div>
                                                        )}
                                                        {guildTab === 'MEMBERS' && (
                                                            <div className="space-y-4">
                                                                {isLeader && (<div className="bg-black p-3 border border-zinc-800 shadow-md text-left"><p className="text-[10px] font-black text-cyan-400 mb-2 uppercase tracking-widest">Chiêu Mộ Đạo Hữu</p><div className="flex gap-2"><input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Nhập ID 8 số..." value={inviteGuildMemberId} onChange={e=>setInviteGuildMemberId(e.target.value)} /><button onClick={()=>inviteToGuildAction(gObj)} className="bg-cyan-700 text-white px-3 text-[9px] font-black uppercase">KÉO VÀO</button></div></div>)}
                                                                <div className="space-y-2">
                                                                    {gObj.members.map(memberUidOrName => {
                                                                        const memberData = allUsers.find(x => x.uid === memberUidOrName || x.name === memberUidOrName) || { name: memberUidOrName };
                                                                        const mRankName = RANKS.find(r => r.id === memberData.rank)?.name || 'Luyện Khí';
                                                                        return (
                                                                            <div key={memberUidOrName} className="text-sm font-bold text-white flex justify-between items-center bg-black p-3 border border-zinc-800">
                                                                                <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform" onClick={() => { playSfx('CLICK'); if (memberData && memberData.uid) { setViewingUser(memberData); changeAppState('VIEW_PROFILE'); } }} title="Hồ sơ">
                                                                                    <img src={memberData.photo || 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Anonymous'} className={`w-8 h-8 object-cover ${memberData.frame ? 'frame-'+memberData.frame : 'border border-zinc-700'} ${memberData.aura||''}`} />
                                                                                    <div className="flex flex-col"><UserName u={memberData} cls="text-[12px]" /><span className="text-[9px] text-zinc-500 font-black mt-1">{mRankName}</span></div>
                                                                                </div>
                                                                                {(memberUidOrName === gObj.leader || memberData.name === gObj.leader) ? <span className="text-yellow-600 text-[9px] border border-yellow-600 px-2 py-1 font-black uppercase bg-yellow-900/20">Bang Chủ</span> : (isLeader && <button onClick={()=>leaveOrKickGuildAction(gObj, memberUidOrName)} className="text-red-500 border border-red-500 px-2 py-1 text-[9px] hover:bg-red-900 hover:text-white uppercase">Trục Xuất</button>)}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {guildTab === 'SHOP' && (
                                                            <div className="space-y-4 text-left pb-10">
                                                                {!isLeader ? (<div className="bg-blue-900/20 border border-blue-500/50 p-3 mb-4 text-[10px] text-blue-300 italic">Bang Chủ mới có quyền tu sửa nâng cấp.</div>) : (
                                                                    <div className="bg-emerald-900/20 border-2 border-emerald-500/50 p-4 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                                                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
                                                                        <p className="text-[11px] text-emerald-400 font-black mb-1 uppercase tracking-widest text-center">💎 Thánh Khố Tông Môn 💎</p>
                                                                        <div className="bg-black/50 border border-emerald-800 p-2 mb-2 text-center"><span className="text-[9px] text-zinc-400 uppercase font-black">Công Trạng: </span><span className="text-yellow-400 font-bold text-[12px]">{gObj.exp || 0}</span></div>
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-cyan-300">Túi 5000 LT</span><button onClick={() => exchangeGuildExpAction(gObj, 2000, 'spirit', 5000, '5000 Linh Thạch')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (2000 CT)</button></div>
                                                                            <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-red-300">2x Bùa x2</span><button onClick={() => exchangeGuildExpAction(gObj, 1000, 'x2', null, '2 Bùa Nhân Đôi')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (1000 CT)</button></div>
                                                                            <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-yellow-300">Hiệu: [TÔNG SƯ]</span><button onClick={() => exchangeGuildExpAction(gObj, 5000, 'item', 'nf_tongsu', 'Hiệu Tông Sư')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (5000 CT)</button></div>
                                                                            <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-green-300">Quang: [HỖN ĐỘN]</span><button onClick={() => exchangeGuildExpAction(gObj, 10000, 'item', 'pa_chaos', 'Hào Quang Hỗn Độn')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (10000 CT)</button></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-yellow-500 font-black mb-2 uppercase tracking-widest">Sửa Cáo Thị</p><textarea className="w-full bg-zinc-900 text-xs p-3 text-zinc-300 outline-none border border-zinc-700" rows="3" value={editNotice} onChange={e=>setEditNotice(e.target.value)} /><button onClick={()=>updateGuildNoticeAction(gObj)} className="w-full mt-2 bg-yellow-600 text-black py-2 text-[10px] font-black uppercase">LƯU CÁO THỊ</button></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-cyan-400 font-black mb-2 uppercase">Thăng Cấp Bang</p><button onClick={()=>upgradeGuildLevelAction(gObj)} className="w-full bg-cyan-800 text-white py-2 text-[10px] font-black uppercase">ĐỘ KIẾP THĂNG CẤP</button></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-orange-400 font-black mb-3 uppercase">Thần Thú (1500 💎)</p><div className="grid grid-cols-2 gap-2">{GUILD_BEASTS.map(b => (<button key={b.id} onClick={()=>buyGuildPerkAction(gObj, 'beast', b.icon, b.price)} className="text-[11px] font-black border border-orange-700/50 p-2 bg-orange-950/20 text-orange-300">{b.name} {b.icon}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'beast', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Thả Thần Thú</button></div></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-indigo-400 font-black mb-3 uppercase">Hào Quang Phái</p><div className="grid grid-cols-1 gap-2"><button onClick={()=>buyGuildPerkAction(gObj, 'aura', 'guild-aura-sacred', 5000)} className="text-[10px] font-black border border-indigo-500 bg-indigo-950/40 text-indigo-300 p-2 shadow-[0_0_10px_#6366f1]">Thánh Quang (5000 💎)</button><button onClick={()=>buyGuildPerkWithExpAction(gObj, 'aura', 'guild-aura-rainbow', 5000)} className="text-[10px] font-black border border-pink-500 bg-pink-950/40 text-pink-300 p-2 aura-rainbow">Cầu Vồng (5000 CT)</button><button onClick={()=>buyGuildPerkAction(gObj, 'aura', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2">Tắt Hào Quang</button></div></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-pink-400 font-black mb-3 uppercase">Màu Tên Bang (1000 💎)</p><div className="grid grid-cols-2 gap-2">{NAME_COLORS.map(c => (<button key={c.id} onClick={()=>buyGuildPerkAction(gObj, 'color', c.color, 1000)} style={{color: c.color}} className="text-[10px] font-black border border-zinc-700 p-2">{c.name}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'color', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Màu Gốc</button></div></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-green-400 font-black mb-3 uppercase">Khung Bảng (2000 💎)</p><div className="grid grid-cols-2 gap-3">{FRAMES.map(f => (<button key={f.id} onClick={()=>buyGuildPerkAction(gObj, 'frame', f.id, 2000)} className={`text-[10px] font-black border border-zinc-700 p-2 bg-zinc-900 text-white`}><div className={`w-full h-2 mb-1 frame-${f.id}`}></div>{f.name}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'frame', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Tháo Khung</button></div></div>
                                                                <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-purple-400 font-black mb-3 uppercase">Màu Nền (3000 💎)</p><div className="grid grid-cols-2 gap-2"><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-blood', 3000)} className="text-[10px] font-black border border-red-500 bg-red-950/40 text-red-400 p-2">Huyết Quỷ</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-abyss', 3000)} className="text-[10px] font-black border border-purple-500 bg-purple-950/40 text-purple-400 p-2">Vực Sâu</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-gold', 3000)} className="text-[10px] font-black border border-yellow-500 bg-yellow-900/40 text-yellow-400 p-2 col-span-2">Hoàng Kim</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Hắc Ám</button></div></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-2 text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-colors">Trở Về Tàng Kinh Các</button>
                            </div>
                        )}

                        {/* LEADERBOARD - TÍCH HỢP TAB "DANH VỌNG" */}
                        {appState === 'LEADERBOARD' && user && (
                            <div className="w-full max-w-lg h-[85vh] bg-zinc-900 border border-yellow-700/50 flex flex-col shadow-2xl animate-fadeIn">
                                <div className="p-4 border-b border-yellow-700/30">
                                    <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-2 font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Phong Thần Bảng</h2>
                                    <p className="text-center text-[10px] text-cyan-400 font-bold mb-4 uppercase">{leaderboardTab === 'GUILDS' ? <span>Thời Khắc Tổng Kết Thế Lực: <span className="text-yellow-400 font-mono ml-1">{guildTimeLeftStr}</span></span> : <span>Thời Khắc Tái Lập Mùa Giải: <span className="text-yellow-400 font-mono ml-1">{timeLeftStr}</span></span>}</p>
                                    <div className="flex justify-around text-[10px] font-black uppercase border-b border-zinc-800">
                                        <button onClick={()=>{ playSfx('CLICK'); setLeaderboardTab('ALL'); }} className={`pb-3 px-2 ${leaderboardTab==='ALL'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-600'}`}>TOÀN ĐẠI LỤC</button>
                                        <button onClick={()=>{ playSfx('CLICK'); setLeaderboardTab('FAME'); }} className={`pb-3 px-2 ${leaderboardTab==='FAME'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-600'}`}>DANH VỌNG</button>
                                        <button onClick={()=>{ playSfx('CLICK'); setLeaderboardTab('FRIENDS'); }} className={`pb-3 px-2 ${leaderboardTab==='FRIENDS'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-600'}`}>ĐẠO HỮU</button>
                                        <button onClick={()=>{ playSfx('CLICK'); setLeaderboardTab('GUILDS'); }} className={`pb-3 px-2 ${leaderboardTab==='GUILDS'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-600'}`}>THẾ LỰC</button>
                                    </div>
                                </div>
                                {leaderboardTab !== 'GUILDS' && (<div className="bg-black/60 border border-yellow-600/50 m-3 mt-0 p-3 text-center shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]"><p className="text-[10px] text-yellow-500 font-black mb-2 uppercase tracking-widest border-b border-yellow-700/50 pb-1">🎁 Phần Thưởng Top Mùa Giải 🎁</p><div className="flex justify-center gap-2 text-[9px] font-bold"><div className="flex-1 bg-yellow-900/30 border border-yellow-500 p-2"><span className="text-yellow-400 text-[11px] block mb-1 drop-shadow-[0_0_2px_#facc15]">🥇 TOP 1</span> 5000💎 <br/> 100⭐</div><div className="flex-1 bg-gray-800/30 border border-gray-400 p-2"><span className="text-gray-300 text-[11px] block mb-1 drop-shadow-[0_0_2px_#d1d5db]">🥈 TOP 2</span> 3000💎 <br/> 50⭐</div><div className="flex-1 bg-orange-900/30 border border-orange-500 p-2"><span className="text-orange-400 text-[11px] block mb-1 drop-shadow-[0_0_2px_#fb923c]">🥉 TOP 3</span> 1000💎 <br/> 20⭐</div></div></div>)}
                                {leaderboardTab === 'GUILDS' && (<div className="bg-black/60 border border-indigo-600/50 m-3 mt-0 p-3 text-center shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]"><p className="text-[10px] text-indigo-400 font-black mb-2 uppercase border-b border-indigo-700/50 pb-1">🏰 Thế Lực Tranh Bá 🏰</p><div className="flex justify-center gap-2 text-[9px] font-bold"><div className="flex-1 bg-yellow-900/30 border border-yellow-500 p-2"><span className="text-yellow-400 text-[11px] block mb-1">🥇 TOP 1</span> +5000 CT</div><div className="flex-1 bg-gray-800/30 border border-gray-400 p-2"><span className="text-gray-300 text-[11px] block mb-1">🥈 TOP 2</span> +3000 CT</div><div className="flex-1 bg-orange-900/30 border border-orange-500 p-2"><span className="text-orange-400 text-[11px] block mb-1">🥉 TOP 3</span> +1000 CT</div></div></div>)}
                                {leaderboardTab !== 'GUILDS' && (<div className="flex gap-2 mb-2 px-4 mt-4"><input className="flex-1 bg-black border border-cyan-900/80 p-3 text-xs font-bold text-white outline-none focus:border-cyan-400" placeholder="Nhập ID..." value={globalSearchUid} onChange={e=>setGlobalSearchUid(e.target.value)} /><button onClick={searchUserAction} className="bg-cyan-800 text-white px-5 text-[11px] font-black uppercase shadow-md">TRA CỨU</button></div>)}
                                <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-2 custom-scrollbar">
                                    {leaderboardTab === 'FRIENDS' && (<div className="mb-6 space-y-3 bg-black/40 p-3 border border-yellow-900/30 mt-2"><p className="text-[10px] text-yellow-500 font-bold uppercase mb-1">Kết Giao Bằng Hữu</p><div className="flex gap-2 bg-black p-2 border border-zinc-800"><input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-yellow-500" placeholder="ID kết duyên..." value={friendSearchUid} onChange={e=>setFriendSearchUid(e.target.value)} /><button onClick={addFriendAction} className="bg-yellow-600 text-black px-4 py-2 text-[10px] font-black uppercase">KẾT DUYÊN</button></div><button onClick={addRandomFriendAction} className="w-full py-3 border border-dashed border-yellow-500/50 text-yellow-500 text-[11px] font-black uppercase">✨ KẾT BẠN NGẪU NHIÊN ✨</button></div>)}
                                    {leaderboardTab !== 'GUILDS' && leaderboardRenderList.map((p, i) => {
                                        let rankColorClass = "text-zinc-500"; let bgRankClass = "bg-black/50 border-zinc-800";
                                        if (i === 0) { rankColorClass = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; bgRankClass = "bg-yellow-900/20 border-yellow-500 shadow-[inset_0_0_10px_rgba(234,179,8,0.2)]"; } 
                                        else if (i === 1) { rankColorClass = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; bgRankClass = "bg-gray-800/40 border-gray-400"; } 
                                        else if (i === 2) { rankColorClass = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]"; bgRankClass = "bg-orange-900/20 border-orange-500"; }
                                        if (p.uid === user.uid) bgRankClass += " border-l-4 border-l-cyan-400 bg-cyan-900/10";
                                        return (
                                            <div key={i} onClick={()=>{ setViewingUser(p); changeAppState('VIEW_PROFILE'); }} className={`flex justify-between items-center p-3 border cursor-pointer hover:scale-[1.02] transition-transform ${bgRankClass}`}>
                                                <div className="flex items-center gap-3"><span className={`${rankColorClass} text-[16px] font-black w-8 text-center`}>#{i+1}</span><img src={p.photo} className={`w-12 h-12 object-cover ${p.frame ? 'frame-'+p.frame : 'border border-zinc-700'} ${p.aura||''}`} alt="avatar" /><div className="flex flex-col leading-tight"><UserName u={p} cls="text-[13px] tracking-wide" /><span className="text-[9px] text-zinc-500 font-bold mt-1.5 tracking-widest">ID: {p.gameId || '---'}</span>{p.guild && <span className="text-[9px] text-cyan-500 font-black mt-1 tracking-widest">🏯 {p.guild}</span>}</div></div>
                                                <div className="text-right leading-tight">
                                                    {leaderboardTab === 'FAME' ? <span className="text-yellow-500 font-black text-[14px] drop-shadow-[0_0_2px_#eab308]">⭐ {formatNumber(p.fame || 0)}</span> : <span className="text-green-400 font-black text-[14px] drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(p.seasonScore || 0)}</span>}
                                                    <div className="text-[10px] streak-fire font-black mt-1.5">🔥 {p.streakCount || 0}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {leaderboardTab === 'GUILDS' && guildLeaderboardRenderList.map((g, i) => {
                                        let rankColorClass = "text-zinc-500"; let bgRankClass = (g.theme || "bg-black/50 border-zinc-800") + " " + (g.aura || "");
                                        if (i === 0) rankColorClass = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; else if (i === 1) rankColorClass = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; else if (i === 2) rankColorClass = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]";
                                        if (g.name === user.guild) bgRankClass += " border-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.4)]";
                                        const leaderData = allUsers.find(u => u.uid === g.leader || u.name === g.leader) || { name: "Ẩn Danh" };
                                        return (
                                            <div key={i} onClick={() => { playSfx('CLICK'); setViewGuildModal(g); }} className={`flex justify-between items-center p-3 border ${bgRankClass} mb-3 shadow-md cursor-pointer hover:scale-[1.02] transition-transform`}>
                                                <div className="flex items-center gap-3"><div className={`w-8 h-8 flex items-center justify-center border ${i === 0 ? 'border-yellow-400 bg-yellow-900/40' : i === 1 ? 'border-gray-300 bg-gray-800/40' : i === 2 ? 'border-orange-400 bg-orange-900/40' : 'border-zinc-700 bg-black/60'}`}><span className={`${rankColorClass} text-[12px] font-black`}>#{i+1}</span></div><div className="flex flex-col leading-tight justify-center"><div><span className={`text-[14px] font-black uppercase ${g.frame ? 'frame-'+g.frame : ''} inline-block px-2 py-1 bg-black/40`} style={{ color: g.color || '#eab308' }}>{g.beast ? <span className="mr-1">{g.beast}</span> : ''}{g.name}</span></div><span className="text-[9px] text-zinc-400 font-bold mt-2 flex items-center gap-1">👑 Bang Chủ: <UserName u={leaderData} cls="text-[9px]" /></span></div></div>
                                                <div className="text-right flex flex-col justify-center border-l border-zinc-700/50 pl-3 min-w-[70px]"><span className="text-cyan-400 font-black text-[13px]">Cấp {g.level}</span><span className="text-[9px] text-zinc-400 font-black mt-1">👥 {g.members?.length || 1}/{g.level*5}</span><span className="text-[8px] text-zinc-500 font-bold mt-0.5">⭐ {formatNumber(g.exp || 0)}</span></div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button onClick={()=>changeAppState('DASHBOARD')} className="p-4 bg-zinc-800 text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors">QUAY VỀ BÍ CẢNH</button>
                            </div>
                        )}

                        {/* QUIZ */}
                        {appState === 'QUIZ' && activeQuiz.length > 0 && user && (
                            <div className="w-full max-w-md h-[85vh] flex flex-col border border-indigo-500/50 p-6 shadow-[0_0_30px_rgba(79,70,229,0.2),inset_0_0_20px_rgba(79,70,229,0.3)] relative animate-fadeIn rounded-xl overflow-hidden" style={{ backgroundImage: 'url(https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                <div className="absolute inset-0 bg-black/85 z-0"></div>
                                <div className="relative z-10 flex flex-col h-full min-h-0">
                                    <div className="flex justify-between items-center mb-4 border-b border-indigo-500/30 pb-3 gap-2 flex-shrink-0">
                                        <span className="text-[11px] font-black text-indigo-300 uppercase truncate flex-1">Ải {curIdx + 1} / {activeQuiz.length}</span>
                                        <span className="text-[11px] font-black text-green-400 uppercase whitespace-nowrap">Đúng: {correctAnswers}</span>
                                        <button onClick={async ()=>{ if(await askConfirm("Bỏ ải?")){ clearTimeout(quizTimerRef.current); playSfx('FAIL'); setActiveQuiz([]); setExamPathActiveNodeId(null); changeAppState('DASHBOARD'); } }} className="text-red-400 text-lg hover:scale-110 ml-2 p-1">🚪</button>
                                    </div>
                                    <div key={curIdx} className="slide-in-right w-full flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                        <h3 className="math-text text-[15px] text-white font-bold mb-4 leading-loose min-h-[80px] drop-shadow-[0_0_2px_#000] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{activeQuiz[curIdx].q}</h3>

                                        {/* 🆕 ẢNH MINH HOẠ CÂU HỎI (sơ đồ, đồ thị...) kèm nút xem ảnh rõ (phóng to) */}
                                        {activeQuiz[curIdx].img && (
                                            <div className="mb-6">
                                                <img src={activeQuiz[curIdx].img} onClick={() => setLightboxImg(activeQuiz[curIdx].img)} className="w-full max-h-56 object-contain bg-black/50 border border-indigo-500/30 cursor-zoom-in" alt="Hình minh hoạ câu hỏi" />
                                                <button onClick={() => setLightboxImg(activeQuiz[curIdx].img)} className="mt-2 w-full text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/40 py-2 bg-black/40 hover:bg-indigo-900/40">🔍 Xem Ảnh Rõ</button>
                                            </div>
                                        )}

                                        {/* CÂU 1 ĐÁP ÁN: bấm sai -> đáp án đó biến mất + hiện bảng gợi ý, được thử lại */}
                                        {(!activeQuiz[curIdx].type || activeQuiz[curIdx].type === 'single') && (
                                            <div className="space-y-4">
                                                {activeQuiz[curIdx].o.map((optText, optIndex) => {
                                                    // 🆕 Đáp án đã bị loại do chọn sai -> ẨN HẲN khỏi danh sách trong lúc đang làm bài (chỉ hiện lại khi đã xem đáp án cuối)
                                                    if (!showExplanation && eliminatedOptions.includes(optIndex)) return null;
                                                    let btnClasses = "bg-black/60 border border-indigo-500/40 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-900/40 shadow-[0_0_10px_rgba(79,70,229,0.1)]";
                                                    if (showExplanation) {
                                                        if (optIndex === activeQuiz[curIdx].c) { btnClasses = "bg-green-900/60 border border-green-400 text-green-300 scale-[1.02] shadow-[0_0_15px_rgba(74,222,128,0.4)] font-black"; } 
                                                        else if (optIndex === selectedOption || eliminatedOptions.includes(optIndex)) { btnClasses = "bg-red-900/60 border border-red-500 text-red-300 font-bold"; } 
                                                        else { btnClasses = "bg-black/50 border border-zinc-800 text-zinc-500 opacity-40"; }
                                                    }
                                                    return (<button key={optIndex} disabled={showExplanation} onClick={() => handleAnswerSelect(optIndex)} className={`math-text w-full text-left p-4 text-sm break-words [overflow-wrap:anywhere] ${btnClasses}`}><span className="text-[11px] font-black mr-3 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + optIndex)}.</span>{optText}</button>);
                                                })}

                                                {/* 🆕 BẢNG GỢI Ý: hiện ra ngay khi đoán sai ít nhất 1 lần, thay cho đáp án vừa biến mất */}
                                                {!showExplanation && eliminatedOptions.length > 0 && (
                                                    <div className="bg-orange-950/40 border border-orange-500/50 p-3 space-y-2 animate-fadeIn">
                                                        <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">❌ Đã loại {eliminatedOptions.length} đáp án sai — thử lại các lựa chọn còn lại nhé!</p>
                                                        {hintText && <p className="math-text text-[12px] text-orange-100 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-t border-orange-500/30 pt-2">{hintText}</p>}
                                                        <div className="flex gap-2">
                                                            <button onClick={handleRequestAiHint} disabled={hintLoading} className="flex-1 bg-orange-900/50 border border-orange-500 text-orange-300 py-2 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{hintLoading ? '💡 Đang nghĩ...' : (hintText ? '💡 Gợi Ý Khác' : '💡 Xin Gợi Ý AI')}</button>
                                                            <button onClick={handleGiveUpQuestion} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">🏳️ Xem Đáp Án</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 🆕 CÂU ĐÚNG/SAI NHIỀU Ý: bấm Đ hoặc S cho từng ý, xong bấm Xem Kết Quả mới chấm điểm */}
                                        {activeQuiz[curIdx].type === 'multi' && (
                                            <div className="space-y-3">
                                                {activeQuiz[curIdx].o.map((optText, optIndex) => {
                                                    const correctSet = Array.isArray(activeQuiz[curIdx].c) ? activeQuiz[curIdx].c : [];
                                                    const rowAns = selectedOptions[optIndex]; // true | false | undefined
                                                    const correctVal = correctSet.includes(optIndex);
                                                    let rowBox = "bg-black/60 border border-indigo-500/40";
                                                    if (showExplanation) { rowBox = (rowAns === correctVal) ? "bg-green-900/30 border border-green-500" : "bg-red-900/30 border border-red-500"; }
                                                    return (
                                                        <div key={optIndex} className={`p-3 ${rowBox}`}>
                                                            <p className="math-text text-indigo-100 text-sm mb-2 leading-relaxed break-words [overflow-wrap:anywhere]"><span className="text-[11px] font-black mr-2 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + optIndex)}.</span>{optText}</p>
                                                            <div className="flex gap-2">
                                                                <button disabled={showExplanation} onClick={() => setMultiRowAnswer(optIndex, true)} className={`flex-1 py-2 text-[11px] font-black uppercase border transition-colors ${rowAns === true ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-green-500'}`}>Đ (Đúng)</button>
                                                                <button disabled={showExplanation} onClick={() => setMultiRowAnswer(optIndex, false)} className={`flex-1 py-2 text-[11px] font-black uppercase border transition-colors ${rowAns === false ? 'bg-red-600 border-red-400 text-white' : 'border-zinc-700 text-zinc-400 hover:border-red-500'}`}>S (Sai)</button>
                                                            </div>
                                                            {showExplanation && <p className="text-[9px] text-zinc-400 mt-1.5 uppercase font-black tracking-widest">Đáp án đúng: <span className={correctVal ? 'text-green-400' : 'text-red-400'}>{correctVal ? 'ĐÚNG' : 'SAI'}</span></p>}
                                                        </div>
                                                    );
                                                })}
                                                {!showExplanation && <button onClick={handleSubmitMultiAnswer} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest mt-1">Xem Kết Quả</button>}
                                            </div>
                                        )}

                                        {/* 🆕 CÂU ĐIỀN SỐ (tính toán): gõ số rồi bấm Xác Nhận mới chấm điểm */}
                                        {activeQuiz[curIdx].type === 'numeric' && (() => {
                                            const userNum = parseFloat(String(numericAnswer).replace(',', '.'));
                                            const correctNum = parseFloat(String(activeQuiz[curIdx].c).replace(',', '.'));
                                            const wasCorrect = !isNaN(userNum) && !isNaN(correctNum) ? Math.abs(userNum - correctNum) < 0.01 : String(numericAnswer).trim().toLowerCase() === String(activeQuiz[curIdx].c).trim().toLowerCase();
                                            return (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text" inputMode="decimal" disabled={showExplanation}
                                                        value={numericAnswer} onChange={e => setNumericAnswer(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitNumericAnswer(); }}
                                                        placeholder="Nhập đáp án số..."
                                                        className={`math-text w-full text-center p-4 text-lg font-black bg-black/60 border outline-none tracking-wide ${showExplanation ? (wasCorrect ? 'border-green-400 text-green-300' : 'border-red-500 text-red-300') : 'border-indigo-500/40 text-white focus:border-indigo-400'}`}
                                                    />
                                                    {!showExplanation && <button onClick={handleSubmitNumericAnswer} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest">Xác Nhận Đáp Án</button>}
                                                    {showExplanation && !wasCorrect && <p className="math-text text-center text-[12px] text-green-400 font-black">Đáp án đúng: {activeQuiz[curIdx].c}</p>}
                                                </div>
                                            );
                                        })()}

                                        {/* 🆕 DỪNG SAU MỖI CÂU: xem giải thích AI (tuỳ chọn) rồi tự bấm để sang câu tiếp theo / xem kết quả */}
                                        {showExplanation && (
                                            <div className="mt-5 pt-4 border-t border-indigo-500/20 space-y-3">
                                                {aiExplainText && <div className="math-text bg-black/70 border border-purple-500/40 p-3 text-[12px] text-purple-200 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-40 overflow-y-auto custom-scrollbar">{aiExplainText}</div>}
                                                <div className="flex gap-2">
                                                    <button onClick={handleAiExplainQuestion} disabled={aiExplainLoading} className="flex-1 bg-purple-900/50 border border-purple-500 text-purple-300 py-3 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{aiExplainLoading ? '🔮 Đang phân tích...' : (aiExplainText ? '🔮 Phân Tích Lại' : '🔮 AI Phân Tích')}</button>
                                                    <button onClick={continueAfterAnswer} className="flex-1 bg-yellow-500 hover:bg-white text-black py-3 text-[10px] font-black uppercase transition-colors">{curIdx === activeQuiz.length - 1 ? 'Xem Kết Quả 🏆' : 'Câu Tiếp Theo ➡'}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🆕 MODAL XEM ẢNH PHÓNG TO (dùng cho ảnh minh hoạ câu hỏi & ảnh trong màn hình Chỉnh Sửa Ải) */}
                        {lightboxImg && ReactDOM.createPortal(
                            <ZoomableImage src={lightboxImg} onClose={() => setLightboxImg(null)} />, document.body
                        )}

                        {/* 🆕 BÀN PHÍM KÝ HIỆU TOÁN/LÝ: bấm 1 ký hiệu để chèn vào đúng vị trí con trỏ của ô đang gõ dở */}
                        {showMathKeyboard && ReactDOM.createPortal(
                            <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center" onClick={() => setShowMathKeyboard(false)}>
                                <div className="absolute inset-0 bg-black/70"></div>
                                <div className="relative w-full sm:max-w-md bg-zinc-950 border-t-2 sm:border-2 border-cyan-600 p-4 shadow-[0_0_30px_rgba(6,182,212,0.3)] safe-bottom" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">🔣 Bàn Phím Ký Hiệu Toán/Lý</p>
                                        <button onClick={() => setShowMathKeyboard(false)} className="text-zinc-500 hover:text-white text-lg px-1">✕</button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                        {['π','ω','θ','Δ','α','β','γ','λ','μ','φ','Ω','Σ','√','∞','±','×','÷','≤','≥','≈','≠','°','→','∫','²','³','⁰','¹','ₓ','₀','₁','₂'].map(sym => (
                                            <button key={sym} onClick={() => insertMathSymbol(sym)} className="aspect-square bg-black border border-zinc-700 hover:border-cyan-500 hover:bg-cyan-950 text-white text-base font-bold rounded">{sym}</button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-zinc-600 italic mt-2 text-center">Bấm vào 1 ô nhập trước, rồi chọn ký hiệu để chèn vào đúng vị trí con trỏ.</p>
                                </div>
                            </div>, document.body
                        )}

                        {/* RESULT - SỬA LỖI UNTERMINATED JSX */}
                        {appState === 'RESULT' && user && (
                            <div className="w-full max-w-sm h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-900 border-2 border-yellow-500 p-8 text-center shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-fadeIn my-5 pb-10">
                                <h2 className="text-3xl font-black text-yellow-500 font-playfair italic mb-8 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">Kết Thúc Lịch Luyện</h2>
                                <div className="text-2xl font-bold mb-8 mt-4">
                                    <span className="text-zinc-500 text-[11px] block mb-2 uppercase font-black tracking-widest">Thành Tích</span>
                                    <span className={correctAnswers > 0 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{correctAnswers}</span>
                                    <span className="text-zinc-600"> / {activeQuiz.length}</span>
                                </div>
                                <div className="bg-black border border-zinc-800 p-5 mb-8 relative mt-8 shadow-inner">
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                                    <div className="flex justify-around items-center pt-3">
                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className={`text-lg font-black ${stonesGained >= 0 ? 'text-white drop-shadow-[0_0_2px_#fff]' : 'text-red-500'}`}>{stonesGained > 0 ? `+${stonesGained}` : stonesGained}</span></div>
                                        <div className="h-10 w-px bg-zinc-800"></div>
                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className={`text-lg font-black ${fameGained >= 0 ? 'text-yellow-500 drop-shadow-[0_0_2px_#eab308]' : 'text-red-500'}`}>{fameGained > 0 ? `+${fameGained}` : fameGained}</span></div>
                                        <div className="h-10 w-px bg-zinc-800"></div>
                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">🏆</span><span className={`text-lg font-black text-green-400 drop-shadow-[0_0_2px_#4ade80]`}>+{correctAnswers}</span></div>
                                    </div>
                                </div>
                                <MiniLeaderboard list={topSeasonList} currentUser={user} />
                                {/* 🆕 SỬA HIỂU LẦM "HỌC RỒI MÀ BXH KHÔNG LÊN": báo NGAY tại đây lý do vì sao lượt luyện Đạo Lộ
                                    vừa rồi không được cộng vào Đạo Hữu Bảng, thay vì để người dùng tự đoán là lỗi. */}
                                {examPathLastRunCounted === false && (
                                    <p className="text-[9px] text-orange-400 italic mb-3 px-2 leading-relaxed">⏰ Lượt luyện này diễn ra ngoài khung giờ tính điểm Đạo Hữu Bảng (4h00-23h00) nên KHÔNG được cộng vào bảng xếp hạng hôm nay. Linh Thạch/Danh Vọng ở trên vẫn được giữ nguyên.</p>
                                )}
                                {examPathActiveNodeId ? (
                                    <div className="flex gap-2 mt-6">
                                        <button onClick={()=>{ setExamPathActiveNodeId(null); changeAppState('DASHBOARD'); }} className="flex-1 bg-zinc-800 text-zinc-400 py-4 font-black uppercase hover:text-white transition-colors text-[10px] tracking-widest">Tàng Kinh Các</button>
                                        <button onClick={()=>{ setExamPathActiveNodeId(null); changeAppState('EXAM_PATH'); }} className="flex-1 bg-emerald-700 text-white py-4 font-black uppercase hover:bg-emerald-600 transition-colors text-[10px] tracking-widest">🗺️ Trở Về Đạo Đồ</button>
                                    </div>
                                ) : (
                                    <button onClick={()=>changeAppState('DASHBOARD')} className="w-full mt-6 bg-zinc-800 text-zinc-400 py-4 font-black uppercase hover:text-white transition-colors text-xs tracking-widest">Trở Về Tàng Kinh Các</button>
                                )}
                            </div>
                        )}
                        
                    </div> {/* ĐÓNG CONTAINER CHÍNH */}

                </div>
            );
        }; // KẾT THÚC COMPONENT

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ThienKieuApp />);
