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
export const SRS_PERKS = [
    { lv: 2, n: '💡 Gợi ý chữ cái đầu', d: 'Nút Gợi ý hiện chữ cái đầu của mỗi từ trong nghĩa' },
    { lv: 3, n: '📖 Gợi ý câu ví dụ', d: 'Bấm Gợi ý lần 2 để xem câu ví dụ có từ đó' },
    { lv: 4, n: '🔊 Nghe phát âm', d: 'Nút NGHE đọc to từ gốc (giọng đúng ngôn ngữ)' },
    { lv: 5, n: '🛡️ Bùa tha lỗi', d: '1 lần/phiên: trả lời sai mà không bị tính quên' },
    { lv: 6, n: '💎 Thưởng +50%', d: 'Mỗi từ nhớ đúng được thêm 5 Linh Thạch' }
];
const STREAK_TITLES = [[365, 'Hóa Thần'], [100, 'Nguyên Anh'], [30, 'Kim Đan'], [7, 'Trúc Cơ'], [3, 'Luyện Khí']];
export const titleOf = n => (STREAK_TITLES.find(([d]) => n >= d) || [0, 'Phàm Nhân'])[1];
