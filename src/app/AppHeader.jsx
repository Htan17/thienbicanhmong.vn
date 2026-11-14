import { AUDIO_URLS } from '../lib/audio.js';
import { SCREEN_TITLES } from '../config/gameData.js';
import { UserName } from '../components/common.jsx';
import { formatNumber } from '../lib/format.js';

export function AppHeader({ core, audio, videoplayer, nav, profile }) {
    const { appState, latestUser, setShowMenuPanel, showMenuPanel, user } = core;
    const { audioErrors, bgmCurrentTime, bgmDuration, bgmNext, bgmPlaylist, bgmPrev, bgmShuffle, bgmTrackIndex, handleBgmUpload, handleSfxUpload, isMuted, playBgmTrackAt, playSfx, reloadAllSfx, seekBgm, setShowMusicPanel, showMusicPanel, toggleBgmShuffle, toggleMute } = audio;
    const { setVideoResult } = videoplayer;
    const { changeAppState } = nav;
    const { setNewName, setProfileBg, setProfileBio, setProfileImage } = profile;
    return (
                <div className={`safe-top absolute top-0 inset-x-0 max-w-lg mx-auto h-16 bg-zinc-950/90 backdrop-blur-md border-b-2 flex items-center justify-between px-3 z-50 transition-all duration-300 ${user.aura ? user.aura : 'border-yellow-700/40 shadow-[0_0_15px_rgba(184,134,11,0.2)]'}`}>
                    {appState !== 'DASHBOARD' ? (
                        <button onClick={()=>{ playSfx('CLICK'); setVideoResult(null); changeAppState('DASHBOARD'); }} className="flex items-center gap-2 text-zinc-300 hover:text-white pr-2 shrink-0" title="Quay lại Bí Cảnh">
                            <span className="text-2xl leading-none">←</span><span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Bí Cảnh</span>
                        </button>
                    ) : (
                    <div className="flex items-center gap-2 cursor-pointer" onClick={()=>{ setProfileImage(user.photo); setProfileBg(user.bgImage||''); setProfileBio(user.bio||''); setNewName(''); changeAppState('PROFILE'); }}>
                        <img src={user.photo} className={`w-10 h-10 object-cover ${user.frame ? 'frame-'+user.frame : 'border-2 border-yellow-500'}`} alt="avatar" />
                        <div className="leading-tight">
                            <UserName u={latestUser.current} cls="text-[12px] tracking-wide" />
                            <div className="text-[10px] streak-fire font-black mt-1">🔥 {user.streakCount||0}</div>
                        </div>
                    </div>
                    )}
                    {appState !== 'DASHBOARD' && SCREEN_TITLES[appState] && <span className="absolute left-1/2 -translate-x-1/2 max-w-[34%] truncate text-[10px] font-black uppercase tracking-widest text-yellow-500 pointer-events-none">{SCREEN_TITLES[appState]}</span>}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5 items-end mr-0.5">
                            <span className="ui-chip text-cyan-300 border-cyan-900/80" title={(user.spirit||0).toLocaleString('vi-VN')}>💎 {formatNumber(user.spirit)}</span>
                            <span className="ui-chip text-yellow-400 border-yellow-900/80" title={(user.fame||0).toLocaleString('vi-VN')}>⭐ {formatNumber(user.fame)}</span>
                        </div>
                        <div className="relative">
                            <button onClick={()=>{ playSfx('CLICK'); changeAppState('MAIL'); }} className="ui-icon-btn text-lg" aria-label="Thư">✉️</button>
                            {user.requests && user.requests.length > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_5px_red]">{user.requests.length}</span>}
                        </div>
                        {/* SỬA LỖI GIAO DIỆN RỐI/TRÀN HÀNG: gom các nút chức năng ít dùng (Tông Môn, Cửa
                            Hàng, Nhạc, Âm thanh) vào 1 nút ☰ duy nhất thay vì xếp hàng ngang dễ tràn/chồng
                            lên thanh tên khi màn hình nhỏ hoặc thêm icon mới. */}
                        <div className="relative">
                            <button onClick={()=>{ playSfx('CLICK'); setShowMenuPanel(v=>!v); }} className="ui-icon-btn text-lg" aria-label="Menu">☰</button>
                            {/* 🆕 SỬA LỖI ÂM THANH: trước đây dấu "!" chỉ báo lỗi riêng nhạc nền (BGM), khiến
                                người dùng không biết các hiệu ứng CLICK/CORRECT/WRONG... cũng đang lỗi. Giờ
                                báo hễ CÒN 1 hiệu ứng bất kỳ bị lỗi là hiện dấu "!", bấm vào 🎵 Tiên Âm để
                                thấy nút "Tải Lại Âm Thanh" sửa nhanh. */}
                            {!isMuted && Object.values(audioErrors).some(Boolean) && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[8px] font-black px-1 rounded-full animate-pulse shadow-[0_0_5px_red]">!</span>}
                        </div>
                    </div>

                    {/* 🆕 SỬA LỖI KHUNG MÁY TÍNH: đổi "fixed" (neo theo góc MÀN HÌNH thật) thành "absolute"
                        và ĐẶT VÀO BÊN TRONG thanh top bar (đã giới hạn max-w-lg) để 2 bảng này luôn bám
                        sát đúng vị trí nút ☰/nhạc bên dưới, thay vì bay lạc ra góc phải màn hình rộng
                        trên máy tính trong khi nội dung app lại nằm co cụm ở giữa. */}
                    {showMenuPanel && (
                        <div className="safe-top absolute top-16 right-2 z-[70] w-48 bg-zinc-950 border-2 border-yellow-700 shadow-[0_0_20px_rgba(184,134,11,0.3)] p-2 space-y-1 animate-fadeIn">
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('GUILD'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🏯</span> Tông Môn</button>
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('EXAM_PATH'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🗺️</span> Tu Luyện Chi Lộ</button>
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('SHOP'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🛍️</span> Cửa Hàng</button>
                            <button onClick={()=>{ playSfx('CLICK'); setShowMenuPanel(false); setShowMusicPanel(true); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">🎵</span> Tiên Âm</button>
                            <button onClick={()=>{ setShowMenuPanel(false); toggleMute(); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2 text-[11px] font-black uppercase"><span className="text-lg">{isMuted ? '🔇' : '🔊'}</span> {isMuted ? 'Bật Âm Thanh' : 'Tắt Âm Thanh'}</button>
                        </div>
                    )}
                    {/* 🎵 TAB NHỎ DANH SÁCH PHÁT TIÊN ÂM: phát/tạm dừng, bài trước/sau, trộn bài, tua bài, tải thêm nhạc */}
                    {showMusicPanel && (
                        <div className="safe-top absolute top-16 right-2 z-[70] w-64 bg-zinc-950 border-2 border-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.3)] p-3 space-y-2 animate-fadeIn">
                            <div className="flex justify-between items-center">
                                <p className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">🎵 Danh Sách Phát</p>
                                <button onClick={()=>setShowMusicPanel(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
                            </div>
                            <p className="text-[10px] text-white font-bold truncate">{bgmPlaylist[bgmTrackIndex]?.name || '---'}</p>
                            <input type="range" className="w-full accent-cyan-500" min="0" max={bgmDuration || 0} step="0.1" value={Math.min(bgmCurrentTime, bgmDuration || 0)} onChange={e=>seekBgm(Number(e.target.value))} />
                            <div className="flex justify-between text-[8px] text-zinc-500 font-bold -mt-1">
                                <span>{Math.floor(bgmCurrentTime/60)}:{String(Math.floor(bgmCurrentTime%60)).padStart(2,'0')}</span>
                                <span>{Math.floor((bgmDuration||0)/60)}:{String(Math.floor((bgmDuration||0)%60)).padStart(2,'0')}</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-1">
                                <button onClick={toggleBgmShuffle} className={`text-lg ${bgmShuffle ? 'text-cyan-400' : 'text-zinc-600'}`} title="Trộn bài">🔀</button>
                                <button onClick={bgmPrev} className="text-xl text-white hover:text-cyan-400" title="Bài trước">⏮</button>
                                <button onClick={toggleMute} className="text-2xl text-white hover:text-cyan-400" title="Phát/Tạm dừng">{isMuted ? '▶️' : '⏸️'}</button>
                                <button onClick={bgmNext} className="text-xl text-white hover:text-cyan-400" title="Bài tiếp">⏭</button>
                            </div>
                            {bgmPlaylist.length > 1 && (
                                <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 border-t border-zinc-800 pt-2">
                                    {bgmPlaylist.map((t, i) => (
                                        <p key={t.id} onClick={()=>playBgmTrackAt(i)} className={`text-[9px] truncate cursor-pointer px-1 py-0.5 ${i===bgmTrackIndex ? 'text-cyan-400 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}>{i===bgmTrackIndex ? '▶ ' : ''}{t.name}</p>
                                    ))}
                                </div>
                            )}
                            <label className="w-full block text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 text-[9px] font-black uppercase cursor-pointer border border-zinc-700">+ Tải Thêm Tiên Âm<input type="file" accept="audio/*" multiple className="hidden" onChange={handleBgmUpload} /></label>
                            {/* 🆕 SỬA LỖI "ÂM THANH VẪN BỊ LỖI": nút tải lại toàn bộ + danh sách từng hiệu
                                ứng cho phép thay file riêng khi 1 URL mixkit cụ thể bị chặn/lỗi mạng. */}
                            <div className="border-t border-zinc-800 pt-2 space-y-1">
                                <button onClick={reloadAllSfx} className="w-full text-center bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 py-2 text-[9px] font-black uppercase border border-cyan-700">🔄 Tải Lại Âm Thanh</button>
                                <p className="text-[8px] text-zinc-500 font-bold uppercase pt-1">Hiệu ứng riêng lẻ:</p>
                                <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1">
                                    {Object.keys(AUDIO_URLS).filter(k => k !== 'BGM').map(k => (
                                        <div key={k} className="flex items-center justify-between gap-2">
                                            <span className={`text-[9px] font-bold flex-1 ${audioErrors[k] ? 'text-red-500' : 'text-zinc-400'}`}>{audioErrors[k] ? '⚠️ ' : ''}{k}</span>
                                            <label className="text-[8px] text-cyan-400 hover:text-cyan-200 cursor-pointer font-black uppercase px-2 py-1 border border-cyan-800">Đổi File<input type="file" accept="audio/*" className="hidden" onChange={e=>handleSfxUpload(k, e)} /></label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
    );
}
