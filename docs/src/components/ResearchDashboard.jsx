/**
 * RESEARCH_DASHBOARD - Bảng điều khiển nghiên cứu KHKT (CHỈ ĐỌC, BẢO MẬT PHÍA MÁY CHỦ).
 *
 * - KHÔNG đọc users/quizShares/videoShares/guilds từ trình duyệt. Mọi số liệu lấy từ Cloud Function
 *   callable `getResearchStats`; function tự kiểm tra admins/{request.auth.uid} và trả về số liệu tổng hợp ẩn danh.
 * - Việc ẩn nút Dashboard chỉ là tiện ích giao diện, KHÔNG phải biện pháp bảo mật. Người không phải admin
 *   có gọi trực tiếp function vẫn nhận permission-denied.
 * - File này không ghi dữ liệu và không import firestore. Biểu đồ vẽ bằng SVG thuần.
 */

// PHẢI TRÙNG với RS_REGION trong functions/index.js (block getResearchStats).
const RS_REGION = 'us-central1';

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const nf = (v) => Math.round(num(v)).toLocaleString('vi-VN');
const fmtDuration = (sec) => {
    sec = Math.max(0, Math.round(num(sec)));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${nf(h)} giờ ${m} phút` : `${m} phút`;
};
const C = { gold: '#eab308', green: '#34d399', sky: '#38bdf8', rose: '#fb7185', violet: '#a78bfa', grid: '#3f3f46', text: '#a1a1aa' };

// ---------- Biểu đồ SVG thuần ----------
const ChartBox = ({ title, note, children }) => (
    <div className="bg-black border border-zinc-800 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-yellow-500 mb-1">{title}</p>
        {note && <p className="text-[9px] text-zinc-500 mb-2 leading-snug">{note}</p>}
        {children}
    </div>
);

const Empty = () => <p className="text-center text-[11px] text-zinc-600 py-6">Chưa có dữ liệu</p>;

/** Cột ngang (Top N, tên dài): data = [{label, value, text}] */
const HBarChart = ({ data, color = C.gold }) => {
    if (!data.length || data.every(d => d.value === 0)) return <Empty />;
    const max = Math.max(1, ...data.map(d => d.value));
    return (
        <div className="space-y-1.5">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-4 text-[9px] text-zinc-500 text-right shrink-0">{i + 1}</span>
                    <span className="w-20 text-[10px] text-zinc-300 truncate shrink-0" title={d.label}>{d.label}</span>
                    <div className="flex-1 bg-zinc-900 h-4 relative">
                        <div style={{ width: `${(d.value / max) * 100}%`, background: color }} className="h-full" />
                    </div>
                    <span className="w-14 text-[9px] text-zinc-300 text-right shrink-0">{d.text}</span>
                </div>
            ))}
        </div>
    );
};

/** Tròn: slices = [{label, value, color}] */
const PieChart = ({ slices }) => {
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (total <= 0) return <Empty />;
    const R = 52, CX = 60, CY = 60;
    let acc = 0;
    const arcs = slices.filter(s => s.value > 0).map((s, i, arr) => {
        const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2; acc += s.value;
        const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2;
        if (arr.length === 1) return <circle key={i} cx={CX} cy={CY} r={R} fill={s.color} />;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M ${CX} ${CY} L ${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)} A ${R} ${R} 0 ${large} 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)} Z`;
        return <path key={i} d={d} fill={s.color} stroke="#09090b" strokeWidth="1" />;
    });
    return (
        <div className="flex items-center gap-3">
            <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0" role="img">{arcs}</svg>
            <ul className="space-y-1 min-w-0">
                {slices.map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                        <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: s.color }} />
                        <span className="truncate">{s.label}</span>
                        <span className="text-zinc-500 shrink-0">{nf(s.value)} ({Math.round((s.value / total) * 100)}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Stat = ({ icon, label, value, sub }) => (
    <div className="bg-black border border-zinc-800 p-3 min-w-0">
        <p className="text-[9px] text-zinc-500 uppercase font-black truncate">{icon} {label}</p>
        <p className="text-base font-black text-white mt-1 break-words">{value}</p>
        {sub && <p className="text-[9px] text-zinc-600 mt-0.5 leading-snug">{sub}</p>}
    </div>
);

const Section = ({ title, children }) => (
    <section className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-yellow-400 border-b border-yellow-900/50 pb-1 mb-3">{title}</h3>
        {children}
    </section>
);


const NotEnough = ({ note }) => (
    <div className="text-center py-5">
        <p className="text-[11px] text-zinc-400 font-bold">Chưa đủ dữ liệu để thống kê</p>
        {note && <p className="text-[9px] text-zinc-600 mt-1 leading-snug">{note}</p>}
    </div>
);

const errMessage = (e) => {
    const code = String((e && e.code) || '').replace('functions/', '');
    if (code === 'permission-denied') return 'Bạn không có quyền truy cập';
    if (code === 'unauthenticated') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (code === 'not-found' || code === 'unavailable') return 'Chưa kết nối được máy chủ thống kê (function getResearchStats chưa được triển khai hoặc sai region).';
    if (e && e.message === 'NO_FUNCTIONS_SDK') return 'Thiếu thư viện firebase-functions-compat trong index.html.';
    return 'Không tải được số liệu. Vui lòng thử lại.';
};

export const ResearchDashboard = ({ adminUid, onBack, playSfx }) => {
    const { useState, useEffect, useCallback, useRef } = React;
    const [state, setState] = useState({ status: 'loading', data: null, error: '', denied: false });
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

    const load = useCallback(async () => {
        setState(s => ({ ...s, status: 'loading', error: '', denied: false }));
        try {
            if (!firebase.functions) throw new Error('NO_FUNCTIONS_SDK');
            const call = firebase.app().functions(RS_REGION).httpsCallable('getResearchStats', { timeout: 120000 });
            const res = await call();
            if (alive.current) setState({ status: 'ready', data: res.data || null, error: '', denied: false });
        } catch (e) {
            const denied = String((e && e.code) || '').replace('functions/', '') === 'permission-denied';
            if (alive.current) setState({ status: 'error', data: null, error: errMessage(e), denied });
        }
    }, []);
    // Quyền thật được kiểm tra trong Cloud Function; adminUid chỉ để chắc chắn component không vẽ khi thiếu phiên đăng nhập.
    useEffect(() => { if (adminUid) load(); }, [adminUid, load]);

    if (!adminUid) return null;
    const { status, data, error, denied } = state;
    const d = data || {};
    const missing = Array.isArray(d.unavailable) ? d.unavailable : [];
    const missNote = (key) => (missing.find(m => m.key === key) || {}).missing;
    const topData = (arr, fmt) => (Array.isArray(arr) ? arr : []).map(r => ({ label: r.code, value: num(r.value), text: fmt(num(r.value)) }));
    const isEmpty = status === 'ready' && num(d.totalUsers) === 0;

    return (
        <div className="w-full max-w-md bg-zinc-900 border border-yellow-900/60 p-4 text-left animate-fadeIn max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-1">
                <button onClick={() => { if (playSfx) playSfx('CLICK'); if (onBack) onBack(); }} className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase">← Hồ sơ</button>
                <button onClick={() => { if (playSfx) playSfx('CLICK'); load(); }} disabled={status === 'loading'} className="text-[10px] text-yellow-400 font-bold uppercase border border-yellow-700/60 px-2 py-1 disabled:opacity-40">{status === 'loading' ? 'Đang tải…' : 'Tải lại số liệu'}</button>
            </div>
            <h2 className="text-base font-black text-yellow-400 uppercase tracking-widest text-center">📊 Bảng Nghiên Cứu KHKT</h2>
            <p className="text-center text-[9px] text-zinc-500 mt-1 mb-4">Chỉ xem · số liệu tổng hợp ẩn danh từ máy chủ{status === 'ready' && d.generatedAt ? ` · cập nhật lúc ${new Date(d.generatedAt).toLocaleTimeString('vi-VN')}` : ''}</p>

            {status === 'loading' && <p className="text-center text-zinc-500 text-[11px] py-10">Đang tải số liệu từ máy chủ…</p>}

            {status === 'error' && (
                <div className="text-center py-8">
                    <p className={`text-[12px] font-bold ${denied ? 'text-red-400' : 'text-orange-300'}`}>{error}</p>
                    {!denied && <button onClick={load} className="mt-3 text-[10px] text-yellow-400 font-bold uppercase border border-yellow-700/60 px-3 py-1.5">Thử lại</button>}
                </div>
            )}

            {isEmpty && <p className="text-center text-zinc-500 text-[11px] py-10">Chưa có người dùng nào để thống kê.</p>}

            {status === 'ready' && !isEmpty && (<>
                <Section title="Tổng quan">
                    <div className="grid grid-cols-2 gap-2">
                        <Stat icon="👤" label="Người dùng" value={nf(d.totalUsers)} />
                        <Stat icon="📚" label="Bí Tịch đã chia sẻ" value={nf(d.totalQuizShares)} sub="Số mã chia sẻ đang lưu" />
                        <Stat icon="🎥" label="Video đã chia sẻ" value={nf(d.totalVideoShares)} sub="Số mã chia sẻ đang lưu" />
                        <Stat icon="⏱️" label="Tổng thời gian học" value={fmtDuration(d.totalStudySeconds)} sub="Hiện tính theo học video" />
                        <Stat icon="🔥" label="Tổng streak" value={nf(d.totalStreak)} />
                        <Stat icon="💎" label="Tổng Linh Thạch" value={nf(d.totalSpirit)} />
                        <Stat icon="⭐" label="Tổng Danh Vọng" value={nf(d.totalFame)} />
                        <Stat icon="🏆" label="Tổng điểm mùa" value={nf(d.totalSeasonScore)} />
                        <Stat icon="🏯" label="Tông Môn" value={nf(d.totalGuilds)} />
                        <Stat icon="✅" label={`Hoạt động ${d.activeWindowDays || 30} ngày`} value={nf(d.activeUsers)} sub={`Không hoạt động: ${nf(d.inactiveUsers)}`} />
                    </div>
                </Section>

                <Section title="Chế độ Học tập">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <Stat icon="📈" label="Tổng thời gian học" value={fmtDuration(d.totalStudySeconds)} />
                        <Stat icon="⏰" label="Học trung bình" value={fmtDuration(d.averageStudySeconds)} sub={`Trên ${nf(d.learnersCount)} người đã học`} />
                    </div>
                    <ChartBox title="1. Top 10 thời gian học" note="Mã ẩn danh · giờ học">
                        <HBarChart color={C.green} data={topData(d.topStudyUsers, v => (v / 3600).toFixed(1) + ' giờ')} />
                    </ChartBox>
                </Section>

                <Section title="Chế độ Bí Tịch">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <Stat icon="💎" label="Tổng Linh Thạch" value={nf(d.totalSpirit)} />
                        <Stat icon="⭐" label="Tổng Danh Vọng" value={nf(d.totalFame)} />
                        <Stat icon="🏯" label="Tông Môn" value={nf(d.totalGuilds)} />
                        <Stat icon="🏆" label="Tổng điểm mùa" value={nf(d.totalSeasonScore)} />
                    </div>
                    <div className="space-y-3">
                        <ChartBox title="2. Top 10 streak" note="Mã ẩn danh · số ngày">
                            <HBarChart color={C.rose} data={topData(d.topStreakUsers, v => nf(v) + ' ngày')} />
                        </ChartBox>
                        <ChartBox title="3. Top 10 seasonScore" note="Mã ẩn danh · điểm mùa">
                            <HBarChart color={C.gold} data={topData(d.topSeasonUsers, v => nf(v))} />
                        </ChartBox>
                    </div>
                </Section>

                <Section title="Biểu đồ tổng hợp">
                    <div className="space-y-3">
                        <ChartBox title="4. Hoạt động / không hoạt động" note={`Hoạt động = có lastActive trong ${d.activeWindowDays || 30} ngày gần nhất`}>
                            <PieChart slices={[{ label: 'Hoạt động', value: num(d.activeUsers), color: C.green }, { label: 'Không hoạt động', value: num(d.inactiveUsers), color: '#52525b' }]} />
                        </ChartBox>
                        <ChartBox title="5. Tổng thời gian học theo ngày"><NotEnough note={missNote('dailyStudySeconds')} /></ChartBox>
                        <ChartBox title="6. Tỷ lệ Chế độ Học tập / Bí Tịch"><NotEnough note={missNote('modeUsage')} /></ChartBox>
                    </div>
                </Section>

                <Section title="Dữ liệu còn thiếu">
                    <ul className="space-y-1.5">
                        {missing.map(m => <li key={m.key} className="text-[10px] text-zinc-400 leading-snug">• {m.missing}</li>)}
                    </ul>
                </Section>
            </>)}
        </div>
    );
};
