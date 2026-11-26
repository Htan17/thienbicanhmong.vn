import { CharacterWritePractice } from '../../components/CharacterWritePractice.jsx';

export function WriteCharModal({ audio, gemini, videoplayer }) {
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    const { getVideoHanziList, setWriteCharModal, setWriteMeaningCache, setWritePracticeChar, writeMeaningCache, writePracticeChar } = videoplayer;
    return ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-black/85 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setWriteCharModal(false)}>
                        <div className="w-full sm:max-w-sm bg-zinc-950 border-t-2 sm:border-2 border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.35)] p-4 space-y-3 animate-fadeIn max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b border-pink-800 pb-2">
                                <h3 className="text-base font-black text-pink-300 uppercase tracking-wide">✍️ Luyện Viết Chữ</h3>
                                <button onClick={() => setWriteCharModal(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
                            </div>

                            {!writePracticeChar ? (
                                <>
                                    <p className="text-[10px] text-zinc-400 italic">Chọn 1 chữ trong Từ Vựng của video này để luyện viết theo đúng thứ tự nét:</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {getVideoHanziList().map((ch, i) => (
                                            <button key={i} onClick={() => { playSfx('CLICK'); setWritePracticeChar(ch); }} className="aspect-square bg-black border border-pink-700/60 hover:border-pink-400 hover:bg-pink-900/30 text-white text-xl font-bold flex items-center justify-center transition-colors">{ch}</button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <button onClick={() => setWritePracticeChar(null)} className="text-[10px] text-pink-400 font-black uppercase">‹ Chọn Chữ Khác</button>
                                        <span className="text-[9px] text-zinc-500 font-bold">{getVideoHanziList().indexOf(writePracticeChar) + 1} / {getVideoHanziList().length}</span>
                                    </div>
                                    <CharacterWritePractice
                                        char={writePracticeChar}
                                        playSfx={playSfx}
                                        apiKey={anyGeminiKey}
                                        meaningCache={writeMeaningCache}
                                        onMeaningFetched={(ch, data) => setWriteMeaningCache(prev => ({ ...prev, [ch]: data }))}
                                        onAutoAdvance={() => { const list = getVideoHanziList(); const idx = list.indexOf(writePracticeChar); setWritePracticeChar(list[(idx + 1) % list.length]); }}
                                    />
                                    {/* ✍️ NÚT CHUYỂN CHỮ THỦ CÔNG: viết xong sẽ TỰ ĐỘNG sang chữ tiếp theo, nhưng vẫn giữ nút
                                        này để Ngài chủ động bỏ qua/sang chữ khác bất cứ lúc nào không cần đợi. */}
                                    <button onClick={() => { playSfx('CLICK'); const list = getVideoHanziList(); const idx = list.indexOf(writePracticeChar); setWritePracticeChar(list[(idx + 1) % list.length]); }} className="w-full mt-2 bg-gradient-to-r from-pink-700 to-yellow-600 hover:scale-[1.02] transition-transform text-white py-2.5 text-[10px] font-black uppercase">Chữ Tiếp Theo ⏭</button>
                                </>
                            )}
                        </div>
                    </div>,
                    document.body
                );
}
