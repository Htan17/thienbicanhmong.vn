

export function QuizEditScreen({ library, quiz, editor }) {
    const { bindMathFocus, setShowMathKeyboard } = library;
    const { setLightboxImg } = quiz;
    const { appendTextToEditAction, cancelEditQuestion, deleteEditQuestionAt, editAppendText, editDraftQuestions, editDraftTitle, editQDraft, editQImgUploading, editQuizSaving, exitLibraryEditor, handleEditQImageUpload, saveEditQuestionDraft, saveLibraryEditAction, setEditAppendText, setEditDraftTitle, setEditQDraft, startEditQuestion, switchEditQType } = editor;
    return (
                    <div className="w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-cyan-700/50 pb-2 mb-3">
                            <h2 className="text-lg font-black text-cyan-400 uppercase italic truncate flex-1">✏️ Chỉnh Sửa Ải</h2>
                            <button onClick={exitLibraryEditor} className="text-zinc-500 hover:text-white text-xl px-2">✕</button>
                        </div>

                        {/* ====== FORM SỬA 1 CÂU HỎI (hiện khi đang sửa/thêm câu) ====== */}
                        {editQDraft ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 pb-4">
                                <button onClick={cancelEditQuestion} className="text-[10px] text-zinc-500 hover:text-white font-black uppercase mb-1">← Quay Lại Danh Sách</button>
                                <textarea className="math-text w-full h-24 bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 custom-scrollbar" placeholder="Nội dung câu hỏi..." value={editQDraft.q} onChange={e=>setEditQDraft(prev=>({...prev, q: e.target.value}))} onFocus={bindMathFocus(()=>editQDraft.q, v=>setEditQDraft(prev=>({...prev, q: v})))} />
                                <button onClick={()=>setShowMathKeyboard(true)} className="w-full border border-cyan-600 text-cyan-400 py-1.5 text-[9px] font-black uppercase">🔣 Bàn Phím Ký Hiệu Toán/Lý</button>

                                <div className="flex gap-2">
                                    {[['single','1 Đáp Án'],['truefalse','Đúng/Sai'],['short','Trả Lời Ngắn'],['essay','Tự Luận']].map(([tv,tl]) => (
                                        <button key={tv} onClick={()=>switchEditQType(tv)} className={`flex-1 py-2 text-[9px] font-black uppercase border ${((editQDraft.type==='multi'?'truefalse':editQDraft.type==='numeric'?'short':editQDraft.type)===tv) ? 'bg-cyan-600 border-cyan-400 text-black' : 'border-zinc-700 text-zinc-400'}`}>{tl}</button>
                                    ))}
                                </div>

                                {/* --- Ảnh minh hoạ --- */}
                                <div className="bg-black/40 border border-zinc-800 p-3 space-y-2">
                                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Ảnh minh hoạ (sơ đồ, đồ thị...)</p>
                                    {editQDraft.img && (
                                        <div className="relative inline-block">
                                            <img src={editQDraft.img} className="max-h-32 border border-zinc-700 cursor-zoom-in" onClick={()=>setLightboxImg(editQDraft.img)} alt="preview" />
                                            <button onClick={()=>setEditQDraft(prev=>({...prev, img:''}))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-700 text-white text-xs font-black rounded-full">✕</button>
                                        </div>
                                    )}
                                    <label className={`block text-center py-2 text-[10px] font-black uppercase border cursor-pointer ${editQImgUploading ? 'border-zinc-700 text-zinc-600 cursor-wait' : 'border-cyan-600 text-cyan-400'}`}>{editQImgUploading ? 'Đang tải ảnh...' : (editQDraft.img ? '📷 Đổi Ảnh Khác' : '📷 Tải Ảnh Lên')}<input type="file" accept="image/*" className="hidden" disabled={editQImgUploading} onChange={handleEditQImageUpload} /></label>
                                </div>

                                {/* --- 1 Đáp Án --- */}
                                {editQDraft.type === 'single' && (
                                    <div className="space-y-2">
                                        {editQDraft.o.map((optText, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <button onClick={()=>setEditQDraft(prev=>({...prev, c:i}))} className={`w-8 h-8 flex-shrink-0 border text-[10px] font-black ${editQDraft.c===i ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>{String.fromCharCode(65+i)}</button>
                                                <input className="math-text flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={`Lựa chọn ${String.fromCharCode(65+i)}...`} value={optText} onChange={e=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=e.target.value; return {...prev,o};})} onFocus={bindMathFocus(()=>editQDraft.o[i], v=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=v; return {...prev,o};}))} />
                                            </div>
                                        ))}
                                        <p className="text-[9px] text-zinc-600 italic">Bấm vào chữ cái để đánh dấu đáp án đúng.</p>
                                    </div>
                                )}

                                {/* --- Đúng/Sai Nhiều Ý --- */}
                                {(editQDraft.type === 'multi' || editQDraft.type === 'truefalse') && (
                                    <div className="space-y-2">
                                        {editQDraft.o.map((optText, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <button onClick={()=>setEditQDraft(prev=>{const c=Array.isArray(prev.c)?[...prev.c]:[]; const idx=c.indexOf(i); if(idx>-1) c.splice(idx,1); else c.push(i); return {...prev,c};})} className={`w-8 h-8 flex-shrink-0 border text-[9px] font-black uppercase ${Array.isArray(editQDraft.c)&&editQDraft.c.includes(i) ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>{Array.isArray(editQDraft.c)&&editQDraft.c.includes(i) ? 'Đ' : 'S'}</button>
                                                <input className="math-text flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={`Ý ${String.fromCharCode(65+i)}...`} value={optText} onChange={e=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=e.target.value; return {...prev,o};})} onFocus={bindMathFocus(()=>editQDraft.o[i], v=>setEditQDraft(prev=>{const o=[...prev.o]; o[i]=v; return {...prev,o};}))} />
                                                {editQDraft.o.length > 2 && <button onClick={()=>setEditQDraft(prev=>{const o=prev.o.filter((_,idx)=>idx!==i); const c=(Array.isArray(prev.c)?prev.c:[]).map(x=>x>i?x-1:x).filter(x=>x!==i); return {...prev,o,c};})} className="text-red-700 text-lg px-1">✕</button>}
                                            </div>
                                        ))}
                                        {editQDraft.o.length < 6 && <button onClick={()=>setEditQDraft(prev=>({...prev, o:[...prev.o,'']}))} className="text-[9px] text-cyan-500 font-black uppercase">+ Thêm Ý</button>}
                                        <p className="text-[9px] text-zinc-600 italic">Bấm nút chữ cái để chuyển đổi Đ (Đúng) / S (Sai) cho từng ý.</p>
                                    </div>
                                )}

                                {/* --- Điền Số --- */}
                                {editQDraft.type === 'numeric' && (
                                    <input className="math-text w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 text-center" placeholder="Đáp án số đúng (VD: 12.5)..." value={editQDraft.c} onChange={e=>setEditQDraft(prev=>({...prev, c: e.target.value}))} onFocus={bindMathFocus(()=>editQDraft.c, v=>setEditQDraft(prev=>({...prev, c: v})))} />
                                )}

                                {/* --- 🆕 V2: Trả Lời Ngắn --- */}
                                {editQDraft.type === 'short' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-1">{[['number','Đáp án SỐ'],['text','Đáp án CHỮ']].map(([av,al]) => <button key={av} onClick={()=>setEditQDraft(prev=>({...prev, answerType: av}))} className={`flex-1 py-1.5 text-[9px] font-black uppercase border ${(editQDraft.answerType||'number')===av ? 'bg-sky-600 border-sky-400 text-black' : 'border-zinc-700 text-zinc-400'}`}>{al}</button>)}</div>
                                        {(editQDraft.answerType||'number') === 'number' ? (<>
                                            <input className="math-text w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 text-center" placeholder="Đáp án số đúng (VD: 12.5, -2.75)..." value={editQDraft.c == null ? '' : editQDraft.c} onChange={e=>setEditQDraft(prev=>({...prev, c: e.target.value}))} />
                                            <input className="w-full bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500 text-center" placeholder="Sai số cho phép (tùy chọn, mặc định 0.01)" value={editQDraft.tolerance == null ? '' : editQDraft.tolerance} onChange={e=>setEditQDraft(prev=>({...prev, tolerance: e.target.value}))} />
                                        </>) : (<>
                                            <textarea className="math-text w-full h-20 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={"Các đáp án được chấp nhận (mỗi dòng một đáp án, dòng đầu là đáp án chính)"} value={editQDraft.acceptedText != null ? editQDraft.acceptedText : [editQDraft.c, ...(editQDraft.acceptedAnswers || [])].filter(Boolean).join('\n')} onChange={e=>setEditQDraft(prev=>({...prev, acceptedText: e.target.value}))} />
                                            <p className="text-[9px] text-zinc-600 italic">So khớp chính xác (chuẩn hóa khoảng trắng, không phân biệt hoa/thường, KHÔNG bỏ dấu).</p>
                                        </>)}
                                    </div>
                                )}
                                {/* --- 🆕 V2: Tự Luận --- */}
                                {editQDraft.type === 'essay' && (
                                    <div className="space-y-2">
                                        <textarea className="math-text w-full h-24 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder={"Rubric (tùy chọn): mỗi dòng một tiêu chí, có thể ghi điểm, VD: Nêu đúng khái niệm (2 điểm)"} value={typeof editQDraft.rubric === 'string' ? editQDraft.rubric : (Array.isArray(editQDraft.rubric) ? editQDraft.rubric.map(r => (r && r.points != null ? `${r.text} (${r.points} điểm)` : (r && r.text) || r)).join('\n') : '')} onChange={e=>setEditQDraft(prev=>({...prev, rubric: e.target.value}))} />
                                        <input className="w-full bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500 text-center" placeholder="Điểm tối đa (để trống = mặc định)" value={editQDraft.maxScore == null ? '' : editQDraft.maxScore} onChange={e=>setEditQDraft(prev=>({...prev, maxScore: e.target.value}))} />
                                        <textarea className="math-text w-full h-20 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Đáp án / bài mẫu (tùy chọn)" value={editQDraft.sampleAnswer || ''} onChange={e=>setEditQDraft(prev=>({...prev, sampleAnswer: e.target.value}))} />
                                        <p className="text-[9px] text-zinc-600 italic">AI chỉ gợi ý điểm theo rubric, không phải điểm chính thức.</p>
                                    </div>
                                )}

                                <button onClick={saveEditQuestionDraft} className="w-full bg-cyan-600 hover:bg-cyan-400 text-black py-3 font-black text-[11px] uppercase mt-2">Lưu Câu Hỏi Này</button>
                            </div>
                        ) : (
                            <>
                                <input className="w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-cyan-500 mb-3" placeholder="Tên Bí Tịch..." value={editDraftTitle} onChange={e=>setEditDraftTitle(e.target.value)} />
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 pb-3">
                                    {editDraftQuestions.map((q, i) => (
                                        <div key={i} className="bg-black/70 border border-zinc-800 p-3 flex items-center gap-2">
                                            <span className="text-[10px] text-zinc-600 font-black flex-shrink-0">#{i+1}</span>
                                            {q.img && <img src={q.img} className="w-8 h-8 object-cover flex-shrink-0 border border-zinc-700" alt="" />}
                                            <p className="math-text flex-1 text-[11px] text-zinc-300 truncate">{q.q}</p>
                                            <span className="text-[8px] px-1.5 py-0.5 border border-zinc-700 text-zinc-500 uppercase font-black flex-shrink-0">{(q.type === 'multi' || q.type === 'truefalse') ? 'Đ/S' : q.type === 'numeric' ? 'Số' : q.type === 'short' ? 'Ngắn' : q.type === 'essay' ? 'Luận' : '1ĐA'}</span>
                                            <button onClick={()=>startEditQuestion(i)} className="text-cyan-500 text-sm flex-shrink-0">✏️</button>
                                            <button onClick={()=>deleteEditQuestionAt(i)} className="text-red-700 text-sm flex-shrink-0">🗑️</button>
                                        </div>
                                    ))}
                                    {editDraftQuestions.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-6 italic">Chưa có câu hỏi nào...</p>}

                                    <button onClick={()=>startEditQuestion('new')} className="w-full border border-dashed border-cyan-500/50 text-cyan-400 py-3 text-[11px] font-black tracking-widest mt-2">+ Thêm Câu Hỏi Mới</button>

                                    <div className="bg-zinc-900/60 border border-zinc-800 p-3 space-y-2 mt-2">
                                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Hoặc dán thêm nhiều câu cùng lúc (định dạng: Câu.../A.../Đáp án:)</p>
                                        <textarea className="w-full h-20 bg-black border border-zinc-700 p-2 text-[11px] text-zinc-300 outline-none focus:border-cyan-500 custom-scrollbar" placeholder={"Câu 5: Câu hỏi mới...?\nA. ...\nĐáp án: A"} value={editAppendText} onChange={e=>setEditAppendText(e.target.value)} onFocus={bindMathFocus(()=>editAppendText, setEditAppendText)} />
                                        <button onClick={appendTextToEditAction} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 text-[10px] font-black uppercase">Thêm Vào Danh Sách</button>
                                    </div>
                                </div>
                                <button onClick={saveLibraryEditAction} disabled={editQuizSaving} className="w-full bg-yellow-500 hover:bg-white disabled:opacity-50 disabled:cursor-wait text-black py-3 font-black text-[11px] uppercase mt-2">{editQuizSaving ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}</button>
                            </>
                        )}
                    </div>
    );
}
