import { FRAMES, GUILD_BEASTS, NAME_COLORS, RANKS } from '../../config/gameData.js';
import { UserName } from '../../components/common.jsx';
import { guildLabel } from '../../lib/moderation.js';
import { safeUserUpdate } from '../../lib/userData.js';

export function GuildScreen({ core, audio, nav, guild }) {
    const { allGuilds, allUsers, guildTab, setGuildTab, setViewingUser, user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const { buyGuildPerkAction, buyGuildPerkWithExpAction, createGuildAction, dissolveGuildAction, editNotice, exchangeGuildExpAction, guildSyncingUntil, inviteGuildMemberId, inviteToGuildAction, joinGuildAction, joinGuildByCodeAction, joinGuildIdStr, leaveOrKickGuildAction, newGuildName, setEditNotice, setInviteGuildMemberId, setJoinGuildIdStr, setNewGuildName, transferLeaderAction, updateGuildNoticeAction, upgradeGuildLevelAction } = guild;
    return (
                    <div className="w-full max-w-sm h-[80vh] bg-zinc-900 border border-yellow-700/50 p-6 flex flex-col shadow-2xl animate-fadeIn">
                        <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-8 uppercase font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Thế Lực Phân Tranh</h2>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                            {!user.guild ? (
                                <div className="space-y-8 mt-2">
                                    <div className="bg-black p-5 border border-zinc-800 shadow-lg">
                                        <p className="text-[11px] font-black text-yellow-500 mb-3 uppercase tracking-widest">Lập Tông Môn (-500 💎)</p>
                                        <input className="w-full bg-zinc-900 border border-zinc-700 p-3 text-sm text-white mb-3 outline-none focus:border-yellow-500" placeholder="Nhập Tôn hiệu tông môn..." value={newGuildName} onChange={e=>setNewGuildName(e.target.value)} />
                                        <button onClick={createGuildAction} className="w-full bg-yellow-600 text-black py-3 text-[11px] font-black hover:bg-yellow-500 shadow-md">KHAI SƠN LẬP PHÁI</button>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-cyan-400 mb-3 uppercase tracking-widest border-l-4 border-cyan-400 pl-2">Gia Nhập Bằng Mã</p>
                                        <div className="flex gap-2 mb-6 bg-black p-2 border border-zinc-800">
                                            <input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Mã Tông Môn..." value={joinGuildIdStr} onChange={e=>setJoinGuildIdStr(e.target.value)} />
                                            <button onClick={joinGuildByCodeAction} className="bg-cyan-700 text-white px-3 text-[10px] font-black uppercase">VÀO BANG</button>
                                        </div>
                                        <p className="text-[11px] font-black text-yellow-500 mb-3 uppercase tracking-widest border-l-4 border-yellow-500 pl-2">Danh Sách Thế Lực</p>
                                        <div className="space-y-2">
                                            {Object.values(allGuilds).length > 0 ? Object.values(allGuilds).map(g => (
                                                <div key={g.name} className="flex justify-between items-center bg-black border border-zinc-800 p-4 hover:border-cyan-900/50 transition-colors">
                                                    <div className="leading-tight"><span className="text-sm font-black text-white uppercase">{g.beast ? g.beast+' ' : ''}{guildLabel(g)}</span><br/><span className="text-[9px] text-zinc-500 font-bold mt-1 inline-block">Cấp {g.level} | {g.members.length}/{g.level*5} môn đồ</span></div>
                                                    <button onClick={()=>joinGuildAction(g)} className="bg-cyan-900 text-cyan-400 border border-cyan-700 px-4 py-2 text-[9px] font-black hover:bg-cyan-800 hover:text-white">QUY PHỤC</button>
                                                </div>
                                            )) : <p className="text-[11px] text-zinc-600 italic text-center">Đại lục chưa có thế lực nào...</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    {(()=>{ 
                                        const gObj = allGuilds[user.guild]; 
                                        if(!gObj) {
                                            // SỬA LỖI: vừa tạo/gia nhập tông môn xong, listener 'guilds' có thể chưa kịp đồng bộ về máy
                                            // -> đừng vội báo "diệt vong", chờ vài giây rồi mới kết luận thật sự không có bang.
                                            if (Date.now() < guildSyncingUntil) {
                                                return (<div className="text-center mt-10"><p className="text-[12px] text-cyan-400 font-black uppercase mb-4 leading-relaxed animate-pulse">Đang đồng bộ Tông môn...</p></div>);
                                            }
                                            return (<div className="text-center mt-10"><p className="text-[12px] text-red-500 font-black uppercase mb-4 leading-relaxed">Tông môn này đã bị diệt vong!</p><button onClick={()=>{ playSfx('CLICK'); safeUserUpdate(user.uid, {guild: null}); }} className="bg-red-900 text-white px-6 py-3 font-black text-[10px] uppercase">Rời Khỏi Phế Tích</button></div>);
                                        }
                                        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
                                        return (
                                            <div className="flex-1">
                                                <div className="flex justify-around border-b border-yellow-700/50 mb-4 pb-2">
                                                    <button onClick={()=>{ playSfx('CLICK'); setGuildTab('INFO'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='INFO'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>THÔNG TIN</button>
                                                    <button onClick={()=>{ playSfx('CLICK'); setGuildTab('MEMBERS'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='MEMBERS'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>MÔN ĐỒ</button>
                                                    <button onClick={()=>{ playSfx('CLICK'); setGuildTab('SHOP'); }} className={`text-[10px] font-black uppercase tracking-widest px-2 pb-1 ${guildTab==='SHOP'?'border-b-2 border-yellow-500 text-yellow-500':'text-zinc-500'}`}>PHÚC LỢI BANG</button>
                                                </div>
                                                {guildTab === 'INFO' && (
                                                    <div className={`p-5 mb-4 text-center ${gObj.theme || 'bg-black border border-zinc-800'} ${gObj.aura || ''}`}>
                                                        <h3 className={`text-2xl font-black uppercase mb-1 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] ${gObj.frame ? 'frame-'+gObj.frame : ''} inline-block px-4 py-2`} style={{ color: gObj.color || '#eab308' }}>{gObj.beast ? gObj.beast + ' ' : ''}{guildLabel(gObj)}</h3>
                                                        <div className="text-[10px] text-zinc-300 font-bold mb-4 tracking-widest mt-2">CẤP ĐỘ {gObj.level} ({gObj.members.length}/{gObj.level*5})</div>
                                                        <div className="bg-black/80 border border-yellow-700/50 p-2 mb-4 cursor-pointer hover:bg-yellow-900/40 inline-block mx-auto rounded" onClick={()=>{navigator.clipboard.writeText(gObj.guildId || gObj.name); alert("Đã copy Mã Tông Môn!");}}><span className="text-[9px] text-zinc-400 uppercase font-black">Mã Tông Môn: </span><span className="text-yellow-400 font-bold text-[11px] tracking-widest">{gObj.guildId || "---"}</span></div>
                                                        <div className="bg-black/60 border border-zinc-700 p-3 mb-4 text-left"><p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">CÁO THỊ TÔNG MÔN:</p><p className="text-[11px] text-zinc-300 italic font-playfair">{gObj.notice || "Chưa có thông báo."}</p></div>
                                                        {gObj.level < 5 ? (<div className="bg-black/60 border border-zinc-700 p-3 text-center"><span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-2">Độ kiếp thăng cấp {gObj.level + 1}</span><span className="text-[10px] text-zinc-300 font-bold">Cần 3 môn đồ đạt <span className="text-yellow-500">{RANKS.find(r=>r.level === gObj.level + 1)?.name || 'Cao hơn'}</span></span></div>) : <div className="text-[12px] text-yellow-500 font-black mb-2 streak-fire uppercase tracking-widest py-2 border border-yellow-500/30 bg-yellow-900/10">Đỉnh Cấp Tông Môn</div>}
                                                        <button onClick={()=>leaveOrKickGuildAction(gObj)} className="w-full mt-6 border border-red-900 bg-black text-red-500 py-3 text-[10px] font-black hover:bg-red-900 hover:text-white transition-colors uppercase tracking-widest">Phản Bội Tông Môn (-500💎)</button>
                                                        {isLeader && <button onClick={()=>dissolveGuildAction(gObj)} className="w-full mt-2 border border-red-700 bg-red-950/40 text-red-400 py-3 text-[10px] font-black hover:bg-red-800 hover:text-white transition-colors uppercase tracking-widest">⚰️ Khai Tử Tông Môn (Miễn Phí)</button>}
                                                    </div>
                                                )}
                                                {guildTab === 'MEMBERS' && (
                                                    <div className="space-y-4">
                                                        {isLeader && (<div className="bg-black p-3 border border-zinc-800 shadow-md text-left"><p className="text-[10px] font-black text-cyan-400 mb-2 uppercase tracking-widest">Chiêu Mộ Đạo Hữu</p><div className="flex gap-2"><input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Nhập ID 8 số..." value={inviteGuildMemberId} onChange={e=>setInviteGuildMemberId(e.target.value)} /><button onClick={()=>inviteToGuildAction(gObj)} className="bg-cyan-700 text-white px-3 text-[9px] font-black uppercase">KÉO VÀO</button></div></div>)}
                                                        <div className="space-y-2">
                                                            {gObj.members.map(memberUidOrName => {
                                                                const memberData = allUsers.find(x => x.uid === memberUidOrName || x.name === memberUidOrName) || { name: memberUidOrName };
                                                                const mRankName = RANKS.find(r => r.id === memberData.rank)?.name || 'Luyện Khí';
                                                                return (
                                                                    <div key={memberUidOrName} className="text-sm font-bold text-white flex justify-between items-center bg-black p-3 border border-zinc-800">
                                                                        <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform" onClick={() => { playSfx('CLICK'); if (memberData && memberData.uid) { setViewingUser(memberData); changeAppState('VIEW_PROFILE'); } }} title="Hồ sơ">
                                                                            <img src={memberData.photo || 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Anonymous'} className={`w-8 h-8 object-cover ${memberData.frame ? 'frame-'+memberData.frame : 'border border-zinc-700'} ${memberData.aura||''}`} />
                                                                            <div className="flex flex-col"><UserName u={memberData} cls="text-[12px]" /><span className="text-[9px] text-zinc-500 font-black mt-1">{mRankName}</span></div>
                                                                        </div>
                                                                        {(memberUidOrName === gObj.leader || memberData.name === gObj.leader) ? <span className="text-yellow-600 text-[9px] border border-yellow-600 px-2 py-1 font-black uppercase bg-yellow-900/20">Bang Chủ</span> : (isLeader && <div className="flex gap-1"><button onClick={()=>transferLeaderAction(gObj, memberUidOrName)} className="text-yellow-500 border border-yellow-600 px-2 py-1 text-[9px] hover:bg-yellow-700 hover:text-black uppercase">Truyền Ngôi</button><button onClick={()=>leaveOrKickGuildAction(gObj, memberUidOrName)} className="text-red-500 border border-red-500 px-2 py-1 text-[9px] hover:bg-red-900 hover:text-white uppercase">Trục Xuất</button></div>)}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {guildTab === 'SHOP' && (
                                                    <div className="space-y-4 text-left pb-10">
                                                        {!isLeader ? (<div className="bg-blue-900/20 border border-blue-500/50 p-3 mb-4 text-[10px] text-blue-300 italic">Bang Chủ mới có quyền tu sửa nâng cấp.</div>) : (
                                                            <div className="bg-emerald-900/20 border-2 border-emerald-500/50 p-4 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                                                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
                                                                <p className="text-[11px] text-emerald-400 font-black mb-1 uppercase tracking-widest text-center">💎 Thánh Khố Tông Môn 💎</p>
                                                                <div className="bg-black/50 border border-emerald-800 p-2 mb-2 text-center"><span className="text-[9px] text-zinc-400 uppercase font-black">Công Trạng: </span><span className="text-yellow-400 font-bold text-[12px]">{gObj.exp || 0}</span></div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-cyan-300">Túi 5000 LT</span><button onClick={() => exchangeGuildExpAction(gObj, 2000, 'spirit', 5000, '5000 Linh Thạch')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (2000 CT)</button></div>
                                                                    <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-red-300">2x Bùa x2</span><button onClick={() => exchangeGuildExpAction(gObj, 1000, 'x2', null, '2 Bùa Nhân Đôi')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (1000 CT)</button></div>
                                                                    <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-yellow-300">Hiệu: [TÔNG SƯ]</span><button onClick={() => exchangeGuildExpAction(gObj, 5000, 'item', 'nf_tongsu', 'Hiệu Tông Sư')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (5000 CT)</button></div>
                                                                    <div className="flex justify-between items-center bg-black/50 p-2 border border-emerald-900/50 hover:border-emerald-500 transition-colors"><span className="text-[10px] font-black text-green-300">Quang: [HỖN ĐỘN]</span><button onClick={() => exchangeGuildExpAction(gObj, 10000, 'item', 'pa_chaos', 'Hào Quang Hỗn Độn')} className="bg-emerald-800 text-white px-3 py-1 text-[9px] font-black">Đổi (10000 CT)</button></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-yellow-500 font-black mb-2 uppercase tracking-widest">Sửa Cáo Thị</p><textarea className="w-full bg-zinc-900 text-xs p-3 text-zinc-300 outline-none border border-zinc-700" rows="3" value={editNotice} onChange={e=>setEditNotice(e.target.value)} /><button onClick={()=>updateGuildNoticeAction(gObj)} className="w-full mt-2 bg-yellow-600 text-black py-2 text-[10px] font-black uppercase">LƯU CÁO THỊ</button></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-cyan-400 font-black mb-2 uppercase">Thăng Cấp Bang</p><button onClick={()=>upgradeGuildLevelAction(gObj)} className="w-full bg-cyan-800 text-white py-2 text-[10px] font-black uppercase">ĐỘ KIẾP THĂNG CẤP</button></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-orange-400 font-black mb-3 uppercase">Thần Thú (1500 💎)</p><div className="grid grid-cols-2 gap-2">{GUILD_BEASTS.map(b => (<button key={b.id} onClick={()=>buyGuildPerkAction(gObj, 'beast', b.icon, b.price)} className="text-[11px] font-black border border-orange-700/50 p-2 bg-orange-950/20 text-orange-300">{b.name} {b.icon}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'beast', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Thả Thần Thú</button></div></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-indigo-400 font-black mb-3 uppercase">Hào Quang Phái</p><div className="grid grid-cols-1 gap-2"><button onClick={()=>buyGuildPerkAction(gObj, 'aura', 'guild-aura-sacred', 5000)} className="text-[10px] font-black border border-indigo-500 bg-indigo-950/40 text-indigo-300 p-2 shadow-[0_0_10px_#6366f1]">Thánh Quang (5000 💎)</button><button onClick={()=>buyGuildPerkWithExpAction(gObj, 'aura', 'guild-aura-rainbow', 5000)} className="text-[10px] font-black border border-pink-500 bg-pink-950/40 text-pink-300 p-2 aura-rainbow">Cầu Vồng (5000 CT)</button><button onClick={()=>buyGuildPerkAction(gObj, 'aura', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2">Tắt Hào Quang</button></div></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-pink-400 font-black mb-3 uppercase">Màu Tên Bang (1000 💎)</p><div className="grid grid-cols-2 gap-2">{NAME_COLORS.map(c => (<button key={c.id} onClick={()=>buyGuildPerkAction(gObj, 'color', c.color, 1000)} style={{color: c.color}} className="text-[10px] font-black border border-zinc-700 p-2">{c.name}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'color', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Màu Gốc</button></div></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-green-400 font-black mb-3 uppercase">Khung Bảng (2000 💎)</p><div className="grid grid-cols-2 gap-3">{FRAMES.map(f => (<button key={f.id} onClick={()=>buyGuildPerkAction(gObj, 'frame', f.id, 2000)} className={`text-[10px] font-black border border-zinc-700 p-2 bg-zinc-900 text-white`}><div className={`w-full h-2 mb-1 frame-${f.id}`}></div>{f.name}</button>))}<button onClick={()=>buyGuildPerkAction(gObj, 'frame', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Tháo Khung</button></div></div>
                                                        <div className="bg-black border border-zinc-800 p-4"><p className="text-[10px] text-purple-400 font-black mb-3 uppercase">Màu Nền (3000 💎)</p><div className="grid grid-cols-2 gap-2"><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-blood', 3000)} className="text-[10px] font-black border border-red-500 bg-red-950/40 text-red-400 p-2">Huyết Quỷ</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-abyss', 3000)} className="text-[10px] font-black border border-purple-500 bg-purple-950/40 text-purple-400 p-2">Vực Sâu</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', 'theme-gold', 3000)} className="text-[10px] font-black border border-yellow-500 bg-yellow-900/40 text-yellow-400 p-2 col-span-2">Hoàng Kim</button><button onClick={()=>buyGuildPerkAction(gObj, 'theme', '', 0)} className="text-[10px] font-black border border-zinc-500 bg-zinc-900 text-zinc-400 p-2 col-span-2">Hắc Ám</button></div></div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>
                        <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-2 text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-colors">Trở Về Tàng Kinh Các</button>
                    </div>
    );
}
