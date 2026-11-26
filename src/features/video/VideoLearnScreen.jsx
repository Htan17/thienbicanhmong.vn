import { ClickableSentence } from '../../components/ClickableSentence.jsx';
import { safeUserUpdate } from '../../lib/userData.js';
import { formatStudyTime, VOCAB_QUESTIONS_PER_ROUND, normalizeAcademicQuestions, fmtVideoTime } from './videoHelpers.js';

export function VideoLearnScreen({ core, audio, gemini, videoplayer, videoquiz, nav, videonotes }) {
    const { user } = core;
    const { playSfx } = audio;
    const { saveGeminiKey, videoApiKey } = gemini;
    const { activeSecIdx, activeTranscriptIdx, changePlaybackRate, currentYoutubeId, getPhoneticLabel, getVideoHanziList, lookupWordAction, playbackRate, seekVideoTo, setShowPinyin, setShowTranslation, setVideoLink, setVideoResult, setVideoStudyMode, setWriteCharModal, setWritePracticeChar, showPinyin, showTranslation, supportedPlaybackRates, toggleVideoLandscapeMode, transcriptItemRefs, videoLandscapeMode, videoLink, videoResult, videoStudyMode, videoStudySeconds, vocabMarks } = videoplayer;
    const { setVideoQuizActive, setVideoQuizRounds, startVideoVocabReview } = videoquiz;
    const { changeAppState } = nav;
    const { academicQuizTitle, analyzeVideoAction, handleVocabFileUpload, importVideoCodeAction, loadSavedVideoNote, saveAcademicQuizAction, saveVideoNoteAction, setAcademicQuizTitle, setVideoImportCode, shareVideoNoteAction, videoAnalyzing, videoImportCode, videoShareCode, vocabFileAnalyzing } = videonotes;
    const renderAcademicPanel = () => {
        const r = videoResult; if (!r) return null;
        const qCount = normalizeAcademicQuestions(r.quiz).length;
        return (
            <div className="space-y-3">
                <div className="bg-black border border-emerald-800 p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2"><span className="bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 uppercase">📚 {r.subject || 'Môn học'}</span><span className="text-[11px] text-white font-black">{r.topic}</span></div>
                    <p className="text-[11px] text-zinc-300 italic leading-relaxed">{r.summary}</p>
                </div>
                {(r.sections || []).length > 0 && (
                    <div className="bg-black border border-cyan-900 p-3">
                        <p className="text-[10px] text-cyan-400 font-black uppercase mb-2">🧭 Mục lục (bấm để tua video)</p>
                        <div className="space-y-1.5">{r.sections.map((s, i) => (
                            <button key={i} onClick={() => seekVideoTo(s.start)} className={`w-full text-left flex gap-2 p-2 border transition-colors ${i === activeSecIdx ? 'border-cyan-400 bg-cyan-900/30' : 'border-zinc-800 bg-zinc-900/60 hover:border-cyan-700'}`}>
                                <span className="text-[10px] font-mono font-black text-cyan-300 flex-shrink-0 w-12">▶ {fmtVideoTime(s.start)}</span>
                                <span className="min-w-0"><span className="block text-[11px] text-white font-black">{s.title}</span>{s.summary && <span className="block text-[10px] text-zinc-400 leading-snug mt-0.5">{s.summary}</span>}</span>
                            </button>))}</div>
                    </div>
                )}
                {(r.formulas || []).length > 0 && (
                    <div className="bg-black border border-yellow-900 p-3">
                        <p className="text-[10px] text-yellow-400 font-black uppercase mb-2">🧮 Công thức & Định lý ({r.formulas.length})</p>
                        <div className="space-y-2">{r.formulas.map((f, i) => (
                            <div key={i} className="border border-zinc-800 bg-zinc-900/60 p-2">
                                <div className="flex justify-between gap-2"><span className="text-[11px] text-white font-black">{f.name}</span>{f.time > 0 && <button onClick={() => seekVideoTo(f.time)} className="text-[9px] text-cyan-300 font-mono font-black flex-shrink-0">▶ {fmtVideoTime(f.time)}</button>}</div>
                                {f.formula && <p className="mt-1 bg-black border border-yellow-800/60 px-2 py-1.5 text-[13px] text-yellow-300 font-mono break-words" style={{overflowWrap:'anywhere'}}>{f.formula}</p>}
                                {f.explain && <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{f.explain}</p>}
                            </div>))}</div>
                    </div>
                )}
                {(r.keyPoints || []).length > 0 && (
                    <div className="bg-black border border-zinc-800 p-3">
                        <p className="text-[10px] text-pink-400 font-black uppercase mb-2">💡 Ý chính cần nhớ</p>
                        {r.keyPoints.map((k, i) => (<div key={i} className="mb-2 last:mb-0"><div className="flex justify-between gap-2"><span className="text-[11px] text-white font-bold">• {k.point}</span>{k.time > 0 && <button onClick={() => seekVideoTo(k.time)} className="text-[9px] text-cyan-300 font-mono flex-shrink-0">▶ {fmtVideoTime(k.time)}</button>}</div>{k.detail && <p className="text-[10px] text-zinc-400 leading-snug ml-3">{k.detail}</p>}</div>))}
                    </div>
                )}
                {(r.examples || []).length > 0 && (
                    <div className="bg-black border border-zinc-800 p-3">
                        <p className="text-[10px] text-orange-400 font-black uppercase mb-2">📝 Ví dụ trong video</p>
                        {r.examples.map((x, i) => (<div key={i} className="mb-2 last:mb-0 border border-zinc-800 bg-zinc-900/60 p-2"><div className="flex justify-between gap-2"><span className="text-[11px] text-white font-bold">{x.problem}</span>{x.time > 0 && <button onClick={() => seekVideoTo(x.time)} className="text-[9px] text-cyan-300 font-mono flex-shrink-0">▶ {fmtVideoTime(x.time)}</button>}</div>{x.solution && <p className="text-[10px] text-emerald-300/90 mt-1 leading-snug">{x.solution}</p>}</div>))}
                    </div>
                )}
                <div className="bg-gradient-to-b from-indigo-950/60 to-black border border-indigo-600 p-3">
                    <p className="text-[10px] text-indigo-300 font-black uppercase mb-2">🗡️ Ải Bí Tịch ({qCount} câu)</p>
                    <p className="text-[9px] text-zinc-400 mb-2 leading-snug">Học xong hãy thử sức! Ải dùng đúng giao diện Bí Tịch và được lưu ở <b>Tàng Kinh Các (Trang chủ)</b>, không lưu vào mục Học Video.</p>
                    <input value={academicQuizTitle} onChange={e => setAcademicQuizTitle(e.target.value)} maxLength={80} className="w-full bg-zinc-900 border border-zinc-700 p-2 text-[11px] text-white outline-none focus:border-indigo-400 mb-2" placeholder="Tên Bí Tịch..." />
                    <div className="flex gap-2">
                        <button onClick={() => saveAcademicQuizAction(true)} disabled={!qCount} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 text-[10px] font-black uppercase">⚔️ Vượt Ải ngay</button>
                        <button onClick={() => saveAcademicQuizAction(false)} disabled={!qCount} className="flex-1 border border-indigo-500 text-indigo-300 disabled:opacity-40 py-2.5 text-[10px] font-black uppercase">📥 Lưu vào Tàng Kinh Các</button>
                    </div>
                </div>
            </div>
        );
    };
    return (
                    <div id="vl-root" className="w-full max-w-lg h-[80vh] flex flex-col p-4 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-cyan-700/50 pb-2 mb-3">
                            <h2 className="text-xl font-black text-cyan-400 uppercase italic">Thính Kính Trình Học</h2>
                            <button onClick={() => { setVideoResult(null); setVideoQuizActive(false); setVideoQuizRounds([]); changeAppState('DASHBOARD'); }} className="bg-zinc-800 text-zinc-400 px-4 py-2 font-black text-[10px] hover:text-white transition-colors">TRỞ VỀ</button>
                        </div>

                        <div id="vl-body" className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                            {!videoApiKey && (
                                <div className="bg-black border border-cyan-800 p-3 space-y-2">
                                    <p className="text-[10px] text-cyan-300 font-bold">Cần API Key Gemini (miễn phí) để phân tích. Lấy tại <span className="underline">aistudio.google.com/apikey</span>, rồi dán vào đây:</p>
                                    <input className="w-full bg-zinc-900 border border-cyan-700 p-2 text-xs text-white outline-none" placeholder="Dán Gemini API Key..." value={videoApiKey} onChange={e=>saveGeminiKey(e.target.value)} />
                                </div>
                            )}

                            <p className="text-[10px] text-zinc-400 font-bold uppercase">Link Video (ưu tiên YouTube để phân tích + xem trực tiếp):</p>
                            {/* ✕ NÚT XOÁ NHANH: trước đây đổi link phải tự bấm xoá từng ký tự rất mất thời gian,
                                giờ chỉ cần bấm ✕ là xoá sạch để dán link mới ngay lập tức. */}
                            <div className="relative">
                                <input className="w-full bg-black border border-cyan-700 p-3 pr-9 text-sm text-white outline-none focus:border-cyan-400 transition-colors" placeholder="Dán link YouTube vào đây..." value={videoLink} onChange={e=>setVideoLink(e.target.value)} />
                                {videoLink && (
                                    <button onClick={() => setVideoLink('')} title="Xoá link" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full text-sm font-black">✕</button>
                                )}
                            </div>

                            {/* 📥 NHẬP MÃ BÍ TỊCH VIDEO: dán mã người khác chia sẻ để có ngay bài phân tích, khỏi tốn API */}
                            <div className="flex gap-2">
                                <input className="flex-1 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="Mã Bí Tịch Video (nếu có)..." value={videoImportCode} onChange={e=>setVideoImportCode(e.target.value)} />
                                <button onClick={importVideoCodeAction} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-4 text-[10px] font-black uppercase">Nhập</button>
                            </div>

                            {/* 🆕 ĐỒNG BỘ VỚI ẢI BÍ TỊCH: tải thẳng file Ngọc Giản từ vựng (.txt/.docx) lên đây,
                                không cần phải có video mới ôn tập được — AI tự tách "từ - nghĩa" từ file. */}
                            <label className={`w-full border py-2.5 text-[10px] font-black uppercase text-center block ${vocabFileAnalyzing ? 'bg-indigo-900/20 border-indigo-800 text-indigo-600 cursor-wait' : 'bg-indigo-900/50 border-indigo-500 text-indigo-300 cursor-pointer'}`}>{vocabFileAnalyzing ? '🔮 AI ĐANG PHÂN TÍCH FILE...' : '📁 TẢI NGỌC GIẢN TỪ VỰNG (.TXT, .DOCX)'}<input type="file" accept=".txt,.docx" className="hidden" onChange={handleVocabFileUpload} disabled={vocabFileAnalyzing} /></label>

                            {/* KHUNG XEM VIDEO THẬT + NÚT TỐC ĐỘ PHÁT + CHẾ ĐỘ NGANG (chỉ hiện khi ĐANG Ở CHẾ ĐỘ DỌC;
                                khi bật Chế Độ Ngang, khung này ẩn đi và khung landscape-fs bên dưới (portal ra
                                ngoài document.body) đảm nhiệm, tránh 2 trình phát YouTube chạy trùng lúc) */}
                            {currentYoutubeId && !videoLandscapeMode && (
                                <div className="bg-black border border-cyan-800" id="yt-player-wrap">
                                    <div className="w-full aspect-video bg-black" id="yt-player-mount"></div>
                                    <div className="flex items-center justify-between gap-1 p-2 bg-zinc-900 border-t border-cyan-900 flex-wrap">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase pl-1">Tốc Độ:</span>
                                        <div className="flex gap-1 flex-wrap">
                                            {supportedPlaybackRates.map(rate => (
                                                <button key={rate} onClick={() => changePlaybackRate(rate)} className={`px-2 py-1 text-[10px] font-black border ${playbackRate === rate ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}>{rate}x</button>
                                            ))}
                                        </div>
                                        <button onClick={toggleVideoLandscapeMode} className="px-2 py-1 text-[10px] font-black border bg-zinc-800 border-cyan-700 text-cyan-300 hover:bg-cyan-800 hover:text-white flex items-center gap-1">⛶ CHẾ ĐỘ NGANG</button>
                                    </div>
                                </div>
                            )}
                            {currentYoutubeId && videoLandscapeMode && (
                                <div className="bg-black border border-cyan-800 p-6 text-center">
                                    <p className="text-[10px] text-cyan-400 font-bold animate-pulse">Đang xem ở Chế Độ Ngang...</p>
                                </div>
                            )}

                            {/* CHẾ ĐỘ NGANG - RENDER RA NGOÀI (Portal thẳng vào document.body) để tránh bị kẹt
                                trong khung cha có giới hạn chiều cao/transform, đảm bảo LUÔN phủ kín đúng màn hình
                                thật và LUÔN có nút Thoát rõ ràng, không bao giờ bị kẹt lại ở trạng thái ngang. */}
                            {currentYoutubeId && videoLandscapeMode && ReactDOM.createPortal(
                                <div className="landscape-fs use-app-vh flex">
                                    <div className="h-full flex-[3] bg-black relative" id="yt-player-mount-landscape"></div>
                                    <div className="h-full flex-[2] min-w-0 bg-zinc-900 border-l-2 border-cyan-700 flex flex-col overflow-hidden">
                                        <div className="flex items-center justify-between gap-1 p-2 bg-zinc-900 border-b border-cyan-900 flex-wrap flex-shrink-0">
                                            <div className="flex gap-1 flex-wrap">
                                                {supportedPlaybackRates.map(rate => (
                                                    <button key={rate} onClick={() => changePlaybackRate(rate)} className={`px-2 py-1 text-[9px] font-black border ${playbackRate === rate ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{rate}x</button>
                                                ))}
                                            </div>
                                            <button onClick={toggleVideoLandscapeMode} className="px-2 py-1 text-[9px] font-black border bg-red-900/70 border-red-500 text-red-200 hover:bg-red-600 hover:text-white">✕ THOÁT NGANG</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                            {videoResult && videoResult.mode === 'academic' ? renderAcademicPanel() : videoResult ? (
                                                <>
                                                    <div className="bg-black/60 border border-zinc-800 p-2">
                                                        <p className="text-[9px] text-yellow-500 font-black mb-1 uppercase">Tóm Tắt:</p>
                                                        <p className="text-[10px] text-zinc-300 italic leading-snug">{videoResult.summary}</p>
                                                    </div>
                                                    {videoResult.transcript?.length > 0 && (
                                                        <div className="bg-black/60 border border-cyan-800 p-2">
                                                            <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                                                                <p className="text-[9px] text-cyan-400 font-black uppercase">Phụ Đề (bấm từ để tra nghĩa):</p>
                                                                <div className="flex gap-1">
                                                                    {videoResult.isCjk && <button onClick={()=>setShowPinyin(v=>!v)} className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${showPinyin ? 'bg-yellow-600 border-yellow-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>拼 {getPhoneticLabel()}</button>}
                                                                    <button onClick={()=>setShowTranslation(v=>!v)} className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${showTranslation ? 'bg-green-600 border-green-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>🇻🇳 Dịch</button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5 leading-relaxed">
                                                                {videoResult.transcript.map((sentence, i) => (
                                                                    <div key={i} ref={el => { transcriptItemRefs.current.landscape[i] = el; }}
                                                                         className={`transition-colors duration-300 -mx-1 px-1 py-0.5 rounded ${i === activeTranscriptIdx ? 'bg-cyan-800/40 border-l-2 border-yellow-400' : ''}`}>
                                                                        {showPinyin && videoResult.transcriptPinyin?.[i] && <p className="text-[9px] text-yellow-400 italic leading-tight">{videoResult.transcriptPinyin[i]}</p>}
                                                                        <p className="text-[11px] text-white">
                                                                            <ClickableSentence text={sentence} onWordClick={lookupWordAction} vocab={vocabMarks} />
                                                                        </p>
                                                                        {showTranslation && videoResult.transcriptTranslation?.[i] && <p className="text-[9px] text-green-400/90 italic leading-tight mt-0.5">{videoResult.transcriptTranslation[i]}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(videoResult.translations || []).length > 0 && (
                                                        <div className="bg-black/60 border border-zinc-800 p-2 space-y-2">
                                                            <p className="text-[9px] text-green-400 font-black mb-1 uppercase">Từ Vựng / Dịch Thuật:</p>
                                                            {videoResult.translations.map((t, i) => (
                                                                <div key={i} className="text-[10px] pb-1.5 border-b border-zinc-800 last:border-0">
                                                                    <p className="text-cyan-300 font-bold"><ClickableSentence text={t.original} onWordClick={lookupWordAction} /> {t.level && t.level !== 'Không rõ' && <span className="text-[8px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1 ml-1">{t.level}</span>}</p>
                                                                    <p className="text-zinc-400">{t.translated}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* ⏱️ THỜI GIAN ĐÃ HỌC + nút LƯU/CHIA SẺ ngay trong Chế Độ Ngang, khỏi phải Thoát Ngang mới lưu được */}
                                                    <p className="text-[9px] text-zinc-500 font-bold text-center">⏱️ Đã học: <span className="text-cyan-400">{formatStudyTime(videoStudySeconds)}</span></p>
                                                    <div className="flex gap-1">
                                                        <button onClick={saveVideoNoteAction} className="flex-1 bg-gradient-to-r from-green-800 to-cyan-800 text-white py-2.5 text-[9px] font-black uppercase">LƯU BÍ TỊCH</button>
                                                        {videoShareCode && <button onClick={()=>{ navigator.clipboard.writeText(videoShareCode); playSfx('CLICK'); alert("Đã chép Mã Bí Tịch Video!"); }} className="bg-yellow-600 text-black px-3 text-[9px] font-black uppercase">📤</button>}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-[10px] text-zinc-600 italic text-center py-6">Chưa có dữ liệu Phân Tích. Hãy Thoát Ngang rồi bấm "Phân Tích" trước để có bảng từ vựng ở đây.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}

                            <div className="flex gap-1 mb-2">{[['auto','🤖 Tự nhận biết'],['language','🌏 Ngoại ngữ'],['academic','📚 Môn học']].map(([m, lb]) => (<button key={m} onClick={() => { playSfx('TOGGLE'); setVideoStudyMode(m); }} className={`flex-1 py-2 text-[9px] font-black uppercase border ${videoStudyMode === m ? 'bg-cyan-700 border-cyan-400 text-white' : 'border-zinc-700 text-zinc-400'}`}>{lb}</button>))}</div>
                            <button onClick={analyzeVideoAction} disabled={videoAnalyzing} className="w-full bg-cyan-700 hover:bg-cyan-500 disabled:opacity-50 text-white py-3 font-black text-[10px] uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                {videoAnalyzing ? 'Đang Phân Tích Tiên Âm...' : 'Phân Tích'}
                            </button>

                            {videoResult && videoResult.mode === 'academic' && renderAcademicPanel()}
                            {videoResult && videoResult.mode !== 'academic' && (
                                <>
                                    <div className="bg-black border border-zinc-700 p-3">
                                        <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">Tóm Tắt Ý Chính:</p>
                                        <p className="text-sm text-zinc-300 italic">{videoResult.summary}</p>
                                    </div>

                                    {videoResult.transcript?.length > 0 && (
                                        <div className="bg-zinc-900 border border-cyan-700/60 p-3">
                                            <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                                                <p className="text-[10px] text-cyan-400 font-black uppercase">Văn Bản (bấm vào từ để tra nghĩa):</p>
                                                <div className="flex gap-1">
                                                    {videoResult.isCjk && <button onClick={()=>{ playSfx('CLICK'); setShowPinyin(v=>!v); }} className={`text-[9px] font-black px-2 py-1 border uppercase ${showPinyin ? 'bg-yellow-600 border-yellow-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>拼 {getPhoneticLabel()}</button>}
                                                    <button onClick={()=>{ playSfx('CLICK'); setShowTranslation(v=>!v); }} className={`text-[9px] font-black px-2 py-1 border uppercase ${showTranslation ? 'bg-green-600 border-green-400 text-black' : 'bg-transparent border-zinc-600 text-zinc-400'}`}>🇻🇳 Dịch</button>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mb-2 italic">Video sẽ tự tạm dừng khi bạn tra từ. Bấm chữ đầu rồi bấm chữ cuối của cụm để tra cả cụm từ (VD: bấm 因 rồi bấm 为 để tra 因为).</p>
                                            <div className="flex flex-wrap gap-2 text-[9px] mb-2"><span className="text-yellow-300 border-b-2 border-yellow-400 bg-yellow-500/20 px-1">Rất quan trọng</span><span className="text-emerald-300 border-b-2 border-emerald-400 bg-emerald-500/15 px-1">Quan trọng</span><span className="text-sky-300 border-b border-sky-400/70 bg-sky-500/10 px-1">Bổ trợ</span></div>
                                            <div className="space-y-1.5 leading-relaxed">
                                                {videoResult.transcript.map((sentence, i) => (
                                                    <div key={i} ref={el => { transcriptItemRefs.current.portrait[i] = el; }}
                                                         className={`transition-colors duration-300 -mx-1.5 px-1.5 py-0.5 rounded ${i === activeTranscriptIdx ? 'bg-cyan-800/40 border-l-2 border-yellow-400' : ''}`}>
                                                        {showPinyin && videoResult.transcriptPinyin?.[i] && <p className="text-[11px] text-yellow-400 italic leading-tight">{videoResult.transcriptPinyin[i]}</p>}
                                                        <p className="text-sm text-white">
                                                            <ClickableSentence text={sentence} onWordClick={lookupWordAction} vocab={vocabMarks} />
                                                        </p>
                                                        {showTranslation && videoResult.transcriptTranslation?.[i] && <p className="text-[11px] text-green-400/90 italic leading-tight mt-0.5">{videoResult.transcriptTranslation[i]}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-zinc-900 border border-zinc-700 p-3">
                                        <p className="text-[10px] text-green-400 font-black mb-1 uppercase">Dịch Thuật Song Ngữ:</p>
                                        <p className="text-[9px] text-zinc-500 mb-2 italic">Bấm vào từ trong Câu gốc để AI giải nghĩa từ đó đúng theo ngữ cảnh câu này.</p>
                                        <div className="space-y-2">
                                            {(videoResult.translations || []).map((t, i) => (
                                                <div key={i}>
                                                    <p className="text-xs text-white"><span className="text-cyan-300 font-bold">Câu gốc:</span> <ClickableSentence text={t.original} onWordClick={lookupWordAction} /> {t.level && t.level !== 'Không rõ' && <span className="text-[9px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1.5 py-0.5 ml-1 font-black uppercase">{t.level}</span>}</p>
                                                    <p className="text-xs text-zinc-400"><span className="text-green-400 font-bold">Dịch nghĩa:</span> {t.translated}</p>
                                                    {i < videoResult.translations.length - 1 && <hr className="border-zinc-800 mt-2" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ⏱️ THỜI GIAN ĐÃ HỌC video này trong phiên hiện tại */}
                                    <p className="text-[9px] text-zinc-500 font-bold text-center">⏱️ Thời gian đã học: <span className="text-cyan-400">{formatStudyTime(videoStudySeconds)}</span></p>

                                    {/* ÔN TẬP TỪ VỰNG QUA ẢI: học xong video là ôn liền, tránh quên ngay */}
                                    <button onClick={startVideoVocabReview} className="w-full bg-gradient-to-r from-purple-800 to-cyan-700 text-white py-3 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                        🧠 ÔN TẬP TỪ VỰNG ({Math.max(1, Math.ceil((videoResult.translations || []).length / VOCAB_QUESTIONS_PER_ROUND))} Ải)
                                    </button>

                                    {/* ✍️ LUYỆN VIẾT CHỮ: chỉ hiện khi video dùng chữ tượng hình và có ít nhất 1 chữ Hán rút được từ Từ Vựng */}
                                    {videoResult.isCjk && getVideoHanziList().length > 0 && (
                                        <button onClick={() => { playSfx('CLICK'); setWritePracticeChar(null); setWriteCharModal(true); }} className="w-full bg-gradient-to-r from-pink-800 to-yellow-700 text-white py-3 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                                            ✍️ LUYỆN VIẾT CHỮ ({getVideoHanziList().length} Chữ)
                                        </button>
                                    )}

                                    <div className="flex gap-2">
                                        <button onClick={saveVideoNoteAction} className="flex-1 bg-gradient-to-r from-green-800 to-cyan-800 text-white py-4 text-[11px] font-black uppercase hover:scale-[1.02] transition-transform">LƯU BÍ TỊCH VÀO TÀNG KINH CÁC</button>
                                        {videoShareCode && <button onClick={()=>{ navigator.clipboard.writeText(videoShareCode); playSfx('CLICK'); alert("Đã chép Mã Bí Tịch Video!"); }} className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 text-[11px] font-black uppercase" title="Chép Mã Chia Sẻ">📤</button>}
                                    </div>
                                </>
                            )}

                            {user.videoNotes?.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase">🎵 Danh Sách Phát (bấm để phát lại):</p>
                                    <div className="space-y-2">
                                        {user.videoNotes.map(n => (
                                            <div key={n.id} className={`bg-black/80 border p-3 flex justify-between items-center cursor-pointer transition-colors ${videoLink === n.link ? 'border-cyan-400 bg-cyan-950/40' : 'border-zinc-800 hover:border-cyan-700'}`} onClick={()=>loadSavedVideoNote(n)}>
                                                <p className="text-[11px] text-zinc-300 truncate flex-1 mr-2 flex items-center gap-2"><span className="text-cyan-400">▶</span>{n.summary}</p>
                                                <button onClick={(e)=>{ e.stopPropagation(); shareVideoNoteAction(n); }} className="text-yellow-600 text-lg mr-2" title="Chép Mã chia sẻ">📤</button>
                                                <button onClick={async (e)=>{ e.stopPropagation(); if(await askConfirm("Xóa bí tịch này?")){ safeUserUpdate(user.uid, {videoNotes: user.videoNotes.filter(x=>x.id!==n.id)}); playSfx('FAIL'); } }} className="text-red-800 text-lg">🗑️</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
    );
}
