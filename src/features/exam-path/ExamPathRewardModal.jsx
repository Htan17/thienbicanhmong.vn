

export function ExamPathRewardModal({ exampath }) {
    const { examPathRewardModal, setExamPathRewardModal } = exampath;
    return (
                <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-emerald-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                        <h3 className="text-2xl font-black text-emerald-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#10b981]">Tổng Kết Đạo Hữu Bảng</h3>
                        <p className="text-zinc-300 text-[11px] mb-6 italic">Chúc mừng! Ngài đã lọt TOP {examPathRewardModal.rank} Đạo Hữu Bảng hôm qua, nhận được danh hiệu:</p>
                        <div className="flex justify-center items-center mb-6 bg-black/50 p-4 border border-emerald-900/50">
                            <span className="text-lg mb-1">🏅</span>
                            <span className="text-emerald-300 font-black text-sm ml-2">{examPathRewardModal.titleName}</span>
                        </div>
                        <button onClick={() => setExamPathRewardModal(null)} className="w-full bg-emerald-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">LÃNH DANH HIỆU</button>
                    </div>
                </div>
    );
}
