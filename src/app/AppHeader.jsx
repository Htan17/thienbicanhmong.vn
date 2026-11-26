import { AUDIO_URLS } from '../lib/audio.js';
import { SCREEN_TITLES } from '../config/gameData.js';
import { UserName } from '../components/common.jsx';
import { formatNumber } from '../lib/format.js';

// Công tắc + thanh âm lượng cho 1 kênh âm thanh. Định nghĩa NGOÀI AppHeader để không bị tạo lại (mất focus) mỗi lần cập nhật.
const SoundRow = ({ icon, title, desc, on, onToggle, vol, onVol, disabled, extra }) => (
    <div className={'border p-2.5 space-y-1.5 ' + (disabled ? 'border-zinc-800 opacity-50' : 'border-zinc-700')}>
        <div className="flex flex-nowrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-black text-white">{icon} {title}</p><p className="text-[10px] text-zinc-500 leading-snug">{desc}</p></div>
            <button role="switch" aria-checked={on} aria-label={title} disabled={disabled} onClick={onToggle} className="shrink-0 min-h-[44px] min-w-[56px] flex items-center justify-center">
                <span className={'relative inline-block w-12 h-7 rounded-full transition-colors ' + (on ? 'bg-cyan-500' : 'bg-zinc-700')}><span className={'absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} /></span>
            </button>
        </div>
        {onVol && <div className="flex items-center gap-2"><span className="text-[10px] text-zinc-500 w-7" aria-hidden="true">🔈</span><input type="range" min="0" max="1" step="0.05" value={vol} disabled={disabled || !on} onChange={e => onVol(e.target.value)} aria-label={'Âm lượng ' + title} className="flex-1 accent-cyan-500 h-8" /><span className="text-[10px] text-zinc-400 w-9 text-right tabular-nums">{Math.round(vol * 100)}%</span></div>}
        {extra}
    </div>
);

export function AppHeader({ core, audio, videoplayer, nav, profile }) {
    const { appState, latestUser, setShowMenuPanel, showMenuPanel, user } = core;
    const { audioErrors, bgmCurrentTime, bgmDuration, bgmNext, bgmOn, bgmPlaylist, bgmPrev, bgmShuffle, bgmTrackIndex, bgmVol, handleBgmUpload, handleSfxUpload, isMuted, playBgmTrackAt, playSfx, reloadAllSfx, seekBgm, setBgmVol, setSfxVol, setShowMusicPanel, sfxOn, sfxVol, showMusicPanel, toggleBgm, toggleBgmShuffle, toggleMute, toggleSfx, toggleUi, uiOn } = audio;
    const { setVideoResult } = videoplayer;
    const { changeAppState } = nav;
    const { setNewName, setProfileBg, setProfileBio, setProfileImage } = profile;
    const fmt = (t) => Math.floor((t || 0) / 60) + ':' + String(Math.floor((t || 0) % 60)).padStart(2, '0');
    const closeMusic = () => setShowMusicPanel(false);
    return (
                <div className={`safe-top absolute top-0 inset-x-0 max-w-lg mx-auto h-16 bg-zinc-950/90 backdrop-blur-md border-b-2 flex items-center gap-2 px-2 sm:px-3 z-50 transition-all duration-300 ${user.aura ? user.aura : 'border-yellow-700/40 shadow-[0_0_15px_rgba(184,134,11,0.2)]'}`}>
                    {/* 📱 KHUNG ĐIỆN THOẠI: 3 cột (trái | tiêu đề | phải) nằm TRONG luồng flex thay vì tiêu đề "absolute giữa màn hình"
                        - trước đây tiêu đề giữa đè lên nút Quay lại / chip kim cương trên màn hình hẹp. Cột giữa tự co + cắt "…". */}
                    {appState !== 'DASHBOARD' ? (
                        <button onClick={()=>{ playSfx('CLOSE'); setVideoResult(null); changeAppState('DASHBOARD'); }} className="flex items-center gap-1.5 text-zinc-300 hover:text-white pr-1 shrink-0 min-h-[44px]" title="Quay lại Bí Cảnh" aria-label="Quay lại Bí Cảnh">
                            <span className="text-2xl leading-none">←</span><span className="hidden min-[380px]:inline text-[10px] font-black uppercase tracking-wider text-zinc-500">Bí Cảnh</span>
                        </button>
                    ) : (
                    <div className="flex items-center gap-2 cursor-pointer min-w-0 flex-1" onClick={()=>{ setProfileImage(user.photo); setProfileBg(user.bgImage||''); setProfileBio(user.bio||''); setNewName(''); changeAppState('PROFILE'); }}>
                        <img src={user.photo} className={`w-10 h-10 shrink-0 object-cover ${user.frame ? 'frame-'+user.frame : 'border-2 border-yellow-500'}`} alt="avatar" />
                        <div className="leading-tight min-w-0">
                            <div className="truncate max-w-full"><UserName u={latestUser.current} cls="text-[12px] tracking-wide" /></div>
                            <div className="text-[10px] streak-fire font-black mt-1">🔥 {user.streakCount||0}</div>
                        </div>
                    </div>
                    )}
                    {appState !== 'DASHBOARD' && <span className="flex-1 min-w-0 truncate text-center text-[10px] font-black uppercase tracking-widest text-yellow-500 pointer-events-none">{SCREEN_TITLES[appState] || ''}</span>}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="flex flex-col gap-0.5 items-end mr-0.5">
                            <span className="ui-chip text-cyan-300 border-cyan-900/80" title={(user.spirit||0).toLocaleString('vi-VN')}>💎 {formatNumber(user.spirit)}</span>
                            <span className="ui-chip text-yellow-400 border-yellow-900/80" title={(user.fame||0).toLocaleString('vi-VN')}>⭐ {formatNumber(user.fame)}</span>
                        </div>
                        <div className="relative">
                            <button onClick={()=>{ playSfx('CLICK'); changeAppState('MAIL'); }} className="ui-icon-btn text-lg" aria-label="Thư">✉️</button>
                            {user.requests && user.requests.length > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_5px_red]">{user.requests.length}</span>}
                        </div>
                        {/* Gom các nút ít dùng (Tông Môn, Cửa Hàng, Âm thanh) vào 1 nút ☰ để không tràn hàng trên màn hình nhỏ. */}
                        <div className="relative">
                            <button onClick={()=>{ playSfx('CLICK'); setShowMenuPanel(v=>!v); }} className="ui-icon-btn text-lg" aria-label="Menu" aria-expanded={!!showMenuPanel}>☰</button>
                            {/* Dấu "!" khi CÒN 1 âm thanh bị lỗi tải; mở "Âm thanh & Nhạc" để Tải Lại. */}
                            {!isMuted && Object.values(audioErrors).some(Boolean) && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1 rounded-full animate-pulse shadow-[0_0_5px_red]">!</span>}
                        </div>
                    </div>

                    {showMenuPanel && (
                        <div className="safe-top absolute top-16 right-2 z-[70] w-52 bg-zinc-950 border-2 border-yellow-700 shadow-[0_0_20px_rgba(184,134,11,0.3)] p-2 space-y-1 animate-fadeIn">
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('GUILD'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2.5 min-h-[44px] text-[11px] font-black uppercase"><span className="text-lg">🏯</span> Tông Môn</button>
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('EXAM_PATH'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2.5 min-h-[44px] text-[11px] font-black uppercase"><span className="text-lg">🗺️</span> Tu Luyện Chi Lộ</button>
                            <button onClick={()=>{ setShowMenuPanel(false); changeAppState('SHOP'); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2.5 min-h-[44px] text-[11px] font-black uppercase"><span className="text-lg">🛍️</span> Cửa Hàng</button>
                            <button onClick={()=>{ playSfx('OPEN'); setShowMenuPanel(false); setShowMusicPanel(true); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2.5 min-h-[44px] text-[11px] font-black uppercase"><span className="text-lg">🎛️</span> Âm Thanh &amp; Nhạc</button>
                            <button onClick={()=>{ setShowMenuPanel(false); toggleMute(); }} className="w-full flex items-center gap-2 text-left text-zinc-200 hover:bg-zinc-800 px-3 py-2.5 min-h-[44px] text-[11px] font-black uppercase"><span className="text-lg">{isMuted ? '🔇' : '🔊'}</span> {isMuted ? 'Bật Tất Cả Âm' : 'Tắt Tất Cả Âm'}</button>
                        </div>
                    )}
                    {/* 🎛️ ÂM THANH & NHẠC: tách riêng NHẠC NỀN / HIỆU ỨNG / ÂM GIAO DIỆN. Vẽ qua portal ra <body>: trên điện thoại là
                        bảng trượt từ đáy màn hình (đủ rộng, chạm dễ, chừa vùng an toàn), trên máy tính là hộp nhỏ dưới thanh trên cùng.
                        (Không dùng fixed bên trong thanh trên cùng vì backdrop-blur khiến "fixed" neo theo thanh chứ không theo màn hình.) */}
                    {showMusicPanel && ReactDOM.createPortal(
                        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Âm thanh và nhạc">
                            <div className="absolute inset-0 bg-black/60" onClick={closeMusic} />
                            <div className="absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-16 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg pointer-events-none">
                                <div className="pointer-events-auto bg-zinc-950 border-t-2 sm:border-2 border-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.3)] p-3 space-y-2.5 animate-fadeIn max-h-[85dvh] overflow-y-auto custom-scrollbar sm:ml-auto sm:mr-2 sm:w-80 sm:max-h-[75vh]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                                    <div className="flex flex-nowrap justify-between items-center">
                                        <p className="text-[11px] text-cyan-400 font-black uppercase tracking-widest">🎛️ Âm Thanh &amp; Nhạc</p>
                                        <button onClick={closeMusic} aria-label="Đóng" className="text-zinc-400 hover:text-white text-lg min-h-[44px] min-w-[44px]">✕</button>
                                    </div>
                                    <SoundRow icon="🎵" title="Nhạc nền" desc="Phát/tạm dừng riêng, không ảnh hưởng hiệu ứng." on={bgmOn} onToggle={toggleBgm} vol={bgmVol} onVol={setBgmVol} />
                                    <SoundRow icon="🔊" title="Hiệu ứng" desc="Đúng/sai, thưởng, lên cấp, combo, mua đồ…" on={sfxOn} onToggle={toggleSfx} vol={sfxVol} onVol={setSfxVol}
                                        extra={<button onClick={()=>playSfx('CORRECT')} disabled={!sfxOn} className="w-full min-h-[40px] text-[10px] font-black uppercase border border-cyan-800 text-cyan-300 disabled:opacity-40">▶ Thử hiệu ứng</button>} />
                                    <SoundRow icon="🖱️" title="Âm giao diện" desc="Chạm nút, gõ phím, chuyển trang, mở/đóng bảng." on={uiOn && sfxOn} onToggle={toggleUi} disabled={!sfxOn} />
                                    <div className="border-t border-zinc-800 pt-2 space-y-2">
                                        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">🎵 Danh Sách Phát</p>
                                        <p className="text-xs text-white font-bold truncate">{bgmPlaylist[bgmTrackIndex]?.name || '---'}</p>
                                        <input type="range" className="w-full accent-cyan-500 h-8" aria-label="Tua bài" min="0" max={bgmDuration || 0} step="0.1" value={Math.min(bgmCurrentTime, bgmDuration || 0)} onChange={e=>seekBgm(Number(e.target.value))} />
                                        <div className="flex flex-nowrap justify-between text-[10px] text-zinc-500 font-bold -mt-1"><span>{fmt(bgmCurrentTime)}</span><span>{fmt(bgmDuration)}</span></div>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={toggleBgmShuffle} aria-pressed={bgmShuffle} className={`text-lg min-h-[44px] min-w-[44px] ${bgmShuffle ? 'text-cyan-400' : 'text-zinc-600'}`} title="Trộn bài" aria-label="Trộn bài">🔀</button>
                                            <button onClick={bgmPrev} className="text-xl text-white hover:text-cyan-400 min-h-[44px] min-w-[44px]" title="Bài trước" aria-label="Bài trước">⏮</button>
                                            <button onClick={toggleBgm} className="text-2xl text-white hover:text-cyan-400 min-h-[48px] min-w-[48px]" title="Phát/Tạm dừng nhạc" aria-label={bgmOn ? 'Tạm dừng nhạc' : 'Phát nhạc'}>{bgmOn ? '⏸️' : '▶️'}</button>
                                            <button onClick={bgmNext} className="text-xl text-white hover:text-cyan-400 min-h-[44px] min-w-[44px]" title="Bài tiếp" aria-label="Bài tiếp">⏭</button>
                                        </div>
                                        {bgmPlaylist.length > 1 && (
                                            <div className="max-h-28 overflow-y-auto custom-scrollbar border-t border-zinc-800 pt-1">
                                                {bgmPlaylist.map((t, i) => (
                                                    <button key={t.id} onClick={()=>playBgmTrackAt(i)} className={`w-full text-left text-[11px] truncate px-1 py-2 min-h-[40px] ${i===bgmTrackIndex ? 'text-cyan-400 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}>{i===bgmTrackIndex ? '▶ ' : ''}{t.name}</button>
                                                ))}
                                            </div>
                                        )}
                                        <label className="w-full flex items-center justify-center min-h-[44px] text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 text-[11px] font-black uppercase cursor-pointer border border-zinc-700">+ Tải Thêm Nhạc Nền<input type="file" accept="audio/*" multiple className="hidden" onChange={handleBgmUpload} /></label>
                                        <p className="text-[10px] text-zinc-500 leading-snug">Tải nhạc lên chỉ thay đổi nhạc nền. Hiệu ứng âm thanh vẫn giữ nguyên.</p>
                                    </div>
                                    <details className="border-t border-zinc-800 pt-2">
                                        <summary className="text-[11px] text-zinc-400 font-black uppercase cursor-pointer min-h-[40px] flex items-center">🔧 Sửa lỗi &amp; đổi file hiệu ứng</summary>
                                        <div className="space-y-1.5 pt-2">
                                            <button onClick={reloadAllSfx} className="w-full min-h-[44px] text-center bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 py-2 text-[11px] font-black uppercase border border-cyan-700">🔄 Tải Lại Âm Thanh</button>
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                                {Object.keys(AUDIO_URLS).filter(k => k !== 'BGM').map(k => (
                                                    <div key={k} className="flex flex-nowrap items-center justify-between gap-2">
                                                        <span className={`text-[11px] font-bold flex-1 ${audioErrors[k] ? 'text-red-500' : 'text-zinc-400'}`}>{audioErrors[k] ? '⚠️ ' : ''}{k}</span>
                                                        <label className="text-[10px] text-cyan-400 hover:text-cyan-200 cursor-pointer font-black uppercase px-3 py-2 min-h-[40px] flex items-center border border-cyan-800">Đổi File<input type="file" accept="audio/*" className="hidden" onChange={e=>handleSfxUpload(k, e)} /></label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>, document.body)}
                </div>
    );
}
