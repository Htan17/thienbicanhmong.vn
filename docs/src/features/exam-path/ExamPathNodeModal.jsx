

export function ExamPathNodeModal({ exampath, quiz }) {
    const { examPathViewNode, setExamPathViewNode } = exampath;
    const { startExamPathNode } = quiz;
    return (
                    <div className="absolute inset-0 bg-black/90 z-[250] flex items-center justify-center p-4 animate-fadeIn" onClick={()=>setExamPathViewNode(null)}>
                        <div className="bg-zinc-900 border-2 border-emerald-600 p-6 w-full max-w-sm text-center" onClick={e=>e.stopPropagation()}>
                            <h3 className="text-lg font-black text-emerald-400 mb-1 uppercase">{examPathViewNode.title}</h3>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase mb-4">{examPathViewNode.type === 'boss' ? '👹 Ải Boss Tổng Kết' : examPathViewNode.type === 'review' ? '🔁 Ải Ôn Tập' : '📖 Ải Thường'} · {examPathViewNode.questions.length} câu</p>
                            {examPathViewNode.topics?.length > 0 && <div className="flex flex-wrap gap-1 justify-center mb-4">{examPathViewNode.topics.map(t => <span key={t} className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-1">{t}</span>)}</div>}
                            {examPathViewNode.bestScore != null && <p className="text-[10px] text-yellow-500 font-black mb-4">Điểm tốt nhất: {examPathViewNode.bestScore}%</p>}
                            <div className="flex gap-2">
                                <button onClick={()=>setExamPathViewNode(null)} className="flex-1 bg-zinc-800 text-zinc-400 py-3 text-[10px] font-black uppercase">Đóng</button>
                                <button onClick={()=>{ const n = examPathViewNode; setExamPathViewNode(null); startExamPathNode(n); }} className="flex-1 bg-emerald-600 text-black py-3 text-[10px] font-black uppercase">VÀO ẢI</button>
                            </div>
                        </div>
                    </div>
    );
}
