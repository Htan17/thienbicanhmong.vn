import { GeminiPool, geminiTestKey } from '../../lib/gemini.js';
import { firestore } from '../../config/firebase.js';

const { useState, useEffect } = React;

export function useGeminiKeys({ core, audio }) {
    const { appState, user } = core;
    const { playSfx } = audio;
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

    return { anyGeminiKey, geminiKey2, handleSaveKey, handleTestKeys, keyDraft1, keyDraft2, keyTesting, saveGeminiKey, setGeminiKey2, setKeyDraft1, setKeyDraft2, setPoolTick, setShowKeys, setVideoApiKey, showKeys, videoApiKey };
}
