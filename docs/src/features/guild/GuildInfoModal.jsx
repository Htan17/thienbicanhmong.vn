import { UserName } from '../../components/common.jsx';
import { guildLabel } from '../../lib/moderation.js';

export function GuildInfoModal({ core, nav, guild }) {
    const { allUsers, setReportTarget, setViewingUser, user } = core;
    const { changeAppState } = nav;
    const { setViewGuildModal, viewGuildModal } = guild;
    return (
                <div className="absolute inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-fadeIn">
                    <div className={`bg-zinc-900 border border-yellow-500 p-6 w-full max-w-sm text-center shadow-[0_0_30px_rgba(234,179,8,0.2)] ${viewGuildModal.theme||''} ${viewGuildModal.aura||''}`}>
                        <h3 className={`text-2xl font-black uppercase mb-1 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] ${viewGuildModal.frame ? 'frame-'+viewGuildModal.frame : ''} inline-block px-4 py-2`} style={{ color: viewGuildModal.color || '#eab308' }}>
                            {viewGuildModal.beast ? viewGuildModal.beast + ' ' : ''}{guildLabel(viewGuildModal)}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-bold mb-4 tracking-widest mt-2 uppercase">Thế Lực Cấp {viewGuildModal.level}</p>
                        <div className="bg-black border border-zinc-700 p-3 mb-4 text-left">
                            <p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">Cáo Thị Tông Môn:</p>
                            <p className="text-[11px] text-zinc-300 italic font-playfair">{viewGuildModal.notice || "Chưa có thông báo nào."}</p>
                        </div>
                        <div className="bg-black border border-zinc-700 p-3 mb-4 text-left max-h-40 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] text-cyan-400 font-black mb-2 uppercase">Môn Đồ ({viewGuildModal.members.length}/{viewGuildModal.level*5}):</p>
                            {viewGuildModal.members.map(uid => {
                                const mData = allUsers.find(x => x.uid === uid || x.name === uid) || { name: uid };
                                const isLeader = (uid === viewGuildModal.leader || mData.name === viewGuildModal.leader);
                                return (
                                    <div key={uid} className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => { setViewingUser(mData); changeAppState('VIEW_PROFILE'); setViewGuildModal(null); }}>
                                        <UserName u={mData} cls="text-[10px]" />
                                        {isLeader && <span className="text-[8px] text-yellow-500 bg-yellow-900/30 px-1 border border-yellow-700">Bang Chủ</span>}
                                    </div>
                                )
                            })}
                        </div>
                        {viewGuildModal.leader !== user?.uid && viewGuildModal.leader !== user?.name && <button onClick={() => setReportTarget({ type: 'guild', id: viewGuildModal.id || viewGuildModal.name, label: viewGuildModal.name })} className="w-full mb-2 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">🚩 Báo cáo tông môn này</button>}
                    <button onClick={() => setViewGuildModal(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white py-3 text-[10px] font-black uppercase transition-colors border border-zinc-700">Đóng Lại</button>
                    </div>
                </div>
    );
}
