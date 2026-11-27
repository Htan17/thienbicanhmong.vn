import { firestore } from '../config/firebase.js';
import { SRS, SRS_PERKS, titleOf } from '../lib/srs.js';
import { safeUserUpdate } from '../lib/userData.js';
import { isContentBlocked, isContentBlockedBody } from '../lib/contentFilter.js';
import { DOCX_IMPORT_CONFIG } from '../docx-import/docxImportTypes.js';
import { geminiGenerateContent, GeminiPool } from '../lib/gemini.js';
import { parseVocabText, parseDirectives, looksMessy, swapColumns, buildAiPrompt, parseAiVocabJson, detectLang, DECK_MODES, SYNTAX_TEMPLATE } from '../lib/vocabImport.js';
import { PATH_STAGES, PATH_DONE, PATH_BATCH, PATH_MAX_WRONG, stageMode, pathBatch, sessionPathPct, TYPING_MODES, MODE_LABEL, langCodeOf, checkAnswer, blankSentence, pickMode, maskWords, pct, streakProgress, buildQuizFromCards } from '../lib/srsTyping.js';
import { diffMarks, isEnglishWord, normalizeWord, strictSpellOk } from '../features/english-vocab/spelling.js';
import { speak as ttsSpeak, ttsOk, RATE_NORMAL, RATE_SLOW } from '../lib/tts.js';
import { buildExamplePrompt, parseExample } from '../lib/aiExample.js';
import { publishQuizShare, fetchQuizShare } from '../lib/quizShare.js';

// Thanh tiến độ dùng chung (role=progressbar để trình đọc màn hình hiểu). pct: 0-100.
const Bar = ({ pct: p, color = '#eab308', h = 8, label, right }) => { const v = Math.max(0, Math.min(100, Math.round(p || 0)));
    return <div>{(label || right) && <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5"><span>{label}</span><span>{right}</span></div>}
        <div className="bg-zinc-800 w-full overflow-hidden" style={{ height: h }} role="progressbar" aria-label={label || 'Tiến độ'} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: v + '%', height: '100%', background: color, transition: 'width .5s ease' }} /></div></div>; };
// Word (.docx) -> văn bản: bảng thành dòng, ô cách nhau bằng Tab (để bộ nhận diện tách cột).
const htmlToVocabText = html => { try { const doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
    const walk = n => [...n.children].forEach(el => { const tg = el.tagName;
        if (tg === 'TABLE') el.querySelectorAll('tr').forEach(tr => out.push([...tr.children].map(td => td.textContent.replace(/\s+/g, ' ').trim()).join('\t')));
        else if (/^(P|LI|H[1-6])$/.test(tg)) out.push(el.textContent.trim()); else walk(el); });
    walk(doc.body); return out.filter(Boolean).join('\n'); } catch (e) { return ''; } };
const SYNTAX_HELP = '@ten: Từ vựng bài 1      ← tên bộ từ\n@ngonngu: Tiếng Anh    ← anh | trung | nhat | han | nga | phap | duc ...\n@huong: auto           ← auto | goc-nghia (cột 1 là từ gốc) | nghia-goc (cột 1 là nghĩa)\n@tach: =               ← ký tự tách cột, "tab" = phím Tab (bỏ trống = tự nhận)\n@luyen: BOTH           ← WORD (thấy nghĩa, gõ từ) | MEANING (thấy từ, gõ nghĩa) | BOTH (xen kẽ)\n@chude: Công nghệ     ← gợi ý chủ đề cho AI\n\nMỗi dòng: từ = nghĩa   (cũng nhận: tab, | , - , : , ; , dấu phẩy CSV)\nCó thể thêm cột: loại từ (v, n...), phiên âm, câu ví dụ.';
const SND_KEY = 'suphu_snd_v1';
const loadSnd = () => { try { const o = JSON.parse(localStorage.getItem(SND_KEY) || '{}'); return { speak: o.speak !== false, keys: o.keys !== false, strict: o.strict === true, slow: o.slow === true }; } catch (e) { return { speak: true, keys: true, strict: false, slow: false }; } };
// Các chế độ phải gõ lại TỪ GỐC: với từ tiếng Anh có thể bật chấm chặt từng chữ + hiện chỗ sai.
const SPELL_MODES = new Set(['COPY', 'WORD', 'LISTEN', 'SENTENCE']);
const SpellMarks = ({ typed, answer }) => <p className="text-sm font-black tracking-widest" aria-label={'Chính tả đúng: ' + answer}>{diffMarks(typed, answer).map((x, i) => <span key={i} className={x.ok ? 'text-emerald-400' : 'text-red-400 underline'}>{x.ch}</span>)}</p>;
const TTS_OK = ttsOk;
// Đọc to từ gốc bằng giọng TỐT NHẤT của máy cho đúng ngôn ngữ thẻ (xem lib/tts.js). rate truyền vào > tuỳ chọn "Đọc chậm" > mặc định.
const speakText = (c, rate) => ttsSpeak(c.original, langCodeOf(SRS.langOf(c)), { rate: rate || (loadSnd().slow ? RATE_SLOW : RATE_NORMAL) });
const MODE_KEY = 'suphu_tmode_v1';
const loadMode = () => { try { const m = localStorage.getItem(MODE_KEY); return TYPING_MODES.some(x => x.k === m) ? m : 'MEANING'; } catch (e) { return 'MEANING'; } };

