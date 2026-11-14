

export function SeasonRewardModal({ leaderboard }) {
    const { seasonRewardModal, setSeasonRewardModal } = leaderboard;
    return (
                <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-cyan-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(6,182,212,0.3)]">
                        <h3 className="text-2xl font-black text-cyan-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#00ffff]">Tổng Kết Mùa Giải</h3>
                        <p className="text-zinc-300 text-[11px] mb-6 italic">Chúc mừng! Ngài đã xuất sắc lọt TOP {seasonRewardModal.rank} Thiên Bảng mùa trước!</p>
                        <div className="flex justify-center items-center gap-6 mb-6 bg-black/50 p-4 border border-cyan-900/50">
                            <div className="flex flex-col items-center">
                                <span className="text-3xl mb-2">💎</span>
                                <span className="text-cyan-400 font-black text-xl">+{seasonRewardModal.s}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-3xl mb-2">⭐</span>
                                <span className="text-yellow-500 font-black text-xl">+{seasonRewardModal.f}</span>
                            </div>
                        </div>
                        <button onClick={() => setSeasonRewardModal(null)} className="w-full bg-cyan-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">LÃNH THƯỞNG</button>
                    </div>
                </div>
    );
}
