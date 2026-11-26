

export function WordLookupModal({ videoplayer }) {
    const { setWordLookup, wordLookup, ytPlayerRef } = videoplayer;
    return ReactDOM.createPortal(
                    <div className="fixed inset-0 bg-black/80 z-[9997] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setWordLookup(null)}>
                        <div className="w-full sm:max-w-sm bg-zinc-950 border-t-2 sm:border-2 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.4)] p-4 space-y-3 animate-fadeIn" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b border-cyan-800 pb-2">
                                <div>
                                    <h3 className="text-lg font-black text-cyan-300">{wordLookup.word}</h3>
                                    {wordLookup.data?.pinyin && <p className="text-[11px] text-yellow-400 font-bold italic">{wordLookup.data.pinyin}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {wordLookup.data?.level && wordLookup.data.level !== 'Không rõ' && <span className="text-[9px] font-black uppercase bg-purple-900/60 border border-purple-500 text-purple-300 px-2 py-1">{wordLookup.data.level}</span>}
                                    <button onClick={() => setWordLookup(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
                                </div>
                            </div>
                            {wordLookup.loading && <p className="text-xs text-zinc-400 italic py-4 text-center">Đang tra cứu Tiên Điển...</p>}
                            {wordLookup.error && <p className="text-xs text-red-400 py-2">Lỗi tra từ: {wordLookup.error}</p>}
                            {wordLookup.data && (
                                <div className="space-y-2 text-xs">
                                    <p><span className="text-yellow-500 font-black uppercase">Nghĩa: </span><span className="text-white">{wordLookup.data.meaning}</span></p>
                                    <p><span className="text-purple-400 font-black uppercase">Từ loại/Ngữ pháp: </span><span className="text-white">{wordLookup.data.partOfSpeech}</span></p>
                                    <p><span className="text-cyan-400 font-black uppercase">Hoàn cảnh sử dụng: </span><span className="text-white">{wordLookup.data.usage}</span></p>
                                    <p><span className="text-green-400 font-black uppercase">Ví dụ: </span><span className="text-white">{wordLookup.data.example}</span></p>
                                </div>
                            )}
                            <button onClick={() => { setWordLookup(null); if (ytPlayerRef.current?.playVideo) ytPlayerRef.current.playVideo(); }} className="w-full bg-cyan-700 hover:bg-cyan-500 text-white py-2 text-[10px] font-black uppercase">Đóng &amp; Tiếp Tục Xem</button>
                        </div>
                    </div>,
                    document.body
                );
}