const SrsBars = ({ data, color = '#eab308', labels }) => { const mx = Math.max(1, ...data), w = 100 / data.length;
    return <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">{data.map((v, i) => <rect key={i} x={i * w + 0.4} y={40 - (v / mx) * 38} width={w - 0.8} height={Math.max(0.5, (v / mx) * 38)} fill={color}><title>{(labels ? labels[i] + ': ' : '') + v}</title></rect>)}</svg>; };

export const SuPhuHub = ({ user, onBack, playSfx }) => {
    const { useState, useEffect, useRef } = React;
    const [tv, tick] = useState(0); const [tab, setTab] = useState('SUPHU'); const [sess, setSess] = useState(null); const [sum, setSum] = useState(null); const [msg, setMsg] = useState('');
    const [tmode, setTmodeRaw] = useState(loadMode);
    const [qOpen, setQOpen] = useState(false), [qScope, setQScope] = useState('WEAK'), [qCount, setQCount] = useState(10), [qTitle, setQTitle] = useState(''), [qBusy, setQBusy] = useState(false), [qMsg, setQMsg] = useState(null);
    const [impOpen, setImpOpen] = useState(false), [impText, setImpText] = useState(''), [impBusy, setImpBusy] = useState(false), [impMsg, setImpMsg] = useState(null), [impPrev, setImpPrev] = useState(null), [impAi, setImpAi] = useState(false), [impHelp, setImpHelp] = useState(false);
    const [exMap, setExMap] = useState({}), [exBusy, setExBusy] = useState(false), [exMsg, setExMsg] = useState('');
    const [qShare, setQShare] = useState(null), [rxCode, setRxCode] = useState(''), [rxBusy, setRxBusy] = useState(false), [rxMsg, setRxMsg] = useState(null);
    const inputRef = useRef(null);
    const [snd, setSndRaw] = useState(loadSnd);
    const setSnd = k => setSndRaw(o => { const n = { ...o, [k]: !o[k] }; try { localStorage.setItem(SND_KEY, JSON.stringify(n)); } catch (e) {} return n; });
    const setTmode = m => { setTmodeRaw(m); try { localStorage.setItem(MODE_KEY, m); } catch (e) {} };
    const t0 = useRef(0), retry = useRef(new Set());
    useEffect(() => SRS.subscribe(() => tick(x => x + 1)), []);
    const advRef = useRef(null), scrollRef = useRef(null);
    // OS: giữ màn hình sáng khi đang học (điện thoại không tự tắt giữa phiên); xin lại khi quay về tab.
    const wl = useRef(null), inSess = !!sess;
    useEffect(() => { if (!inSess || typeof navigator === 'undefined' || !navigator.wakeLock) return; let dead = false;
        const get = async () => { try { if (!dead && document.visibilityState === 'visible') wl.current = await navigator.wakeLock.request('screen'); } catch (e) {} };
        const vis = () => { if (document.visibilityState === 'visible') get(); }; get(); document.addEventListener('visibilitychange', vis);
        return () => { dead = true; document.removeEventListener('visibilitychange', vis); try { wl.current && wl.current.release(); } catch (e) {} wl.current = null; }; }, [inSess]);
    const curC = sess && sess.q[sess.i], hasRes = !!(sess && sess.res);
    // Tự đọc: Nghe chép đọc ngay khi hiện thẻ; Gõ nghĩa đọc từ khi hiện thẻ; các chế độ khác đọc từ gốc sau khi chấm (củng cố phát âm).
    useEffect(() => { if (!curC) return; const m = curC.mode || 'MEANING';
        if (m === 'LISTEN') { if (!hasRes) speakText(curC); return; }
        if (!window.__sfxMuted && snd.speak && (((m === 'MEANING' || m === 'COPY') && !hasRes) || (m !== 'MEANING' && hasRes))) speakText(curC); }, [sess && sess.i, hasRes]);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);
    // Thẻ mới: đưa vùng cuộn về đầu thẻ MỘT lần; ô gõ nằm trong thanh dính đáy nên luôn thấy, không phải cuộn xuống để gõ.
    useEffect(() => { setExMsg(''); if (sess && scrollRef.current) scrollRef.current.scrollTop = 0; }, [sess && sess.i]);
    // focus({ preventScroll }) thay cho autoFocus + scrollIntoView (nguyên nhân trang tự nhảy mỗi lần ô gõ được focus).
    useEffect(() => { if (sess && !sess.res && inputRef.current) { try { inputRef.current.focus({ preventScroll: true }); } catch (e) {} } }, [sess && sess.i, hasRes]);
    useEffect(() => { const h = e => { if (e.key === 'Enter' && advRef.current && !e.repeat && !e.isComposing && e.target.tagName !== 'BUTTON') { e.preventDefault(); advRef.current(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
    useEffect(() => { SRS.init(user, firestore); tick(x => x + 1); }, [user.uid]);
    // Dữ liệu tổng hợp nặng (O(số thẻ)): chỉ tính lại khi kho thẻ đổi (tv) hoặc đổi tab, KHÔNG tính lại mỗi phím gõ.
    const heavy = tab === 'SUPHU' || tab === 'STATS';
    const heavyData = React.useMemo(() => { if (!heavy || !SRS.ready()) return { vc: [], memPct: 0, startedN: 0, LP: [], decks: [], MS: { MEANING: { o: 0, t: 0 }, WORD: { o: 0, t: 0 }, SENTENCE: { o: 0, t: 0 }, LISTEN: { o: 0, t: 0 }, COPY: { o: 0, t: 0 } } };
        const vc = SRS.cards(); return { vc, memPct: pct(vc.reduce((a, x) => a + Math.min(7, x.reviewLevel || 0), 0), vc.length * 7), startedN: vc.filter(x => x.reps > 0).length, LP: SRS.langProgress(), decks: SRS.deckList(), MS: SRS.modeStats() }; }, [tv, heavy]);
    if (!SRS.ready()) return <div className="text-zinc-400 text-xs p-6">Đang khai mở Đại Đạo...</div>;
    const A = SRS.analyze(user), st = A.st, Q = SRS.quest(), online = navigator.onLine;
    const xi = SRS.xpInfo(), langs = SRS.langs(), curLang = SRS.lang();
    const speak = (c, r) => speakText(c, r);
    const submit = () => { const cc = sess.q[sess.i], md = cc.mode || 'MEANING'; const ok = (snd.strict && SPELL_MODES.has(md) && isEnglishWord(cc.original)) ? strictSpellOk(sess.typed, cc.original) : checkAnswer(md, sess.typed, cc); playSfx && playSfx(ok ? 'CORRECT' : 'WRONG'); try { navigator.vibrate && navigator.vibrate(ok ? 15 : [40, 30, 40]); } catch (e) {} setSess({ ...sess, res: { ok } }); };
    // 🤖 VÍ DỤ DO AI: 1 câu dùng đúng từ + nghĩa tiếng Việt; lưu vào thẻ (SRS.setExample) để dùng lại cho chế độ Điền câu, không tốn API lần sau.
    const genExample = async (cc) => {
        if (!cc || exBusy) return; setExMsg('');
        const key = (() => { try { return localStorage.getItem('geminiApiKey') || ''; } catch (e) { return ''; } })();
        if (!GeminiPool.list(key).length) { playSfx && playSfx('DENY'); return setExMsg('Cần API Key Gemini (miễn phí): nhập ở Hồ Sơ → 🔑 API Key Gemini.'); }
        setExBusy(true);
        try {
            const data = await geminiGenerateContent(key, [{ text: buildExamplePrompt(cc, SRS.langOf(cc)) }]);
            const ex = parseExample(data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '', cc.original);
            if (!ex) { playSfx && playSfx('WRONG'); setExMsg('AI trả lời chưa đúng định dạng, bấm thử lại nhé.'); }
            else { SRS.setExample(cc.id, ex.s, ex.vi); setExMap(m => ({ ...m, [cc.id]: ex })); playSfx && playSfx('MAGIC'); }
        } catch (e) { playSfx && playSfx('ERROR'); setExMsg('AI đang bận hoặc lỗi: ' + String((e && e.message) || '').slice(0, 80)); }
        setExBusy(false);
    };
    const giveUp = () => { playSfx && playSfx('WRONG'); setSess({ ...sess, res: { ok: false } }); };
    const askHint = () => { playSfx && playSfx('HINT'); setSess({ ...sess, hint: Math.min(xi.lv >= 3 ? 2 : 1, (sess.hint || 0) + 1) }); };
    const forgive = () => { playSfx && playSfx('SUCCESS'); setSess({ ...sess, forgiveUsed: true, res: { ok: false, forgiven: true } }); };
    const advance = () => { const cc = sess.q[sess.i], r = sess.res; if (!r) return; let q = [...sess.q], okN = sess.ok, badN = sess.bad, lu = 0, extra = {};
        if (!r.forgiven) SRS.logMode(cc.mode || 'MEANING', r.ok);
        if (cc.path) {
            // ẢI HỌC THUỘC: mỗi từ phải qua lần lượt 4 ải. Đúng -> sang ải kế (gặp lại sau các từ khác); sai -> lùi 1 ải; dùng gợi ý ở ải 3-4 -> chưa tính qua ải.
            // Chỉ khi qua ải 4 mới ghi 1 lần vào lịch ôn cách quãng (SRS) để không "bơm" cấp ghi nhớ bằng các lần lặp liên tiếp.
            const cur = { ...sess.cur }, weak = { ...sess.weak }; let grad = sess.grad || 0;
            if (r.ok) { okN++; lu = SRS.addXp(sess.hint ? 2 : 4);
                if ((sess.hint || 0) > 0 && cc.stage >= 3) q.push({ ...cc });
                else { SRS.setStage(cc.id, cc.stage); cur[cc.id] = cc.stage;
                    if (cc.stage >= PATH_DONE) { SRS.grade(cc.id, !(cc.wrong > 0)); grad++; lu = lu || SRS.addXp(10); if (playSfx) setTimeout(() => playSfx('LEVELUP'), 150); try { navigator.vibrate && navigator.vibrate([30, 40, 30, 40, 60]); } catch (e) {} }
                    else { q.push({ ...cc, stage: cc.stage + 1, mode: stageMode(cc, cc.stage + 1, { tts: TTS_OK() }) }); if (playSfx) setTimeout(() => playSfx('STAGEUP'), 120); } } }
            else if (r.forgiven) q.push({ ...cc });
            else { badN++; const w = (cc.wrong || 0) + 1, st2 = Math.max(1, cc.stage - 1); weak[cc.id] = { original: cc.original, translated: cc.translated, wrong: w };
                if ((cur[cc.id] || 0) > st2 - 1) { SRS.setStage(cc.id, st2 - 1); cur[cc.id] = st2 - 1; }
                if (w < PATH_MAX_WRONG) q.push({ ...cc, stage: st2, wrong: w, mode: stageMode(cc, st2, { tts: TTS_OK() }) }); }
            extra = { cur, weak, grad };
        } else if (r.ok) { SRS.grade(cc.id, true); lu = SRS.addXp(sess.hint ? 6 : 10); okN++; }
        else if (r.forgiven) { q.push({ ...cc }); }
        else { SRS.grade(cc.id, false); lu = SRS.addXp(2); badN++; if (!retry.current.has(cc.id)) { retry.current.add(cc.id); q.push({ ...cc }); } }
        const i = sess.i + 1, combo = r.ok ? (sess.combo || 0) + 1 : r.forgiven ? (sess.combo || 0) : 0;
        if (r.ok && combo >= 5 && combo % 5 === 0 && playSfx) setTimeout(() => { playSfx('COMBO'); if (combo >= 10) setTimeout(() => playSfx('SPARKLE'), 260); }, 250);
        if (i < q.length && i * 2 >= q.length && sess.i * 2 < q.length && !sess.path && playSfx) setTimeout(() => playSfx('DING'), 200);
        if (i >= q.length) { const bonus = SRS.finish((Date.now() - t0.current) / 1000); if (playSfx) { const big = bonus || (sess.path && extra.grad === sess.words); setTimeout(() => playSfx(big ? 'VICTORY' : 'SUCCESS'), 150); if (big) setTimeout(() => playSfx('FANFARE'), 750); }
            const path = sess.path ? { deckId: sess.deckId, deck: sess.deck, words: sess.words, grad: extra.grad || 0, weak: Object.values(extra.weak || {}), remaining: (SRS.deckList().find(d => d.id === sess.deckId) || {}).remaining || 0 } : null;
            setSum({ ok: okN, bad: badN, bonus, a: SRS.analyze(user), path }); setSess(null); }
        else { setSess({ ...sess, ...extra, q, i, ok: okN, bad: badN, typed: '', res: null, hint: 0, lu, combo }); if (playSfx) playSfx(lu ? 'LEVELUP' : 'FLIP'); } };
    advRef.current = sess && sess.res ? advance : null;
    const start = () => { const q = SRS.startSession().map(c => ({ ...c, mode: pickMode(c, tmode, { tts: TTS_OK() }) })); if (!q.length) return setMsg('Hôm nay không còn thẻ cần ôn.'); retry.current = new Set(); t0.current = Date.now(); setSess({ q, i: 0, typed: '', res: null, hint: 0, ok: 0, bad: 0, forgiveUsed: false, lu: 0, combo: 0 }); setSum(null); setMsg(''); setTab('REVIEW'); };
    const answer = ok => { playSfx && playSfx(ok ? 'SUCCESS' : 'CLICK'); const c = sess.q[sess.i]; SRS.grade(c.id, ok);
        const q = [...sess.q]; if (!ok && !retry.current.has(c.id)) { retry.current.add(c.id); q.push(SRS.startSession ? { ...c } : c); }
        const i = sess.i + 1, ns = { ...sess, q, i, flip: false, ok: sess.ok + (ok ? 1 : 0), bad: sess.bad + (ok ? 0 : 1) };
        if (i >= q.length) { const bonus = SRS.finish((Date.now() - t0.current) / 1000); setSum({ ok: ns.ok, bad: ns.bad, bonus, a: SRS.analyze(user) }); setSess(null); } else setSess(ns); };
    const Card = ({ k, v, c = 'text-white' }) => <div className="bg-black/50 border border-zinc-800 p-2 text-center"><div className={'text-lg font-black ' + c}>{v}</div><div className="text-[10px] text-zinc-500 uppercase">{k}</div></div>;
    const nextMs = [3, 7, 30, 100, 365].find(d => d > st.streak);
    const pred = nextMs ? new Date(Date.now() + (nextMs - st.streak) * 864e5).toLocaleDateString('vi-VN') : null;
    const c = sess && sess.q[sess.i];
    // ----- tiến độ học tập -----
    const { vc, memPct, startedN, LP, decks, MS } = heavyData, sp = streakProgress(st.streak), todayN = st.today.reviews || 0;
    // ----- tạo Bí Tịch từ thẻ -----
    const base = vc.filter(x => x.translated), nowMs = Date.now();
    const scopeList = k => k === 'WEAK' ? base.filter(x => x.lapses > 0 || (x.reps > 0 && x.reviewLevel <= 1)) : k === 'DUE' ? base.filter(x => x.nextReviewAt <= nowMs) : base;
    const scopeN = scopeList(qScope).length, defTitle = 'Sư Phụ · ' + (curLang === 'ALL' ? 'Tổng hợp' : curLang) + ' · ' + new Date().toLocaleDateString('vi-VN');
    const makeQuiz = async () => {
        if (qBusy) return; setQMsg(null);
        if (base.length < 4) return setQMsg({ ok: false, t: 'Cần ít nhất 4 thẻ có nghĩa để tạo Bí Tịch (đang có ' + base.length + '). Hãy học thêm video hoặc tra thêm từ.' });
        const targets = scopeList(qScope); if (!targets.length) return setQMsg({ ok: false, t: qScope === 'WEAK' ? 'Chưa có từ yếu nào (cần từng ôn sai hoặc cấp ghi nhớ thấp). Thử chọn "Tất cả".' : 'Hôm nay không có thẻ đến hạn ôn. Thử chọn "Tất cả".' });
        const questions = buildQuizFromCards(targets, { count: qCount, pool: base, langOf: SRS.langOf });
        if (questions.length < 3) return setQMsg({ ok: false, t: 'Không đủ dữ liệu để sinh câu hỏi (cần các thẻ có nghĩa khác nhau). Học thêm rồi thử lại.' });
        const title = (qTitle.trim() || defTitle).slice(0, 80);
        if (isContentBlocked(title) || isContentBlockedBody(questions.map(q => q.q + ' ' + q.o.join(' ')).join('\n'))) { playSfx && playSfx('ERROR'); return setQMsg({ ok: false, t: 'Nội dung chứa từ ngữ không phù hợp nên không thể tạo Bí Tịch.' }); }
        setQBusy(true);
        try {
            const code = LZString.compressToEncodedURIComponent(JSON.stringify({ t: title, d: questions }));
            const est = JSON.stringify(user.library || []).length + JSON.stringify(questions).length + code.length;
            if (est > DOCX_IMPORT_CONFIG.limits.docBudgetBytes) { setQMsg({ ok: false, t: 'Tàng Kinh Các đã gần đầy (giới hạn dữ liệu hồ sơ). Hãy xoá bớt Bí Tịch cũ rồi thử lại.' }); playSfx && playSfx('WRONG'); }
            else { let sc = ''; try { sc = await publishQuizShare(firestore, user.uid, title, questions); } catch (e) { sc = ''; } // mã ngắn 8 ký tự để gửi bạn bè
                await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title, data: questions, code, ...(sc ? { shortCode: sc } : {}) }) });
                setQShare(sc ? { code: sc, title } : null);
                setQMsg({ ok: true, t: 'Đã khắc ghi Bí Tịch "' + title + '" (' + questions.length + ' câu) vào Tàng Kinh Các.' + (sc ? ' Chép mã bên dưới để chia sẻ!' : ' (Chưa tạo được mã chia sẻ, bạn có thể chia sẻ từ Tàng Kinh Các sau.)') }); setQTitle(''); playSfx && playSfx('REWARD'); }
        } catch (e) { setQMsg({ ok: false, t: 'Không lưu được Bí Tịch: ' + ((e && e.message) || 'lỗi không rõ').slice(0, 120) }); playSfx && playSfx('WRONG'); }
        setQBusy(false);
    };
    const copyText = async (txt) => { try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
        try { const t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); document.body.removeChild(t); return ok; } catch (x) { return false; } } };
    const copyShare = async () => { if (!qShare) return; const ok = await copyText(qShare.code); playSfx && playSfx(ok ? 'COPIED' : 'ERROR'); setQMsg({ ok, t: ok ? 'Đã chép mã ' + qShare.code + '. Gửi cho bạn bè nhé!' : 'Máy chặn việc chép tự động, hãy bấm giữ vào ô mã để chép tay.' }); };
    const receiveShare = async () => {
        if (rxBusy) return; setRxMsg(null);
        if (!rxCode.trim()) return setRxMsg({ ok: false, t: 'Hãy dán Mã Bí Tịch (8 ký tự) vào ô trước.' });
        setRxBusy(true);
        try {
            const v = await fetchQuizShare(firestore, rxCode);
            if (isContentBlocked(v.t) || isContentBlockedBody(v.d.map(q => (q.q || '') + ' ' + (q.o || []).join(' ')).join('\n'))) { playSfx && playSfx('ERROR'); setRxMsg({ ok: false, t: 'Bí Tịch này chứa nội dung không phù hợp nên không thể nhận.' }); }
            else if ((user.library || []).some(x => x.code === v.code || x.shortCode === v.code)) { setRxMsg({ ok: false, t: 'Bạn đã có Bí Tịch này trong Tàng Kinh Các rồi.' }); playSfx && playSfx('DENY'); }
            else if (JSON.stringify(user.library || []).length + JSON.stringify(v.d).length > DOCX_IMPORT_CONFIG.limits.docBudgetBytes) { setRxMsg({ ok: false, t: 'Tàng Kinh Các đã gần đầy. Hãy xoá bớt Bí Tịch cũ rồi thử lại.' }); playSfx && playSfx('WRONG'); }
            else { await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: v.t, data: v.d, code: v.code }) });
                setRxCode(''); setRxMsg({ ok: true, t: 'Đã nhận Bí Tịch "' + v.t + '" (' + v.d.length + ' câu). Vào Tàng Kinh Các để luyện!' }); playSfx && playSfx('REWARD'); }
        } catch (e) { playSfx && playSfx('WRONG'); setRxMsg({ ok: false, t: (e && (e.code === 'not-found' || e.code === 'bad-code')) ? e.message : (e && e.code === 'permission-denied') ? 'Bí Tịch này bị gỡ ẩn hoặc bạn chưa đăng nhập.' : 'Không nhận được Bí Tịch: ' + String((e && e.message) || '').slice(0, 80) }); }
        setRxBusy(false);
    };
    // ----- nhập tài liệu từ vựng -> bộ từ -> luyện gõ -----
    const hasAi = impOpen && GeminiPool.list((() => { try { return localStorage.getItem('geminiApiKey') || ''; } catch (e) { return ''; } })()).length > 0;
    const onFile = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; setImpPrev(null);
        if (f.size > 2 * 1024 * 1024) return setImpMsg({ ok: false, t: 'Tệp quá lớn (tối đa 2 MB).' });
        const ext = (f.name.split('.').pop() || '').toLowerCase(), done = txt => { if (!txt.trim()) return setImpMsg({ ok: false, t: 'Tệp không có chữ nào đọc được.' }); setImpText(t => (t.trim() ? t.replace(/\s+$/, '') + '\n' : '') + txt); setImpMsg({ ok: true, t: 'Đã nạp "' + f.name + '". Bấm NHẬN DIỆN TỪ VỰNG.' }); };
        const r = new FileReader(); r.onerror = () => setImpMsg({ ok: false, t: 'Không đọc được tệp này.' });
        if (ext === 'docx') { if (typeof mammoth === 'undefined') return setImpMsg({ ok: false, t: 'Thư viện đọc Word chưa tải xong, thử lại sau.' }); r.onload = ev => mammoth.convertToHtml({ arrayBuffer: ev.target.result }).then(res => done(htmlToVocabText(res.value))).catch(() => setImpMsg({ ok: false, t: 'Không đọc được tệp Word này.' })); r.readAsArrayBuffer(f); }
        else if (['txt', 'csv', 'tsv', 'md', 'text', ''].includes(ext)) { r.onload = ev => done(String(ev.target.result || '')); r.readAsText(f, 'utf-8'); }
        else setImpMsg({ ok: false, t: 'Định dạng .' + ext + ' chưa hỗ trợ. Dùng .txt, .csv, .tsv, .md hoặc .docx.' }); };
    const recognize = async () => {
        if (impBusy) return; setImpMsg(null); const text = impText; if (!text.trim()) return setImpMsg({ ok: false, t: 'Hãy dán nội dung hoặc chọn tệp tài liệu trước.' });
        setImpBusy(true);
        try {
            const d = parseDirectives(text); let res = null, via = 'local', note = '';
            if (impAi) { try { const data = await geminiGenerateContent((() => { try { return localStorage.getItem('geminiApiKey') || ''; } catch (e) { return ''; } })(), [{ text: buildAiPrompt(text) }]);
                    const ai = parseAiVocabJson(data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '');
                    if (ai.items.length) { res = { items: ai.items, skipped: [], lang: d.lang || ai.lang || detectLang(ai.items.map(i => i.original).join(' ')), title: d.title || ai.title, mode: d.mode, info: { sep: 'AI' } }; via = 'ai'; } else note = 'AI không nhận diện được mục nào nên đã dùng nhận diện thường. ';
                } catch (e) { note = 'AI đang lỗi (' + String((e && e.message) || '').slice(0, 60) + ') nên đã dùng nhận diện thường. '; } }
            if (!res) res = parseVocabText(text);
            if (!res.items.length) { setImpPrev(null); return setImpMsg({ ok: false, t: note + 'Không nhận diện được từ vựng nào. Mỗi dòng cần 2 cột (từ + nghĩa), ví dụ: print = in.' + (hasAi && !impAi ? ' Hoặc bật "Nhờ AI nhận diện" cho tài liệu lộn xộn.' : '') }); }
            setImpPrev({ items: res.items, skipped: res.skipped || [], via, sep: res.info.sep, name: res.title || 'Bộ từ ' + new Date().toLocaleDateString('vi-VN'), lang: res.lang, mode: res.mode || 'BOTH' });
            setImpMsg(note || (via === 'local' && looksMessy(res) && hasAi) ? { ok: false, t: note + (looksMessy(res) ? 'Tài liệu có vẻ lộn xộn, nên thử bật "Nhờ AI nhận diện".' : '') } : null); playSfx && playSfx('DING');
        } finally { setImpBusy(false); } };
    const editItem = (i, k, v) => setImpPrev(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, [k]: v } : it) }));
    const saveDeck = () => { const p = impPrev; if (!p) return; const items = p.items.filter(i => i.original.trim() && i.translated.trim());
        if (!items.length) return setImpMsg({ ok: false, t: 'Bộ từ đang trống.' });
        if (st.total + items.length > 4000) return setImpMsg({ ok: false, t: 'Kho thẻ tối đa 4000 thẻ. Hãy xoá bớt bộ từ cũ.' });
        const r = SRS.addDeck({ name: (p.name || '').trim() || 'Bộ từ', lang: p.lang, mode: p.mode }, items);
        if (!r || !r.id) return setImpMsg({ ok: false, t: 'Tất cả các từ này đã có sẵn trong các bộ từ khác của bạn.' });
        setImpMsg({ ok: true, t: 'Đã lưu bộ "' + ((p.name || '').trim() || 'Bộ từ') + '": ' + r.added + ' thẻ mới' + (r.adopted ? ', ' + r.adopted + ' thẻ có sẵn được nhập vào bộ' : '') + (r.dup ? ', bỏ ' + r.dup + ' từ trùng' : '') + '. Bấm LUYỆN GÕ ở mục Bộ từ bên dưới!' });
        setImpPrev(null); setImpText(''); playSfx && playSfx('REWARD'); };
    const startPath = id => { const dk = SRS.deckList().find(d => d.id === id); if (!dk) return;
        const batch = pathBatch(SRS.deckCards(id), PATH_BATCH); if (!batch.length) return setImpMsg({ ok: true, t: '🏆 Bạn đã thuộc lòng cả bộ "' + dk.name + '"!' });
        const tts = TTS_OK(), start = {}, q = batch.map(c => { const ls = Math.min(PATH_DONE - 1, c.ls || 0); start[c.id] = ls; return { ...c, path: true, stage: ls + 1, wrong: 0, mode: stageMode(c, ls + 1, { tts }) }; });
        retry.current = new Set(); t0.current = Date.now(); setSess({ q, i: 0, typed: '', res: null, hint: 0, ok: 0, bad: 0, forgiveUsed: false, lu: 0, combo: 0, deck: dk.name, deckId: id, path: true, words: q.length, start, cur: { ...start }, weak: {}, grad: 0 }); setSum(null); setMsg(''); setImpMsg(null); setTab('REVIEW'); };
    const pausePath = () => { const g = sess.grad || 0, w = sess.words; SRS.finish((Date.now() - t0.current) / 1000); setSess(null); setSum(null); setTab('SUPHU'); setImpMsg({ ok: true, t: 'Đã lưu tiến trình: ' + g + '/' + w + ' từ thuộc lòng trong phiên vừa rồi. Vào lại ải bất cứ lúc nào.' }); };
    const resetPath = async d => { if (await askConfirm('Học lại từ đầu bộ "' + d.name + '"? Tiến trình các ải của ' + d.n + ' từ sẽ về 0 (lịch ôn cách quãng giữ nguyên).')) SRS.resetPath(d.id); };
    const startDeckSession = id => { const dk = SRS.deckList().find(d => d.id === id); if (!dk) return;
        const q = SRS.startDeck(id).map(c => ({ ...c, mode: pickMode(c, dk.mode || 'BOTH', { tts: TTS_OK() }) }));
        if (!q.length) return setImpMsg({ ok: false, t: 'Bộ "' + dk.name + '" chưa có thẻ đến hạn ôn. Quay lại sau nhé!' });
        retry.current = new Set(); t0.current = Date.now(); setSess({ q, i: 0, typed: '', res: null, hint: 0, ok: 0, bad: 0, forgiveUsed: false, lu: 0, combo: 0, deck: dk.name }); setSum(null); setMsg(''); setTab('REVIEW'); };
    const removeDeck = async d => { if (await askConfirm('Xoá bộ "' + d.name + '" (' + d.n + ' từ)? Các thẻ do bộ này tạo sẽ bị xoá cùng tiến độ ôn.')) { SRS.removeDeck(d.id); playSfx && playSfx('CLICK'); } };
    const modePicker = () => <div className="space-y-1"><p className="text-[10px] font-black text-purple-300 uppercase">Chế độ gõ văn bản</p>
        <div className="grid grid-cols-5 gap-1">{TYPING_MODES.map(m => <button key={m.k} onClick={() => { playSfx && playSfx('TOGGLE'); setTmode(m.k); }} aria-pressed={tmode === m.k} className={'py-2 min-h-[44px] text-[10px] font-black border leading-tight ' + (tmode === m.k ? 'bg-purple-600 text-black border-purple-400' : 'border-zinc-700 text-zinc-400')}><span className="block text-base" aria-hidden="true">{{ MEANING: '🈶', WORD: '⌨️', SENTENCE: '📝', MIXED: '🎲', LISTEN: '🎧' }[m.k]}</span>{m.n}</button>)}</div>
        <p className="text-[10px] text-zinc-500">{TYPING_MODES.find(m => m.k === tmode).d}{tmode === 'LISTEN' && !TTS_OK() ? ' · Máy này chưa hỗ trợ đọc tiếng, sẽ dùng Gõ từ.' : ''}</p>
        <div className="grid grid-cols-2 gap-1 pt-1">{[['speak', '🔊 Tự đọc từ'], ['slow', '🐢 Đọc chậm'], ['keys', '⌨️ Tiếng gõ'], ['strict', '✍️ Chính tả chặt']].map(([k, n]) => <button key={k} onClick={() => { setSnd(k); playSfx && playSfx('TOGGLE'); }} aria-pressed={snd[k]} className={'flex-1 py-2 min-h-[40px] text-[10px] font-black border ' + (snd[k] ? 'border-cyan-500 text-cyan-300 bg-cyan-950/40' : 'border-zinc-700 text-zinc-500')}>{n}: {snd[k] ? 'BẬT' : 'TẮT'}</button>)}</div></div>;
    return (
        <div className="sp-root w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn" style={{ height: '85dvh' }}>
            <style>{`.sp-root button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.sp-root button:active:not(:disabled){transform:scale(.97)}.sp-root button:focus-visible,.sp-root input:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}.sp-ok{animation:spOk .5s ease}.sp-bad{animation:spBad .4s ease}@keyframes spOk{0%{box-shadow:0 0 0 0 rgba(16,185,129,.7)}100%{box-shadow:0 0 0 14px rgba(16,185,129,0)}}@keyframes spBad{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@media (prefers-reduced-motion:reduce){.sp-root *{animation:none!important;transition:none!important}}`}</style>
            <div className="flex justify-between items-center border-b border-yellow-700/50 pb-2 mb-2">
                <h2 className="text-lg font-black text-yellow-500 uppercase italic">AI Sư Phụ</h2>
                <div className="flex items-center gap-2"><span className={'text-[10px] font-black ' + (online ? 'text-emerald-400' : 'text-orange-400')}>{online ? 'ONLINE' : 'OFFLINE'}</span>
                    <button onClick={onBack} className="bg-zinc-800 border border-zinc-600 text-zinc-300 px-3 py-1 text-[10px] font-black">QUAY LẠI</button></div>
            </div>
            <div className="flex gap-1 mb-2">{[['SUPHU', 'SƯ PHỤ'], ['REVIEW', 'ĐẠI ĐẠO ÔN TẬP'], ['STATS', 'THỐNG KÊ']].map(([k, n]) =>
                <button key={k} onClick={() => { playSfx && playSfx('TAB'); setTab(k); }} className={'flex-1 py-3 min-h-[44px] text-[11px] font-black border ' + (tab === k ? 'bg-yellow-500 text-black border-yellow-500' : 'border-zinc-700 text-zinc-400')}>{n}</button>)}</div>
            {!sess && langs.length > 0 && <div className="flex gap-1 mb-2 overflow-x-auto pb-1 custom-scrollbar">{[{ k: 'ALL', n: langs.reduce((a, l) => a + l.n, 0), due: langs.reduce((a, l) => a + l.due, 0) }, ...langs].map(l => <button key={l.k} onClick={() => SRS.setLang(l.k)} className={'flex-shrink-0 px-2 py-1 text-[10px] font-black border whitespace-nowrap ' + (curLang === l.k ? 'bg-cyan-600 text-black border-cyan-400' : 'border-zinc-700 text-zinc-400')}>{l.k === 'ALL' ? '🌐 Tất cả' : l.k} · {l.n}{l.due ? ' (' + l.due + ' cần ôn)' : ''}</button>)}</div>}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', overscrollBehavior: 'contain' }}>
                {tab === 'SUPHU' && <>
                    <div className="bg-gradient-to-br from-indigo-950 to-black border border-indigo-500/60 p-3 space-y-1">
                        <p className="text-[10px] font-black text-indigo-300 uppercase">Lời sư phụ</p>
                        <p className="text-xs text-white leading-relaxed">{A.comment}</p><p className="text-xs text-yellow-300 font-bold leading-relaxed">{A.advice}</p></div>
                    {st.total === 0 && <div className="bg-cyan-950/40 border border-cyan-700/60 p-3 text-[11px] text-cyan-100 leading-relaxed">🌱 Chưa có thẻ nào. Xem 1 video hoặc tra vài từ ở mục <b>Học Qua Video</b>, Sư Phụ sẽ tự tạo thẻ từ vựng để bạn luyện gõ và tạo Bí Tịch.</div>}
                    <div className="grid grid-cols-3 gap-2"><Card k="Tổng thẻ" v={st.total} /><Card k="Cần ôn" v={st.due} c="text-red-400" /><Card k="Thành thạo" v={st.by.Mastered} c="text-emerald-400" /></div>
                    {modePicker()}
                    <button onClick={start} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black uppercase">Vào Đại Đạo Ôn Tập ({st.due} thẻ)</button>
                    <div className="bg-black/50 border border-fuchsia-900/60 p-3 space-y-2">
                        <button onClick={() => { setQOpen(o => !o); setQMsg(null); }} aria-expanded={qOpen} className="w-full flex justify-between items-center text-[11px] font-black text-fuchsia-300 uppercase"><span>📜 Tạo Bí Tịch (quiz) từ thẻ từ vựng</span><span>{qOpen ? '▲' : '▼'}</span></button>
                        {qOpen && <div className="space-y-2">
                            <p className="text-[10px] text-zinc-500">Sư phụ tự ra đề trắc nghiệm: nghĩa của từ, từ theo nghĩa, điền từ vào câu ví dụ (nếu thẻ có câu). Bí Tịch được lưu vào Tàng Kinh Các như bí tịch thường.</p>
                            <div className="grid grid-cols-3 gap-1">{[['WEAK', 'Từ yếu'], ['DUE', 'Cần ôn'], ['ALL', 'Tất cả']].map(([k, n]) => <button key={k} onClick={() => setQScope(k)} aria-pressed={qScope === k} className={'py-1.5 text-[10px] font-black border ' + (qScope === k ? 'bg-fuchsia-600 text-black border-fuchsia-400' : 'border-zinc-700 text-zinc-400')}>{n} ({scopeList(k).length})</button>)}</div>
                            <div className="grid grid-cols-3 gap-1">{[10, 20, 30].map(n => <button key={n} onClick={() => setQCount(n)} aria-pressed={qCount === n} className={'py-1.5 text-[10px] font-black border ' + (qCount === n ? 'bg-fuchsia-600 text-black border-fuchsia-400' : 'border-zinc-700 text-zinc-400')}>{n} câu</button>)}</div>
                            <input value={qTitle} maxLength={80} onChange={e => setQTitle(e.target.value)} placeholder={defTitle} className="w-full bg-black border border-fuchsia-800/70 p-2.5 text-base text-white outline-none focus:border-fuchsia-400" />
                            <p className="text-[10px] text-zinc-500">Ngôn ngữ đang chọn: <b className="text-cyan-300">{curLang === 'ALL' ? 'Tất cả' : curLang}</b> · sẽ ra tối đa {Math.min(qCount, scopeN)} câu từ {scopeN} thẻ.</p>
                            <button disabled={qBusy} onClick={makeQuiz} className="w-full bg-fuchsia-500 text-black py-2.5 text-[11px] font-black uppercase disabled:bg-zinc-800 disabled:text-zinc-500">{qBusy ? 'ĐANG KHẮC GHI...' : 'TẠO BÍ TỊCH'}</button>
                        </div>}
                        {qMsg && <p className={'text-[10px] ' + (qMsg.ok ? 'text-emerald-300' : 'text-orange-300')} role="status">{qMsg.t}</p>}
                        {qShare && <div className="border border-fuchsia-600 bg-fuchsia-950/30 p-2 space-y-1.5">
                            <p className="text-[10px] font-black text-fuchsia-300 uppercase">📤 Mã chia sẻ · {qShare.title}</p>
                            <div className="flex gap-1"><input readOnly value={qShare.code} aria-label="Mã chia sẻ Bí Tịch" data-sfx="off" onFocus={e => e.target.select()} className="flex-1 min-w-0 bg-black border border-fuchsia-700 p-2 text-lg font-black tracking-[0.3em] text-center text-white" />
                                <button onClick={copyShare} className="px-3 min-h-[44px] bg-fuchsia-500 text-black text-[11px] font-black">📋 CHÉP MÃ</button></div>
                            <p className="text-[10px] text-zinc-400">Gửi mã này cho bạn bè. Họ dán vào ô "Nhận Bí Tịch bằng mã" ngay ở đây hoặc ở Tàng Kinh Các.</p></div>}
                        <div className="border-t border-fuchsia-900/50 pt-2 space-y-1.5">
                            <p className="text-[10px] font-black text-fuchsia-300 uppercase">📥 Nhận Bí Tịch bằng mã</p>
                            <div className="flex gap-1"><input value={rxCode} onChange={e => setRxCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); receiveShare(); } }} maxLength={12} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Dán mã 8 ký tự..." aria-label="Mã Bí Tịch cần nhận" className="flex-1 min-w-0 bg-black border border-fuchsia-800/70 p-2.5 text-base text-white tracking-widest outline-none focus:border-fuchsia-400" />
                                <button disabled={rxBusy} onClick={receiveShare} className="px-3 min-h-[44px] bg-fuchsia-600 text-black text-[11px] font-black disabled:bg-zinc-800 disabled:text-zinc-500">{rxBusy ? '...' : 'NHẬN'}</button></div>
                            {rxMsg && <p className={'text-[10px] ' + (rxMsg.ok ? 'text-emerald-300' : 'text-orange-300')} role="status">{rxMsg.t}</p>}
                        </div>
                    </div>
                    <div className="bg-black/50 border border-sky-900/60 p-3 space-y-2">
                        <button onClick={() => { setImpOpen(o => !o); setImpMsg(null); }} aria-expanded={impOpen} className="w-full flex justify-between items-center text-[11px] font-black text-sky-300 uppercase"><span>📥 Nhập tài liệu từ vựng (học bằng gõ chữ)</span><span>{impOpen ? '▲' : '▼'}</span></button>
                        {impOpen && <div className="space-y-2">
                            <p className="text-[10px] text-zinc-500 leading-relaxed">Dán danh sách hoặc tải tệp (.txt .csv .tsv .md .docx). Sư Phụ tự nhận ra cột từ gốc và cột nghĩa tiếng Việt, rồi bạn luyện bằng cách <b className="text-sky-300">gõ chữ</b>: thấy "in" → gõ "print", hoặc ngược lại.</p>
                            <textarea value={impText} onChange={e => { setImpText(e.target.value); setImpPrev(null); }} rows={6} spellCheck={false} aria-label="Nội dung tài liệu từ vựng" placeholder={'print = in\nhello = xin chào\nbook = quyển sách'} className="w-full bg-black border border-sky-800/70 p-2.5 text-base text-white outline-none focus:border-sky-400 font-mono" />
                            <div className="grid grid-cols-2 gap-1">
                                <label className="py-2.5 min-h-[44px] flex items-center justify-center text-[10px] font-black border border-sky-700 text-sky-300 cursor-pointer text-center">📎 CHỌN TỆP<input type="file" aria-label="Chọn tệp từ vựng" accept=".txt,.csv,.tsv,.md,.docx,text/plain" className="hidden" onChange={onFile} /></label>
                                <button onClick={() => { setImpText(t => (t.trim() ? t.replace(/\s+$/, '') + '\n' : '') + SYNTAX_TEMPLATE); setImpPrev(null); }} className="py-2.5 min-h-[44px] text-[10px] font-black border border-sky-700 text-sky-300">✍️ CHÈN MẪU LỆNH</button></div>
                            <button onClick={() => setImpHelp(h => !h)} aria-expanded={impHelp} className="w-full text-left text-[10px] text-zinc-400 py-1">📖 Cấu trúc lệnh cho Sư Phụ {impHelp ? '▲' : '▼'}</button>
                            {impHelp && <pre className="text-[10px] text-sky-200 bg-black border border-zinc-800 p-2 whitespace-pre-wrap leading-relaxed">{SYNTAX_HELP}</pre>}
                            <label className="flex items-center gap-2 text-[11px] text-zinc-300 min-h-[36px]"><input type="checkbox" checked={impAi && hasAi} disabled={!hasAi} onChange={e => setImpAi(e.target.checked)} className="w-4 h-4" /><span>🤖 Nhờ AI nhận diện (tài liệu lộn xộn){!hasAi && <span className="text-zinc-500"> · cần API Key Gemini trong Cài đặt</span>}</span></label>
                            <button disabled={impBusy} onClick={recognize} className="w-full bg-sky-500 text-black py-3 min-h-[48px] text-[11px] font-black uppercase disabled:bg-zinc-800 disabled:text-zinc-500">{impBusy ? 'ĐANG NHẬN DIỆN...' : 'NHẬN DIỆN TỪ VỰNG'}</button>
                            {impMsg && <p className={'text-[11px] ' + (impMsg.ok ? 'text-emerald-300' : 'text-orange-300')} role="status">{impMsg.t}</p>}
                            {impPrev && <div className="space-y-2 border-t border-zinc-800 pt-2">
                                <p className="text-[11px] text-sky-300 font-black">Đã nhận diện {impPrev.items.length} từ ({impPrev.via === 'ai' ? 'bằng AI' : 'tách cột "' + impPrev.sep + '"'}). Kiểm tra rồi lưu:</p>
                                <p className="text-[10px] text-zinc-400">Ví dụ luyện: thấy <b className="text-cyan-300">"{impPrev.items[0].translated}"</b> → gõ <b className="text-yellow-300">"{impPrev.items[0].original}"</b>. Nếu bị ngược, bấm ĐẢO CỘT.</p>
                                <div className="grid grid-cols-2 gap-1"><input value={impPrev.name} maxLength={60} onChange={e => setImpPrev(p => ({ ...p, name: e.target.value }))} aria-label="Tên bộ từ" className="bg-black border border-sky-800/70 p-2 text-base text-white outline-none" /><input value={impPrev.lang} maxLength={30} onChange={e => setImpPrev(p => ({ ...p, lang: e.target.value }))} aria-label="Ngôn ngữ đang học" className="bg-black border border-sky-800/70 p-2 text-base text-white outline-none" /></div>
                                <div className="grid grid-cols-3 gap-1">{DECK_MODES.map(m => <button key={m.k} onClick={() => setImpPrev(p => ({ ...p, mode: m.k }))} aria-pressed={impPrev.mode === m.k} className={'py-2 min-h-[44px] text-[10px] font-black border leading-tight ' + (impPrev.mode === m.k ? 'bg-sky-600 text-black border-sky-400' : 'border-zinc-700 text-zinc-400')}>{m.n}</button>)}</div>
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-zinc-500 uppercase"><span>Từ gốc (phải gõ)</span><span>Nghĩa tiếng Việt</span><span /></div>
                                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">{impPrev.items.slice(0, 80).map((it, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1"><input value={it.original} onChange={e => editItem(i, 'original', e.target.value)} aria-label={'Từ gốc ' + (i + 1)} className="min-w-0 bg-black border border-zinc-700 p-1.5 text-base text-yellow-200 outline-none" /><input value={it.translated} onChange={e => editItem(i, 'translated', e.target.value)} aria-label={'Nghĩa ' + (i + 1)} className="min-w-0 bg-black border border-zinc-700 p-1.5 text-base text-cyan-200 outline-none" /><button onClick={() => setImpPrev(p => p.items.length > 1 ? { ...p, items: p.items.filter((_, j) => j !== i) } : p)} aria-label={'Bỏ từ ' + (i + 1)} className="px-2 min-w-[36px] text-red-400 border border-red-900/60">✕</button></div>)}
                                    {impPrev.items.length > 80 && <p className="text-[10px] text-zinc-500">… và {impPrev.items.length - 80} từ nữa (vẫn được lưu).</p>}</div>
                                <button onClick={() => setImpPrev(p => ({ ...p, items: swapColumns(p.items), lang: detectLang(p.items.map(i => i.translated).join(' ')) === 'Tiếng Anh / Latinh' ? p.lang : detectLang(p.items.map(i => i.translated).join(' ')) }))} className="w-full py-2.5 min-h-[44px] text-[10px] font-black border border-sky-700 text-sky-300">⇄ ĐẢO CỘT (từ gốc ↔ nghĩa)</button>
                                {impPrev.skipped.length > 0 && <details className="text-[10px] text-zinc-500"><summary className="cursor-pointer py-1">{impPrev.skipped.length} dòng bị bỏ qua</summary><div className="max-h-24 overflow-y-auto">{impPrev.skipped.map((x, i) => <p key={i} className="truncate">{x}</p>)}</div></details>}
                                <button onClick={saveDeck} className="w-full bg-emerald-500 text-black py-3 min-h-[48px] text-[11px] font-black uppercase">LƯU BỘ TỪ ({impPrev.items.length} từ)</button>
                            </div>}
                        </div>}
                    </div>
                    {decks.length > 0 && <div className="bg-black/50 border border-sky-900/60 p-3 space-y-2">
                        <p className="text-[10px] font-black text-sky-300 uppercase">📚 Bộ từ của bạn (luyện gõ)</p>
                        {decks.map(d => <div key={d.id} className="border border-zinc-800 p-2 space-y-1.5">
                            <div className="flex justify-between items-start gap-2"><div className="min-w-0"><p className="text-xs font-black text-white truncate">{d.name}</p><p className="text-[10px] text-zinc-500">{d.lang || '—'} · {d.n} từ · {d.due} đến hạn</p></div><button onClick={() => removeDeck(d)} aria-label={'Xoá bộ ' + d.name} className="px-2 min-h-[36px] min-w-[36px] text-red-400 border border-red-900/60">🗑</button></div>
                            <Bar pct={d.pathPct} color="#a855f7" h={8} label="🏯 Tiến trình học thuộc (4 ải)" right={d.st[4] + '/' + d.n + ' thuộc lòng · ' + d.pathPct + '%'} />
                            <div className="grid grid-cols-5 gap-1 text-center" role="list" aria-label="Số từ ở mỗi ải">{[...PATH_STAGES.map((st, k) => ({ ic: st.ic, n: st.n, c: d.st[k] })), { ic: '🏆', n: 'Thuộc', c: d.st[4] }].map((x, k) => <div key={k} role="listitem" className={'border py-1 ' + (x.c ? (k === 4 ? 'border-emerald-700' : 'border-purple-800') : 'border-zinc-800 opacity-60')}><div className="text-sm" aria-hidden="true">{x.ic}</div><div className="text-[10px] text-zinc-400 leading-tight">{x.n}</div><div className="text-xs font-black text-white">{x.c}</div></div>)}</div>
                            {d.remaining > 0 ? <button onClick={() => startPath(d.id)} className="w-full bg-purple-500 text-black py-3 min-h-[48px] text-[11px] font-black uppercase">⚔️ VÀO ẢI HỌC THUỘC ({Math.min(PATH_BATCH, d.remaining)} từ)</button>
                                : <div className="flex gap-1 items-center"><p className="flex-1 text-xs text-emerald-300 font-black">🏆 Đã thuộc lòng cả bộ</p><button onClick={() => resetPath(d)} className="px-3 min-h-[44px] text-[10px] font-black border border-purple-700 text-purple-300">HỌC LẠI TỪ ĐẦU</button></div>}
                            <Bar pct={d.pct} color="#06b6d4" h={5} label="Độ ghi nhớ theo lịch ôn" right={d.pct + '% · thuộc ' + d.mastered + '/' + d.n} />
                            <div className="grid grid-cols-3 gap-1">{DECK_MODES.map(m => <button key={m.k} onClick={() => SRS.setDeck(d.id, { mode: m.k })} aria-pressed={d.mode === m.k} className={'py-1.5 min-h-[40px] text-[10px] font-black border leading-tight ' + (d.mode === m.k ? 'bg-sky-600 text-black border-sky-400' : 'border-zinc-700 text-zinc-400')}>{m.n}</button>)}</div>
                            <button onClick={() => startDeckSession(d.id)} className={'w-full py-2.5 min-h-[44px] text-[11px] font-black uppercase ' + (d.due ? 'bg-emerald-500 text-black' : 'border border-zinc-700 text-zinc-500')}>⌨️ ÔN LỊCH SRS ({d.due} đến hạn)</button>
                        </div>)}
                        {impMsg && !impOpen && <p className={'text-[11px] ' + (impMsg.ok ? 'text-emerald-300' : 'text-orange-300')} role="status">{impMsg.t}</p>}
                    </div>}
                    <div className="bg-black/50 border border-emerald-900/60 p-3 space-y-2">
                        <p className="text-[10px] font-black text-emerald-400 uppercase">Tiến độ học tập</p>
                        <Bar pct={pct(todayN, 20)} color="#22c55e" label="Ôn hôm nay (mục tiêu 20 thẻ)" right={Math.min(todayN, 20) + '/20'} />
                        <Bar pct={memPct} color="#06b6d4" label="Độ ghi nhớ trung bình" right={memPct + '%'} />
                        <Bar pct={pct(startedN, vc.length)} color="#f59e0b" label="Thẻ đã bắt đầu học" right={startedN + '/' + vc.length} />
                        <Bar pct={pct(st.by.Mastered, st.total)} color="#10b981" label="Đã thành thạo" right={st.by.Mastered + '/' + st.total} />
                        <Bar pct={sp.pct} color="#a855f7" label={sp.next ? 'Chuỗi tu luyện tới mốc ' + sp.next + ' ngày' : 'Chuỗi tu luyện: đã đạt mốc cao nhất'} right={st.streak + (sp.next ? '/' + sp.next : '') + ' ngày'} />
                        {LP.length > 0 && <div className="pt-1 space-y-1.5 border-t border-zinc-800"><p className="text-[10px] text-zinc-500 uppercase">Theo ngôn ngữ</p>
                            {LP.map(g => <Bar key={g.k} pct={g.pct} color="#eab308" h={6} label={g.k + ' · ' + g.n + ' thẻ'} right={g.pct + '% · thuộc ' + g.mastered} />)}</div>}
                    </div>
                    <div className="bg-black/50 border border-yellow-800/60 p-3 space-y-2">
                        <div className="flex justify-between items-center"><p className="text-[10px] font-black text-yellow-500 uppercase">Cảnh giới ôn luyện: Lv{xi.lv}{xi.max ? ' (TỐI ĐA)' : ''}</p><span className="text-[10px] text-zinc-500">{xi.xp} EXP{xi.next ? ' / ' + xi.next : ''}</span></div>
                        <div className="h-2 bg-zinc-800"><div className="h-2 bg-yellow-500" style={{ width: (xi.next ? Math.min(100, (xi.xp - xi.cur) / (xi.next - xi.cur) * 100) : 100) + '%' }} /></div>
                        <p className="text-[10px] text-zinc-500">Gõ đúng nghĩa +10 EXP (có gợi ý +6), gõ sai +2 EXP. Mỗi lần thăng cấp thưởng Linh Thạch và mở khóa chức năng:</p>
                        {SRS_PERKS.map(pk => <p key={pk.lv} className={'text-[10px] ' + (xi.lv >= pk.lv ? 'text-emerald-300' : 'text-zinc-600')}>{xi.lv >= pk.lv ? '✔' : '🔒 Lv' + pk.lv} <b>{pk.n}</b> - {pk.d}</p>)}
                    </div>
                    {msg && <p className="text-[10px] text-orange-300 text-center">{msg}</p>}
                    <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase mb-1">Nhiệm vụ hôm nay</p>
                        {Q.items.map((it, i) => <div key={i} className="py-0.5"><div className="flex justify-between text-[11px]"><span className={it.done ? 'text-emerald-400 line-through' : 'text-zinc-300'}>{it.n}</span><span className="text-zinc-500">{it.p}/{it.g}</span></div><Bar pct={pct(it.p, it.g)} color={it.done ? '#10b981' : '#eab308'} h={4} label={'Tiến độ: ' + it.n} /></div>)}
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
                    <div className="space-y-1 sticky top-0 z-10 bg-black/90 pb-1"><div className="flex justify-between items-center text-[10px] text-zinc-400 font-black"><span>{sess.i + 1}/{sess.q.length}</span><span className="border border-purple-600 text-purple-300 px-1.5 text-[10px]">{sess.path ? 'Ải ' + c.stage + ' · ' + PATH_STAGES[c.stage - 1].n : MODE_LABEL[c.mode || 'MEANING']}</span>{(sess.combo || 0) >= 3 && <span className="text-orange-300" aria-label={'Chuỗi đúng liên tiếp ' + sess.combo}>🔥 x{sess.combo}</span>}<span className="text-emerald-400">Nhớ {sess.ok}</span><span className="text-red-400">Quên {sess.bad}</span></div>
                        {sess.path ? <>
                            <Bar pct={sessionPathPct(sess.start, sess.cur)} color="#a855f7" h={8} label={'🏯 ' + sess.deck + ' · tiến trình học thuộc'} right={(sess.grad || 0) + '/' + sess.words + ' từ thuộc · ' + sessionPathPct(sess.start, sess.cur) + '%'} />
                            <div className="flex gap-1" role="img" aria-label={'Đang ở ải ' + c.stage + ' trên ' + PATH_DONE}>{PATH_STAGES.map(st => <div key={st.k} className={'flex-1 text-center text-[10px] py-1 border ' + (st.k === c.stage ? 'border-purple-400 bg-purple-600/30 text-purple-200 font-black' : st.k < c.stage ? 'border-emerald-700 text-emerald-300' : 'border-zinc-800 text-zinc-600')}><span aria-hidden="true">{st.ic}</span> {st.k}</div>)}</div></>
                            : <Bar pct={pct(sess.i, sess.q.length)} color="#eab308" h={8} label={sess.deck ? 'Bộ: ' + sess.deck : 'Tiến độ phiên ôn'} right={pct(sess.i, sess.q.length) + '%'} />}
                        <div className="flex h-1.5 w-full bg-zinc-800 overflow-hidden" aria-hidden="true"><div style={{ width: pct(sess.ok, sess.q.length) + '%', background: '#10b981', transition: 'width .4s' }} /><div style={{ width: pct(sess.bad, sess.q.length) + '%', background: '#ef4444', transition: 'width .4s' }} /></div></div>
                    {sess.lu ? <div className="bg-yellow-500 text-black text-center text-[11px] font-black py-1.5 animate-pulse">⚡ THĂNG CẤP! Cảnh giới Lv{sess.lu} · +{100 * sess.lu} Linh Thạch{SRS_PERKS.find(pk => pk.lv === sess.lu) ? ' · Mở khóa: ' + SRS_PERKS.find(pk => pk.lv === sess.lu).n : ''}</div> : null}
                    <div aria-live="polite" className={'min-h-[160px] bg-zinc-950 border-2 p-4 flex flex-col items-center justify-center text-center select-none transition-colors ' + (!sess.res ? 'border-yellow-600/70' : sess.res.ok ? 'border-emerald-500 sp-ok' : sess.res.forgiven ? 'border-cyan-500' : 'border-red-500 sp-bad')}>
                        {(() => { const md = c.mode || 'MEANING', cl = md === 'SENTENCE' ? blankSentence(c.example, c.original) : null, h2 = md === 'MEANING' ? c.example : md === 'LISTEN' ? c.translated : (c.pinyin || (md === 'WORD' && c.example ? blankSentence(c.example, c.original).text : '')); return <>
                            {md === 'COPY' && <><p className="text-3xl font-black text-white break-words">{c.original}</p>{c.pinyin && <p className="text-sm text-yellow-400 italic mt-1">{c.pinyin}</p>}<p className="text-lg text-cyan-300 font-bold mt-2">{c.translated}</p>{c.example && <p className="text-xs text-zinc-400 italic mt-2">{c.example}</p>}<button onClick={() => speak(c)} className="mt-2 text-[10px] border border-cyan-700 text-cyan-300 px-3 py-2 min-h-[40px] font-black">🔊 NGHE</button></>}
                            {md === 'MEANING' && <><p className="text-3xl font-black text-white break-words">{c.original}</p>{c.pinyin && <p className="text-sm text-yellow-400 italic mt-1">{c.pinyin}</p>}</>}
                            {md === 'WORD' && <><p className="text-2xl font-black text-cyan-300 break-words">{c.translated}</p>{c.partOfSpeech && <p className="text-[10px] text-purple-300 uppercase mt-1">{c.partOfSpeech}</p>}</>}
                            {md === 'LISTEN' && <><p className="text-[11px] text-purple-300 uppercase">Nghe và gõ lại từ bạn nghe được</p><div className="flex gap-2 mt-3 justify-center"><button onClick={() => speak(c)} className="px-4 py-3 min-h-[48px] bg-cyan-600 text-black font-black text-xs">🔊 NGHE LẠI</button><button onClick={() => speak(c, 0.6)} className="px-4 py-3 min-h-[48px] border border-cyan-600 text-cyan-300 font-black text-xs">🐢 CHẬM</button></div>{!TTS_OK() && <p className="text-[10px] text-orange-300 mt-2">Máy chưa hỗ trợ đọc tiếng.</p>}</>}
                            {md === 'SENTENCE' && <><p className="text-xl font-black text-white break-words leading-relaxed">{cl.text}</p><p className="text-xs text-cyan-300 mt-2">Nghĩa của từ cần điền: <b>{c.translated}</b></p></>}
                            {xi.lv >= 4 && md === 'MEANING' && <button onClick={() => speak(c)} className="mt-2 text-[10px] border border-cyan-700 text-cyan-300 px-2 py-1 font-black">🔊 NGHE</button>}
                            {!sess.res && <p className="text-[10px] text-zinc-500 mt-3">{md === 'COPY' ? 'Nhìn và gõ lại từ này để khắc ghi' : md === 'MEANING' ? 'Nhập nghĩa tiếng Việt của từ này' : md === 'WORD' ? 'Gõ từ gốc (' + SRS.langOf(c) + ') có nghĩa này' : md === 'LISTEN' ? 'Gõ từ (' + SRS.langOf(c) + ') bạn vừa nghe' : 'Gõ từ còn thiếu trong câu'}</p>}
                            {!sess.res && sess.hint >= 1 && <p className="text-sm text-cyan-300 font-black tracking-widest mt-2">{maskWords(md === 'MEANING' ? c.translated : c.original)}</p>}
                            {!sess.res && sess.hint >= 2 && h2 && <p className="text-xs text-zinc-400 italic mt-2">{h2}</p>}
                        </>; })()}
                        {sess.res && <div className="mt-3 space-y-1">
                            <p className={'text-sm font-black ' + (sess.res.ok ? 'text-emerald-400' : 'text-red-400')}>{sess.res.ok ? '✔ CHÍNH XÁC' : sess.res.forgiven ? '🛡️ Bùa tha lỗi - từ này sẽ quay lại sau' : '✘ CHƯA ĐÚNG' + (sess.typed ? ' (bạn gõ: ' + sess.typed + ')' : '')}</p>
                            <p className="text-lg text-cyan-300 font-bold">{(c.mode || 'MEANING') === 'MEANING' ? c.translated : c.original}</p>
                            {SPELL_MODES.has(c.mode || 'MEANING') && isEnglishWord(c.original) && sess.typed && normalizeWord(sess.typed) !== normalizeWord(c.original) && <div className="space-y-0.5"><SpellMarks typed={sess.typed} answer={c.original} />{sess.res.ok && <p className="text-[10px] text-orange-300">Đúng nhưng chưa chuẩn chính tả — bật "Chính tả chặt" để luyện viết đúng từng chữ.</p>}</div>}
                            {(c.mode || 'MEANING') !== 'MEANING' && <>{c.pinyin && <p className="text-sm text-yellow-400 italic">{c.pinyin}</p>}<p className="text-sm text-zinc-300">{c.translated}</p>{xi.lv >= 4 && <button onClick={() => speak(c)} className="text-[10px] border border-cyan-700 text-cyan-300 px-2 py-1 font-black">🔊 NGHE</button>}</>}
                            {c.partOfSpeech && <p className="text-[10px] text-purple-300 uppercase">{c.partOfSpeech}</p>}
                            {(() => { const ex = exMap[c.id] || (c.example ? { s: c.example, vi: c.exampleVi || '' } : null), lc = langCodeOf(SRS.langOf(c)); return <div className="w-full max-w-sm mx-auto space-y-1 pt-1">
                                {ex && <div className="border border-zinc-700 bg-black/40 p-2 text-left space-y-0.5">
                                    <p className="text-[10px] text-purple-300 uppercase">Ví dụ{(exMap[c.id] || c.exampleAi) ? ' · AI tạo' : ''}</p>
                                    <p className="text-sm text-zinc-100 italic leading-snug break-words">{ex.s}</p>{ex.vi && <p className="text-xs text-cyan-300/90 break-words">{ex.vi}</p>}
                                    {TTS_OK() && <button onClick={() => ttsSpeak(ex.s, lc, { rate: loadSnd().slow ? RATE_SLOW : RATE_NORMAL })} className="text-[10px] border border-cyan-700 text-cyan-300 px-2 py-1 font-black">🔊 ĐỌC CÂU</button>}</div>}
                                <button disabled={exBusy} onClick={() => genExample(c)} className="w-full min-h-[40px] text-[10px] font-black border border-fuchsia-600 text-fuchsia-300 disabled:opacity-50">{exBusy ? '🤖 AI ĐANG VIẾT CÂU...' : ex ? '🔄 VÍ DỤ KHÁC (AI)' : '🤖 TẠO VÍ DỤ BẰNG AI'}</button>
                                {exMsg && <p className="text-[10px] text-orange-300" role="status">{exMsg}</p>}</div>; })()}
                            {c.path && <p className={'text-xs font-black ' + (sess.res.ok ? 'text-emerald-300' : sess.res.forgiven ? 'text-cyan-300' : 'text-orange-300')} role="status">{sess.res.forgiven ? '🛡️ Giữ nguyên ải này, sẽ gặp lại' : sess.res.ok ? ((sess.hint || 0) > 0 && c.stage >= 3 ? '💡 Dùng gợi ý nên chưa tính qua ải ' + c.stage + ', sẽ gặp lại' : c.stage >= PATH_DONE ? '🏆 Thuộc lòng! Từ này vào lịch ôn cách quãng' : '✅ Qua ải ' + c.stage + '! Tiếp: ải ' + (c.stage + 1) + ' · ' + PATH_STAGES[c.stage].n) : '↩️ Lùi về ải ' + Math.max(1, c.stage - 1) + ((c.wrong || 0) + 1 >= PATH_MAX_WRONG ? ' · đây là lần cuối trong phiên' : ', sẽ gặp lại')}</p>}
                            <div className="max-w-[220px] mx-auto pt-1"><Bar pct={pct(c.reviewLevel, 7)} color="#06b6d4" h={5} label="Cấp ghi nhớ của thẻ" right={Math.min(7, c.reviewLevel || 0) + '/7'} /></div>
                        </div>}
                    </div>
                    {!sess.res ? <>
                        <div className="sticky bottom-0 z-10 bg-black/95 border-t border-zinc-800 pt-2 pb-1 space-y-2">
                        <input ref={inputRef} value={sess.typed || ''} data-sfx={snd.keys ? undefined : 'off'} onChange={e => setSess({ ...sess, typed: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); e.stopPropagation(); /* không để listener Enter toàn cục (qua thẻ kế) nhận cùng phím vừa dùng để chấm */ submit(); } }} placeholder={(c.mode || 'MEANING') === 'MEANING' ? 'Gõ nghĩa tiếng Việt rồi Enter...' : 'Gõ từ bằng ' + SRS.langOf(c) + ' rồi Enter...'} lang={(c.mode || 'MEANING') === 'MEANING' ? 'vi' : langCodeOf(SRS.langOf(c))} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Ô gõ đáp án" className="w-full bg-black border border-yellow-600/60 p-3 text-base text-white outline-none focus:border-yellow-400" enterKeyHint="done" />
                        <div className="flex gap-2">
                            <button onClick={submit} className="flex-1 bg-yellow-500 text-black py-3.5 min-h-[48px] font-black text-xs">KIỂM TRA</button>
                            {xi.lv >= 2 && (c.mode || 'MEANING') !== 'COPY' && <button onClick={askHint} className="px-3 min-h-[48px] border border-cyan-600 text-cyan-300 font-black text-[10px]">💡 GỢI Ý{xi.lv >= 3 ? ' (' + (sess.hint || 0) + '/2)' : ''}</button>}
                        </div>
                        </div>
                        {sess.path && <button onClick={pausePath} className="w-full text-[11px] text-zinc-400 py-2 min-h-[44px] border border-zinc-800">⏸ TẠM DỪNG &amp; LƯU TIẾN TRÌNH</button>}
                        <p className="text-[10px] text-zinc-500 text-center hidden sm:block">Enter: kiểm tra · Enter lần nữa: thẻ tiếp theo</p>
                        {(c.mode || 'MEANING') !== 'COPY' && <button onClick={giveUp} className="w-full text-[11px] text-zinc-400 py-2.5 min-h-[44px]">Không nhớ - xem đáp án (tính là quên)</button>}
                    </> : <div className="sticky bottom-0 z-10 bg-black/95 border-t border-zinc-800 pt-2 pb-1"><div className="flex gap-2">
                        {!sess.res.ok && !sess.res.forgiven && xi.lv >= 5 && !sess.forgiveUsed && <button onClick={forgive} className="flex-1 border border-emerald-600 text-emerald-300 font-black text-[10px] py-3">🛡️ BÙA THA LỖI</button>}
                        <button onClick={advance} className="flex-[2] bg-emerald-600 text-black py-3.5 min-h-[48px] font-black text-xs">TIẾP THEO → <span className="opacity-60 hidden sm:inline">(Enter)</span></button>
                    </div></div>}
                </div> : sum ? <div className="space-y-3">
                    <div className="bg-black/60 border border-yellow-600 p-3 text-center"><p className="text-yellow-500 font-black uppercase text-sm">Kết thúc phiên</p><p className="text-xs text-white mt-1">Nhớ {sum.ok} · Quên {sum.bad}{sum.bonus ? ' · +100 Danh Vọng vì ôn hết hôm nay' : ''}</p>
                        <div className="mt-2 space-y-1.5 text-left"><Bar pct={pct(sum.ok, sum.ok + sum.bad)} color="#10b981" label="Độ chính xác phiên này" right={pct(sum.ok, sum.ok + sum.bad) + '%'} /><Bar pct={pct(sum.a.st.by.Mastered, sum.a.st.total)} color="#06b6d4" label="Đã thành thạo toàn bộ thẻ" right={sum.a.st.by.Mastered + '/' + sum.a.st.total} /></div>
                        {sum.path && <div className="mt-3 text-left space-y-2"><p className="text-sm font-black text-purple-300 text-center">🏯 {sum.path.grad}/{sum.path.words} từ đã thuộc lòng</p>
                            {sum.path.weak.length > 0 && <div><p className="text-[10px] text-orange-300 uppercase">Từ cần chú ý</p>{sum.path.weak.map((w, i) => <p key={i} className="text-xs text-zinc-300">{w.original} → {w.translated} <span className="text-red-400">({w.wrong} lần sai)</span></p>)}</div>}
                            {sum.path.remaining > 0 ? <button onClick={() => startPath(sum.path.deckId)} className="w-full bg-purple-500 text-black py-3 min-h-[48px] text-[11px] font-black uppercase">⚔️ VÀO ẢI TIẾP (còn {sum.path.remaining} từ)</button> : <p className="text-sm text-emerald-300 text-center font-black">🏆 Bạn đã thuộc lòng cả bộ "{sum.path.deck}"!</p>}</div>}
                        </div>
                    <div className="bg-indigo-950/60 border border-indigo-500/60 p-3 space-y-1 text-xs"><p className="text-white">{sum.a.comment}</p>
                        <p className="text-emerald-300"><b>Điểm mạnh:</b> {sum.a.strong.slice(0, 3).map(w => w.original).join(', ') || 'chưa có'}</p>
                        <p className="text-red-300"><b>Điểm yếu:</b> {sum.a.weak.slice(0, 3).map(w => w.original).join(', ') || 'chưa có'}</p>
                        <p className="text-yellow-300 font-bold">{sum.a.advice}</p></div>
                    <button onClick={() => { setSum(null); setTab('SUPHU'); }} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black">VỀ TRANG SƯ PHỤ</button></div>
                    : <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Card k="Cần ôn hôm nay" v={st.dueToday} c="text-yellow-400" /><Card k="Quá hạn" v={st.overdue} c="text-red-400" /><Card k="Đã thành thạo" v={st.by.Mastered} c="text-emerald-400" /><Card k="Tỷ lệ ghi nhớ" v={st.retention == null ? '--' : st.retention + '%'} c="text-cyan-300" /></div>
                        {modePicker()}
                        <Bar pct={pct(todayN, todayN + st.due)} color="#22c55e" label="Tiến độ dọn thẻ hôm nay" right={todayN + ' đã ôn · ' + st.due + ' còn lại'} />
                        <p className="text-[11px] text-zinc-300 text-center">Chuỗi ôn tập: <b className="text-yellow-400">{st.streak} ngày</b> [{titleOf(st.streak)}]</p>
                        <button onClick={start} className="w-full bg-yellow-500 text-black py-3 text-[11px] font-black uppercase">Bắt đầu ôn ({st.due} thẻ)</button>{msg && <p className="text-[10px] text-orange-300 text-center">{msg}</p>}</div>)}
                {tab === 'STATS' && <div className="space-y-3">
                    <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase mb-2">Trạng thái thẻ ({st.total})</p>
                        <div className="flex h-4 w-full overflow-hidden">{[['New', '#71717a'], ['Learning', '#f59e0b'], ['Review', '#06b6d4'], ['Mastered', '#10b981']].map(([k, col]) => <div key={k} style={{ width: (st.total ? st.by[k] / st.total * 100 : 0) + '%', background: col }} title={k} />)}</div>
                        <div className="grid grid-cols-2 gap-x-3 text-[10px] text-zinc-400 mt-2"><span>New: {st.by.New}</span><span>Learning (đang học): {st.by.Learning}</span><span>Review: {st.by.Review}</span><span>Mastered (đã thuộc): {st.by.Mastered}</span><span>Cần ôn: {st.due}</span><span>Tỷ lệ nhớ: {st.retention == null ? '--' : st.retention + '%'}</span></div></div>
                    <div className="bg-black/50 border border-zinc-800 p-3 space-y-1.5"><p className="text-[10px] font-black text-yellow-500 uppercase">Tiến độ theo trạng thái thẻ</p>
                        {[['New', 'Mới', '#71717a'], ['Learning', 'Đang học', '#f59e0b'], ['Review', 'Ôn tập', '#06b6d4'], ['Mastered', 'Đã thuộc', '#10b981']].map(([k, n, col]) => <Bar key={k} pct={pct(st.by[k], st.total)} color={col} h={6} label={n} right={st.by[k] + ' (' + pct(st.by[k], st.total) + '%)'} />)}</div>
                    <div className="bg-black/50 border border-zinc-800 p-3 space-y-1.5"><p className="text-[10px] font-black text-yellow-500 uppercase">Độ chính xác theo chế độ gõ (30 ngày)</p>
                        {Object.keys(MODE_LABEL).map(k => <Bar key={k} pct={pct(MS[k].o, MS[k].t)} color="#a855f7" h={6} label={MODE_LABEL[k]} right={MS[k].t ? MS[k].o + '/' + MS[k].t + ' (' + pct(MS[k].o, MS[k].t) + '%)' : 'chưa luyện'} />)}</div>
                    <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase">Thời gian học 14 ngày (phút)</p><SrsBars data={st.secs14} color="#06b6d4" /></div>
                    <div className="bg-black/50 border border-zinc-800 p-3"><p className="text-[10px] font-black text-yellow-500 uppercase">Số thẻ đã ôn mỗi ngày (30 ngày)</p><SrsBars data={st.rev30} /></div>
                </div>}
            </div>
        </div>
    );
};
