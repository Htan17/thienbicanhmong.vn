import { claimSrsReward, newRequestId } from './serverApi.js';
// ================= AI SƯ PHỤ + FLASHCARD SRS (module thêm mới) =================
// Lưu offline-first ở localStorage, đồng bộ Firestore vào users/{uid}/srs/* (không đụng dữ liệu cũ).
export const SRS = (() => {
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
    const blank = () => ({ cards: {}, decks: {}, del: {}, log: {}, quest: {}, streak: { count: 0, last: '' }, best: 0, pend: { spirit: 0, fame: 0, ct: 0 }, upd: 0 });
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
            difficulty: DIFF[norm(x.level).replace(/\s+/g, '')] || 2, createdAt: now, nextReviewAt: now, reviewLevel: 0, state: 'New', reps: 0, lapses: 0, prio: 0, src: x.src || 'video', vid: x.vid || '', lang: x.lang || '', deck: x.deck || '', updAt: now };
        if (S.del) delete S.del[id]; // thẻ đã từng xoá nay được thêm lại -> bỏ dấu "đã xoá"
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
            for (let i = n; i < (S.shardsN || 0); i++) b.delete(col.doc('deck_' + i)); // thẻ giảm do xoá bộ từ -> dọn shard thừa
            const keep = Object.keys(S.log).sort().slice(-120), log = {}; keep.forEach(k => log[k] = S.log[k]);
            const del = {}; Object.entries(S.del || {}).sort((a, b) => b[1] - a[1]).slice(0, 600).forEach(([k, t]) => del[k] = t);
            b.set(col.doc('meta'), { log, quest: S.quest, streak: S.streak, best: S.best || 0, xp: S.xp || 0, shards: n, decks: S.decks || {}, del, upd: S.upd });
            await b.commit(); S.shardsN = n;
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
                    S.best = Math.max(S.best || 0, v.best || 0); S.xp = Math.max(S.xp || 0, v.xp || 0); S.shardsN = Math.max(S.shardsN || 0, v.shards || 0);
                    S.del = S.del || {}; Object.entries(v.del || {}).forEach(([k, t]) => { if (t > (S.del[k] || 0)) S.del[k] = t; });
                    S.decks = S.decks || {}; Object.entries(v.decks || {}).forEach(([k, dk0]) => { if (!S.decks[k]) S.decks[k] = dk0; else if ((dk0.upd || 0) > (S.decks[k].upd || 0)) S.decks[k] = dk0; });
                } else (v.cards || []).forEach(c => { const m = S.cards[c.id]; if (!m || (c.updAt || 0) > (m.updAt || 0)) S.cards[c.id] = c; });
            });
            // áp dụng dấu "đã xoá" (từ máy khác): thẻ/bộ từ nào bị xoá sau khi tạo thì bỏ
            Object.entries(S.del || {}).forEach(([k, t]) => { if (k.indexOf('deck:') === 0) delete S.decks[k.slice(5)]; else if (S.cards[k] && (S.cards[k].createdAt || 0) <= t) delete S.cards[k]; });
            persist(false);
        } catch (e) { /* offline hoặc chưa cấp rule: vẫn chạy bằng dữ liệu cục bộ */ }
    };
    // Thưởng SRS do MÁY CHỦ cấp (claimSrsReward). Số cần nhận được gom ở `pend` (localStorage) rồi gửi theo "lô" có requestId cố định
    // (S.pend.inflight) => thử lại sau khi mất mạng sẽ không bị cộng 2 lần. Số liệu pend do client khai: máy chủ chỉ chặn trần/lần + trần/ngày.
    const flush = async () => {
        const p = S.pend; if (busy || !db || !(p.inflight || p.spirit || p.fame || p.ct)) return; busy = true;
        try {
            if (!p.inflight) p.inflight = { rid: newRequestId(), spirit: Math.min(p.spirit || 0, 5000), fame: Math.min(p.fame || 0, 500), ct: Math.min(p.ct || 0, 100) };
            const f = p.inflight;
            if (f.spirit || f.fame || f.ct) await claimSrsReward({ spirit: f.spirit, fame: f.fame, ct: f.ct }, f.rid);
            p.spirit -= f.spirit; p.fame -= f.fame; p.ct -= f.ct; p.inflight = null; persist(false);
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
            if (uid !== user.uid) { uid = user.uid; db = fs; try { S = { ...blank(), ...JSON.parse(localStorage.getItem(key()) || '{}') }; } catch (e) { S = blank(); } S.cards = S.cards || {}; S.decks = S.decks || {}; S.del = S.del || {}; S.pend = S.pend || { spirit: 0, fame: 0, ct: 0 };
                migrate(user); persist(false); cloudPull().then(() => { migrate(user); persist(); flush(); }); }
            else if (migrate(user)) persist();
        },
        addLookup(word, data, ctx) { if (!S || !data) return; if (add(word, data.meaning, { ...data, example: data.example || ctx || '', src: 'lookup' })) dayLog().lookups++; touchStreak(); persist(); },
        addMany(list, tx) { if (!S) return; const vl = tx ? langOfText(tx) : ''; (list || []).forEach(t => add(t.original, t.translated, { level: t.level, pinyin: t.pinyin, src: 'video', lang: vl })); dayLog().videos++; touchStreak(); persist(); },
        logQuiz(c, t) { if (!S) return; const L = dayLog(); L.quizC += c || 0; L.quizT += t || 0; touchStreak(); persist(); },
        // ----- Luyện gõ văn bản: ghi nhận đúng/sai theo chế độ (MEANING/WORD/SENTENCE) vào nhật ký ngày -----
        logMode(mode, ok) { if (!S || !mode) return; const L = dayLog(); L.modes = L.modes || {}; const m = L.modes[mode] || { o: 0, t: 0 }; m.t++; if (ok) m.o++; L.modes[mode] = m; persist(); },
        modeStats() { const r = { MEANING: { o: 0, t: 0 }, WORD: { o: 0, t: 0 }, SENTENCE: { o: 0, t: 0 }, LISTEN: { o: 0, t: 0 }, COPY: { o: 0, t: 0 } }, now = Date.now();
            for (let i = 0; i < 30; i++) { const l = S.log[dk(now - i * D)]; if (l && l.modes) Object.keys(r).forEach(k => { const m = l.modes[k]; if (m) { r[k].o += m.o || 0; r[k].t += m.t || 0; } }); } return r; },
        cards() { return vis(); },
        // Tiến độ ghi nhớ theo từng ngôn ngữ (không bị ảnh hưởng bộ lọc ngôn ngữ): pct = trung bình cấp ghi nhớ / 7.
        langProgress() { const m = {}; Object.values(S.cards).forEach(c => { const k = langOf(c), g = m[k] || (m[k] = { k, n: 0, mastered: 0, lv: 0, started: 0 }); g.n++; g.lv += Math.min(7, c.reviewLevel || 0); if (c.reps > 0) g.started++; if (c.state === 'Mastered') g.mastered++; });
            return Object.values(m).map(g => ({ ...g, pct: g.n ? Math.round(g.lv / (g.n * 7) * 100) : 0 })).sort((a, b) => b.n - a.n); },
        // ----- BỘ TỪ NHẬP TỪ TÀI LIỆU: mỗi bộ có id; thẻ giữ `deck`=id. Xoá bộ -> xoá thẻ do bộ tạo (thẻ vốn có từ video/tra từ chỉ bị gỡ khỏi bộ) -----
        addDeck(meta, items) { if (!S) return null; meta = meta || {};
            const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), lang = meta.lang || '', t0 = Date.now(); let added = 0, adopted = 0, dup = 0;
            (items || []).forEach(t => { if (!t || !t.original || !t.translated) return; const before = S.cards[hash(norm(t.original))];
                if (add(t.original, t.translated, { pinyin: t.pinyin, example: t.example, partOfSpeech: t.pos, lang, src: 'doc', deck: id })) added++;
                else if (before && !before.deck) { before.deck = id; before.da = 1; before.updAt = t0; adopted++; } else dup++; });
            if (!added && !adopted) return { id: null, added, adopted, dup };
            (S.decks = S.decks || {})[id] = { id, name: String(meta.name || 'Bộ từ').slice(0, 60), lang, mode: ['WORD', 'MEANING', 'BOTH'].includes(meta.mode) ? meta.mode : 'BOTH', createdAt: t0, upd: t0 };
            touchStreak(); persist(); return { id, added, adopted, dup }; },
        deckList() { const now = Date.now(), m = {}; Object.values(S.decks || {}).forEach(d => m[d.id] = { ...d, n: 0, due: 0, mastered: 0, started: 0, lv: 0, st: [0, 0, 0, 0, 0], ls: 0 });
            Object.values(S.cards).forEach(c => { const g = c.deck && m[c.deck]; if (!g) return; g.n++; g.lv += Math.min(7, c.reviewLevel || 0); if (c.nextReviewAt <= now) g.due++; if (c.reps > 0) g.started++; if (c.state === 'Mastered') g.mastered++; const l = Math.max(0, Math.min(4, c.ls || 0)); g.st[l]++; g.ls += l; });
            return Object.values(m).map(g => ({ ...g, pct: g.n ? Math.round(g.lv / (g.n * 7) * 100) : 0, pathPct: g.n ? Math.round(g.ls / (g.n * 4) * 100) : 0, remaining: g.n - g.st[4] })).sort((a, b) => b.createdAt - a.createdAt); },
        setDeck(id, patch) { const d = S.decks && S.decks[id]; if (!d || !patch) return; if (['WORD', 'MEANING', 'BOTH'].includes(patch.mode)) d.mode = patch.mode; if (patch.name) d.name = String(patch.name).slice(0, 60); d.upd = Date.now(); persist(); },
        removeDeck(id) { if (!S || !S.decks || !S.decks[id]) return 0; const t = Date.now(); let n = 0; S.del = S.del || {};
            Object.values(S.cards).forEach(c => { if (c.deck !== id) return; if (c.da) { c.deck = ''; delete c.da; c.updAt = t; } else { delete S.cards[c.id]; S.del[c.id] = t; n++; } });
            delete S.decks[id]; S.del['deck:' + id] = t; persist(); return n; },
        // ----- ẢI HỌC THUỘC: ls = số ải đã qua (0..4). Lưu ngay mỗi lần đổi để thoát giữa chừng không mất tiến trình. -----
        deckCards(id) { return Object.values(S.cards).filter(c => c.deck === id); },
        // Lưu câu ví dụ do AI tạo (chỉ khi thẻ chưa có ví dụ, hoặc ví dụ cũ cũng do AI tạo) để không ghi đè ví dụ gốc của người dùng.
        setExample(id, ex, vi = '') { const c = S && S.cards[id]; if (!c || !ex) return false; if (c.example && !c.exampleAi) return false;
            c.example = String(ex).slice(0, 240); c.exampleVi = String(vi || '').slice(0, 240); c.exampleAi = 1; c.updAt = Date.now(); persist(); return true; },
        setStage(id, ls) { const c = S.cards[id]; if (!c) return; const v = Math.max(0, Math.min(4, Math.floor(+ls || 0))); if ((c.ls || 0) === v) return; c.ls = v; c.updAt = Date.now(); persist(); },
        resetPath(id) { let n = 0; Object.values(S.cards).forEach(c => { if (c.deck === id && (c.ls || 0) > 0) { c.ls = 0; c.updAt = Date.now(); n++; } }); if (n) persist(); return n; },
        // Phiên ôn riêng cho 1 bộ từ: thẻ đến hạn (cũ trước), tối đa newCap thẻ mới.
        startDeck(id, newCap = 20) { chain = 0; const now = Date.now(), due = Object.values(S.cards).filter(c => c.deck === id && c.translated && c.nextReviewAt <= now);
            const old = due.filter(c => c.reps > 0).sort((a, b) => (b.prio - a.prio) || (a.nextReviewAt - b.nextReviewAt)); return [...old, ...due.filter(c => c.reps === 0).slice(0, newCap)].slice(0, 40); },
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
export const SRS_PERKS = [
    { lv: 2, n: '💡 Gợi ý chữ cái đầu', d: 'Nút Gợi ý hiện chữ cái đầu của mỗi từ trong nghĩa' },
    { lv: 3, n: '📖 Gợi ý câu ví dụ', d: 'Bấm Gợi ý lần 2 để xem câu ví dụ có từ đó' },
    { lv: 4, n: '🔊 Nghe phát âm', d: 'Nút NGHE đọc to từ gốc (giọng đúng ngôn ngữ)' },
    { lv: 5, n: '🛡️ Bùa tha lỗi', d: '1 lần/phiên: trả lời sai mà không bị tính quên' },
    { lv: 6, n: '💎 Thưởng +50%', d: 'Mỗi từ nhớ đúng được thêm 5 Linh Thạch' }
];
const STREAK_TITLES = [[365, 'Hóa Thần'], [100, 'Nguyên Anh'], [30, 'Kim Đan'], [7, 'Trúc Cơ'], [3, 'Luyện Khí']];
export const titleOf = n => (STREAK_TITLES.find(([d]) => n >= d) || [0, 'Phàm Nhân'])[1];
