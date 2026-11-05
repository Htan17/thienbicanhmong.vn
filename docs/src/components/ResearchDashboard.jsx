/**
 * RESEARCH_DASHBOARD - Bảng điều khiển nghiên cứu KHKT (CHỈ ĐỌC).
 *
 * Nguồn số liệu (ưu tiên theo thứ tự):
 *  1) Cloud Function callable `getResearchStats` (máy chủ tự kiểm tra admins/{uid}, trả số liệu tổng hợp ẩn danh).
 *  2) Chế độ dự phòng: nếu function CHƯA triển khai / không gọi được (ví dụ dự án đang ở gói Spark, không deploy được
 *     Cloud Functions) thì tính từ danh sách `users`, `guilds` mà App.jsx ĐÃ tải sẵn (không thêm lượt đọc Firestore).
 *     Chế độ này không có số Bí Tịch/Video chia sẻ vì rules chặn client liệt kê quizShares/videoShares.
 *
 * - Chỉ admin thấy màn này (App.jsx kiểm tra isAdmin). Không có thao tác ghi dữ liệu nào trong file này.
 * - Biểu đồ vẽ bằng SVG/CSS thuần, không cần thư viện ngoài.
 */

// PHẢI TRÙNG với RS_REGION trong functions/index.js (block getResearchStats).
const RS_REGION = 'us-central1';
const DAY = 86400000;
const PERIODS = [7, 14, 30];

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const nf = (v) => Math.round(num(v)).toLocaleString('vi-VN');
const fmtDuration = (sec) => {
    sec = Math.max(0, Math.round(num(sec)));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${nf(h)} giờ ${m} phút` : `${m} phút`;
};
const pct = (a, b) => (b > 0 ? Math.round((num(a) / b) * 100) : 0);

// Bảng màu riêng cho Dashboard (mỗi nhóm số liệu một màu để dễ phân biệt)
const COLORS = {
    sky: { bar: '#38bdf8', text: 'text-sky-300', bg: 'from-sky-500/25 to-sky-900/10', border: 'border-sky-500/50' },
    emerald: { bar: '#34d399', text: 'text-emerald-300', bg: 'from-emerald-500/25 to-emerald-900/10', border: 'border-emerald-500/50' },
    violet: { bar: '#a78bfa', text: 'text-violet-300', bg: 'from-violet-500/25 to-violet-900/10', border: 'border-violet-500/50' },
    amber: { bar: '#fbbf24', text: 'text-amber-300', bg: 'from-amber-500/25 to-amber-900/10', border: 'border-amber-500/50' },
    rose: { bar: '#fb7185', text: 'text-rose-300', bg: 'from-rose-500/25 to-rose-900/10', border: 'border-rose-500/50' },
    orange: { bar: '#fb923c', text: 'text-orange-300', bg: 'from-orange-500/25 to-orange-900/10', border: 'border-orange-500/50' },
    teal: { bar: '#2dd4bf', text: 'text-teal-300', bg: 'from-teal-500/25 to-teal-900/10', border: 'border-teal-500/50' },
    pink: { bar: '#f472b6', text: 'text-pink-300', bg: 'from-pink-500/25 to-pink-900/10', border: 'border-pink-500/50' }
};
const MEDAL = ['#fbbf24', '#cbd5e1', '#fb923c'];

// ---------- Chế độ dự phòng: tính từ dữ liệu app đã tải ----------
const hashCode = (uid) => {
    let h = 2166136261;
    const s = 'rs:' + String(uid);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'HS-' + (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
};
const computeLocal = (users, guilds) => {
    const list = Array.isArray(users) ? users.filter(u => u && u.uid) : [];
    const now = Date.now();
    const sum = (f) => list.reduce((s, u) => s + num(f(u)), 0);
    const top = (key) => list.filter(u => num(u[key]) > 0).sort((a, b) => num(b[key]) - num(a[key])).slice(0, 10).map(u => ({ code: hashCode(u.uid), value: num(u[key]) }));
    const learners = list.filter(u => num(u.studySeconds) > 0).length;
    const totalStudy = sum(u => u.studySeconds);
    const periods = {};
    PERIODS.forEach(d => {
        const a = list.filter(u => num(u.lastActive) >= now - d * DAY).length;
        periods[d] = { days: d, activeUsers: a, inactiveUsers: Math.max(0, list.length - a), newQuizShares: null, newVideoShares: null };
    });
    return {
        generatedAt: now, activeWindowDays: 30, totalUsers: list.length, totalStudySeconds: totalStudy,
        averageStudySeconds: learners ? Math.round(totalStudy / learners) : 0, learnersCount: learners,
        totalSpirit: sum(u => u.spirit), totalFame: sum(u => u.fame), totalSeasonScore: sum(u => u.seasonScore), totalStreak: sum(u => u.streakCount),
        totalQuizShares: null, totalVideoShares: null, totalGuilds: guilds ? (Array.isArray(guilds) ? guilds.length : Object.keys(guilds).length) : 0,
        activeUsers: periods[30].activeUsers, inactiveUsers: periods[30].inactiveUsers, periods,
        topStudyUsers: top('studySeconds'), topStreakUsers: top('streakCount'), topSeasonUsers: top('seasonScore'),
        unavailable: [
            { key: 'dailyStudySeconds', missing: 'Chưa có lịch sử thời gian học theo ngày (studySeconds chỉ là số tích lũy)' },
            { key: 'modeUsage', missing: 'Chưa có trường hoặc log ghi Chế độ Học tập / Bí Tịch' },
            { key: 'lessonCompletionRate', missing: 'Chưa có số bài bắt đầu và hoàn thành (seasonLessons bị đặt lại mỗi mùa)' }
        ]
    };
};

// ---------- Thành phần giao diện ----------
const memo = (c) => (typeof React !== 'undefined' && React.memo ? React.memo(c) : c); // tránh vẽ lại các khối không đổi
const CardRaw = ({ color = 'sky', icon, label, value, sub }) => {
    const c = COLORS[color];
    return (
        <div className={`bg-gradient-to-br ${c.bg} border ${c.border} p-3 min-w-0`}>
            <p className={`text-[9px] font-black uppercase tracking-wide truncate ${c.text}`}>{icon} {label}</p>
            <p className="text-lg font-black text-white mt-1 break-words leading-tight">{value}</p>
            {sub && <p className="text-[9px] text-zinc-400 mt-0.5 leading-snug">{sub}</p>}
        </div>
    );
};

const SectionRaw = ({ color = 'sky', icon, title, note, children }) => {
    const c = COLORS[color];
    return (
        <section className="mb-5">
            <div className={`flex items-center gap-2 border-l-4 pl-2 mb-3`} style={{ borderColor: c.bar }}>
                <span className="text-base">{icon}</span>
                <div className="min-w-0">
                    <h3 className={`text-[11px] font-black uppercase tracking-widest ${c.text}`}>{title}</h3>
                    {note && <p className="text-[9px] text-zinc-500 leading-snug">{note}</p>}
                </div>
            </div>
            {children}
        </section>
    );
};

const PanelRaw = ({ title, note, children }) => (
    <div className="bg-black/60 border border-zinc-800 p-3">
        {title && <p className="text-[10px] font-black uppercase tracking-wider text-zinc-200 mb-1">{title}</p>}
        {note && <p className="text-[9px] text-zinc-500 mb-2 leading-snug">{note}</p>}
        {children}
    </div>
);

const NoDataRaw = ({ title, why, need }) => (
    <div className="border border-dashed border-zinc-700 bg-zinc-950/60 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-300">{title}</p>
        <p className="text-[11px] text-zinc-400 font-bold mt-1">Chưa đủ dữ liệu để thống kê</p>
        {why && <p className="text-[9px] text-zinc-500 mt-1 leading-snug">Thiếu: {why}</p>}
        {need && <p className="text-[9px] text-zinc-600 mt-0.5 leading-snug">Cần bổ sung: {need}</p>}
    </div>
);

/** Top N cột ngang có huy chương */
const RankBarsRaw = ({ rows, color, fmt }) => {
    if (!rows.length) return <p className="text-center text-[11px] text-zinc-600 py-4">Chưa có dữ liệu</p>;
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
        <div className="space-y-1.5">
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 shrink-0 flex items-center justify-center text-[9px] font-black rounded-sm" style={{ background: MEDAL[i] || '#27272a', color: i < 3 ? '#18181b' : '#a1a1aa' }}>{i + 1}</span>
                    <span className="w-[72px] text-[10px] text-zinc-300 font-mono shrink-0 truncate">{r.code}</span>
                    <div className="flex-1 bg-zinc-900 h-4 overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
                    </div>
                    <span className="w-16 text-[9px] text-zinc-200 font-bold text-right shrink-0">{fmt(r.value)}</span>
                </div>
            ))}
        </div>
    );
};

/** Vòng tròn phần trăm */
const RingRaw = ({ value, total, color, label }) => {
    const R = 38, C2 = 2 * Math.PI * R, p = total > 0 ? Math.min(1, value / total) : 0;
    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 100 100" className="w-24 h-24" role="img" aria-label={label}>
                <circle cx="50" cy="50" r={R} fill="none" stroke="#27272a" strokeWidth="12" />
                <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="butt" strokeDasharray={`${p * C2} ${C2}`} transform="rotate(-90 50 50)" />
                <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#f4f4f5">{Math.round(p * 100)}%</text>
            </svg>
            <p className="text-[9px] text-zinc-400 mt-1 text-center">{label}</p>
        </div>
    );
};

/** So sánh các kỳ 7 / 14 / 30 ngày bằng cột dọc */
const PeriodBarsRaw = ({ periods, selected, onPick, total, field, color, unit }) => {
    const vals = PERIODS.map(d => ({ d, v: periods && periods[d] ? periods[d][field] : null }));
    const max = Math.max(1, ...vals.map(x => num(x.v)));
    return (
        <div className="flex items-end justify-around gap-3 h-36 pt-2">
            {vals.map(({ d, v }) => {
                const on = d === selected;
                return (
                    <button key={d} onClick={() => onPick(d)} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <span className="text-[11px] font-black text-white mb-1">{v == null ? '—' : nf(v)}</span>
                        <div className="w-full max-w-[64px] transition-all" style={{ height: `${v == null ? 4 : Math.max(6, (num(v) / max) * 100)}%`, background: on ? `linear-gradient(180deg, ${color}, ${color}99)` : `${color}55`, border: on ? `1px solid ${color}` : '1px solid transparent' }} />
                        <span className={`text-[10px] mt-1 font-black ${on ? 'text-white' : 'text-zinc-500'}`}>{d} ngày</span>
                        {total > 0 && v != null && <span className="text-[8px] text-zinc-500">{pct(v, total)}% {unit}</span>}
                    </button>
                );
            })}
        </div>
    );
};

const Card = memo(CardRaw);
const Section = memo(SectionRaw);
const Panel = memo(PanelRaw);
const NoData = memo(NoDataRaw);
const RankBars = memo(RankBarsRaw);
const Ring = memo(RingRaw);
const PeriodBars = memo(PeriodBarsRaw);

const errMessage = (e) => {
    const code = String((e && e.code) || '').replace('functions/', '');
    if (code === 'permission-denied') return 'Bạn không có quyền truy cập';
    if (code === 'unauthenticated') return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    return 'Không tải được số liệu. Vui lòng thử lại.';
};

export const ResearchDashboard = ({ adminUid, users, guilds, onBack, playSfx }) => {
    const { useState, useEffect, useCallback, useRef, useMemo } = React;
    const [state, setState] = useState({ status: 'loading', data: null, error: '', denied: false, source: 'server' });
    const [period, setPeriod] = useState(7);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

    const usersRef = useRef(users); usersRef.current = users;
    const guildsRef = useRef(guilds); guildsRef.current = guilds;

    const load = useCallback(async () => {
        setState(s => ({ ...s, status: 'loading', error: '', denied: false }));
        try {
            if (!firebase.functions) throw Object.assign(new Error('NO_FUNCTIONS_SDK'), { code: 'no-sdk' });
            const call = firebase.app().functions(RS_REGION).httpsCallable('getResearchStats', { timeout: 120000 });
            const res = await call();
            if (alive.current) setState({ status: 'ready', data: res.data || null, error: '', denied: false, source: 'server' });
        } catch (e) {
            const code = String((e && e.code) || '').replace('functions/', '');
            if (code === 'permission-denied' || code === 'unauthenticated') {
                if (alive.current) setState({ status: 'error', data: null, error: errMessage(e), denied: code === 'permission-denied', source: 'server' });
                return;
            }
            // Function chưa triển khai / không gọi được -> dùng số liệu từ dữ liệu app đã tải (chỉ xem)
            if (Array.isArray(usersRef.current) && usersRef.current.length > 0) {
                if (alive.current) setState({ status: 'ready', data: computeLocal(usersRef.current, guildsRef.current), error: '', denied: false, source: 'local' });
            } else if (alive.current) setState({ status: 'error', data: null, error: errMessage(e), denied: false, source: 'server' });
        }
    }, []);
    // Quyền thật được kiểm tra trong Cloud Function; adminUid chỉ để chắc chắn component không vẽ khi thiếu phiên đăng nhập.
    useEffect(() => { if (adminUid) load(); }, [adminUid, load]);

    const { status, data, error, denied, source } = state;
    const d = data || {};
    const P = d.periods || {};
    const cur = P[period] || {};
    const missing = Array.isArray(d.unavailable) ? d.unavailable : [];
    const why = (key) => (missing.find(m => m.key === key) || {}).missing;
    const toRows = (arr) => (Array.isArray(arr) ? arr : []).map(r => ({ code: r.code, value: num(r.value) }));
    // Các danh sách Top chỉ tính lại khi dữ liệu đổi (không tính lại khi bấm đổi kỳ 7/14/30)
    const rowsStudy = useMemo(() => toRows(d.topStudyUsers), [data]);
    const rowsStreak = useMemo(() => toRows(d.topStreakUsers), [data]);
    const rowsSeason = useMemo(() => toRows(d.topSeasonUsers), [data]);
    const onPickPeriod = useCallback((p) => { if (playSfx) playSfx('CLICK'); setPeriod(p); }, [playSfx]);
    if (!adminUid) return null;
    const isEmpty = status === 'ready' && num(d.totalUsers) === 0;
    const activePct = pct(cur.activeUsers, d.totalUsers);

    return (
        <div className="w-[calc(100%-1rem)] max-w-6xl bg-zinc-900 border border-sky-900/60 p-3 sm:p-4 text-left animate-fadeIn max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar">
            {/* Thanh đầu: nút quay lại | tiêu đề + nguồn | tải lại — nằm ngang */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 bg-gradient-to-r from-sky-600/30 via-violet-600/30 to-pink-600/30 border border-violet-500/40 p-2.5">
                <button onClick={() => { if (playSfx) playSfx('CLICK'); if (onBack) onBack(); }} className="text-[10px] text-zinc-300 hover:text-white font-bold uppercase shrink-0">← Hồ sơ</button>
                <div className="flex-1 min-w-[200px]">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-white">📊 Bảng Nghiên Cứu KHKT <span className="text-[9px] font-bold text-zinc-300 normal-case tracking-normal">· chỉ xem · số liệu tổng hợp ẩn danh</span></h2>
                    {status === 'ready' && (
                        <p className="mt-1 inline-block text-[9px] font-bold px-2 py-0.5" style={{ background: source === 'server' ? '#064e3b' : '#78350f', color: source === 'server' ? '#6ee7b7' : '#fcd34d' }}>
                            {source === 'server' ? '🔒 Nguồn: máy chủ (đã xác thực admin)' : '⚠️ Chế độ dự phòng: dữ liệu app đã tải (chưa có Cloud Function)'}
                            {d.generatedAt ? ` · ${new Date(d.generatedAt).toLocaleTimeString('vi-VN')}` : ''}
                        </p>
                    )}
                </div>
                <button onClick={() => { if (playSfx) playSfx('CLICK'); load(); }} disabled={status === 'loading'} className="text-[10px] text-sky-300 font-bold uppercase border border-sky-700/60 px-2 py-1 disabled:opacity-40 shrink-0">{status === 'loading' ? 'Đang tải…' : 'Tải lại số liệu'}</button>
            </div>

            {status === 'loading' && <p className="text-center text-zinc-500 text-[11px] py-10">Đang tải số liệu…</p>}

            {status === 'error' && (
                <div className="text-center py-8">
                    <p className={`text-[12px] font-bold ${denied ? 'text-rose-400' : 'text-orange-300'}`}>{error}</p>
                    {!denied && <button onClick={load} className="mt-3 text-[10px] text-sky-300 font-bold uppercase border border-sky-700/60 px-3 py-1.5">Thử lại</button>}
                </div>
            )}

            {isEmpty && <p className="text-center text-zinc-500 text-[11px] py-10">Chưa có người dùng nào để thống kê.</p>}

            {status === 'ready' && !isEmpty && (<>
                {/* Dải số liệu tổng quan: 1 hàng ngang, tự xuống dòng theo bề rộng màn hình */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                    <Card color="sky" icon="👤" label="Người dùng" value={nf(d.totalUsers)} sub={`${nf(d.learnersCount)} người đã học`} />
                    <Card color="emerald" icon="✅" label={`Hoạt động ${period} ngày`} value={nf(cur.activeUsers)} sub={`${activePct}% tổng số người dùng`} />
                    <Card color="violet" icon="⏱️" label="Tổng thời gian học" value={fmtDuration(d.totalStudySeconds)} sub="Hiện tính theo học video" />
                    <Card color="teal" icon="⏰" label="Học trung bình" value={fmtDuration(d.averageStudySeconds)} sub={`Trên ${nf(d.learnersCount)} người đã học`} />
                    <Card color="amber" icon="🏆" label="Tổng điểm mùa" value={nf(d.totalSeasonScore)} />
                    <Card color="rose" icon="🔥" label="Tổng streak" value={nf(d.totalStreak)} />
                    <Card color="sky" icon="💎" label="Tổng Linh Thạch" value={nf(d.totalSpirit)} />
                    <Card color="amber" icon="⭐" label="Tổng Danh Vọng" value={nf(d.totalFame)} />
                    <Card color="violet" icon="🏯" label="Tông Môn" value={nf(d.totalGuilds)} />
                    <Card color="pink" icon="📚" label="Bí Tịch đã chia sẻ" value={d.totalQuizShares == null ? '—' : nf(d.totalQuizShares)} sub="Số mã chia sẻ đang lưu" />
                    <Card color="orange" icon="🎥" label="Video đã chia sẻ" value={d.totalVideoShares == null ? '—' : nf(d.totalVideoShares)} sub="Số mã chia sẻ đang lưu" />
                </div>

                <Section color="emerald" icon="📅" title="Hoạt động theo kỳ" note="Số người có lần hoạt động gần nhất nằm trong kỳ. Bấm một cột hoặc nút kỳ để đổi kỳ cho toàn bảng.">
                    <div className="flex gap-1.5 mb-3 max-w-md">
                        {PERIODS.map(p => (
                            <button key={p} onClick={() => onPickPeriod(p)} className={`flex-1 py-1.5 text-[10px] font-black uppercase border ${period === p ? 'bg-emerald-600 text-white border-emerald-300' : 'bg-black text-zinc-400 border-zinc-700 hover:border-emerald-700'}`}>{p} ngày</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <Panel title="Người dùng hoạt động" note="So sánh 7 / 14 / 30 ngày gần nhất">
                            <PeriodBars periods={P} selected={period} onPick={onPickPeriod} total={num(d.totalUsers)} field="activeUsers" color={COLORS.emerald.bar} unit="tổng" />
                        </Panel>
                        <Panel title={`Tỉ lệ hoạt động / không hoạt động (${period} ngày)`}>
                            <div className="flex items-center justify-around h-full min-h-[9rem]">
                                <Ring value={num(cur.activeUsers)} total={num(d.totalUsers)} color={COLORS.emerald.bar} label="Hoạt động" />
                                <div className="space-y-1.5 text-[10px]">
                                    <p className="text-emerald-300 font-bold">● Hoạt động: {nf(cur.activeUsers)}</p>
                                    <p className="text-zinc-400 font-bold">● Không hoạt động: {nf(cur.inactiveUsers)}</p>
                                </div>
                            </div>
                        </Panel>
                        {cur.newQuizShares != null ? (
                            <Panel title="Chia sẻ mới theo kỳ" note="Tính từ ngày tạo mã chia sẻ (createdAt)">
                                <div className="grid grid-cols-2 gap-2">
                                    <Card color="pink" icon="📚" label={`Bí Tịch mới · ${period} ngày`} value={nf(cur.newQuizShares)} />
                                    <Card color="orange" icon="🎥" label={`Video mới · ${period} ngày`} value={nf(cur.newVideoShares)} />
                                </div>
                            </Panel>
                        ) : (
                            <NoData title="Chia sẻ mới theo kỳ" why="Rules không cho app liệt kê quizShares / videoShares" need="Cloud Function getResearchStats (cần gói Blaze) để đếm ở máy chủ" />
                        )}
                    </div>
                </Section>

                <Section color="amber" icon="🏅" title="Bảng xếp hạng ẩn danh" note="Mã HS-xxxxxx không suy ngược được ra tài khoản.">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <Panel title="Top 10 thời gian học" note="Tổng thời gian tích lũy">
                            <RankBars rows={rowsStudy} color={COLORS.sky.bar} fmt={v => (v / 3600).toFixed(1) + ' giờ'} />
                        </Panel>
                        <Panel title="Top 10 streak" note="Số ngày liên tiếp">
                            <RankBars rows={rowsStreak} color={COLORS.rose.bar} fmt={v => nf(v) + ' ngày'} />
                        </Panel>
                        <Panel title="Top 10 điểm mùa" note="seasonScore hiện tại">
                            <RankBars rows={rowsSeason} color={COLORS.amber.bar} fmt={v => nf(v)} />
                        </Panel>
                    </div>
                </Section>

                <Section color="violet" icon="🧪" title="Chưa đủ dữ liệu" note="Các chỉ tiêu này cần Firestore lưu thêm lịch sử; hệ thống không suy đoán số liệu.">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <NoData title="Thời gian học theo ngày" why={why('dailyStudySeconds')} need="researchSnapshots/{yyyy-mm-dd}: ghi mỗi ngày tổng thời gian học và số người hoạt động (Scheduled Function, cần gói Blaze)" />
                        <NoData title="Tỉ lệ Chế độ Học tập / Bí Tịch" why={why('modeUsage')} need="activityLogs/{id} {uidHash, mode, ts}" />
                        <NoData title="Tỉ lệ hoàn thành bài" why={why('lessonCompletionRate')} need="activityLogs với type lesson_start / lesson_done" />
                    </div>
                </Section>
            </>)}
        </div>
    );
};
