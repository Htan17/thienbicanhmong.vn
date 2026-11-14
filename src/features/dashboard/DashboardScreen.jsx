import { safeUserUpdate } from '../../lib/userData.js';

export function DashboardScreen({ core, audio, library, nav, quiz, editor, shop }) {
    const { setReportTarget, user } = core;
    const { playSfx } = audio;
    const { bindMathFocus, createQuizAction, handleFileUpload, handleQuizImageUpload, importCode, importQuizCodeAction, isAddingQuiz, quizImageAnalyzing, quizTextAnalyzing, quizTitle, rawQuizText, redeemMsg, redeemingCode, setImportCode, setIsAddingQuiz, setQuizTitle, setRawQuizText, setShowMathKeyboard, shareLibraryItemAction } = library;
    const { changeAppState } = nav;
    const { handleEnterQuiz } = quiz;
    const { openLibraryEditor } = editor;
    const { gachaResultText, handleGachaRoll } = shop;
    return (
                    <div className="w-full max-w-lg h-[80vh] flex flex-col p-3 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-yellow-700/50 pb-2 mb-3">
                            <h2 className="text-xl font-black text-yellow-500 uppercase italic">Tàng Kinh Các</h2>
                            <button onClick={()=>changeAppState('LEADERBOARD')} className="bg-yellow-500 text-black px-4 py-2 font-black text-[10px] shadow-[0_0_10px_rgba(234,179,8,0.4)] hover:bg-white transition-colors">THIÊN BẢNG</button>
                        </div>
                        <button onClick={handleGachaRoll} className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-400 p-4 text-white font-black text-xs uppercase mb-1 shadow-[0_0_15px_rgba(129,140,248,0.4)] hover:scale-[1.02] transition-transform">TẠO HÓA KHÍ VẬN (-200 💎)</button>
                        {gachaResultText && <div className="text-center text-[10px] text-yellow-300 font-bold mb-3 animate-fadeIn">{gachaResultText}</div>}
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-20 mt-2">
                            <div className="flex gap-2 bg-black p-2 border border-zinc-800">
                                <input disabled={redeemingCode} className="flex-1 bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-yellow-500 disabled:opacity-50" placeholder="Mã Bí Tịch / Code quà..." value={importCode} onChange={e=>setImportCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') importQuizCodeAction();}} />
                                <button onClick={importQuizCodeAction} disabled={redeemingCode} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-wait text-black px-5 font-black text-[10px]">{redeemingCode ? '...' : 'THU'}</button>
                            </div>
                            {redeemMsg && (<div className={`p-3 text-[11px] font-bold border break-words ${redeemMsg.ok ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300' : 'bg-red-900/30 border-red-500 text-red-300'}`} style={{overflowWrap:'anywhere'}}>{redeemMsg.ok ? '✅ ' : '⚠️ '}{redeemMsg.text}</div>)}
                                <button onClick={() => { playSfx('CLICK'); changeAppState('SUPHU'); }} className="w-full bg-gradient-to-r from-yellow-900/50 to-indigo-900/50 border border-yellow-500 text-yellow-300 py-3 text-[11px] font-black tracking-widest">AI SƯ PHỤ · ĐẠI ĐẠO ÔN TẬP</button>
                                <button onClick={() => { playSfx('CLICK'); changeAppState('VIDEO_LEARN'); }} className="w-full bg-cyan-900/40 border border-cyan-500 text-cyan-300 py-3 text-[11px] font-black tracking-widest hover:bg-cyan-800 transition-colors">📹 HỌC QUA VIDEO TIÊN ÂM</button>
                                <button onClick={() => { playSfx('CLICK'); changeAppState('EXAM_PATH'); }} className="w-full bg-emerald-900/40 border border-emerald-500 text-emerald-300 py-3 text-[11px] font-black tracking-widest hover:bg-emerald-800 transition-colors relative">🗺️ TU LUYỆN CHI LỘ {user.examPath?.active && !user.examPath?.completedAt && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_5px_red]">ĐANG LUYỆN</span>}</button>
                            <button onClick={()=>{ playSfx('CLICK'); setIsAddingQuiz(!isAddingQuiz); }} className="w-full border border-dashed border-yellow-500/50 text-yellow-500 py-3 text-[11px] font-black tracking-widest">{isAddingQuiz ? 'HỦY CHẾ TẠO' : '+ TẠO BÍ TỊCH MỚI'}</button>
                            
                            {isAddingQuiz && (
                                <div className="bg-zinc-900/90 p-4 space-y-3 border border-yellow-500/40 animate-fadeIn">
                                    <label className={`w-full border py-3 text-[10px] font-black uppercase text-center block mb-2 ${quizTextAnalyzing ? 'bg-indigo-900/20 border-indigo-800 text-indigo-600 cursor-wait' : 'bg-indigo-900/50 border-indigo-500 text-indigo-300 cursor-pointer'}`}>{quizTextAnalyzing ? '🔮 AI ĐANG PHÂN TÍCH FILE...' : 'TẢI NGỌC GIẢN (.TXT, .DOCX)'}<input type="file" accept=".txt,.docx" className="hidden" onChange={handleFileUpload} disabled={quizTextAnalyzing} /></label>
                                    <label className={`w-full border py-3 text-[10px] font-black uppercase text-center block mb-2 ${quizImageAnalyzing ? 'bg-purple-900/20 border-purple-800 text-purple-600 cursor-wait' : 'bg-purple-900/50 border-purple-500 text-purple-300 cursor-pointer'}`}>{quizImageAnalyzing ? '🔮 AI ĐANG ĐỌC ẢNH...' : '📷 QUÉT ẢNH ĐỀ THI (AI)'}<input type="file" accept="image/*" className="hidden" onChange={handleQuizImageUpload} disabled={quizImageAnalyzing} /></label>
                                    <input className="w-full bg-black border border-zinc-700 p-3 text-sm text-white outline-none focus:border-yellow-500" placeholder="Tên Bí Tịch..." value={quizTitle} onChange={e=>setQuizTitle(e.target.value)} />
                                    <div className="text-[9px] text-zinc-500 leading-relaxed bg-black/40 border border-zinc-800 p-2">
                                        <p><b className="text-zinc-300">1 đáp án (mặc định):</b> Đáp án: A</p>
                                        <p><b className="text-zinc-300">Nhiều đáp án đúng:</b> Đáp án: A,C</p>
                                        <p><b className="text-zinc-300">Điền số (không cần A/B/C/D):</b> Đáp án: 12.5</p>
                                    </div>
                                    <textarea className="w-full h-32 bg-black border border-zinc-700 p-3 text-xs text-zinc-300 outline-none focus:border-yellow-500 custom-scrollbar" placeholder={"Câu 1: Câu hỏi...?\nA. Lựa chọn 1...\nB. Lựa chọn 2...\nĐáp án: A (hoặc A,C nếu nhiều đáp án; hoặc chỉ ghi số nếu là câu tính toán)"} value={rawQuizText} onChange={e=>setRawQuizText(e.target.value)} onFocus={bindMathFocus(()=>rawQuizText, setRawQuizText)} />
                                    <button onClick={()=>setShowMathKeyboard(true)} className="w-full border border-cyan-600 text-cyan-400 py-2 text-[10px] font-black uppercase">🔣 Bàn Phím Ký Hiệu Toán/Lý</button>
                                    <button onClick={createQuizAction} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px]">LƯU TRỮ VÀ CHÉP MÃ</button>
                                </div>
                            )}
                            <div className="space-y-3 lib-grid">
                                {user.library?.length > 0 ? user.library.map(s => (
                                    <div key={s.id} className="bg-black/80 border border-zinc-800 p-4 flex justify-between items-center hover:border-zinc-600 transition-colors">
                                        <div className="flex-1 mr-3 overflow-hidden"><p className="text-sm font-black text-white uppercase truncate">{s.title}</p><p className="text-[10px] text-zinc-500 font-bold mt-1">SỐ ẢI: <span className="text-yellow-500">{s.data.length}</span></p></div>
                                        <div className="flex gap-3">
                                            <button onClick={()=>openLibraryEditor(s)} className="text-cyan-500 text-xl" title="Chỉnh sửa ải">✏️</button>
                                            <button onClick={()=>shareLibraryItemAction(s)} className="text-yellow-600 text-xl">📤</button>
                                            {/^[A-Z2-9]{8}$/.test(s.code || '') && <button onClick={()=>setReportTarget({ type: 'quiz', id: s.code, label: s.title })} className="text-red-700 text-xl" title="Báo cáo Bí Tịch này">🚩</button>}
                                            <button onClick={async ()=>{ if(await askConfirm("Hủy bí tịch này?")){ safeUserUpdate(user.uid, {library: user.library.filter(x=>x.id!==s.id)}); playSfx('FAIL'); } }} className="text-red-800 text-xl">🗑️</button>
                                            <button onClick={()=>handleEnterQuiz(s.data)} className="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500 px-4 py-2 text-[10px] font-black transition-all">VÀO ẢI</button>
                                        </div>
                                    </div>
                                )) : <p className="text-[11px] text-zinc-600 text-center py-6 italic">Tàng Kinh Các trống rỗng...</p>}
                            </div>
                        </div>
                    </div>
    );
}
