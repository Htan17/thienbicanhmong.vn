import { shortErr } from './format.js';

// 🛰️ GỌI GEMINI API VỚI TỰ ĐỘNG DỰ PHÒNG MODEL: Google liên tục khai tử/đổi tên model (2.0-flash rồi
// 2.5-flash đều lần lượt bị ngừng cấp cho user mới trong 2026) khiến app hay bị lỗi "hết quota"/"not
// found" giả. Thử lần lượt từng model trong danh sách, hễ model nào bị khai tử/không tồn tại thì tự
// động thử model kế tiếp, chỉ thật sự báo lỗi khi TẤT CẢ đều thất bại.
// Danh sách model theo thứ tự ưu tiên (tên model theo tài liệu Gemini API, 10/2026). Mỗi model có hạn mức RIÊNG
// nên khi 1 model hết lượt/bị ngừng, app tự nhảy sang model kế tiếp. Người dùng có thể chọn model ưu tiên ở mục Hồ Sơ.
export const GEMINI_MODEL_LIST = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-flash-latest'];
export const getPreferredGeminiModel = () => { try { return localStorage.getItem('geminiPreferredModel') || ''; } catch (e) { return ''; } };
const GEMINI_MODEL_CANDIDATES = GEMINI_MODEL_LIST; // giữ tên cũ cho phần code phía dưới
const orderedGeminiModels = () => { const pref = getPreferredGeminiModel(); return pref && GEMINI_MODEL_LIST.includes(pref) ? [pref, ...GEMINI_MODEL_LIST.filter(m => m !== pref)] : GEMINI_MODEL_LIST; };
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
const GEMINI_TIMEOUT = { text: 35000, video: 240000 };
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
export const GeminiPool = (() => {
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
            orderedGeminiModels().forEach(m => {
                if (deadModel[m] > now) return;
                keys.forEach(k => (cool[ck(k, m)] > now ? rest : ready).push({ key: k, model: m }));
            });
            rest.sort((a, b) => cool[ck(a.key, a.model)] - cool[ck(b.key, b.model)]);
            let plan = ready.concat(rest);
            if (!plan.length) { plan = []; orderedGeminiModels().forEach(m => all.forEach(k => plan.push({ key: k, model: m }))); }
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
export const geminiGenerateContent = async (apiKey, parts, _retried = false) => {
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
export const geminiTestKey = async (key) => {
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
