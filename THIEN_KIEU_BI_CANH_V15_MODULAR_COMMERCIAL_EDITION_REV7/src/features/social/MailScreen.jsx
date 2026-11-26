

export function MailScreen({ core, audio, nav, guild, social }) {
    const { allUsers, setViewingUser, user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const { acceptGuildReq } = guild;
    const { acceptFriendReq, rejectReq } = social;
    return (
                <div className="w-full max-w-sm h-[85vh] bg-zinc-900 border border-yellow-700/50 p-5 flex flex-col shadow-2xl animate-fadeIn mt-[10vh] mx-auto z-[60]">
                    <h2 className="text-yellow-500 font-black text-center text-xl italic mb-4 font-playfair border-b border-yellow-700/30 pb-3">Bồ Câu Truyền Tin</h2>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {!user.requests || user.requests.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 text-center italic mt-10">Khí tức bình yên, không có thư từ nào.</p>
                        ) : user.requests.map(req => (
                            <div key={req.id} className="bg-black border border-zinc-700 p-3 shadow-md hover:border-yellow-600/50 transition-colors">
                                {req.type === 'friend' && (
                                    <>
                                        <p className="text-[11px] text-zinc-300 mb-3 leading-relaxed"><span className="text-yellow-400 font-bold cursor-pointer hover:text-white hover:underline decoration-yellow-600" onClick={() => { playSfx('CLICK'); const senderData = allUsers.find(u => u.uid === req.fromUid); if (senderData) { setViewingUser(senderData); changeAppState('VIEW_PROFILE'); } else { alert("Đạo hữu đã quy ẩn!"); } }}>[{req.fromName}]</span> muốn kết duyên Đạo hữu cùng ngài.</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptFriendReq(req)} className="flex-1 bg-green-800 text-green-200 py-2 text-[10px] font-black uppercase hover:bg-green-600 border border-green-600">Chấp Nhận</button>
                                            <button onClick={() => rejectReq(req)} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-[10px] font-black uppercase hover:bg-red-900 hover:text-red-200 border border-zinc-700">Từ Chối</button>
                                        </div>
                                    </>
                                )}
                                {req.type === 'guild' && (
                                    <>
                                        <p className="text-[11px] text-zinc-300 mb-3 leading-relaxed"><span className="text-yellow-400 font-bold cursor-pointer hover:text-white hover:underline decoration-yellow-600" onClick={() => { playSfx('CLICK'); const senderData = allUsers.find(u => u.uid === req.fromUid); if (senderData) { setViewingUser(senderData); changeAppState('VIEW_PROFILE'); } else { alert("Đạo hữu đã quy ẩn!"); } }}>[{req.fromName}]</span> mời ngài quy thuận Tông môn <span className="text-cyan-400 font-black">[{req.guildName}]</span>.</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptGuildReq(req)} className="flex-1 bg-cyan-800 text-cyan-200 py-2 text-[10px] font-black uppercase hover:bg-cyan-600 border border-cyan-600">Quy Phục</button>
                                            <button onClick={() => rejectReq(req)} className="flex-1 bg-zinc-800 text-zinc-400 py-2 text-[10px] font-black uppercase hover:bg-red-900 hover:text-red-200 border border-zinc-700">Từ Chối</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-4 text-[11px] font-black text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors uppercase tracking-widest">ĐÓNG HỘP THƯ</button>
                </div>
    );
}
