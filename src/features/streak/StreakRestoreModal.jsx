

export function StreakRestoreModal({ streak }) {
    const { streakRestoreByFame, streakRestoreBySpirit, streakRestoreByStudy, streakRestoreDismiss, streakRestoreModal } = streak;
    return (
                    <div className="fixed inset-0 bg-black/85 z-[997] flex items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-zinc-950 border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.35)] p-5 space-y-3 animate-fadeIn text-center">
                            <p className="text-3xl">🔥💔</p>
                            <h3 className="text-lg font-black text-orange-400 uppercase">Chuỗi Điểm Danh Sắp Đứt!</h3>
                            <p className="text-[11px] text-zinc-400">Ngài đã bỏ lỡ hơn 24h! Chuỗi <span className="text-orange-400 font-black">{streakRestoreModal.oldStreak} ngày</span> sẽ mất nếu không khôi phục.</p>
                            <div className="space-y-2 pt-2 text-left">
                                <button onClick={streakRestoreByStudy} className="w-full bg-cyan-800 hover:bg-cyan-600 text-white py-3 text-[10px] font-black uppercase">📖 Học 1 Ải Hôm Nay Để Khôi Phục (Miễn Phí)</button>
                                <button onClick={streakRestoreBySpirit} className="w-full bg-blue-900 hover:bg-blue-700 text-white py-3 text-[10px] font-black uppercase">💎 Dùng {Math.min(streakRestoreModal.oldStreak * 20, 2000)} Linh Thạch</button>
                                <button onClick={streakRestoreByFame} className="w-full bg-yellow-800 hover:bg-yellow-600 text-white py-3 text-[10px] font-black uppercase">⭐ Dùng {Math.min(streakRestoreModal.oldStreak * 5, 500)} Danh Vọng</button>
                                <button onClick={streakRestoreDismiss} className="w-full text-zinc-500 hover:text-red-400 py-2 text-[9px] font-black uppercase">Bỏ Qua, Chấp Nhận Mất Chuỗi</button>
                            </div>
                        </div>
                    </div>
    );
}
