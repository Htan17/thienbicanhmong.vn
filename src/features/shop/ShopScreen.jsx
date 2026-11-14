import { APP_THEMES, BUFF_DAILY_LIMIT, BUFF_DEFS, FRAMES, ITEMS, NAME_COLORS, NAME_FRAMES, PERSONAL_AURAS, RANKS, SFX_PACKS, buffActive } from '../../config/gameData.js';
import { BuffTimer } from '../../components/common.jsx';
import { getVNSourceDate } from '../../lib/progress.js';

export function ShopScreen({ core, audio, exampath, nav, profile, shop }) {
    const { user } = core;
    const { playSfx } = audio;
    const { x2BoostTimeLeftStr } = exampath;
    const { changeAppState } = nav;
    const { equip } = profile;
    const { activateBuffAction, activateX2BoostAction, breakthroughRankAction, buyItemAction, buySfxPackAction } = shop;
    return (
                    <div className="w-full max-w-sm h-[85vh] bg-zinc-900 border border-yellow-700/50 p-5 flex flex-col shadow-2xl animate-fadeIn">
                        <h2 className="text-yellow-500 font-black text-center text-2xl italic mb-4 font-playfair drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">PHÁP BẢO CÁC</h2>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-6">
                            
                            {/* MỤC MỚI: MÀU NỀN ẢO CẢNH */}
                            <div><p className="text-[11px] text-pink-400 font-black border-l-4 border-pink-400 pl-2 mb-3 uppercase tracking-widest">Ảo Cảnh Nền (💎)</p>
                                {APP_THEMES.map(theme => (
                                    <div key={theme.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 bg-zinc-900 border border-zinc-500 ${theme.id}`}></div>
                                            <span className="text-[11px] font-black uppercase text-white">{theme.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] text-pink-400 font-black">{theme.price} 💎</span>
                                            {user.appTheme === theme.id ? 
                                                <button onClick={()=>{ playSfx('CLICK'); equip('appTheme'); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> 
                                                : (user.inventory?.includes(theme.id) ? 
                                                    <button onClick={()=>{ playSfx('CLICK'); equip('appTheme', theme.id); }} className="bg-pink-600 text-white px-3 py-1 text-[9px] font-black">Dùng</button> 
                                                    : <button onClick={()=>buyItemAction(theme.price, theme.id, 'spirit', 'appTheme')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>
                                                )
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {Object.keys(BUFF_DEFS).some(id => buffActive(user, id)) && (<div className="bg-emerald-950/30 border border-emerald-700/60 p-3"><p className="text-[10px] text-emerald-400 font-black uppercase mb-2">✨ Hiệu lực đang chạy</p>{Object.keys(BUFF_DEFS).filter(id => buffActive(user, id)).map(id => (<div key={id} className="flex justify-between text-[10px] text-zinc-300 py-0.5"><span>{BUFF_DEFS[id].icon} {BUFF_DEFS[id].name}</span><span className="text-emerald-300"><BuffTimer until={user.buffs[id]} /></span></div>))}</div>)}
                            <div><p className="text-[11px] text-cyan-400 font-black border-l-4 border-cyan-400 pl-2 mb-3 uppercase tracking-widest">Trân Bảo (💎)</p>
                                {ITEMS.map(item => (
                                    <div key={item.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                        <span className="text-xs font-black text-white">{item.icon} {item.name} {item.id==='x2_card'&&<span className="text-[8px] text-zinc-500 block mt-1">(Còn {2-(user.dailyPurchases?.date===getVNSourceDate(new Date())?(user.dailyPurchases.x2||0):0)}/2 lượt)</span>}{(item.desc || BUFF_DEFS[item.id]) && <span className="text-[9px] text-zinc-500 font-normal italic block mt-1 normal-case">{item.desc || BUFF_DEFS[item.id].desc}</span>}</span>
                                        {/* 🆕 Bùa Nhân Đôi giờ có 3 trạng thái riêng: (1) đang có hiệu lực -> hiện đếm ngược thay vì nút mua,
                                            (2) đã mua nhưng chưa kích hoạt -> hiện nút "Kích Hoạt", (3) chưa có thẻ nào -> hiện nút mua như cũ. */}
                                        {item.id === 'x2_card' ? (
                                            (user.x2BoostExpiresAt && user.x2BoostExpiresAt > Date.now()) ? (
                                                <span className="text-[9px] text-emerald-400 font-black text-right whitespace-nowrap">🧧 Còn hiệu lực<br/>{x2BoostTimeLeftStr}</span>
                                            ) : (user.inventory || []).includes('x2_card') ? (
                                                <button onClick={activateX2BoostAction} className="bg-emerald-700 text-white px-4 py-2 text-[10px] font-black hover:bg-emerald-600 animate-pulse">Kích Hoạt</button>
                                            ) : (
                                                <button onClick={()=>buyItemAction(item.price, item.id, 'spirit')} className="bg-zinc-800 text-white px-4 py-2 text-[10px] font-black hover:bg-cyan-700">{item.price} LT</button>
                                            )
                                        ) : BUFF_DEFS[item.id] ? (() => {
                                            const n = (user.inventory || []).filter(x => x === item.id).length;
                                            const bought = (user.dailyPurchases && user.dailyPurchases.date === getVNSourceDate(new Date()) && user.dailyPurchases.b && user.dailyPurchases.b[item.id]) || 0;
                                            return (<div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                {buffActive(user, item.id) && <span className="text-[9px] text-emerald-400 font-black whitespace-nowrap">● còn <BuffTimer until={user.buffs[item.id]} /></span>}
                                                <div className="flex gap-1">
                                                    {n > 0 && <button onClick={() => activateBuffAction(item.id)} className="bg-emerald-700 text-white px-3 py-2 text-[10px] font-black hover:bg-emerald-600 animate-pulse">Dùng ({n})</button>}
                                                    <button onClick={() => buyItemAction(item.price, item.id, 'spirit')} className="bg-zinc-800 text-white px-3 py-2 text-[10px] font-black hover:bg-cyan-700">{item.price} 💎</button>
                                                </div>
                                                <span className="text-[8px] text-zinc-600">Còn {Math.max(0, BUFF_DAILY_LIMIT - bought)}/{BUFF_DAILY_LIMIT} lượt mua hôm nay</span>
                                            </div>);
                                        })() : (
                                            user.inventory?.includes(item.id) ? <span className="text-[9px] text-zinc-600 font-bold italic">Đã Sở Hữu</span> : <button onClick={()=>buyItemAction(item.price, item.id, 'spirit')} className="bg-zinc-800 text-white px-4 py-2 text-[10px] font-black hover:bg-cyan-700">{item.price} LT</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div><p className="text-[11px] text-amber-400 font-black border-l-4 border-amber-400 pl-2 mb-3 uppercase tracking-widest">Bộ Âm Thanh (💎)</p>
                                {SFX_PACKS.map(pk => { const owned = pk.price === 0 || (user.inventory || []).includes('sfx_' + pk.id); const using = (user.sfxPack || 'default') === pk.id; return (
                                    <div key={pk.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center gap-2">
                                        <div className="min-w-0"><p className="text-[11px] font-black text-white">{pk.icon} {pk.name}</p><p className="text-[9px] text-zinc-500 italic">{pk.desc}</p></div>
                                        <div className="flex gap-1 flex-shrink-0 items-center">
                                            <button onClick={() => { const prev = window.__sfxPack; window.__sfxPack = pk.id; window.__synthSfx('REWARD'); window.__sfxPack = prev; }} className="border border-zinc-600 text-zinc-300 px-2 py-1 text-[9px] font-black">🔊 Nghe</button>
                                            {using ? <span className="text-[9px] text-emerald-400 font-black px-2">ĐANG DÙNG</span> : owned ? <button onClick={() => { playSfx('EQUIP'); equip('sfx', pk.id); }} className="bg-amber-600 text-black px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={() => buySfxPackAction(pk)} className="bg-zinc-800 text-white px-3 py-1 text-[9px] font-black hover:bg-cyan-700">{pk.price} 💎</button>}
                                        </div>
                                    </div>); })}
                            </div>
                            <div><p className="text-[11px] text-indigo-400 font-black border-l-4 border-indigo-400 pl-2 mb-3 uppercase tracking-widest">Hào Quang Cá Nhân (💎)</p>
                                {PERSONAL_AURAS.filter(a => a.price !== 99999).map(a => (
                                    <div key={a.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                        <div className="flex items-center gap-3"><div className={`w-8 h-8 bg-zinc-900 border ${a.class}`}></div><span className="text-[11px] font-black uppercase text-white">{a.name}</span></div>
                                        <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-indigo-400 font-black">{a.price} 💎</span>
                                            {user.aura === a.class ? <button onClick={()=>{ playSfx('CLICK'); equip('aura'); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(a.id) ? <button onClick={()=>{ playSfx('CLICK'); equip('aura', a.id); }} className="bg-indigo-600 text-white px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(a.price, a.id, 'spirit', 'aura')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div><p className="text-[11px] text-yellow-500 font-black border-l-4 border-yellow-500 pl-2 mb-3 uppercase tracking-widest">Danh Hiệu (⭐)</p>
                                {NAME_FRAMES.filter(f => f.price !== 99999).map(f => (
                                    <div key={f.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                        <span className={`text-[12px] font-black uppercase ${f.class}`}>{f.name}</span>
                                        <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-yellow-500 font-black">{f.price} ⭐</span>
                                            {user.nameFrame === f.id ? <button onClick={()=>{ playSfx('CLICK'); equip('nameFrame'); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(f.id) ? <button onClick={()=>{ playSfx('CLICK'); equip('nameFrame', f.id); }} className="bg-yellow-600 text-black px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(f.price, f.id, 'fame')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Đổi</button>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div><p className="text-[11px] text-cyan-400 font-black border-l-4 border-cyan-400 pl-2 mb-3 uppercase tracking-widest">Màu Tên (💎)</p>
                                {NAME_COLORS.map(c => (
                                    <div key={c.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center hover:border-cyan-900/50 transition-colors">
                                        <span className="text-[12px] font-black uppercase" style={{color: c.color}}>{c.name}</span>
                                        <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-cyan-400 font-black">{c.price} 💎</span>
                                            {user.nameColor === c.color ? <button onClick={()=>{ playSfx('CLICK'); equip('nameColor'); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(c.id) ? <button onClick={()=>{ playSfx('CLICK'); equip('nameColor', c.id); }} className="bg-cyan-700 text-white px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(c.price, c.id, 'spirit', 'color')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Mua</button>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div><p className="text-[11px] text-yellow-500 font-black border-l-4 border-yellow-500 pl-2 mb-3 uppercase tracking-widest">Khung Ảnh (⭐)</p>
                                {FRAMES.map(f => (
                                    <div key={f.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center hover:border-yellow-900/50 transition-colors">
                                        <div className="flex items-center gap-3"><div className={`w-8 h-8 bg-zinc-900 frame-${f.id}`}></div><span className="text-[11px] font-black uppercase" style={{color: f.color}}>{f.name}</span></div>
                                        <div className="flex flex-col items-end gap-1"><span className="text-[9px] text-yellow-500 font-black">{f.price} ⭐</span>
                                            {user.frame === f.id ? <button onClick={()=>{ playSfx('CLICK'); equip('frame'); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px] font-black">Gỡ</button> : (user.inventory?.includes(f.id) ? <button onClick={()=>{ playSfx('CLICK'); equip('frame', f.id); }} className="bg-yellow-600 text-black px-3 py-1 text-[9px] font-black">Dùng</button> : <button onClick={()=>buyItemAction(f.price, f.id, 'fame')} className="border border-zinc-600 text-zinc-300 px-3 py-1 text-[9px] font-black">Đổi</button>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div><p className="text-[11px] text-zinc-400 font-black border-l-4 border-zinc-500 pl-2 mb-3 uppercase tracking-widest">Cảnh Giới (💎/⭐)</p>
                                {(() => { const curRankLv = (RANKS.find(x => x.id === user.rank) || RANKS[0]).level; return RANKS.map(r => (
                                    <div key={r.id} className="bg-black border border-zinc-800 p-3 mb-2 flex justify-between items-center">
                                        <div><p className="text-[12px] font-black uppercase" style={{color: r.color}}>{r.name}</p>{r.price > 0 && <p className="text-[9px] text-zinc-500 font-bold mt-1">{r.price} LT {r.reqFame > 0 ? `| ${r.reqFame} ⭐` : ''}</p>}<p className="text-[8px] text-cyan-500 font-bold mt-0.5">Công dụng: +{r.bonusPercent}% Linh Thạch mỗi Ải</p></div>
                                        {user.rank === r.id ? <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-3 py-1 border border-yellow-500/30">Đã Đạt Tới</span> : r.level === curRankLv + 1 ? <button onClick={()=>breakthroughRankAction(r)} className="bg-yellow-600 text-black px-3 py-2 text-[9px] font-black hover:bg-yellow-500 shadow-md">ĐỘT PHÁ</button> : <span className="text-[9px] text-zinc-600 bg-zinc-900 px-3 py-2 border border-zinc-800" title="Phải đột phá tuần tự từng cảnh giới">🔒 Khóa</span>}
                                    </div>
                                )); })()}
                            </div>
                        </div>
                        <button onClick={()=>changeAppState('DASHBOARD')} className="w-full bg-zinc-800 py-4 mt-3 text-[11px] font-black uppercase text-zinc-400 hover:text-white transition-colors">RỜI KHỎI PHÁP BẢO CÁC</button>
                    </div>
    );
}
