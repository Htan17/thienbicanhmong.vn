

export function ExamPathFinaleModal({ exampath }) {
    const { examPathFinaleInfo, setExamPathFinaleInfo } = exampath;
    return (
                <div className="absolute inset-0 bg-black/95 z-[310] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-yellow-500 p-6 w-full max-w-sm text-center shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                        <span className="text-5xl block mb-3">🏆</span>
                        <h3 className="text-2xl font-black text-yellow-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_6px_#eab308]">Hoàn Thành Đạo Lộ!</h3>
                        <p className="text-zinc-300 text-[11px] mb-1 italic">Ngài đã chinh phục trọn vẹn Đạo Lộ:</p>
                        <p className="text-white text-sm font-black mb-4">"{examPathFinaleInfo.title}"</p>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="bg-black/50 border border-yellow-900/50 p-3"><span className="block text-lg font-black text-yellow-300">{examPathFinaleInfo.totalNodes}</span><span className="text-[8px] text-zinc-500 uppercase">Ải Đã Vượt</span></div>
                            <div className="bg-black/50 border border-yellow-900/50 p-3"><span className="block text-lg font-black text-yellow-300">{examPathFinaleInfo.days}</span><span className="text-[8px] text-zinc-500 uppercase">Ngày Lộ Trình</span></div>
                        </div>
                        <p className="text-zinc-500 text-[9px] mb-4 italic">Hãy khai mở 1 Đạo Lộ mới ở tab ĐẠO ĐỒ để tiếp tục tu luyện, hoặc xem Bát Quái Đồ để biết điểm mạnh/yếu của mình!</p>
                        <button onClick={() => setExamPathFinaleInfo(null)} className="w-full bg-yellow-600 text-black py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">TIẾP TỤC</button>
                    </div>
                </div>
    );
}
