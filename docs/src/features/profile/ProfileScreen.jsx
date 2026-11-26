import { GEMINI_MODEL_LIST, GeminiPool, getPreferredGeminiModel } from '../../lib/gemini.js';
import { RESEARCH_UI_UIDS } from '../../config/researchUi.js';
import { auth } from '../../config/firebase.js';
import { compressImageFile } from '../../lib/helpers.js';
import { isGoogleLinked, realEmailOf } from '../auth/authHelpers.js';

export function ProfileScreen({ core, audio, auth, theme, gemini, nav, profile }) {
    const { isAdmin, user } = core;
    const { handleBgmUpload, playSfx } = audio;
    const { handleDeleteAccount, handleLinkGoogleAccount, handleLinkRecoveryEmail, handleLogout, recoveryEmailInput, setPwdModal, setRecoveryEmailInput } = auth;
    const { setThemeAction, setUiModeAction, themeMode, uiMode } = theme;
    const { geminiKey2, handleSaveKey, handleTestKeys, keyDraft1, keyDraft2, keyTesting, setKeyDraft1, setKeyDraft2, setPoolTick, setShowKeys, showKeys, videoApiKey } = gemini;
    const { changeAppState } = nav;
    const { handleChangeNameAction, newName, profileBg, profileBio, profileImage, saveProfileAction, setNewName, setProfileBg, setProfileBio, setProfileImage } = profile;
    return (
                    <div className="w-full h-[85vh] max-w-sm bg-zinc-900 border border-yellow-700/50 p-6 text-center overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn">
                        <h2 className="text-yellow-500 font-black uppercase text-xl mb-6 tracking-widest">Khắc Họa Chân Ngã</h2>
                        <div className="relative inline-block mb-4"><img src={profileImage} className={`w-24 h-24 object-cover ${user.frame?'frame-'+user.frame:'border-2 border-yellow-500'} ${user.aura||''}`} alt="avatar" /></div><br/>
                        
                        <div className="flex justify-center gap-2 mb-4">
                            <label className="flex flex-col items-center justify-center text-[9px] bg-zinc-800 hover:bg-zinc-700 px-4 py-2 font-bold uppercase cursor-pointer transition-colors border border-zinc-700">
                                <span>Đổi Ảnh</span>
                                <span className="text-[7px] text-zinc-400 lowercase font-normal mt-0.5">(avatar)</span>
                                <input type="file" className="hidden" accept="image/*" onChange={e=>{ const file = e.target.files[0]; if(file){ if(file.size > 10 * 1024 * 1024) return alert("Dung lượng quá lớn!"); compressImageFile(file, 256, 0.82).then(setProfileImage).catch(err => alert((err && err.message) || 'Không đọc được ảnh')); } }}/>
                            </label>
                            <label className="flex flex-col items-center justify-center text-[9px] bg-indigo-900 hover:bg-indigo-700 px-4 py-2 font-bold uppercase cursor-pointer transition-colors border border-indigo-500 text-indigo-200">
                                <span>Truyền Tiên Âm</span>
                                <span className="text-[7px] text-indigo-400 lowercase font-normal mt-0.5">(nhạc nền mp3)</span>
                                <input type="file" className="hidden" accept="audio/*,video/mp4" onChange={handleBgmUpload}/>
                            </label>
                        </div>

                        <div className="mt-6 bg-black border border-cyan-900/50 p-3 flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-black uppercase">ID: <span className="text-cyan-400 text-xs">{user.gameId || user.uid}</span></span>
                            <button onClick={()=>{navigator.clipboard.writeText(user.gameId || user.uid); alert("Đã chép ID!");}} className="bg-zinc-800 px-3 py-2 text-[9px] text-white font-black">COPY</button>
                        </div>
                        <div className="mt-6 text-left space-y-3 bg-black/40 p-4 border border-zinc-800">
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Đạo Hiệu Mới</p>
                            <input className="w-full bg-zinc-900 border border-zinc-700 p-3 text-sm text-white mb-1 outline-none" placeholder="Nhập Đạo Hiệu..." value={newName} onChange={e=>setNewName(e.target.value)} />
                            <p className="text-[9px] text-zinc-500 font-bold">Phí: <span className="text-cyan-400">1000 LT</span> & <span className="text-yellow-500">100 ⭐</span>.</p>
                            <button onClick={handleChangeNameAction} className="w-full bg-cyan-900 text-cyan-200 border border-cyan-600 py-3 text-[10px] font-black uppercase">Đổi Đạo Hiệu</button>
                        </div>
                        <div className="mt-6 bg-black/40 border border-cyan-900/60 p-3 text-left space-y-2">
                            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">🔑 API Key Gemini · Song Kiếm</p>
                            <p className="text-[9px] text-zinc-500 leading-relaxed">Nhập 2 Key khác nhau: Key nào không gọi được (hết lượt, sai, treo, máy chủ bận) thì AI tự chuyển ngay sang Key còn lại. Hạn mức chỉ cộng dồn khi 2 Key thuộc 2 dự án Google khác nhau (tạo tại aistudio.google.com/apikey). Key 1 dùng chung với mục Học Qua Video.</p>
                            <div className="flex gap-1">
                                <button onClick={() => GeminiPool.setMode('parallel')} className={'flex-1 py-2 text-[9px] font-black uppercase border ' + (GeminiPool.getMode() === 'parallel' ? 'bg-cyan-600 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700')}>Song song (chia đều)</button>
                                <button onClick={() => GeminiPool.setMode('backup')} className={'flex-1 py-2 text-[9px] font-black uppercase border ' + (GeminiPool.getMode() === 'backup' ? 'bg-cyan-600 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700')}>Key 2 dự phòng</button>
                            </div>
                            <div className="bg-black/40 border border-zinc-800 p-2">
                                <p className="text-[9px] text-zinc-400 font-bold uppercase mb-1">Mô hình AI ưu tiên</p>
                                <select value={getPreferredGeminiModel()} onChange={e => { try { if (e.target.value) localStorage.setItem('geminiPreferredModel', e.target.value); else localStorage.removeItem('geminiPreferredModel'); } catch (err) {} setPoolTick(x => x + 1); }} className="w-full bg-zinc-900 border border-zinc-700 text-white text-[10px] p-2 outline-none">
                                    <option value="">Tự động (thử lần lượt {GEMINI_MODEL_LIST.length} mô hình)</option>
                                    {GEMINI_MODEL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Mô hình lỗi/hết lượt sẽ tự chuyển sang mô hình kế tiếp, không cần làm gì thêm.</p>
                            </div>
                            {[1, 2].map(n => {
                                const draft = n === 1 ? keyDraft1 : keyDraft2;
                                const saved = n === 1 ? videoApiKey : geminiKey2;
                                const stt = GeminiPool.statusOf(saved.trim());
                                const le = GeminiPool.lastOf(saved.trim());
                                return (
                                    <div key={n} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase">{n === 1 ? 'Key 1 (chính)' : 'Key 2 (phụ)'}</span>
                                            <span className={'text-[9px] font-black ' + stt.cls}>{stt.text}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <input type={showKeys ? 'text' : 'password'} autoComplete="off" spellCheck={false} className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500" placeholder="AIza..." value={draft} onChange={e => (n === 1 ? setKeyDraft1(e.target.value) : setKeyDraft2(e.target.value))} />
                                            <button onClick={() => handleSaveKey(n)} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-3 text-[10px] font-black uppercase">Lưu</button>
                                        </div>
                                        {le && <p className="text-[9px] text-zinc-500 break-words">Lỗi gần nhất: {le}</p>}
                                    </div>
                                );
                            })}
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setShowKeys(s => !s)} className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 py-2 text-[10px] font-black uppercase">{showKeys ? 'Ẩn Key' : 'Hiện Key'}</button>
                                <button onClick={handleTestKeys} disabled={keyTesting} className="flex-1 bg-indigo-900 border border-indigo-500 text-indigo-200 py-2 text-[10px] font-black uppercase disabled:opacity-50">{keyTesting ? 'Đang thử...' : 'Thử Key'}</button>
                            </div>
                            <p className="text-[9px] text-emerald-400 font-bold">{GeminiPool.summary(videoApiKey)}</p>
                        </div>
                        <div className="mt-6 bg-black/40 border border-red-900/50 p-3">
                           <p className="text-[10px] text-red-500 font-black mb-2 uppercase">Bảo Mật</p>
                            <button onClick={() => { playSfx('CLICK'); setPwdModal({show: true, val: '', oldVal: ''}); }} className="w-full bg-red-900/40 text-red-300 border border-red-600 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white">Đổi Mật Mã</button>
                            <div className="mt-3 pt-3 border-t border-red-900/30">
                                <p className="text-[9px] text-zinc-500 font-bold mb-2 leading-relaxed">Liên kết Google để có đường lui, tránh mất tài khoản nếu quên Mật Mã (bắt buộc nếu là tài khoản khách/tự tạo):</p>
                                {isGoogleLinked ? (
                                    <p className="w-full bg-green-900/30 text-green-400 border border-green-700 py-3 text-[10px] font-black uppercase tracking-widest text-center">✓ ĐÃ LIÊN KẾT GOOGLE</p>
                                ) : (
                                    <button onClick={handleLinkGoogleAccount} className="w-full bg-white text-black py-3 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">🔗 LIÊN KẾT TÀI KHOẢN GOOGLE</button>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-red-900/30">
                                {realEmailOf(auth.currentUser) ? (
                                    <p className="w-full bg-green-900/30 text-green-400 border border-green-700 py-3 text-[10px] font-black uppercase tracking-widest text-center">✉️ Email Khôi Phục: {realEmailOf(auth.currentUser)}</p>
                                ) : (
                                    <>
                                        <p className="text-[9px] text-zinc-500 font-bold mb-2 leading-relaxed">Hoặc thêm Email thật để nhận LIÊN KẾT khôi phục Mật Mã qua mail nếu quên:</p>
                                        <div className="flex gap-2">
                                            <input className="flex-1 bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-cyan-500" placeholder="ban@email.com" value={recoveryEmailInput} onChange={e=>setRecoveryEmailInput(e.target.value)} />
                                            <button onClick={handleLinkRecoveryEmail} className="bg-cyan-800 text-cyan-100 border border-cyan-500 px-4 text-[10px] font-black uppercase">Lưu</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 h-16 bg-black border border-zinc-800 overflow-hidden flex items-center justify-center relative">{profileBg ? <img src={profileBg} className="w-full h-full object-cover opacity-60"/> : <span className="text-[10px] text-zinc-600 font-playfair italic">Chưa thiết lập ảo cảnh nền</span>}</div>
                        <label className="text-[9px] bg-zinc-800 px-4 py-2 font-bold uppercase mt-2 cursor-pointer inline-block border border-zinc-700">Đổi Ảo Cảnh Nền<input type="file" className="hidden" accept="image/*" onChange={e=>{ const file = e.target.files[0]; if(file){ if(file.size > 10 * 1024 * 1024) return alert("Dung lượng quá lớn!"); compressImageFile(file, 960, 0.7).then(setProfileBg).catch(err => alert((err && err.message) || 'Không đọc được ảnh')); } }}/></label>
                        <div className="mt-6 text-left">
                            <p className="text-[10px] text-yellow-500 font-black mb-2 uppercase tracking-widest">Di ngôn:</p>
                            <textarea className="w-full bg-black border border-zinc-800 p-3 text-xs italic text-zinc-300 outline-none" rows="3" value={profileBio} onChange={e=>setProfileBio(e.target.value)} maxLength="100" placeholder="Viết di ngôn..."/>
                        </div>
                        <button onClick={saveProfileAction} className="w-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 text-black py-4 mt-6 text-[11px] font-black uppercase hover:scale-[1.02] shadow-lg">LƯU LẠI ẤN KÝ</button>
                        {isAdmin && <button onClick={() => changeAppState('MODERATION')} className="w-full mt-4 text-[10px] text-yellow-400 font-bold uppercase py-2 border border-yellow-700/60">🛡️ BẢNG QUẢN TRỊ</button>}
                        {(isAdmin || (user && RESEARCH_UI_UIDS.includes(user.uid))) && <button onClick={() => changeAppState('RESEARCH_DASHBOARD')} className="w-full mt-2 text-[10px] text-yellow-400 font-bold uppercase py-2 border border-yellow-700/60">📊 Thống kê nghiên cứu</button>}
                    <button onClick={handleLogout} className="w-full mt-4 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">ĐĂNG XUẤT</button>
                    <button onClick={handleDeleteAccount} className="w-full mt-2 text-[9px] text-zinc-500 font-bold uppercase py-2 border border-zinc-800 hover:text-red-400 hover:border-red-900">XOÁ TÀI KHOẢN VĨNH VIỄN</button>
                        <button onClick={()=>changeAppState('DASHBOARD')} className="mt-6 text-[10px] text-zinc-500 font-bold uppercase hover:text-white pb-1 block mx-auto">ĐÓNG HỒ SƠ</button>
                        <div className="mt-4 pt-3 border-t border-zinc-800">
                            <p className="text-[10px] text-zinc-300 font-black uppercase mb-2">⚙ Cài đặt · Chế độ giao diện</p>
                            <div className="grid grid-cols-2 gap-2" role="radiogroup">
                                {[['study', '📘 Học tập', 'Màu cơ bản, thuật ngữ học đường'], ['thienkieu', '🏯 Bí Tịch', 'Phong cách tu tiên (Thiên Kiều)']].map(([m, lb, ds]) => (
                                    <button key={m} role="radio" aria-checked={uiMode === m} onClick={() => setUiModeAction(m)} className={`p-2 border text-left ${uiMode === m ? 'border-yellow-500 bg-yellow-900/20' : 'border-zinc-700 bg-black/40'}`}>
                                        <span className="flex items-center gap-1.5 text-[11px] font-black text-white"><span className={`w-3 h-3 rounded-full border ${uiMode === m ? 'bg-yellow-400 border-yellow-300' : 'border-zinc-500'}`}></span>{lb}</span>
                                        <span className="block text-[9px] text-zinc-500 mt-1" data-noterm>{ds}</span>
                                    </button>))}
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-1.5 leading-snug" data-noterm>Chế độ "Học tập" đổi Linh Thạch → Điểm thưởng, Danh Vọng → Thành tích, Đạo Hữu → Bạn học, Tông Môn → Nhóm học tập, Tu Luyện Chi Lộ → Lộ trình học, Tàng Kinh Các → Thư viện học liệu...</p>
                            <p className="text-[10px] text-zinc-300 font-black uppercase mt-3 mb-2">🎨 Giao diện sáng / tối</p>
                            <div className="grid grid-cols-3 gap-2" role="radiogroup" data-noterm>
                                {[['dark', '🌙 Tối'], ['light', '☀️ Sáng'], ['auto', '🖥️ Tự động']].map(([m, lb]) => (
                                    <button key={m} role="radio" aria-checked={themeMode === m} onClick={() => setThemeAction(m)} className={`py-2 border text-[11px] font-black ${themeMode === m ? 'border-yellow-500 bg-yellow-900/20 text-yellow-400' : 'border-zinc-700 bg-black/40 text-zinc-400'}`}>{lb}</button>))}
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
                            <a href="dieu-khoan.html" target="_blank" rel="noopener noreferrer" className="text-[10px] text-yellow-600 font-bold underline hover:text-white">Điều Khoản Dịch Vụ &amp; Chính Sách Bảo Mật</a>
                            <p className="text-[9px] text-zinc-600 mt-1">Dự án phi thương mại · Linh Thạch là tiền tệ ảo, không quy đổi ra tiền thật</p>
                        </div>
                    </div>
    );
}
