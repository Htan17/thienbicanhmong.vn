import { EXAM_DIFFICULTY, EXAM_PATH_TITLES, EXAM_SUBJECT_SUGGESTIONS, getExamDifficulty } from '../../config/gameData.js';
import { MasteryCard } from '../../components/adaptive/MasteryCard.jsx';
import { RadarChart, UserName } from '../../components/common.jsx';
import { loadProfiles as alepLoadProfiles } from '../../adaptive/adaptiveLocalStore.js';
import { EXAM_PATH_SAVE_MAX } from './examPathHelpers.js';

export function ExamPathScreen({ core, audio, theme, gemini, exampath, nav }) {
    const { user } = core;
    const { playSfx } = audio;
    const { uiMode } = theme;
    const { anyGeminiKey } = gemini;
    const { deleteSavedExamPathAction, examPathBoardList, examPathGenerating, examPathRadarAdvice, examPathRadarLoading, examPathTab, examPathTimeLeftStr, examPathTopicMastery, examPathWindowOpen, examPathWizDays, examPathWizDifficulty, examPathWizLibId, examPathWizMode, examPathWizSubjectInput, examPathWizSubjects, getExamPathAiAdvice, loadSavedExamPathAction, newExamPathAction, resetExamPathAction, saveExamPathAction, setExamPathActiveTitle, setExamPathFinaleInfo, setExamPathTab, setExamPathViewNode, setExamPathWizDays, setExamPathWizDifficulty, setExamPathWizLibId, setExamPathWizMode, setExamPathWizSubjectInput, setExamPathWizSubjects, startExamPathAction } = exampath;
    const { changeAppState } = nav;
    const examPathSavesUI = (user?.examPathSaves || []).length > 0 ? (
        <div className="mt-4 bg-black/40 border border-emerald-900/50 p-3">
            <p className="text-[10px] text-emerald-400 font-black uppercase mb-2">🗂️ Kho Đạo Lộ ({(user?.examPathSaves || []).length}/{EXAM_PATH_SAVE_MAX})</p>
            {(user?.examPathSaves || []).map(sv => (
                <div key={sv.id} className="flex items-center justify-between gap-2 border border-zinc-800 bg-zinc-900/60 p-2 mb-2">
                    <div className="min-w-0"><p className="text-[11px] text-white font-black truncate">{sv.title}</p><p className="text-[9px] text-zinc-500">{sv.done || 0}/{sv.total || 0} Ải · {new Date(sv.savedAt).toLocaleDateString('vi-VN')}</p></div>
                    <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => loadSavedExamPathAction(sv)} className="bg-emerald-600 text-black text-[9px] font-black px-2 py-1.5 uppercase">Tiếp tục</button>
                        <button onClick={() => deleteSavedExamPathAction(sv)} className="border border-red-900 text-red-500 text-[9px] font-black px-2 py-1.5">✕</button>
                    </div>
                </div>
            ))}
        </div>
    ) : null;
    return (
                    <div className="w-full max-w-lg h-[85vh] flex flex-col p-3 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-emerald-700/50 pb-2 mb-3">
                            <h2 className="text-xl font-black text-emerald-400 uppercase italic">Tu Luyện Chi Lộ</h2>
                            <button onClick={()=>changeAppState('DASHBOARD')} className="text-zinc-500 hover:text-white text-xl px-2">✕</button>
                        </div>
                        <div className="flex justify-around text-[9px] font-black uppercase border-b border-zinc-800 mb-3">
                            <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('TREE'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='TREE'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>ĐẠO ĐỒ</button>
                            <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('RADAR'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='RADAR'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>BÁT QUÁI ĐỒ</button>
                            <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('BOARD'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='BOARD'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>ĐẠO HỮU BẢNG</button>
                            <button onClick={()=>{ playSfx('CLICK'); setExamPathTab('REWARDS'); }} className={`pb-3 px-1.5 whitespace-nowrap ${examPathTab==='REWARDS'?'border-b-2 border-emerald-500 text-emerald-400':'text-zinc-600'}`}>PHONG THƯỞNG</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
                            {/* ===== TAB: ĐẠO ĐỒ (nghi thức khai mở HOẶC sơ đồ cây nếu đã có Đạo Lộ) ===== */}
                            {examPathTab === 'TREE' && (
                                !user.examPath?.active ? (
                                    <div className="space-y-4 animate-fadeIn">
                                        <p className="text-[10px] text-zinc-400 text-center italic px-2">Khai mở 1 lộ trình luyện thi có sơ đồ cây, mỗi ngày 1 Ải, xen kẽ ôn tập & Ải Boss, AI hỗ trợ phân tích thực lực sau mỗi chặng.</p>
                                        <div>
                                            <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">1. Nguồn Đề</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={()=>{ playSfx('CLICK'); setExamPathWizMode('library'); }} className={`p-3 border text-[10px] font-black uppercase ${examPathWizMode==='library'?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>📖 Từ Bí Tịch Có Sẵn</button>
                                                <button onClick={()=>{ playSfx('CLICK'); setExamPathWizMode('subjects'); }} className={`p-3 border text-[10px] font-black uppercase ${examPathWizMode==='subjects'?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>📚 Theo Môn Học</button>
                                            </div>
                                        </div>
                                        {examPathWizMode === 'library' ? (
                                            <div>
                                                <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">Chọn Bí Tịch trong Tàng Kinh Các</p>
                                                {user.library?.length > 0 ? (
                                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                        {user.library.map(s => (
                                                            <div key={s.id} onClick={()=>{ playSfx('CLICK'); setExamPathWizLibId(s.id); }} className={`p-2 border text-[10px] font-bold cursor-pointer flex justify-between ${String(examPathWizLibId)===String(s.id)?'border-emerald-500 bg-emerald-900/20 text-emerald-300':'border-zinc-800 text-zinc-400'}`}>
                                                                <span className="truncate mr-2">{s.title}</span><span className="text-zinc-600 flex-shrink-0">{s.data.length} câu</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-[10px] text-zinc-600 italic text-center py-3">Chưa có Bí Tịch nào - hãy tạo 1 bộ trong Tàng Kinh Các trước!</p>}
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">Chọn/Nhập Môn Học</p>
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {EXAM_SUBJECT_SUGGESTIONS.map(sub => (
                                                        <button key={sub} onClick={()=>{ playSfx('CLICK'); setExamPathWizSubjects(p => p.includes(sub) ? p.filter(x=>x!==sub) : [...p, sub]); }} className={`px-2.5 py-1.5 border text-[9px] font-bold ${examPathWizSubjects.includes(sub)?'border-emerald-500 bg-emerald-900/30 text-emerald-300':'border-zinc-700 text-zinc-500'}`}>{sub}</button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input className="flex-1 bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-emerald-500" placeholder="Môn khác..." value={examPathWizSubjectInput} onChange={e=>setExamPathWizSubjectInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && examPathWizSubjectInput.trim()){ setExamPathWizSubjects(p=>[...p, examPathWizSubjectInput.trim()]); setExamPathWizSubjectInput(''); } }} />
                                                    <button onClick={()=>{ if(examPathWizSubjectInput.trim()){ setExamPathWizSubjects(p=>[...p, examPathWizSubjectInput.trim()]); setExamPathWizSubjectInput(''); } }} className="bg-zinc-800 text-zinc-300 px-4 text-[10px] font-black">+</button>
                                                </div>
                                                {examPathWizSubjects.length > 0 && <p className="text-[9px] text-emerald-400 mt-2">Đã chọn: {examPathWizSubjects.join(', ')}</p>}
                                                {!anyGeminiKey && <p className="text-[9px] text-orange-400 mt-2 italic">⚠️ Cần API Key (Gemini) ở mục Học Qua Video để AI soạn câu hỏi mới.</p>}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">2. Số Ngày Học: <span className="text-emerald-400">{examPathWizDays} ngày</span></p>
                                            <input type="range" min="3" max="30" value={examPathWizDays} onChange={e=>setExamPathWizDays(Number(e.target.value))} className="w-full accent-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-zinc-500 font-black uppercase mb-2">3. Độ Khó</p>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {EXAM_DIFFICULTY.map(d => (
                                                    <div key={d.id} onClick={()=>{ playSfx('CLICK'); setExamPathWizDifficulty(d.id); }} className={`difficulty-chip ${examPathWizDifficulty===d.id?'active':''}`} style={{ borderColor: d.color, color: examPathWizDifficulty===d.id?d.color:'#71717a' }}>
                                                        <div className="text-lg">{d.icon}</div><div className="text-[8px] font-black uppercase mt-1">{d.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-zinc-500 italic mt-2 text-center">{getExamDifficulty(examPathWizDifficulty).desc}</p>
                                        </div>
                                        <button onClick={startExamPathAction} disabled={examPathGenerating} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-wait text-black py-4 font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)]">{examPathGenerating ? '🔮 AI ĐANG KHAI MỞ ĐẠO LỘ...' : '⚡ KHAI MỞ ĐẠO LỘ'}</button>
                                        {examPathSavesUI}
                                    </div>
                                ) : (
                                    <div className="animate-fadeIn">
                                        <div className="flex justify-between items-center mb-4 bg-black/40 border border-emerald-900/50 p-3">
                                            <div className="overflow-hidden"><p className="text-[11px] font-black text-white truncate max-w-[180px]">{user.examPath.title}</p><p className="text-[9px] text-zinc-500 font-bold mt-1">{getExamDifficulty(user.examPath.difficulty).icon} {getExamDifficulty(user.examPath.difficulty).name} · {user.examPath.nodes.length} Ải</p></div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={saveExamPathAction} className="text-[9px] text-emerald-400 font-black uppercase border border-emerald-700 px-2 py-1.5">💾 Lưu</button>
                                                <button onClick={newExamPathAction} className="text-[9px] text-cyan-300 font-black uppercase border border-cyan-800 px-2 py-1.5">+ Mới</button>
                                                <button onClick={resetExamPathAction} className="text-[9px] text-red-500 font-black uppercase border border-red-900 px-2 py-1.5">Xoá</button>
                                            </div>
                                        </div>
                                        {examPathSavesUI && <details className="mb-4"><summary className="text-[10px] text-emerald-400 font-black uppercase cursor-pointer">🗂️ Kho Đạo Lộ đã lưu ({(user.examPathSaves || []).length})</summary>{examPathSavesUI}</details>}
                                        {user.examPath.completedAt && <div className="bg-yellow-900/20 border border-yellow-600 p-3 text-center mb-4"><p className="text-yellow-400 text-[11px] font-black">🎉 ĐÃ HOÀN THÀNH TOÀN BỘ ĐẠO LỘ! 🎉</p></div>}
                                        <div className="exam-path-track has-final pt-2 pb-8">
                                            {user.examPath.nodes.map((n, i) => {
                                                const pos = n.type === 'boss' ? 'pos-mid' : (i % 2 === 0 ? 'pos-left' : 'pos-right');
                                                const cls = n.status === 'done' ? 'exam-node-done' : n.status === 'unlocked' ? 'exam-node-unlocked' : 'exam-node-locked';
                                                const icon = n.status === 'locked' ? '🔒' : n.type === 'boss' ? '👹' : n.type === 'review' ? '🔁' : (n.status === 'done' ? '⭐' : '▶️');
                                                return (
                                                    <div key={n.id} className={`exam-node-wrap ${pos}`}>
                                                        <div className="relative flex flex-col items-center">
                                                            <button onClick={()=>{ if(n.status==='locked'){ playSfx('WRONG'); } else { playSfx('CLICK'); setExamPathViewNode(n); } }} className={`exam-node-btn ${cls} ${n.type==='boss'?'exam-node-boss':''} ${n.type==='review'?'exam-node-review':''}`}>{icon}</button>
                                                            <span className="exam-node-label">{n.title}{n.bestScore!=null && <span className="block text-emerald-400">{n.bestScore}%</span>}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* 🏆 ĐÍCH ĐẾN: nút cuối sơ đồ cây. Khoá tới khi vượt hết Ải; xong hết -> phát sáng, bấm để xem lại tổng kết. */}
                                            {(() => {
                                                const epNodes = user.examPath.nodes;
                                                const doneCount = epNodes.filter(x => x.status === 'done').length;
                                                const allDone = epNodes.length > 0 && doneCount === epNodes.length;
                                                return (
                                                    <div className="exam-node-wrap pos-mid" style={{ marginTop: 14, marginBottom: 40 }}>
                                                        <div className="relative flex flex-col items-center">
                                                            <button onClick={() => {
                                                                if (allDone) { playSfx('SUCCESS'); setExamPathFinaleInfo({ title: user.examPath.title, totalNodes: epNodes.length, days: user.examPath.days }); }
                                                                else { playSfx('WRONG'); alert(`Còn ${epNodes.length - doneCount} Ải nữa là chạm tới ĐẠO THÀNH! Cố lên!`); }
                                                            }} className={`exam-node-btn exam-node-final ${allDone ? 'exam-node-final-done' : 'exam-node-locked'}`}>{allDone ? '🏆' : '🔒'}</button>
                                                            <span className="exam-node-label" style={{ color: allDone ? '#facc15' : undefined }}>ĐẠO THÀNH<span className={`block ${allDone ? 'text-yellow-300' : 'text-zinc-500'}`}>{allDone ? 'ĐÃ VIÊN MÃN' : `${doneCount}/${epNodes.length} Ải`}</span></span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )
                            )}
                            {/* ===== TAB: BÁT QUÁI ĐỒ (biểu đồ mạng nhện phân tích thực lực) ===== */}
                            {examPathTab === 'RADAR' && (
                                <div className="animate-fadeIn space-y-4">
                                    {!user.examPath?.active ? (
                                        <p className="text-[11px] text-zinc-600 text-center py-10 italic">Hãy khai mở 1 Đạo Lộ ở tab ĐẠO ĐỒ trước!</p>
                                    ) : Object.keys(examPathTopicMastery).length === 0 ? (
                                        <p className="text-[11px] text-zinc-600 text-center py-10 italic">Chưa có dữ liệu - hoàn thành ít nhất 1 Ải để xem Bát Quái Đồ!</p>
                                    ) : (
                                        <>
                                            <RadarChart data={examPathTopicMastery} />
                                            <MasteryCard profiles={alepLoadProfiles(user && user.uid)} uiMode={uiMode} />
                                            <button onClick={getExamPathAiAdvice} disabled={examPathRadarLoading} className="w-full border border-indigo-500 text-indigo-300 py-3 text-[10px] font-black uppercase disabled:opacity-50">{examPathRadarLoading ? '🔮 AI ĐANG PHÂN TÍCH...' : '🔮 XIN SƯ PHỤ AI NHẬN XÉT'}</button>
                                            {examPathRadarAdvice && <div className="bg-indigo-950/40 border border-indigo-800 p-3 text-[11px] text-indigo-200 italic leading-relaxed animate-fadeIn">{examPathRadarAdvice}</div>}
                                        </>
                                    )}
                                </div>
                            )}
                            {/* ===== TAB: ĐẠO HỮU BẢNG (BXH thời gian luyện thi 4h00-23h00, reset mỗi ngày) ===== */}
                            {examPathTab === 'BOARD' && (
                                <div className="animate-fadeIn space-y-3">
                                    <div className="bg-black/60 border border-emerald-600/50 p-3 text-center">
                                        <p className="text-[9px] text-emerald-400 font-black uppercase mb-1">{examPathWindowOpen ? '🟢 Đang Tính Điểm (4h00-23h00)' : '🔴 Ngoài Khung Giờ Tính Điểm'}</p>
                                        <p className="text-[9px] text-zinc-400">Chốt hạng & làm mới sau: <span className="text-yellow-400 font-mono">{examPathTimeLeftStr}</span></p>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 text-center italic">Điểm = số phút luyện thi tích luỹ trong khung giờ 4h00-23h00 hôm nay.</p>
                                    {/* 🆕 NÊU RÕ PHẦN THƯỞNG: trước đây chỉ có 1 dòng chữ chung chung "Top 3 nhận Danh Hiệu Phong Thái
                                        miễn phí!", không nói rõ TỪNG hạng nhận danh hiệu gì - khác với Phong Thần Bảng đã có sẵn dải
                                        thưởng rõ ràng (+5000/+3000/+1000 CT theo từng Top). Nay thêm dải xem trước tương tự, lấy đúng
                                        dữ liệu từ EXAM_PATH_TITLES để không thể lệch với danh hiệu thật sự phát ra. */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-yellow-900/20 border border-yellow-600 p-2"><span className="block text-base">🥇</span><span className="text-[8px] text-yellow-400 font-black block">TOP 1</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[0].name}</span></div>
                                        <div className="bg-gray-800/30 border border-gray-400 p-2"><span className="block text-base">🥈</span><span className="text-[8px] text-gray-300 font-black block">TOP 2</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[1].name}</span></div>
                                        <div className="bg-orange-900/20 border border-orange-500 p-2"><span className="block text-base">🥉</span><span className="text-[8px] text-orange-400 font-black block">TOP 3</span><span className="text-[7px] text-zinc-400 block leading-tight mt-0.5">{EXAM_PATH_TITLES[2].name}</span></div>
                                    </div>
                                    <p className="text-[8px] text-zinc-600 text-center italic">Danh hiệu miễn phí, không cộng thêm Linh Thạch/Danh Vọng - chọn hiển thị ở tab PHONG THƯỞNG.</p>
                                    <div className="space-y-2">
                                        {examPathBoardList.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-6 italic">Chưa ai luyện thi hôm nay - hãy là người đầu tiên!</p>}
                                        {examPathBoardList.map((p, i) => (
                                            <div key={p.uid} className={`flex justify-between items-center p-3 border ${i===0?'border-yellow-500 bg-yellow-900/10':i===1?'border-gray-400 bg-gray-800/20':i===2?'border-orange-500 bg-orange-900/10':'border-zinc-800 bg-black/40'} ${p.uid===user.uid?'border-l-4 border-l-cyan-400':''}`}>
                                                <div className="flex items-center gap-3 overflow-hidden"><span className="text-[13px] font-black w-6 text-center text-zinc-400 flex-shrink-0">#{i+1}</span><img src={p.photo} className="w-9 h-9 object-cover border border-zinc-700 flex-shrink-0" alt="avatar" /><UserName u={p} cls="text-[11px] truncate" /></div>
                                                <span className="text-emerald-400 font-black text-[12px] flex-shrink-0 ml-2">⏱️ {(p.examPathDailyScore||0).toFixed(1)}p</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* ===== TAB: BẢNG PHONG THƯỞNG (danh hiệu đã nhận từ Đạo Hữu Bảng) ===== */}
                            {examPathTab === 'REWARDS' && (
                                <div className="animate-fadeIn space-y-3">
                                    <p className="text-[10px] text-zinc-400 text-center italic px-2 mb-2">Danh Hiệu Phong Thái nhận được từ Đạo Hữu Bảng - chọn 1 để hiển thị cạnh tên (hoặc gỡ bất kỳ lúc nào).</p>
                                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                        <div className="bg-yellow-900/20 border border-yellow-600 p-2"><span className="block text-lg">🥇</span><span className="text-[9px] text-yellow-400 font-black">TOP 1</span></div>
                                        <div className="bg-gray-800/30 border border-gray-400 p-2"><span className="block text-lg">🥈</span><span className="text-[9px] text-gray-300 font-black">TOP 2</span></div>
                                        <div className="bg-orange-900/20 border border-orange-500 p-2"><span className="block text-lg">🥉</span><span className="text-[9px] text-orange-400 font-black">TOP 3</span></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div onClick={()=>setExamPathActiveTitle(null)} className={`p-3 border cursor-pointer text-[10px] font-bold ${!user.examPathActiveTitle?'border-emerald-500 text-emerald-300 bg-emerald-900/20':'border-zinc-800 text-zinc-500'}`}>Không hiển thị danh hiệu</div>
                                        {EXAM_PATH_TITLES.map(t => {
                                            const owned = (user.examPathTitles||[]).includes(t.id);
                                            return (
                                                <div key={t.id} onClick={()=> owned && setExamPathActiveTitle(t.id)} className={`p-3 border flex justify-between items-center text-[10px] font-bold ${!owned?'border-zinc-900 text-zinc-700 opacity-50':user.examPathActiveTitle===t.id?'border-emerald-500 bg-emerald-900/20 cursor-pointer':'border-zinc-800 text-zinc-400 cursor-pointer'}`}>
                                                    <span className={t.class}>{t.name}</span>
                                                    <span>{owned ? (user.examPathActiveTitle===t.id?'✅':'') : '🔒'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
    );
}
