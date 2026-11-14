import { AUDIO_URLS } from '../../lib/audio.js';

const { useState, useEffect, useRef } = React;

export function useAudio({ core }) {
    const { appState, user } = core;
    const [isMuted, setIsMuted] = useState(false);
    const [audioErrors, setAudioErrors] = useState({}); // { BGM: true, CLICK: true, ... } khi 1 file audio load/play lỗi
    // 🎵 DANH SÁCH PHÁT TIÊN ÂM (nhạc nền): cho phép tải lên NHIỀU bài cùng lúc, tua, trộn bài,
    // bỏ qua bài (thay vì chỉ 1 bài lặp lại như trước).
    const [bgmPlaylist, setBgmPlaylist] = useState([{ id: 'default', name: 'Tiên Âm Mặc Định', url: AUDIO_URLS.BGM }]);
    const [bgmTrackIndex, setBgmTrackIndex] = useState(0);
    const [bgmShuffle, setBgmShuffle] = useState(false);
    const [bgmCurrentTime, setBgmCurrentTime] = useState(0);
    const [bgmDuration, setBgmDuration] = useState(0);
    const [showMusicPanel, setShowMusicPanel] = useState(false);
    const bgmNextRef = useRef(() => {});
    const audioRefs = useRef({});
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
        if (window.__sfxPack && window.__sfxPack !== 'default') { window.__synthSfx(key); return; } // bộ âm thanh tự tạo
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
    useEffect(() => { window.__sfxPack = (user && user.sfxPack) || 'default'; }, [user && user.sfxPack]);
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

    return { audioErrors, bgmCurrentTime, bgmDuration, bgmNext, bgmPlaylist, bgmPrev, bgmShuffle, bgmTrackIndex, handleBgmUpload, handleSfxUpload, isMuted, playBgm, playBgmTrackAt, playSfx, playVictoryFx, reloadAllSfx, seekBgm, setAudioErrors, setShowMusicPanel, showMusicPanel, toggleBgmShuffle, toggleMute };
}
