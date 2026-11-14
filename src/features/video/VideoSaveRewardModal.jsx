import { MiniLeaderboard } from '../../components/common.jsx';

export function VideoSaveRewardModal({ core, leaderboard, videonotes }) {
    const { user } = core;
    const { topSeasonList } = leaderboard;
    const { setVideoSaveReward, videoSaveReward } = videonotes;
    return (
                <div className="absolute inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border-2 border-cyan-500 p-6 w-full max-w-sm text-center shadow-[0_0_40px_rgba(6,182,212,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-2xl font-black text-cyan-400 mb-2 uppercase font-playfair tracking-widest drop-shadow-[0_0_5px_#00ffff]">Đã Lưu Bí Tịch Video!</h3>
                        <p className="text-zinc-400 text-[11px] mb-6 italic">{videoSaveReward.alreadySaved ? 'Bài học này đã lưu từ trước, không nhận thêm Linh Thạch.' : 'Bài học mới đã nhập vào Tàng Kinh Các!'}</p>
                        <div className="bg-black border border-zinc-800 p-4 mb-2 relative mt-2 shadow-inner">
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                            <div className="flex justify-center items-center pt-3">
                                <div className="flex flex-col items-center"><span className="text-3xl mb-2">💎</span><span className="text-xl font-black text-white drop-shadow-[0_0_2px_#fff]">{videoSaveReward.stones > 0 ? `+${videoSaveReward.stones}` : 0}</span></div>
                            </div>
                        </div>
                        <MiniLeaderboard list={topSeasonList} currentUser={user} />
                        <button onClick={() => setVideoSaveReward(null)} className="w-full mt-6 bg-cyan-700 text-white py-4 font-black uppercase shadow-lg hover:scale-[1.02] transition-transform">TIẾP TỤC</button>
                    </div>
                </div>
    );
}
