import { ConfettiBurst, MiniLeaderboard } from '../../components/common.jsx';

export function VideoQuizModal({ core, leaderboard, audio, videoquiz }) {
    const { user } = core;
    const { topSeasonList } = leaderboard;
    const { playSfx } = audio;
    const { calcVideoQuizRoundReward, closeVideoQuizSummary, handleVideoAiExplain, handleVideoGiveUp, handleVideoRequestHint, nextVideoQuizQuestion, nextVideoQuizRound, selectVideoQuizAnswer, setVideoQuizActive, startVideoVocabReview, videoAiExplainLoading, videoAiExplainText, videoHintLoading, videoHintText, videoQuizEliminated, videoQuizFinished, videoQuizQIdx, videoQuizRoundIdx, videoQuizRoundResults, videoQuizRounds, videoQuizScore, videoQuizSelected, videoQuizShowResult } = videoquiz;
    return (
                    <div className="fixed inset-0 bg-black/90 z-[998] flex items-center justify-center p-4">
                        <div className="w-full max-w-sm h-[85vh] flex flex-col border border-indigo-500/50 p-6 shadow-[0_0_30px_rgba(79,70,229,0.2),inset_0_0_20px_rgba(79,70,229,0.3)] relative animate-fadeIn rounded-xl overflow-hidden" style={{ backgroundImage: 'url(https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            <div className="absolute inset-0 bg-black/85 z-0"></div>
                            <div className="relative z-10 flex flex-col h-full min-h-0">
                                {videoQuizFinished ? (
                                    (() => {
                                        const rs = videoQuizRoundResults;
                                        const sumCorrect = rs.reduce((a, r) => a + r.score, 0);
                                        const sumTotal = rs.reduce((a, r) => a + r.total, 0);
                                        const sumStones = rs.reduce((a, r) => a + r.stones, 0);
                                        const sumFame = rs.reduce((a, r) => a + r.fame, 0);
                                        const rate = sumTotal > 0 ? sumCorrect / sumTotal : 0;
                                        const pct = Math.round(rate * 100);
                                        const perfect = sumTotal > 0 && sumCorrect === sumTotal;
                                        const verdict = perfect ? { icon: '🏆', text: 'HOÀN HẢO! Ngài đã nhớ trọn vẹn từ vựng của video này.', cls: 'text-yellow-400' }
                                            : rate >= 0.8 ? { icon: '🎖️', text: 'Xuất sắc! Chỉ còn vài từ nữa là thuộc lòng.', cls: 'text-green-400' }
                                            : rate >= 0.6 ? { icon: '📜', text: 'Khá tốt! Ôn thêm một lượt nữa sẽ nhớ chắc hơn.', cls: 'text-cyan-400' }
                                            : { icon: '🌱', text: 'Cần ôn thêm — xem lại bảng Dịch Thuật rồi thử lại nhé!', cls: 'text-orange-400' };
                                        return (
                                            <div className="text-center flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 animate-fadeIn">
                                                {perfect && <ConfettiBurst />}
                                                <span className="text-5xl block mb-2">{verdict.icon}</span>
                                                <h3 className="text-xl font-black text-cyan-400 uppercase italic mb-1 font-playfair drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Hoàn Tất Ôn Tập</h3>
                                                <p className={`text-[11px] font-bold italic mb-4 ${verdict.cls}`}>{verdict.text}</p>
                                                <p className="text-4xl font-black mb-1"><span className={rate >= 0.6 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{sumCorrect}</span><span className="text-zinc-600"> / {sumTotal}</span></p>
                                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4">Chính xác {pct}% · {rs.length} Ải</p>
                                                <div className="bg-black border border-zinc-800 p-4 mb-4 relative mt-6 shadow-inner">
                                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest whitespace-nowrap">TỔNG THU HOẠCH</div>
                                                    <div className="flex justify-around items-center pt-3">
                                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className="text-lg font-black text-white drop-shadow-[0_0_2px_#fff]">{sumStones > 0 ? `+${sumStones}` : 0}</span></div>
                                                        <div className="h-10 w-px bg-zinc-800"></div>
                                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className="text-lg font-black text-yellow-500 drop-shadow-[0_0_2px_#eab308]">{sumFame > 0 ? `+${sumFame}` : 0}</span></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 mb-2 text-left">
                                                    {rs.map(r => (
                                                        <div key={r.round} className={`flex justify-between items-center px-3 py-2 border text-[11px] font-black ${r.score === r.total ? 'border-yellow-600/70 bg-yellow-900/10 text-yellow-300' : 'border-zinc-800 bg-black/50 text-zinc-300'}`}>
                                                            <span className="uppercase">Ải {r.round} {r.score === r.total && '🌟'}</span>
                                                            <span>{r.score}/{r.total}</span>
                                                            <span className="text-cyan-300">💎 {r.stones > 0 ? `+${r.stones}` : 0}{r.fame > 0 ? ` · ⭐ +${r.fame}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <MiniLeaderboard list={topSeasonList} currentUser={user} />
                                                <div className="flex gap-2 mt-6">
                                                    <button onClick={startVideoVocabReview} className="flex-1 border border-indigo-500 text-indigo-300 py-3 font-black text-[10px] uppercase hover:bg-indigo-900/30">🔁 Ôn Lại</button>
                                                    <button onClick={closeVideoQuizSummary} className="flex-1 bg-cyan-700 hover:bg-cyan-500 text-white py-3 font-black text-[10px] uppercase">Đóng</button>
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : !videoQuizShowResult ? (
                                    <>
                                        <div className="flex justify-between items-center mb-4 border-b border-indigo-500/30 pb-3 gap-2 flex-shrink-0">
                                            <span className="text-[11px] font-black text-indigo-300 uppercase truncate flex-1">Ải {videoQuizRoundIdx+1}/{videoQuizRounds.length} · Câu {videoQuizQIdx+1}/{videoQuizRounds[videoQuizRoundIdx].length}</span>
                                            <span className="text-[11px] font-black text-green-400 uppercase whitespace-nowrap">Đúng: {videoQuizScore}</span>
                                            <button onClick={async ()=>{ if(await askConfirm("Bỏ ải ôn tập?")){ playSfx('FAIL'); setVideoQuizActive(false); } }} className="text-red-400 text-lg hover:scale-110 ml-2 p-1">🚪</button>
                                        </div>
                                        <div key={`${videoQuizRoundIdx}-${videoQuizQIdx}`} className="slide-in-right w-full flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                            <p className="text-lg text-white font-bold mb-6 leading-loose min-h-[60px] text-center break-words [overflow-wrap:anywhere] drop-shadow-[0_0_2px_#000]">{videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].term}</p>
                                            <div className="space-y-4">
                                                {videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].options.map((opt, i) => {
                                                    // 🆕 Đáp án đã bị loại do chọn sai -> ẨN HẲN trong lúc đang làm, chỉ hiện lại khi đã có kết quả (đúng/bỏ cuộc)
                                                    if (videoQuizSelected === null && videoQuizEliminated.includes(i)) return null;
                                                    let cls = "bg-black/60 border border-indigo-500/40 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-900/40 shadow-[0_0_10px_rgba(79,70,229,0.1)]";
                                                    if (videoQuizSelected !== null) {
                                                        if (i === videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx].correctIndex) cls = "bg-green-900/60 border border-green-400 text-green-300 scale-[1.02] shadow-[0_0_15px_rgba(74,222,128,0.4)] font-black";
                                                        else if (i === videoQuizSelected || videoQuizEliminated.includes(i)) cls = "bg-red-900/60 border border-red-500 text-red-300 font-bold";
                                                        else cls = "bg-black/50 border border-zinc-800 text-zinc-500 opacity-40";
                                                    }
                                                    return (<button key={i} disabled={videoQuizSelected!==null} onClick={()=>selectVideoQuizAnswer(i)} className={`w-full text-left p-4 text-sm break-words [overflow-wrap:anywhere] ${cls}`}><span className="text-[11px] font-black mr-3 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + i)}.</span>{opt}</button>);
                                                })}
                                            </div>

                                            {/* 🆕 BẢNG GỢI Ý: hiện ngay khi chọn sai ít nhất 1 lần, thay cho đáp án vừa biến mất */}
                                            {videoQuizSelected === null && videoQuizEliminated.length > 0 && (
                                                <div className="bg-orange-950/40 border border-orange-500/50 p-3 space-y-2 animate-fadeIn mt-4">
                                                    <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">❌ Đã loại {videoQuizEliminated.length} đáp án sai — thử lại nhé!</p>
                                                    {videoHintText && <p className="text-[12px] text-orange-100 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-t border-orange-500/30 pt-2">{videoHintText}</p>}
                                                    <div className="flex gap-2">
                                                        <button onClick={handleVideoRequestHint} disabled={videoHintLoading} className="flex-1 bg-orange-900/50 border border-orange-500 text-orange-300 py-2 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{videoHintLoading ? '💡 Đang nghĩ...' : (videoHintText ? '💡 Gợi Ý Khác' : '💡 Xin Gợi Ý AI')}</button>
                                                        <button onClick={handleVideoGiveUp} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">🏳️ Xem Đáp Án</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 🆕 DỪNG LẠI SAU KHI TRẢ LỜI: xem AI phân tích (tuỳ chọn) rồi tự bấm để đi tiếp */}
                                            {videoQuizSelected !== null && (
                                                <div className="mt-5 pt-4 border-t border-indigo-500/20 space-y-3">
                                                    {videoAiExplainText && <div className="bg-black/70 border border-purple-500/40 p-3 text-[12px] text-purple-200 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-40 overflow-y-auto custom-scrollbar">{videoAiExplainText}</div>}
                                                    <div className="flex gap-2">
                                                        <button onClick={handleVideoAiExplain} disabled={videoAiExplainLoading} className="flex-1 bg-purple-900/50 border border-purple-500 text-purple-300 py-3 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{videoAiExplainLoading ? '🔮 Đang phân tích...' : (videoAiExplainText ? '🔮 Phân Tích Lại' : '🔮 AI Phân Tích')}</button>
                                                        <button onClick={nextVideoQuizQuestion} className="flex-1 bg-cyan-700 hover:bg-cyan-500 text-white py-3 text-[10px] font-black uppercase">
                                                            {videoQuizQIdx + 1 < videoQuizRounds[videoQuizRoundIdx].length ? 'Câu Tiếp ➡' : 'Xem Kết Quả Ải 🏆'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                        <h3 className="text-xl font-black text-cyan-400 uppercase italic mb-4 font-playfair drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Kết Thúc Ải {videoQuizRoundIdx+1}</h3>
                                        <p className="text-3xl font-black mb-6"><span className={videoQuizScore > 0 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{videoQuizScore}</span><span className="text-zinc-600"> / {videoQuizRounds[videoQuizRoundIdx].length}</span></p>
                                        {videoQuizScore === videoQuizRounds[videoQuizRoundIdx].length && <p className="text-yellow-400 text-[11px] font-black uppercase tracking-widest mb-2 animate-pulse">🌟 Ải Hoàn Hảo! 🌟</p>}
                                        {(() => {
                                            const rw = calcVideoQuizRoundReward(videoQuizScore, videoQuizRounds[videoQuizRoundIdx].length);
                                            return (
                                                <div className="bg-black border border-zinc-800 p-4 mb-6 relative mt-6 shadow-inner">
                                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                                                    <div className="flex justify-around items-center pt-3">
                                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className="text-lg font-black text-white drop-shadow-[0_0_2px_#fff]">{rw.stones > 0 ? `+${rw.stones}` : 0}</span></div>
                                                        <div className="h-10 w-px bg-zinc-800"></div>
                                                        <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className="text-lg font-black text-yellow-500 drop-shadow-[0_0_2px_#eab308]">{rw.fame > 0 ? `+${rw.fame}` : 0}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <button onClick={nextVideoQuizRound} className="w-full bg-cyan-700 hover:bg-cyan-500 text-white py-3 font-black text-[11px] uppercase">
                                            {videoQuizRoundIdx + 1 < videoQuizRounds.length ? 'Nhận Thưởng & Vào Ải Tiếp' : 'Nhận Thưởng & Xem Tổng Kết 🏁'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
    );
}
