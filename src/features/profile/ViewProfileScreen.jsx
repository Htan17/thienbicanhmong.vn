import { RANKS } from '../../config/gameData.js';
import { UserName } from '../../components/common.jsx';

export function ViewProfileScreen({ core, nav, social }) {
    const { setReportTarget, user, viewingUser } = core;
    const { changeAppState } = nav;
    const { sendFriendReqToUser } = social;
    return (
                    <div className="w-full max-w-xs bg-zinc-900 border border-yellow-500/50 p-6 text-center shadow-2xl animate-fadeIn">
                        <img src={viewingUser.photo} className={`w-28 h-28 mx-auto object-cover mb-4 ${viewingUser.frame ? 'frame-'+viewingUser.frame : 'border-2 border-yellow-500'} ${viewingUser.aura||''}`} alt="avatar" />
                        <div className="inline-block bg-black px-3 py-1 border border-yellow-500 text-yellow-500 text-[10px] font-black uppercase mb-4 shadow-[0_0_5px_rgba(234,179,8,0.2)]">{RANKS.find(r => r.id === viewingUser.rank)?.name || 'Vô Danh'}</div>
                        <div><UserName u={viewingUser} cls="text-2xl tracking-wider drop-shadow-[0_0_5px_currentColor]" /></div>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <span className="text-[10px] text-zinc-400 font-black bg-black px-3 py-2 border border-cyan-900 uppercase">ID: <span className="text-cyan-400">{viewingUser.gameId || viewingUser.uid}</span></span>
                            <button onClick={()=>{navigator.clipboard.writeText(viewingUser.gameId || viewingUser.uid); alert("Đã chép ID!");}} className="text-[10px] font-black bg-zinc-800 text-white px-3 py-2 uppercase">Chép</button>
                        </div>
                        {viewingUser.guild && <div className="text-[11px] text-cyan-400 font-black mt-3 uppercase tracking-widest">🏯 Bang Phái: {viewingUser.guild}</div>}
                        <div className="bg-black border border-zinc-800 p-3 mt-5 text-left shadow-inner">
                            <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">Di Ngôn:</p>
                            <p className="text-[12px] text-zinc-400 italic font-playfair">"{viewingUser.bio || 'Kẻ vô danh.'}"</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-5 text-[11px] font-black text-left">
                            <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Linh Thạch</span><span className="text-white">💎 {viewingUser.spirit || 0}</span></div>
                            <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Danh Vọng</span><span className="text-yellow-500">⭐ {viewingUser.fame || 0}</span></div>
                            <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Xếp Hạng</span><span className="text-green-400">🏆 {viewingUser.seasonScore || 0}</span></div>
                            <div className="bg-black p-3 border border-zinc-800 shadow-md"><span className="text-zinc-500 block text-[9px] uppercase mb-1">Đăng Nhập</span><span className="streak-fire">🔥 {viewingUser.streakCount || 0}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button onClick={() => sendFriendReqToUser(viewingUser)} className="bg-yellow-600 text-black py-3 text-[10px] font-black uppercase transition-colors">Kết Giao</button>
                            <button onClick={() => changeAppState('DASHBOARD')} className="bg-zinc-800 text-white py-3 text-[10px] font-black uppercase border border-zinc-700">ĐÓNG LẠI</button>
                        </div>
                        {viewingUser.uid && viewingUser.uid !== user?.uid && <button onClick={() => setReportTarget({ type: 'user', id: viewingUser.uid, label: viewingUser.name })} className="w-full mt-3 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">🚩 Báo cáo đạo hữu này</button>}
                    </div>
    );
}
