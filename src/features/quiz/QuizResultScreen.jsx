import { MiniLeaderboard } from '../../components/common.jsx';
import { SectionSummary } from '../../components/quiz-v2/QuizV2Panels.jsx';
import { V2_SCORING_CFG } from './scoringConfig.js';
import { isEssayType } from '../../quiz-v2/questionTypes.js';
import { summarizeScores } from '../../quiz-v2/quizScoringConfig.js';

export function QuizResultScreen({ core, leaderboard, exampath, nav, quiz }) {
    const { user } = core;
    const { topSeasonList } = leaderboard;
    const { examPathActiveNodeId, examPathLastRunCounted, setExamPathActiveNodeId } = exampath;
    const { changeAppState } = nav;
    const { activeQuiz, correctAnswers, fameGained, stonesGained, v2ScoresRef } = quiz;
    return (
                    <div className="w-full max-w-sm h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-900 border-2 border-yellow-500 p-8 text-center shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-fadeIn my-5 pb-10">
                        <h2 className="text-3xl font-black text-yellow-500 font-playfair italic mb-8 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">Kết Thúc Lịch Luyện</h2>
                        <div className="text-2xl font-bold mb-8 mt-4">
                            <span className="text-zinc-500 text-[11px] block mb-2 uppercase font-black tracking-widest">Thành Tích</span>
                            <span className={correctAnswers > 0 ? 'text-green-500 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500 drop-shadow-[0_0_5px_#ef4444]'}>{correctAnswers}</span>
                            <span className="text-zinc-600"> / {activeQuiz.filter(q => !isEssayType(q.type)).length || activeQuiz.length}</span>
                        </div>
                        {activeQuiz.some(q => q.sectionId || q.type === 'truefalse' || q.type === 'short' || q.type === 'essay') && <SectionSummary summary={summarizeScores(v2ScoresRef.current.filter(Boolean), V2_SCORING_CFG)} />}
                        <div className="bg-black border border-zinc-800 p-5 mb-8 relative mt-8 shadow-inner">
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-yellow-500 font-black uppercase tracking-widest">THU HOẠCH</div>
                            <div className="flex justify-around items-center pt-3">
                                <div className="flex flex-col items-center"><span className="text-xl mb-2">💎</span><span className={`text-lg font-black ${stonesGained >= 0 ? 'text-white drop-shadow-[0_0_2px_#fff]' : 'text-red-500'}`}>{stonesGained > 0 ? `+${stonesGained}` : stonesGained}</span></div>
                                <div className="h-10 w-px bg-zinc-800"></div>
                                <div className="flex flex-col items-center"><span className="text-xl mb-2">⭐</span><span className={`text-lg font-black ${fameGained >= 0 ? 'text-yellow-500 drop-shadow-[0_0_2px_#eab308]' : 'text-red-500'}`}>{fameGained > 0 ? `+${fameGained}` : fameGained}</span></div>
                                <div className="h-10 w-px bg-zinc-800"></div>
                                <div className="flex flex-col items-center"><span className="text-xl mb-2">🏆</span><span className={`text-lg font-black text-green-400 drop-shadow-[0_0_2px_#4ade80]`}>+{correctAnswers}</span></div>
                            </div>
                        </div>
                        <MiniLeaderboard list={topSeasonList} currentUser={user} />
                        {/* 🆕 SỬA HIỂU LẦM "HỌC RỒI MÀ BXH KHÔNG LÊN": báo NGAY tại đây lý do vì sao lượt luyện Đạo Lộ
                            vừa rồi không được cộng vào Đạo Hữu Bảng, thay vì để người dùng tự đoán là lỗi. */}
                        {examPathLastRunCounted === false && (
                            <p className="text-[9px] text-orange-400 italic mb-3 px-2 leading-relaxed">⏰ Lượt luyện này diễn ra ngoài khung giờ tính điểm Đạo Hữu Bảng (4h00-23h00) nên KHÔNG được cộng vào bảng xếp hạng hôm nay. Linh Thạch/Danh Vọng ở trên vẫn được giữ nguyên.</p>
                        )}
                        {examPathActiveNodeId ? (
                            <div className="flex gap-2 mt-6">
                                <button onClick={()=>{ setExamPathActiveNodeId(null); changeAppState('DASHBOARD'); }} className="flex-1 bg-zinc-800 text-zinc-400 py-4 font-black uppercase hover:text-white transition-colors text-[10px] tracking-widest">Tàng Kinh Các</button>
                                <button onClick={()=>{ setExamPathActiveNodeId(null); changeAppState('EXAM_PATH'); }} className="flex-1 bg-emerald-700 text-white py-4 font-black uppercase hover:bg-emerald-600 transition-colors text-[10px] tracking-widest">🗺️ Trở Về Đạo Đồ</button>
                            </div>
                        ) : (
                            <button onClick={()=>changeAppState('DASHBOARD')} className="w-full mt-6 bg-zinc-800 text-zinc-400 py-4 font-black uppercase hover:text-white transition-colors text-xs tracking-widest">Trở Về Tàng Kinh Các</button>
                        )}
                    </div>
    );
}
