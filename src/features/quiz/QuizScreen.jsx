import { EssayPanel, ShortAnswerPanel } from '../../components/quiz-v2/QuizV2Panels.jsx';
import { SECTION_BY_ID, isTrueFalseType } from '../../quiz-v2/questionTypes.js';
import { V2_SCORING_CFG } from './scoringConfig.js';
import { gradeShortAnswer } from '../../quiz-v2/shortAnswer.js';
import { maxScoreOf } from '../../quiz-v2/quizScoringConfig.js';

export function QuizScreen({ audio, exampath, nav, quiz }) {
    const { playSfx } = audio;
    const { setExamPathActiveNodeId } = exampath;
    const { changeAppState } = nav;
    const { activeQuiz, aiExplainLoading, aiExplainText, continueAfterAnswer, correctAnswers, curIdx, eliminatedOptions, essayFeedback, handleAiExplainQuestion, handleAnswerSelect, handleGiveUpQuestion, handleRequestAiHint, handleRequestEssayFeedback, handleSubmitEssay, handleSubmitMultiAnswer, handleSubmitNumericAnswer, handleSubmitShortAnswer, hintLoading, hintText, numericAnswer, quizTimerRef, selectedOption, selectedOptions, setActiveQuiz, setLightboxImg, setMultiRowAnswer, setNumericAnswer, showExplanation } = quiz;
    return (
                    <div className="w-full max-w-md h-[85vh] flex flex-col border border-indigo-500/50 p-6 shadow-[0_0_30px_rgba(79,70,229,0.2),inset_0_0_20px_rgba(79,70,229,0.3)] relative animate-fadeIn rounded-xl overflow-hidden" style={{ backgroundImage: 'url(https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <div className="absolute inset-0 bg-black/85 z-0"></div>
                        <div className="relative z-10 flex flex-col h-full min-h-0">
                            <div className="flex justify-between items-center mb-4 border-b border-indigo-500/30 pb-3 gap-2 flex-shrink-0">
                                <span className="text-[11px] font-black text-indigo-300 uppercase truncate flex-1">Ải {curIdx + 1} / {activeQuiz.length}</span>
                                <span className="text-[11px] font-black text-green-400 uppercase whitespace-nowrap">Đúng: {correctAnswers}</span>
                                <button onClick={async ()=>{ if(await askConfirm("Bỏ ải?")){ clearTimeout(quizTimerRef.current); playSfx('FAIL'); setActiveQuiz([]); setExamPathActiveNodeId(null); changeAppState('DASHBOARD'); } }} className="text-red-400 text-lg hover:scale-110 ml-2 p-1">🚪</button>
                            </div>
                            <div key={curIdx} className="slide-in-right w-full flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                                {activeQuiz[curIdx].sectionId && SECTION_BY_ID[activeQuiz[curIdx].sectionId] && <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2" data-testid="quiz-section-title">{SECTION_BY_ID[activeQuiz[curIdx].sectionId].title}</p>}
                                <h3 className="math-text text-[15px] text-white font-bold mb-4 leading-loose min-h-[80px] drop-shadow-[0_0_2px_#000] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{activeQuiz[curIdx].q}</h3>

                                {/* 🆕 ẢNH MINH HOẠ CÂU HỎI (sơ đồ, đồ thị...) kèm nút xem ảnh rõ (phóng to) */}
                                {activeQuiz[curIdx].img && (
                                    <div className="mb-6">
                                        <img src={activeQuiz[curIdx].img} onClick={() => setLightboxImg(activeQuiz[curIdx].img)} className="w-full max-h-56 object-contain bg-black/50 border border-indigo-500/30 cursor-zoom-in" alt="Hình minh hoạ câu hỏi" />
                                        <button onClick={() => setLightboxImg(activeQuiz[curIdx].img)} className="mt-2 w-full text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/40 py-2 bg-black/40 hover:bg-indigo-900/40">🔍 Xem Ảnh Rõ</button>
                                    </div>
                                )}

                                {/* CÂU 1 ĐÁP ÁN: bấm sai -> đáp án đó biến mất + hiện bảng gợi ý, được thử lại */}
                                {(!activeQuiz[curIdx].type || activeQuiz[curIdx].type === 'single') && (
                                    <div className="space-y-4">
                                        {activeQuiz[curIdx].o.map((optText, optIndex) => {
                                            // 🆕 Đáp án đã bị loại do chọn sai -> ẨN HẲN khỏi danh sách trong lúc đang làm bài (chỉ hiện lại khi đã xem đáp án cuối)
                                            if (!showExplanation && eliminatedOptions.includes(optIndex)) return null;
                                            let btnClasses = "bg-black/60 border border-indigo-500/40 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-900/40 shadow-[0_0_10px_rgba(79,70,229,0.1)]";
                                            if (showExplanation) {
                                                if (optIndex === activeQuiz[curIdx].c) { btnClasses = "bg-green-900/60 border border-green-400 text-green-300 scale-[1.02] shadow-[0_0_15px_rgba(74,222,128,0.4)] font-black"; } 
                                                else if (optIndex === selectedOption || eliminatedOptions.includes(optIndex)) { btnClasses = "bg-red-900/60 border border-red-500 text-red-300 font-bold"; } 
                                                else { btnClasses = "bg-black/50 border border-zinc-800 text-zinc-500 opacity-40"; }
                                            }
                                            return (<button key={optIndex} disabled={showExplanation} onClick={() => handleAnswerSelect(optIndex)} className={`math-text w-full text-left p-4 text-sm break-words [overflow-wrap:anywhere] ${btnClasses}`}><span className="text-[11px] font-black mr-3 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + optIndex)}.</span>{optText}</button>);
                                        })}

                                        {/* 🆕 BẢNG GỢI Ý: hiện ra ngay khi đoán sai ít nhất 1 lần, thay cho đáp án vừa biến mất */}
                                        {!showExplanation && eliminatedOptions.length > 0 && (
                                            <div className="bg-orange-950/40 border border-orange-500/50 p-3 space-y-2 animate-fadeIn">
                                                <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">❌ Đã loại {eliminatedOptions.length} đáp án sai — thử lại các lựa chọn còn lại nhé!</p>
                                                {hintText && <p className="math-text text-[12px] text-orange-100 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-t border-orange-500/30 pt-2">{hintText}</p>}
                                                <div className="flex gap-2">
                                                    <button onClick={handleRequestAiHint} disabled={hintLoading} className="flex-1 bg-orange-900/50 border border-orange-500 text-orange-300 py-2 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{hintLoading ? '💡 Đang nghĩ...' : (hintText ? '💡 Gợi Ý Khác' : '💡 Xin Gợi Ý AI')}</button>
                                                    <button onClick={handleGiveUpQuestion} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">🏳️ Xem Đáp Án</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 🆕 CÂU ĐÚNG/SAI NHIỀU Ý: bấm Đ hoặc S cho từng ý, xong bấm Xem Kết Quả mới chấm điểm */}
                                {isTrueFalseType(activeQuiz[curIdx].type) && (
                                    <div className="space-y-3">
                                        {activeQuiz[curIdx].o.map((optText, optIndex) => {
                                            const correctSet = Array.isArray(activeQuiz[curIdx].c) ? activeQuiz[curIdx].c : [];
                                            const rowAns = selectedOptions[optIndex]; // true | false | undefined
                                            const correctVal = correctSet.includes(optIndex);
                                            let rowBox = "bg-black/60 border border-indigo-500/40";
                                            if (showExplanation) { rowBox = (rowAns === correctVal) ? "bg-green-900/30 border border-green-500" : "bg-red-900/30 border border-red-500"; }
                                            return (
                                                <div key={optIndex} className={`p-3 ${rowBox}`}>
                                                    <p className="math-text text-indigo-100 text-sm mb-2 leading-relaxed break-words [overflow-wrap:anywhere]"><span className="text-[11px] font-black mr-2 opacity-70 uppercase text-indigo-300">{String.fromCharCode(65 + optIndex)}.</span>{optText}</p>
                                                    <div className="flex gap-2">
                                                        <button disabled={showExplanation} onClick={() => setMultiRowAnswer(optIndex, true)} className={`flex-1 py-2 text-[11px] font-black uppercase border transition-colors ${rowAns === true ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-green-500'}`}>Đ (Đúng)</button>
                                                        <button disabled={showExplanation} onClick={() => setMultiRowAnswer(optIndex, false)} className={`flex-1 py-2 text-[11px] font-black uppercase border transition-colors ${rowAns === false ? 'bg-red-600 border-red-400 text-white' : 'border-zinc-700 text-zinc-400 hover:border-red-500'}`}>S (Sai)</button>
                                                    </div>
                                                    {showExplanation && <p className="text-[9px] text-zinc-400 mt-1.5 uppercase font-black tracking-widest">Đáp án đúng: <span className={correctVal ? 'text-green-400' : 'text-red-400'}>{correctVal ? 'ĐÚNG' : 'SAI'}</span></p>}
                                                </div>
                                            );
                                        })}
                                        {!showExplanation && <button onClick={handleSubmitMultiAnswer} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest mt-1">Xem Kết Quả</button>}
                                    </div>
                                )}

                                {/* 🆕 CÂU ĐIỀN SỐ (tính toán): gõ số rồi bấm Xác Nhận mới chấm điểm */}
                                {activeQuiz[curIdx].type === 'numeric' && (() => {
                                    const userNum = parseFloat(String(numericAnswer).replace(',', '.'));
                                    const correctNum = parseFloat(String(activeQuiz[curIdx].c).replace(',', '.'));
                                    const wasCorrect = !isNaN(userNum) && !isNaN(correctNum) ? Math.abs(userNum - correctNum) < 0.01 : String(numericAnswer).trim().toLowerCase() === String(activeQuiz[curIdx].c).trim().toLowerCase();
                                    return (
                                        <div className="space-y-3">
                                            <input
                                                type="text" inputMode="decimal" disabled={showExplanation}
                                                value={numericAnswer} onChange={e => setNumericAnswer(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSubmitNumericAnswer(); }}
                                                placeholder="Nhập đáp án số..."
                                                className={`math-text w-full text-center p-4 text-lg font-black bg-black/60 border outline-none tracking-wide ${showExplanation ? (wasCorrect ? 'border-green-400 text-green-300' : 'border-red-500 text-red-300') : 'border-indigo-500/40 text-white focus:border-indigo-400'}`}
                                            />
                                            {!showExplanation && <button onClick={handleSubmitNumericAnswer} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest">Xác Nhận Đáp Án</button>}
                                            {showExplanation && !wasCorrect && <p className="math-text text-center text-[12px] text-green-400 font-black">Đáp án đúng: {activeQuiz[curIdx].c}</p>}
                                        </div>
                                    );
                                })()}

                                {/* 🆕 QUIZ ENGINE V2: TRẢ LỜI NGẮN + TỰ LUẬN */}
                                {activeQuiz[curIdx].type === 'short' && <ShortAnswerPanel q={activeQuiz[curIdx]} value={numericAnswer} onChange={setNumericAnswer} onSubmit={handleSubmitShortAnswer} showExplanation={showExplanation} wasCorrect={showExplanation && gradeShortAnswer(activeQuiz[curIdx], numericAnswer).correct} />}
                                {activeQuiz[curIdx].type === 'essay' && <EssayPanel q={activeQuiz[curIdx]} value={numericAnswer} onChange={setNumericAnswer} onSubmit={handleSubmitEssay} showExplanation={showExplanation} maxScore={maxScoreOf(activeQuiz[curIdx], V2_SCORING_CFG)} feedback={essayFeedback} onRequestFeedback={handleRequestEssayFeedback} />}

                                {/* 🆕 DỪNG SAU MỖI CÂU: xem giải thích AI (tuỳ chọn) rồi tự bấm để sang câu tiếp theo / xem kết quả */}
                                {showExplanation && (
                                    <div className="mt-5 pt-4 border-t border-indigo-500/20 space-y-3">
                                        {aiExplainText && <div className="math-text bg-black/70 border border-purple-500/40 p-3 text-[12px] text-purple-200 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-40 overflow-y-auto custom-scrollbar">{aiExplainText}</div>}
                                        <div className="flex gap-2">
                                            <button onClick={handleAiExplainQuestion} disabled={aiExplainLoading} className="flex-1 bg-purple-900/50 border border-purple-500 text-purple-300 py-3 text-[10px] font-black uppercase disabled:opacity-50 disabled:cursor-wait">{aiExplainLoading ? '🔮 Đang phân tích...' : (aiExplainText ? '🔮 Phân Tích Lại' : '🔮 AI Phân Tích')}</button>
                                            <button onClick={continueAfterAnswer} className="flex-1 bg-yellow-500 hover:bg-white text-black py-3 text-[10px] font-black uppercase transition-colors">{curIdx === activeQuiz.length - 1 ? 'Xem Kết Quả 🏆' : 'Câu Tiếp Theo ➡'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
    );
}
