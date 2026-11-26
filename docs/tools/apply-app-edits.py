# Áp dụng các chỉnh sửa tối thiểu (Lộ trình 2 + 3) lên src/App.jsx sau khi tách module. Mỗi chỗ thay phải khớp ĐÚNG số lần kỳ vọng.
import sys
p=sys.argv[1]; t=open(p,encoding='utf-8').read()
import re
def rep(old,new,cnt=1):
    # Khớp không phụ thuộc thụt lề ở các dòng sau dòng đầu (file đã bị dedent khi tách module)
    global t
    parts=re.split(r'\n[ \t]*', old)
    pat=r'\n[ \t]*'.join(re.escape(x) for x in parts)
    n=len(re.findall(pat,t))
    assert n==cnt, f"kỳ vọng {cnt} lần, thấy {n}: {old[:90]!r}"
    t=re.sub(pat, lambda m: new, t)

rep("import { isContentBlocked } from './lib/contentFilter.js';",
"""import { ModerationPanel } from './components/ModerationPanel.jsx';
import { ReportModal } from './components/ReportModal.jsx';
import { blockMessage, checkContent, isContentBlocked, isContentBlockedBody, isPublicTextBlocked, isReservedName, sanitizePublicText } from './lib/contentFilter.js';
import { checkIsAdmin, guildLabel, maskGuilds, maskUser, subscribeHidden } from './lib/moderation.js';""")

rep("const [viewingUser, setViewingUser] = useState(null);",
"""const [viewingUser, setViewingUser] = useState(null);
    // KIỂM DUYỆT (Lộ trình #3): đối tượng đang báo cáo, cờ quản trị viên, bản gốc users/guilds để che/hiện lại khi quản trị viên ẩn/khôi phục
    const [reportTarget, setReportTarget] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const hiddenSetRef = useRef(new Set());
    const rawUsersRef = useRef([]);
    const rawGuildsRef = useRef({});""")

rep("setAllUsers(usersList); },", "rawUsersRef.current = usersList; setAllUsers(usersList.map(u => maskUser(u, hiddenSetRef.current))); },")
rep("setAllGuilds(guildsDict); },", "rawGuildsRef.current = guildsDict; setAllGuilds(maskGuilds(guildsDict, hiddenSetRef.current)); },")
rep("""        const seasonDocRef = firestore.collection('meta').doc('season');
        const guildDocRef = firestore.collection('meta').doc('guildSeason');
        // 🗺️ ĐẠO HỮU BẢNG""","""        // Danh sách nội dung bị quản trị viên ẩn + kiểm tra quyền quản trị (admins/{uid})
        const unsubHidden = subscribeHidden((set) => { if (!isMounted) return; hiddenSetRef.current = set; setAllUsers(rawUsersRef.current.map(u => maskUser(u, set))); setAllGuilds(maskGuilds(rawGuildsRef.current, set)); });
        checkIsAdmin(authUid).then(v => { if (isMounted) setIsAdmin(!!v); });

        const seasonDocRef = firestore.collection('meta').doc('season');
        const guildDocRef = firestore.collection('meta').doc('guildSeason');
        // 🗺️ ĐẠO HỮU BẢNG""")
rep("return () => { isMounted = false; unsubUsers(); unsubGuilds(); unsubSeason();", "return () => { isMounted = false; unsubUsers(); unsubGuilds(); unsubHidden(); unsubSeason();")

rep("""if (isContentBlocked(quizTitle) || isContentBlocked(rawQuizText)) {""","""if (isContentBlocked(quizTitle) || isContentBlockedBody(rawQuizText)) {""")
rep("""if (cleanName.length < 3) return alert("Đạo hiệu cần ít nhất 3 ký tự chữ/số (không dấu, không khoảng trắng)!");""",
"""if (cleanName.length < 3) return alert("Đạo hiệu cần ít nhất 3 ký tự chữ/số (không dấu, không khoảng trắng)!");
        if (authMode === 'register' && (isReservedName(cleanName) || isPublicTextBlocked(cleanName))) return alert("Đạo hiệu này không được phép sử dụng (từ ngữ không phù hợp hoặc trùng tên dành riêng của quản trị). Vui lòng chọn tên khác!");""")
