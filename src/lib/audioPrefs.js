// ÂM THANH: cài đặt 3 kênh TÁCH RỜI (nhạc nền / hiệu ứng / âm giao diện) + âm lượng + bộ phân loại âm cho mọi lần bấm.
// THUẦN HÀM (trừ load/save dùng localStorage có try/catch) -> test trong audioPrefs.test.mjs.
// Trước đây chỉ có 1 công tắc `isMuted` dùng chung: bấm tạm dừng nhạc là tắt luôn mọi hiệu ứng. Nay:
//   bgmOn  = nhạc nền (Tiên Âm)          -> phát/tạm dừng riêng
//   sfxOn  = hiệu ứng trò chơi            -> đúng/sai, thưởng, lên cấp, combo, mua đồ...
//   uiOn   = âm giao diện                 -> chạm nút, gõ phím, chuyển tab/màn hình, mở/đóng bảng, kéo thanh trượt
// uiOn chỉ có tác dụng khi sfxOn bật (tắt hiệu ứng = tắt cả âm giao diện).
export const PREFS_KEY = 'tkbc_audio_v2';
export const DEFAULT_PREFS = Object.freeze({ bgmOn: true, sfxOn: true, uiOn: true, bgmVol: 0.25, sfxVol: 0.8 });
export const UI_KEYS = Object.freeze(new Set(['TAP', 'CLICK', 'TYPE', 'TICK', 'TOGGLE', 'TAB', 'OPEN', 'CLOSE', 'SWOOSH', 'PRESS', 'SELECT', 'SEND', 'POP', 'NOTIFY', 'WARN', 'DENY', 'FLIP', 'COPIED']));
const clamp01 = (n, d) => { n = Number(n); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d; };
export const normalizePrefs = (o) => { o = o && typeof o === 'object' ? o : {}; const D = DEFAULT_PREFS;
    return { bgmOn: o.bgmOn !== false, sfxOn: o.sfxOn !== false, uiOn: o.uiOn !== false, bgmVol: clamp01(o.bgmVol, D.bgmVol), sfxVol: clamp01(o.sfxVol, D.sfxVol) }; };
export const loadPrefs = () => { try { return normalizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) { return { ...DEFAULT_PREFS }; } };
export const savePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(normalizePrefs(p))); } catch (e) {} };
// Có được phát âm `key` với cài đặt hiện tại không?
export const shouldPlay = (key, p) => { p = p || DEFAULT_PREFS; if (!p.sfxOn) return false; if (UI_KEYS.has(key) && !p.uiOn) return false; return true; };
// Âm lượng nhạc nền: hạ còn 20% khi đang xem video (tránh chồng tiếng).
export const bgmVolumeFor = (p, appState) => Math.max(0, Math.min(1, (p ? p.bgmVol : DEFAULT_PREFS.bgmVol) * (appState === 'VIDEO_LEARN' ? 0.2 : 1)));

// Phân loại âm cho 1 lần bấm theo mô tả phần tử: { sfx, tag, type, role, text, aria, cls, pressed, expanded }
const RE_DANGER = /(^|\s)(xo[aáà]|xóa|gỡ|delete|remove)(\s|$)|🗑/i;
const RE_CLOSE = /^(✕|×|x|←|‹|‹‹)$|đóng|quay lại|thoát|hủy|huỷ|bỏ qua|để sau|tạm dừng|\b(back|close|cancel)\b/i;
const RE_PRIMARY = /bắt đầu|vào ải|vào đại đạo|vào |lưu|xác nhận|nhận diện|kiểm tra|tiếp theo|tiếp tục|mua|gửi|tạo|đăng nhập|chiến|luyện|ôn |start|submit|confirm/i;
const RE_PRIMARY_CLS = /bg-(yellow|emerald|green|purple|sky|cyan|fuchsia|orange|red|blue|indigo)-[3-7]00/;
export const classifyClick = (d) => {
    d = d || {}; if (d.sfx) return String(d.sfx);
    const text = String((d.aria || '') + ' ' + (d.text || '')).trim().replace(/\s+/g, ' ').slice(0, 80);
    if (d.type === 'checkbox' || d.type === 'radio' || d.role === 'switch' || d.role === 'checkbox' || d.tag === 'select') return 'TOGGLE';
    if (d.role === 'tab') return 'TAB';
    if (d.type === 'file') return 'OPEN';
    if (d.pressed != null || d.expanded != null) return 'TOGGLE';
    if (RE_DANGER.test(text)) return 'WARN';
    if (RE_CLOSE.test(text)) return 'CLOSE';
    if (RE_PRIMARY_CLS.test(d.cls || '') || RE_PRIMARY.test(text)) return 'PRESS';
    return 'TAP';
};
