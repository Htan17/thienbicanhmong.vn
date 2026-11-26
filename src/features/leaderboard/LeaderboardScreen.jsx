import { LB_MIN_LESSONS, LB_TITLES } from '../../config/gameData.js';
import { UserName } from '../../components/common.jsx';
import { formatNumber } from '../../lib/format.js';
import { guildLabel } from '../../lib/moderation.js';

export function LeaderboardScreen({ core, leaderboard, audio, nav, guild, social }) {
    const { allUsers, setViewingUser, user } = core;
    const { guildLeaderboardRenderList, guildTimeLeftStr, leaderboardRenderList, leaderboardTab, setLeaderboardTab, timeLeftStr } = leaderboard;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const { setViewGuildModal } = guild;
    const { addFriendAction, addRandomFriendAction, friendSearchUid, globalSearchUid, searchUserAction, setFriendSearchUid, setGlobalSearchUid } = social;
    // SỬA LỖI THEO YÊU CẦU: bỏ hẳn khâu bắt buộc dán Phụ đề/Transcript tay.
    // Gemini API hỗ trợ nhận thẳng link YouTube qua "file_data.file_uri" (server Google tự tải và
    // xem/nghe video, không dính lỗi CORS phía trình duyệt) -> chỉ cần dán link là phân tích được luôn.
    // Lưu ý: tính năng đọc link YouTube trực tiếp hiện chỉ hỗ trợ chắc chắn cho YouTube; các nguồn
    // khác (Bilibili...) có thể không phân tích được, khi đó Gemini sẽ báo lỗi rõ ràng qua alert.
    // ======= HỌC MÔN HỌC QUA VIDEO: tua video tới mục, lưu Ải vào Tàng Kinh Các =======
    // Bục vinh danh Top 3 của Phong Thần Bảng (thứ tự hiển thị: hạng 2 - hạng 1 - hạng 3)
    const renderPodium = () => {
        const top = leaderboardRenderList.slice(0, 3); if (!top.length) return null;
        const styles = [{ h: 'h-20', ring: 'podium-gold', medal: '🥇', num: 'text-yellow-300' }, { h: 'h-14', ring: 'podium-silver', medal: '🥈', num: 'text-zinc-200' }, { h: 'h-10', ring: 'podium-bronze', medal: '🥉', num: 'text-orange-300' }];
        return (
            <div className="flex items-end justify-center gap-1.5 pt-5 pb-2">
                {[1, 0, 2].filter(i => top[i]).map(i => { const p = top[i], s = styles[i], big = i === 0; return (
                    <button key={p.uid || i} onClick={() => { playSfx('OPEN'); setViewingUser(p); changeAppState('VIEW_PROFILE'); }} className="lb-enter flex flex-col items-center flex-1 min-w-0" style={{ animationDelay: (i * 90) + 'ms' }}>
                        {big && <span className="text-2xl -mb-1 animate-bounce">👑</span>}
                        <img src={p.photo} className={`${big ? 'w-16 h-16' : 'w-12 h-12'} object-cover ${p.frame ? 'frame-' + p.frame : 'border-2 border-zinc-600'} ${p.aura || ''}`} alt="avatar" />
                        <div className="w-full px-1 mt-1 text-center truncate"><UserName u={p} cls="text-[11px]" /></div>
                        <span className={`text-[11px] font-black ${leaderboardTab === 'FAME' ? 'text-yellow-400' : 'text-green-400'}`}>{leaderboardTab === 'FAME' ? '⭐ ' + formatNumber(p.fame || 0) : '🏆 ' + formatNumber(p.seasonScore || 0)}</span>
                        <div className={`podium-block ${s.ring} ${s.h} w-full mt-1 flex flex-col items-center justify-center`}><span className="text-lg leading-none">{s.medal}</span><span className={`text-[11px] font-black ${s.num}`}>#{i + 1}</span></div>
                    </button>); })}
            </div>
        );
    };
    return (
                    <div className="w-full max-w-lg h-[85vh] bg-zinc-900 border border-yellow-700/50 flex flex-col shadow-2xl animate-fadeIn">
                        <div className="p-4 border-b border-yellow-700/30">
                            <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-2 font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Phong Thần Bảng</h2>
                            <p className="text-center text-[10px] text-cyan-400 font-bold mb-4 uppercase">{leaderboardTab === 'GUILDS' ? <span>Thời Khắc Tổng Kết Thế Lực: <span className="text-yellow-400 font-mono ml-1">{guildTimeLeftStr}</span></span> : <span>Thời Khắc Tái Lập Mùa Giải: <span className="text-yellow-400 font-mono ml-1">{timeLeftStr}</span></span>}</p>
                            <div className="grid grid-cols-4 gap-1 p-1 bg-black/50 border border-zinc-800 rounded-md" role="tablist">
                                {[['ALL','🏆','Đại Lục'],['FAME','⭐','Danh Vọng'],['FRIENDS','🤝','Đạo Hữu'],['GUILDS','🏯','Thế Lực']].map(([k, ic, lb]) => (
                                    <button key={k} role="tab" aria-selected={leaderboardTab === k} onClick={()=>{ playSfx('TAB'); setLeaderboardTab(k); }} className={`lb-tab ${leaderboardTab === k ? 'lb-tab-on' : ''}`}><span className="text-base leading-none">{ic}</span><span className="text-[9px] font-black uppercase tracking-wide mt-0.5">{lb}</span></button>
                                ))}
                            </div>
                        </div>
                        {leaderboardTab !== 'GUILDS' && (() => {
                            const lessons = user.seasonLessons || 0, ok = lessons >= LB_MIN_LESSONS && (user.seasonScore || 0) > 0;
                            const myIdx = leaderboardRenderList.findIndex(p => p.uid === user.uid);
                            return (<div className="m-3 mt-0 p-3 bg-black/50 border border-yellow-700/40 text-center">
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-black">
                                    <div className="rew-chip rew-gold"><span className="text-base">🥇</span><span>3000💎</span><span className="text-yellow-300">+80⭐</span></div>
                                    <div className="rew-chip rew-silver"><span className="text-base">🥈</span><span>2000💎</span><span className="text-zinc-300">+50⭐</span></div>
                                    <div className="rew-chip rew-bronze"><span className="text-base">🥉</span><span>1200💎</span><span className="text-orange-300">+30⭐</span></div>
                                </div>
                                <p className="text-[9px] text-zinc-400 mt-2">Top 4–10: <b className="text-white">400💎 +10⭐</b> · Đủ điều kiện: <b className="text-white">150💎</b> · Đúng hết (≥5 câu): <b className="text-white">+5 điểm</b></p>
                                {leaderboardTab === 'FAME' ? <p className="text-[9px] text-zinc-500 mt-1">Bảng Danh Vọng xếp theo tổng ⭐ của mọi người chơi.</p> : ok
                                    ? <p className="text-[10px] text-emerald-400 font-bold mt-1">✅ Ngài đang ở hạng #{myIdx >= 0 ? myIdx + 1 : '—'} · {formatNumber(user.seasonScore || 0)} điểm · {lessons} bài</p>
                                    : <div className="mt-2"><p className="text-[10px] text-zinc-300 font-bold">Học thêm <span className="text-yellow-400">{Math.max(0, LB_MIN_LESSONS - lessons)}</span> bài trong mùa này để lên bảng & đủ điều kiện nhận thưởng</p><div className="h-1.5 bg-zinc-800 mt-2"><div className="h-full bg-yellow-500" style={{ width: Math.min(100, Math.round(lessons / LB_MIN_LESSONS * 100)) + '%' }}></div></div><p className="text-[9px] text-zinc-500 mt-1">{lessons}/{LB_MIN_LESSONS} bài</p></div>}
                            </div>);
                        })()}
                        {leaderboardTab === 'GUILDS' && (<div className="bg-black/60 border border-indigo-600/50 m-3 mt-0 p-3 text-center shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]"><p className="text-[10px] text-indigo-400 font-black mb-2 uppercase border-b border-indigo-700/50 pb-1">🏰 Thế Lực Tranh Bá 🏰</p><div className="flex justify-center gap-2 text-[9px] font-bold"><div className="flex-1 bg-yellow-900/30 border border-yellow-500 p-2"><span className="text-yellow-400 text-[11px] block mb-1">🥇 TOP 1</span> +5000 CT</div><div className="flex-1 bg-gray-800/30 border border-gray-400 p-2"><span className="text-gray-300 text-[11px] block mb-1">🥈 TOP 2</span> +3000 CT</div><div className="flex-1 bg-orange-900/30 border border-orange-500 p-2"><span className="text-orange-400 text-[11px] block mb-1">🥉 TOP 3</span> +1000 CT</div></div></div>)}
                        {leaderboardTab !== 'GUILDS' && (<div className="flex gap-2 mb-2 px-4 mt-4"><input className="flex-1 bg-black border border-cyan-900/80 p-3 text-xs font-bold text-white outline-none focus:border-cyan-400" placeholder="Nhập ID..." value={globalSearchUid} onChange={e=>setGlobalSearchUid(e.target.value)} /><button onClick={searchUserAction} className="bg-cyan-800 text-white px-5 text-[11px] font-black uppercase shadow-md">TRA CỨU</button></div>)}
                        <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-2 custom-scrollbar">
                            {leaderboardTab === 'FRIENDS' && (<div className="mb-6 space-y-3 bg-black/40 p-3 border border-yellow-900/30 mt-2"><p className="text-[10px] text-yellow-500 font-bold uppercase mb-1">Kết Giao Bằng Hữu</p><div className="flex gap-2 bg-black p-2 border border-zinc-800"><input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-yellow-500" placeholder="ID kết duyên..." value={friendSearchUid} onChange={e=>setFriendSearchUid(e.target.value)} /><button onClick={addFriendAction} className="bg-yellow-600 text-black px-4 py-2 text-[10px] font-black uppercase">KẾT DUYÊN</button></div><button onClick={addRandomFriendAction} className="w-full py-3 border border-dashed border-yellow-500/50 text-yellow-500 text-[11px] font-black uppercase">✨ KẾT BẠN NGẪU NHIÊN ✨</button></div>)}
                            {leaderboardTab !== 'GUILDS' && renderPodium()}
                            {leaderboardTab !== 'GUILDS' && leaderboardRenderList.length === 0 && leaderboardTab !== 'GUILDS' && (<p className="text-center text-[11px] text-zinc-500 italic py-8">Chưa có ai đủ điều kiện (học tối thiểu {LB_MIN_LESSONS} bài trong mùa). Hãy là người đầu tiên!</p>)}
                            {leaderboardTab !== 'GUILDS' && leaderboardRenderList.map((p, i) => {
                                if (i < 3) return null; // Top 3 đã hiện trên bục vinh danh
                                let rankColorClass = "text-zinc-500"; let bgRankClass = "bg-black/50 border-zinc-800";
                                if (i === 0) { rankColorClass = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; bgRankClass = "bg-yellow-900/20 border-yellow-500 shadow-[inset_0_0_10px_rgba(234,179,8,0.2)]"; } 
                                else if (i === 1) { rankColorClass = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; bgRankClass = "bg-gray-800/40 border-gray-400"; } 
                                else if (i === 2) { rankColorClass = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]"; bgRankClass = "bg-orange-900/20 border-orange-500"; }
                                if (p.uid === user.uid) bgRankClass += " border-l-4 border-l-cyan-400 bg-cyan-900/10";
                                return (
                                    <div key={p.uid || i} onClick={()=>{ playSfx('OPEN'); setViewingUser(p); changeAppState('VIEW_PROFILE'); }} style={{ animationDelay: Math.min(i, 14) * 25 + 'ms' }} className={`lb-row lb-enter flex justify-between items-center p-3 border cursor-pointer hover:scale-[1.02] transition-transform ${bgRankClass}`}>
                                        <div className="flex items-center gap-3"><span className={`${rankColorClass} text-[16px] font-black w-8 text-center`}>#{i+1}</span><img src={p.photo} className={`w-12 h-12 object-cover ${p.frame ? 'frame-'+p.frame : 'border border-zinc-700'} ${p.aura||''}`} alt="avatar" /><div className="flex flex-col leading-tight"><UserName u={p} cls="text-[13px] tracking-wide" />{i < 3 && <span className="text-[9px] font-black mt-1 text-yellow-300 tracking-wider">{LB_TITLES[i]}</span>}<span className="text-[9px] text-zinc-500 font-bold mt-1.5 tracking-widest">ID: {p.gameId || '---'}</span>{p.guild && <span className="text-[9px] text-cyan-500 font-black mt-1 tracking-widest">🏯 {p.guild}</span>}</div></div>
                                        <div className="text-right leading-tight">
                                            {leaderboardTab === 'FAME' ? <span className="text-yellow-500 font-black text-[14px] drop-shadow-[0_0_2px_#eab308]">⭐ {formatNumber(p.fame || 0)}</span> : <span className="text-green-400 font-black text-[14px] drop-shadow-[0_0_2px_#4ade80]">🏆 {formatNumber(p.seasonScore || 0)}</span>}
                                            <div className="text-[10px] streak-fire font-black mt-1.5">🔥 {p.streakCount || 0}</div>
                                        </div>
                                    </div>
                                )
                            })}
                            {leaderboardTab !== 'GUILDS' && (() => {
                                const myIdx = leaderboardRenderList.findIndex(p => p.uid === user.uid); if (myIdx < 0) return null;
                                const me = leaderboardRenderList[myIdx];
                                return (<div className="sticky bottom-0 mt-2 p-2.5 bg-zinc-950/95 backdrop-blur border border-cyan-500/70 shadow-[0_-4px_16px_rgba(0,0,0,.6)] flex items-center justify-between lb-enter">
                                    <div className="flex items-center gap-2 min-w-0"><span className="text-cyan-300 font-black text-sm w-9 text-center">#{myIdx + 1}</span><img src={me.photo} className="w-8 h-8 object-cover border border-cyan-700" alt="" /><span className="text-[11px] text-white font-black truncate">Ngài</span></div>
                                    <span className="text-[12px] font-black text-green-400">{leaderboardTab === 'FAME' ? '⭐ ' + formatNumber(me.fame || 0) : '🏆 ' + formatNumber(me.seasonScore || 0)}</span>
                                </div>);
                            })()}
                            {leaderboardTab === 'GUILDS' && guildLeaderboardRenderList.map((g, i) => {
                                let rankColorClass = "text-zinc-500"; let bgRankClass = (g.theme || "bg-black/50 border-zinc-800") + " " + (g.aura || "");
                                if (i === 0) rankColorClass = "text-yellow-400 drop-shadow-[0_0_2px_#facc15]"; else if (i === 1) rankColorClass = "text-gray-300 drop-shadow-[0_0_2px_#d1d5db]"; else if (i === 2) rankColorClass = "text-orange-400 drop-shadow-[0_0_2px_#fb923c]";
                                if (g.name === user.guild) bgRankClass += " border-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.4)]";
                                const leaderData = allUsers.find(u => u.uid === g.leader || u.name === g.leader) || { name: "Ẩn Danh" };
                                return (
                                    <div key={i} onClick={() => { playSfx('CLICK'); setViewGuildModal(g); }} className={`flex justify-between items-center p-3 border ${bgRankClass} mb-3 shadow-md cursor-pointer hover:scale-[1.02] transition-transform`}>
                                        <div className="flex items-center gap-3"><div className={`w-8 h-8 flex items-center justify-center border ${i === 0 ? 'border-yellow-400 bg-yellow-900/40' : i === 1 ? 'border-gray-300 bg-gray-800/40' : i === 2 ? 'border-orange-400 bg-orange-900/40' : 'border-zinc-700 bg-black/60'}`}><span className={`${rankColorClass} text-[12px] font-black`}>#{i+1}</span></div><div className="flex flex-col leading-tight justify-center"><div><span className={`text-[14px] font-black uppercase ${g.frame ? 'frame-'+g.frame : ''} inline-block px-2 py-1 bg-black/40`} style={{ color: g.color || '#eab308' }}>{g.beast ? <span className="mr-1">{g.beast}</span> : ''}{guildLabel(g)}</span></div><span className="text-[9px] text-zinc-400 font-bold mt-2 flex items-center gap-1">👑 Bang Chủ: <UserName u={leaderData} cls="text-[9px]" /></span></div></div>
                                        <div className="text-right flex flex-col justify-center border-l border-zinc-700/50 pl-3 min-w-[70px]"><span className="text-cyan-400 font-black text-[13px]">Cấp {g.level}</span><span className="text-[9px] text-zinc-400 font-black mt-1">👥 {g.members?.length || 1}/{g.level*5}</span><span className="text-[8px] text-zinc-500 font-bold mt-0.5">⭐ {formatNumber(g.exp || 0)}</span></div>
                                    </div>
                                )
                            })}
                        </div>
                        <button onClick={()=>changeAppState('DASHBOARD')} className="p-4 bg-zinc-800 text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors">QUAY VỀ BÍ CẢNH</button>
                    </div>
    );
}