rep("""if (/[\\W_]/g.test(clean)) return alert("Đạo hiệu chỉ được chứa chữ và số!");""",
"""if (/[\\W_]/g.test(clean)) return alert("Đạo hiệu chỉ được chứa chữ và số!");
            if (isReservedName(clean) || isPublicTextBlocked(clean)) return alert("Đạo hiệu này không được phép sử dụng (từ ngữ không phù hợp hoặc trùng tên dành riêng của quản trị).");""")
rep("""const safeName = newGuildName.trim().replace(/[\\/\\.\\#\\$\\[\\]]/g, '');
            if (!safeName || allGuilds[safeName]) return alert("Tên Tông môn không hợp lệ hoặc đã tồn tại trên giang hồ!");""",
"""const safeName = sanitizePublicText(newGuildName, 30).replace(/[\\/\\.\\#\\$\\[\\]]/g, '');
            if (!safeName || allGuilds[safeName]) return alert("Tên Tông môn không hợp lệ hoặc đã tồn tại trên giang hồ!");
            { const gc = checkContent(safeName); if (!gc.ok || isReservedName(safeName)) { playSfx('ERROR'); return alert(gc.ok ? "Tên Tông môn trùng tên dành riêng của quản trị. Vui lòng đổi tên." : blockMessage(gc, 'Tên Tông môn')); } }""")
rep("""await firestore.collection('guilds').doc(gObj.id).update({ notice: editNotice.trim() });
            playSfx('SUCCESS'); alert("Đã ban bố thông báo mới cho toàn tông môn!");""",
"""const noticeText = sanitizePublicText(editNotice, 200);
            { const nc = checkContent(noticeText); if (!nc.ok) { playSfx('ERROR'); return alert(blockMessage(nc, 'Cáo thị')); } }
            try { await firestore.collection('guilds').doc(gObj.id).update({ notice: noticeText }); }
            catch (e) { playSfx('WRONG'); return alert("Không ban bố được cáo thị: " + shortErr((e && e.message) || '')); }
            playSfx('SUCCESS'); alert("Đã ban bố thông báo mới cho toàn tông môn!");""")
rep("""const saveProfileAction = async () => { await safeUserUpdate(user.uid, { photo: profileImage, bgImage: profileBg, bio: profileBio.trim() }); playSfx('SUCCESS'); changeAppState('DASHBOARD'); };""",
"""const saveProfileAction = async () => {
        const bio = sanitizePublicText(profileBio, 100);
        { const bc = checkContent(bio); if (!bc.ok) { playSfx('ERROR'); return alert(blockMessage(bc, 'Di ngôn')); } }
        try { await safeUserUpdate(user.uid, { photo: profileImage, bgImage: profileBg, bio }); }
        catch (e) { playSfx('WRONG'); return alert("Không lưu được ấn ký: " + shortErr((e && e.message) || '') + " (ảnh quá nặng? hãy thử ảnh nhỏ hơn)."); }
        playSfx('SUCCESS'); changeAppState('DASHBOARD');
    };""")
rep("""if(file.size > 1.5 * 1024 * 1024) return alert("Dung lượng quá lớn!"); const reader = new FileReader(); reader.onload = ev => setProfileImage(ev.target.result); reader.readAsDataURL(file); } }}""",
"""if(file.size > 10 * 1024 * 1024) return alert("Dung lượng quá lớn!"); compressImageFile(file, 256, 0.82).then(setProfileImage).catch(err => alert((err && err.message) || 'Không đọc được ảnh')); } }}""")
rep("""if(file.size > 1.5 * 1024 * 1024) return alert("Dung lượng quá lớn!"); const reader = new FileReader(); reader.onload = ev => setProfileBg(ev.target.result); reader.readAsDataURL(file); } }}""",
"""if(file.size > 10 * 1024 * 1024) return alert("Dung lượng quá lớn!"); compressImageFile(file, 960, 0.7).then(setProfileBg).catch(err => alert((err && err.message) || 'Không đọc được ảnh')); } }}""")
rep("""if (!parsedData || !parsedData.t || !Array.isArray(parsedData.d)) throw new Error('sai định dạng');""",
"""if (!parsedData || !parsedData.t || !Array.isArray(parsedData.d)) throw new Error('sai định dạng');
                    if (isContentBlocked(parsedData.t)) { setRedeemMsg({ ok: false, text: 'Bí Tịch này có tên chứa nội dung không phù hợp nên không thể thu nạp.' }); playSfx('WRONG'); return; }""")
