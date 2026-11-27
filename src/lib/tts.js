// GIỌNG ĐỌC (Web Speech API) rõ hơn: chọn giọng TỐT NHẤT cho ngôn ngữ thay vì lấy giọng đầu tiên khớp 2 chữ cái đầu.
// Phần chấm điểm là hàm thuần để test bằng Node (xem tts.test.mjs); phần speak() chạm trình duyệt.
const NEURAL = /natural|neural|online|premium|enhanced|wavenet|studio/i;
const WEAK = /espeak|compact|festival|robot|novelty|bad news|bubbles|whisper|zarvox|trinoids|cellos|bells|boing/i;

// Điểm của 1 giọng cho ngôn ngữ `lang` (vd 'en-US'): càng cao càng nên dùng.
export const scoreVoice = (v, lang) => {
    if (!v || !v.lang) return -1;
    const vl = String(v.lang).replace('_', '-').toLowerCase(), want = String(lang || 'en-US').toLowerCase();
    if (vl.slice(0, 2) !== want.slice(0, 2)) return -1;
    let s = vl === want ? 100 : 50;
    const name = String(v.name || '');
    if (NEURAL.test(name)) s += 45;            // giọng mạng thần kinh nghe tự nhiên hơn hẳn giọng tổng hợp cũ
    if (/google/i.test(name)) s += 25;
    else if (/microsoft/i.test(name)) s += 20;
    else if (/samantha|karen|daniel|moira|kyoko|ting-ting|yuna|thomas|anna/i.test(name)) s += 15; // giọng chuẩn của macOS/iOS
    if (WEAK.test(name)) s -= 60;
    if (v.default) s += 3;
    return s;
};
export const pickVoice = (voices, lang) => {
    let best = null, bs = -1;
    (voices || []).forEach(v => { const s = scoreVoice(v, lang); if (s > bs) { bs = s; best = v; } });
    return bs >= 0 ? best : null;
};
// Chỉ đọc phần chữ cần đọc: bỏ chú thích trong ngoặc "run (v)", ký hiệu / và khoảng trắng thừa.
export const speechText = (s) => String(s || '').replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, ' ').replace(/[\/|•·]+/g, ', ').replace(/\s+/g, ' ').trim();

export const ttsOk = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
export const RATE_NORMAL = 0.9, RATE_SLOW = 0.65; // học từ mới: chậm hơn 1.0 một chút nghe rõ âm cuối hơn

let waited = false;
// Trình duyệt (Chrome) nạp danh sách giọng bất đồng bộ: lần gọi đầu có thể rỗng -> đợi 'voiceschanged' rồi đọc lại.
export function speak(text, lang, { rate = RATE_NORMAL, pitch = 1 } = {}) {
    try {
        if (!ttsOk()) return false;
        const t = speechText(text); if (!t) return false;
        const go = () => {
            const u = new SpeechSynthesisUtterance(t); u.lang = lang || 'en-US'; u.rate = rate; u.pitch = pitch; u.volume = 1;
            const v = pickVoice(speechSynthesis.getVoices(), u.lang); if (v) { u.voice = v; u.lang = v.lang; }
            speechSynthesis.speak(u);
        };
        speechSynthesis.cancel();
        if (!speechSynthesis.getVoices().length && !waited) {
            waited = true; let done = false; const once = () => { if (done) return; done = true; speechSynthesis.removeEventListener && speechSynthesis.removeEventListener('voiceschanged', once); go(); };
            speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', once); setTimeout(once, 600);
        } else setTimeout(go, 60); // Chrome hay nuốt tiếng nếu speak() ngay sau cancel()
        return true;
    } catch (e) { return false; }
}
