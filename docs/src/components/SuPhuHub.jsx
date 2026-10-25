import { firestore } from '../config/firebase.js';
import { SRS, SRS_PERKS, titleOf } from '../lib/srs.js';

const SrsBars = ({ data, color = '#eab308', labels }) => { const mx = Math.max(1, ...data), w = 100 / data.length;
    return <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">{data.map((v, i) => <rect key={i} x={i * w + 0.4} y={40 - (v / mx) * 38} width={w - 0.8} height={Math.max(0.5, (v / mx) * 38)} fill={color}><title>{(labels ? labels[i] + ': ' : '') + v}</title></rect>)}</svg>; };

export const SuPhuHub = ({ user, onBack, playSfx }) => {
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
