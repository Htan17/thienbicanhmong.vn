import { EXAM_PATH_TITLES, NAME_FRAMES } from '../config/gameData.js';
import { formatNumber } from '../lib/format.js';

export const BuffTimer = ({ until }) => {
    const [, tick] = React.useState(0);
    React.useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
    const ms = Math.max(0, until - Date.now()), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return <span className="font-mono">{h}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s</span>;
};
// 🎉 Pháo hoa CSS thuần (KHÔNG phụ thuộc file/URL ngoài nên luôn hiển thị được kể cả khi mất
// mạng/loa lỗi) - dùng khi hoàn thành toàn bộ Đạo Lộ hoặc chốt hạng Đạo Hữu Bảng cuối ngày.
export const ConfettiBurst = () => {
    const pieces = React.useMemo(() => Array.from({ length: 40 }, (_, i) => ({
        id: i, left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1.6 + Math.random() * 1.2,
        color: ['#eab308', '#22d3ee', '#f97316', '#a855f7', '#4ade80', '#ec4899'][i % 6], rot: Math.random() * 360
    })), []);
    return (
        <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
            {pieces.map(p => (
                <span key={p.id} className="confetti-piece" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
            ))}
        </div>
    );
};

// 🕸️ BÁT QUÁI ĐỒ: biểu đồ mạng nhện (radar chart) SVG THUẦN TỰ VẼ (không dùng thư viện ngoài, y
// hệt tinh thần "hand-rolled SVG" đã có sẵn trong app) - vẽ % thành thạo từng chủ đề luyện thi.
export const RadarChart = ({ data }) => {
    const topics = Object.keys(data);
    const N = topics.length;
    const size = 260, cx = size / 2, cy = size / 2, maxR = 88;
    const angleFor = (i) => (Math.PI * 2 * i / N) - Math.PI / 2;
    const pointFor = (i, val) => { const r = (val / 100) * maxR; const a = angleFor(i); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const dataPoints = topics.map((t, i) => pointFor(i, data[t]));
    const polygonPoints = dataPoints.map(p => p.join(',')).join(' ');
    return (
        <div className="flex justify-center bg-black/40 border border-zinc-800 py-4">
            <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280 }}>
                {[0.25, 0.5, 0.75, 1].map(r => (
                    <polygon key={r} points={topics.map((_, i) => pointFor(i, r * 100).join(',')).join(' ')} fill="none" stroke="#3f3f46" strokeWidth="1" />
                ))}
                {topics.map((t, i) => { const [x, y] = pointFor(i, 100); return <line key={t} x1={cx} y1={cy} x2={x} y2={y} stroke="#3f3f46" strokeWidth="1" />; })}
                <polygon points={polygonPoints} fill="rgba(16,185,129,0.35)" stroke="#10b981" strokeWidth="2" />
                {dataPoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#10b981" />)}
                {topics.map((t, i) => { const [x, y] = pointFor(i, 122); return <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-axis-label">{t.length > 10 ? t.slice(0, 9) + '…' : t}</text>; })}
            </svg>
        </div>
    );
};

export const UserName = ({ u, cls = '' }) => {
    if (!u) return <span className={`inline-block font-black uppercase text-zinc-500 ${cls}`}>Vô Danh</span>;
    let nColor = u.nameColor; let aura = (u.inventory?.includes('aura_laoma') && !nColor) ? 'lao-ma-aura' : '';
    const fObj = NAME_FRAMES.find(f => f.id === u.nameFrame); const wCls = fObj ? fObj.class : ''; let finalColor = nColor ? nColor : (wCls ? undefined : '#ffdf00');
    // 🏅 Danh hiệu Phong Thái Đạo Hữu (Tu Luyện Chi Lộ, nếu đã chọn hiển thị) - hiện như 1 nhãn nhỏ
    // NGAY TRƯỚC tên, gói trong span "inline-flex" thay vì span đơn như cũ để không phá vỡ layout ở
    // MỌI nơi đang gọi <UserName/> (vẫn nằm cùng 1 dòng với tên, cls vẫn áp lên đúng span tên).
    const titleObj = EXAM_PATH_TITLES.find(t => t.id === u.examPathActiveTitle && (u.examPathTitles || []).includes(t.id));
    return (
        <span className="inline-flex items-center gap-1 flex-wrap align-middle">
            {titleObj && <span className={`text-[7px] px-1 py-0.5 ${titleObj.class}`}>{titleObj.name}</span>}
            <span className={`inline-block font-black uppercase ${aura} ${wCls} ${cls}`} style={{ color: finalColor }}>{u.name || 'VÔ DANH'}</span>
        </span>
    );
};
// 🏆 BẢNG XẾP HẠNG THU NHỎ (Phong Thần Bảng TOP 5) - dùng chung cho MỌI màn hình "kết quả sau khi
// học" (Vượt Ải thường, Ôn Tập Từ Vựng Video, Lưu Bài Học Video...), để người chơi luôn thấy được
// vị trí của mình so với người khác ngay sau mỗi lần học, tạo động lực học tiếp.
export const MiniLeaderboard = ({ list, currentUser, title = "Phong Thần Bảng (TOP 5)" }) => {
    if (!list || list.length === 0) return null;
    const top5 = list.slice(0, 5);
    const myIdx = currentUser ? list.findIndex(p => p.uid === currentUser.uid) : -1;
    const me = myIdx >= 5 ? list[myIdx] : null;
    const rowCls = (i, isMe) => {
        let rankCls = "text-zinc-500"; let bgRankCls = "bg-black border-zinc-800";
        if (i === 0) { rankCls = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; bgRankCls = "bg-yellow-900/20 border-yellow-500"; }
        else if (i === 1) { rankCls = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; bgRankCls = "bg-gray-800/30 border-gray-400"; }
        else if (i === 2) { rankCls = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]"; bgRankCls = "bg-orange-900/20 border-orange-500"; }
        if (isMe) bgRankCls = "bg-yellow-900/40 border-yellow-500";
        return { rankCls, bgRankCls };
    };
    return (
        <div className="mt-8 border-t border-yellow-700/30 pt-6 text-left">
            <h3 className="text-yellow-500 font-black text-xs mb-4 uppercase tracking-widest text-center">{title}</h3>
            <div className="space-y-2">
                {top5.map((p, i) => {
                    const { rankCls, bgRankCls } = rowCls(i, currentUser && p.uid === currentUser.uid);
                    return (
                        <div key={p.uid || i} className={`flex justify-between items-center p-2 border ${bgRankCls}`}>
                            <div className="flex items-center gap-2">
                                <span className={`${rankCls} text-xs font-black w-6 text-center`}>#{i+1}</span>
                                <img src={p.photo} className={`w-8 h-8 object-cover ${p.frame ? 'frame-'+p.frame : 'border border-zinc-700'} ${p.aura||''}`} alt="avatar" />
                                <UserName u={p} cls="text-[11px] tracking-wide" />
                            </div>
                            <span className="text-green-400 font-black text-xs whitespace-nowrap drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(p.seasonScore || 0)}</span>
                        </div>
                    );
                })}
                {me && (
                    <div className="flex justify-between items-center p-2 border bg-yellow-900/40 border-yellow-500 mt-2 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-xs font-black w-6 text-center">#{myIdx+1}</span>
                            <img src={me.photo} className={`w-8 h-8 object-cover ${me.frame ? 'frame-'+me.frame : 'border border-zinc-700'} ${me.aura||''}`} alt="avatar" />
                            <UserName u={me} cls="text-[11px] tracking-wide" />
                        </div>
                        <span className="text-green-400 font-black text-xs whitespace-nowrap drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(me.seasonScore || 0)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