rep("""} catch(e) { setRedeemMsg({ ok: false, text: 'Mã Bí Tịch không hợp lệ hoặc đã bị hỏng!' }); playSfx('WRONG'); return; }""",
"""} catch(e) { setRedeemMsg({ ok: false, text: (e && e.code === 'permission-denied') ? 'Bí Tịch này đã bị quản trị viên gỡ ẩn hoặc Ngài chưa đăng nhập.' : 'Mã Bí Tịch không hợp lệ hoặc đã bị hỏng!' }); playSfx('WRONG'); return; }""")

rep("""{viewGuildModal.beast ? viewGuildModal.beast + ' ' : ''}{viewGuildModal.name}""","""{viewGuildModal.beast ? viewGuildModal.beast + ' ' : ''}{guildLabel(viewGuildModal)}""")
rep("""{g.beast ? g.beast+' ' : ''}{g.name}</span><br/>""","""{g.beast ? g.beast+' ' : ''}{guildLabel(g)}</span><br/>""")
rep("""{gObj.beast ? gObj.beast + ' ' : ''}{gObj.name}</h3>""","""{gObj.beast ? gObj.beast + ' ' : ''}{guildLabel(gObj)}</h3>""")
rep("""{g.beast ? <span className="mr-1">{g.beast}</span> : ''}{g.name}</sp""","""{g.beast ? <span className="mr-1">{g.beast}</span> : ''}{guildLabel(g)}</sp""")
rep("""<button onClick={() => setViewGuildModal(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400""",
"""{viewGuildModal.leader !== user?.uid && viewGuildModal.leader !== user?.name && <button onClick={() => setReportTarget({ type: 'guild', id: viewGuildModal.id || viewGuildModal.name, label: viewGuildModal.name })} className="w-full mb-2 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">🚩 Báo cáo tông môn này</button>}
                    <button onClick={() => setViewGuildModal(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400""")
rep("""ĐÓNG LẠI</button>
                        </div>
                    </div>
                )}""","""ĐÓNG LẠI</button>
                        </div>
                        {viewingUser.uid && viewingUser.uid !== user?.uid && <button onClick={() => setReportTarget({ type: 'user', id: viewingUser.uid, label: viewingUser.name })} className="w-full mt-3 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">🚩 Báo cáo đạo hữu này</button>}
                    </div>
                )}

                {/* ===== KIỂM DUYỆT: bảng quản trị + hộp báo cáo ===== */}
                {appState === 'MODERATION' && isAdmin && user && (
                    <ModerationPanel adminUid={user.uid} onBack={() => changeAppState('PROFILE')} playSfx={playSfx} />
                )}
                {reportTarget && user && <ReportModal target={reportTarget} reporterUid={user.uid} onClose={() => setReportTarget(null)} playSfx={playSfx} />}""")
rep("""<button onClick={handleLogout} className="w-full mt-4 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">ĐĂNG XUẤT</button>""",
"""{isAdmin && <button onClick={() => changeAppState('MODERATION')} className="w-full mt-4 text-[10px] text-yellow-400 font-bold uppercase py-2 border border-yellow-700/60">🛡️ BẢNG QUẢN TRỊ</button>}
                    <button onClick={handleLogout} className="w-full mt-4 text-[10px] text-red-500 font-bold uppercase py-2 border border-red-900/50">ĐĂNG XUẤT</button>""")
rep("""<button onClick={()=>shareLibraryItemAction(s)} className="text-yellow-600 text-xl">📤</button>""",
"""<button onClick={()=>shareLibraryItemAction(s)} className="text-yellow-600 text-xl">📤</button>
                                            {/^[A-Z2-9]{8}$/.test(s.code || '') && <button onClick={()=>setReportTarget({ type: 'quiz', id: s.code, label: s.title })} className="text-red-700 text-xl" title="Báo cáo Bí Tịch này">🚩</button>}""")
open(p,'w',encoding='utf-8').write(t)
print("OK: đã áp dụng toàn bộ chỉnh sửa App.jsx")
