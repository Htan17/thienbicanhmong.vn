import { auth, firestore } from '../config/firebase.js';
import { checkIsAdmin, maskGuilds, maskUser, subscribeHidden } from '../lib/moderation.js';
import { generateGameId } from '../lib/userData.js';
import { isExamPathWindowOpen } from '../lib/progress.js';

const { useEffect } = React;

export function useRealtimeSync({ core, leaderboard, gemini, exampath }) {
    const { appState, authUid, friendsSubRef, guildMetaRef, hiddenSetRef, latestAllGuilds, latestAllUsers, latestUser, rawGuildsRef, rawUsersRef, requestsSubRef, seasonMetaRef, setAllGuilds, setAllUsers, setAppState, setAuthUid, setIsAdmin, setLoadProgress, setUser } = core;
    const { setGuildTimeLeftStr, setTimeLeftStr } = leaderboard;
    const { setGeminiKey2, setVideoApiKey } = gemini;
    const { examPathDailyMetaRef, setExamPathTimeLeftStr, setExamPathWindowOpen, setX2BoostTimeLeftStr } = exampath;
    useEffect(() => {
        if (appState !== 'LOADING') return;
        let p = 0; const t = setInterval(() => { p += Math.floor(Math.random() * 15) + 5; if(p > 90) p = 90; setLoadProgress(p); }, 300);
        return () => clearInterval(t);
    }, [appState]);
    useEffect(() => {
        let isMounted = true; const startTime = Date.now();
        const transitionTo = (state) => {
            const elapsed = Date.now() - startTime; const remaining = Math.max(0, 300 - elapsed);
            setTimeout(() => { if (!isMounted) return; setLoadProgress(100); setTimeout(() => { if (isMounted) setAppState(state); }, 100); }, remaining);
        };

        const loadingFallback = setTimeout(() => { if (isMounted) transitionTo('LOGIN'); }, 12000);

        const unsubscribeAuth = auth.onAuthStateChanged(async (fbUser) => {
            clearTimeout(loadingFallback);
            if (!isMounted) return;
            setAuthUid(fbUser ? fbUser.uid : null);
            if (fbUser) {
                const userRef = firestore.collection('users').doc(fbUser.uid);
                // SỬA LỖI TREO: tài khoản đăng nhập lần đầu (VD: Google) chưa có hồ sơ trên Firestore
                // thì onSnapshot bên dưới không bao giờ nhận doc.exists=true -> kẹt mãi ở màn Loading.
                // Nên kiểm tra và tự tạo hồ sơ mặc định trước khi lắng nghe.
                // SỬA LỖI "VÔ DANH": trước đây nếu đọc hồ sơ lỗi tạm thời (mạng/Rules/token chưa sẵn sàng) thì code
                // rơi vào nhánh else và dùng set({lastActive}, {merge:true}) -> TẠO RA hồ sơ rỗng chỉ có lastActive
                // (không có name/spirit/photo) => màn hình hiện "VÔ DANH", 0 tài nguyên, ảnh lỗi.
                // Nay: đọc lỗi thì thử lại, vẫn lỗi thì KHÔNG ghi gì; chỉ cập nhật lastActive bằng update()
                // (không thể tạo hồ sơ rỗng); và chờ một nhịp trước khi tạo hồ sơ mặc định để không đè lên
                // luồng "Lập tài khoản" đang ghi hồ sơ thật.
                const slugLocal = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
                const makeDefaultProfile = () => ({
                    name: slugLocal(fbUser.displayName) || slugLocal((fbUser.email || '').split('@')[0]) || generateGameId(),
                    spirit: 500, fame: 100, seasonScore: 0, streakCount: 0, lastPlayedDate: '',
                    library: [], videoNotes: [], inventory: [], friends: [], requests: [], guild: null,
                    photo: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${fbUser.uid}`,
                    rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
                });
                (async () => {
                    let snap = null;
                    for (let i = 0; i < 3 && !snap; i++) {
                        try { snap = await userRef.get(); } catch (e) { await new Promise(r => setTimeout(r, 700)); }
                    }
                    if (!snap || !isMounted) return; // không rõ trạng thái -> tuyệt đối không ghi
                    if (!snap.exists) {
                        await new Promise(r => setTimeout(r, 1500)); // nhường luồng đăng ký tự ghi hồ sơ trước
                        const again = await userRef.get().catch(() => null);
                        if (again && !again.exists) {
                            await userRef.set({ ...makeDefaultProfile(), gameId: generateGameId(), lastActive: Date.now() }, { merge: true }).catch(() => {});
                        }
                    } else {
                        userRef.update({ lastActive: Date.now() }).catch(() => {});
                    }
                })();
                // 🔑 ĐỒNG BỘ GEMINI API KEY QUA MỌI THIẾT BỊ (theo tài khoản, không theo trình duyệt):
                // Lưu ý QUAN TRỌNG: Key này được đọc từ 1 subcollection RIÊNG "private/settings",
                // KHÔNG lưu trực tiếp vào doc users/{uid} - vì doc đó bị firestore.collection('users')
                // .onSnapshot(...) bên dưới gửi TOÀN BỘ field tới MỌI người chơi khác (để hiển thị Thiên
                // Bảng). Nếu lưu Key ở đó, mọi người chơi khác sẽ vô tình nhận được API Key của Ngài.
                // -> Bắt buộc phải giữ Key trong subcollection riêng này, không được gộp lên doc chính.
                userRef.collection('private').doc('settings').onSnapshot(privDoc => {
                    if (isMounted && privDoc.exists) {
                        const pData = privDoc.data();
                        if (pData.geminiApiKey) { setVideoApiKey(pData.geminiApiKey); localStorage.setItem('geminiApiKey', pData.geminiApiKey); }
                        if (typeof pData.geminiApiKey2 === 'string') { setGeminiKey2(pData.geminiApiKey2); }
                    }
                }, (err) => {
                    // Chưa cấu hình Firestore Rules cho subcollection "private" (hoặc mạng lỗi) ->
                    // im lặng bỏ qua, KHÔNG hiện banner lỗi đỏ. App vẫn chạy bình thường, chỉ là
                    // Key sẽ không đồng bộ qua thiết bị khác được (vẫn dùng bản lưu trong localStorage).
                    console.warn('Không đọc được Gemini Key riêng theo tài khoản (cần thêm Firestore Rules cho users/{uid}/private):', err.code || err.message);
                });
                let isFirstLoad = true; let stubHealed = false;
                userRef.onSnapshot(doc => {
                    if (doc.exists && isMounted) {
                        let data = doc.data();
                        if (!data.gameId) { const newGameId = generateGameId(); userRef.update({ gameId: newGameId }); data.gameId = newGameId; }
                        // Bạn bè + lời mời: nguồn chính là subcollection friends/friendRequests/guildInvites (xem listener bên dưới); mảng cũ trong hồ sơ chỉ còn để hiển thị bạn cũ trước khi di trú.
                        data.friends = Array.from(new Set([...(Array.isArray(data.friends) ? data.friends : []), ...friendsSubRef.current]));
                        data.requests = [...requestsSubRef.current.friend, ...requestsSubRef.current.guild];
                        // TỰ CHỮA hồ sơ rỗng (chỉ có lastActive/gameId...) do lỗi cũ: bổ sung các trường mặc định còn thiếu.
                        if (!data.name && !stubHealed) {
                            stubHealed = true;
                            const fill = makeDefaultProfile();
                            userRef.set(fill, { merge: true }).catch(() => {});
                            data = { ...fill, ...data };
                        }
                        setUser({ ...data, uid: fbUser.uid });
                        if (isFirstLoad) { isFirstLoad = false; transitionTo('DASHBOARD'); }
                    }
                });
            } else { setUser(null); transitionTo('LOGIN'); }
        });

        return () => { isMounted = false; unsubscribeAuth(); clearTimeout(loadingFallback); };
    }, []);
    // 🔐 CÁC LISTENER DỮ LIỆU CHUNG (users, guilds, meta/season, meta/guildSeason) CHỈ ĐƯỢC PHÉP
    // GỌI SAU KHI "authUid" ĐÃ CÓ GIÁ TRỊ (Firebase Auth xác nhận xong đăng nhập) - xem ghi chú
    // đầy đủ ở chỗ khai báo state "authUid". Gọi sớm hơn (như trước đây, ngay khi component vừa
    // mount) khiến Firestore Rules thấy request.auth = null và từ chối một cách NGẪU NHIÊN tuỳ
    // tốc độ khôi phục phiên đăng nhập của từng trình duyệt/thiết bị - đây chính là nguyên nhân
    // lỗi "Lỗi kết nối (Rules?)" chỉ xảy ra trên một số máy/trình duyệt chứ không phải tất cả.
    // Quyền quản trị: mỗi khi đăng nhập / đăng xuất / đổi tài khoản (authUid đổi) thì xoá quyền cũ về false ngay,
    // rồi checkIsAdmin(authUid) trong effect ngay bên dưới đọc admins/{uid} và chỉ bật true khi role === "admin".
    useEffect(() => { setIsAdmin(false); }, [authUid]);
    useEffect(() => {
        if (!authUid) return;
        let isMounted = true;

        const unsubUsers = firestore.collection('users').onSnapshot(
            snap => { if (!isMounted) return; const usersList = []; snap.forEach(doc => usersList.push({ ...doc.data(), uid: doc.id })); rawUsersRef.current = usersList; setAllUsers(usersList.map(u => maskUser(u, hiddenSetRef.current))); },
            e => console.error("Lỗi lắng nghe collection 'users' (kiểm tra Firestore Rules):", e)
        );
        const unsubGuilds = firestore.collection('guilds').onSnapshot(
            snap => { if (!isMounted) return; const guildsDict = {}; snap.forEach(doc => guildsDict[doc.id] = { ...doc.data(), id: doc.id }); rawGuildsRef.current = guildsDict; setAllGuilds(maskGuilds(guildsDict, hiddenSetRef.current)); },
            e => console.error("Lỗi lắng nghe collection 'guilds' (kiểm tra Firestore Rules):", e)
        );

        // Danh sách nội dung bị quản trị viên ẩn + kiểm tra quyền quản trị (admins/{uid})
        const unsubHidden = subscribeHidden((set) => { if (!isMounted) return; hiddenSetRef.current = set; setAllUsers(rawUsersRef.current.map(u => maskUser(u, set))); setAllGuilds(maskGuilds(rawGuildsRef.current, set)); });
        checkIsAdmin(authUid).then(v => { if (isMounted) setIsAdmin(!!v); });

        const seasonDocRef = firestore.collection('meta').doc('season');
        const guildDocRef = firestore.collection('meta').doc('guildSeason');
        // 🗺️ ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ): mốc reset riêng, LUÔN LÀ 4h00 SÁNG (giờ VN) kế tiếp
        // thay vì 1 khoảng thời gian cố định như 2 mùa giải trên, đúng yêu cầu "reset giải 4h-23h".
        const examPathDailyDocRef = firestore.collection('meta').doc('examPathDaily');

        // meta/season, meta/guildSeason, meta/examPathDaily do Cloud Functions (finalize*) tự khởi tạo/đẩy mốc; client chỉ ĐỌC (rules hardened cấm client ghi meta).

        // SỬA LỖI: trước đây lỗi bị nuốt im lặng (không có callback lỗi) nên khi Firestore Rules
        // chặn đọc collection 'meta', đồng hồ đếm ngược kẹt vĩnh viễn ở "Đang tính toán..." mà
        // không ai biết vì sao. Giờ báo lỗi rõ ràng ra console + hiển thị luôn trên UI.
        const unsubSeason = seasonDocRef.onSnapshot(
            doc => { if (doc.exists) seasonMetaRef.current = doc.data(); },
            e => { console.error("Lỗi lắng nghe meta/season (kiểm tra Firestore Rules):", e); setTimeLeftStr('Lỗi kết nối (Rules?)'); }
        );
        const unsubGuild = guildDocRef.onSnapshot(
            doc => { if (doc.exists) guildMetaRef.current = doc.data(); },
            e => { console.error("Lỗi lắng nghe meta/guildSeason (kiểm tra Firestore Rules):", e); setGuildTimeLeftStr('Lỗi kết nối (Rules?)'); }
        );
        const unsubExamPathDaily = examPathDailyDocRef.onSnapshot(
            doc => { if (doc.exists) examPathDailyMetaRef.current = doc.data(); },
            e => { console.error("Lỗi lắng nghe meta/examPathDaily (kiểm tra Firestore Rules):", e); setExamPathTimeLeftStr('Lỗi kết nối (Rules?)'); }
        );

        // Bạn bè / lời mời kết giao / lời mời Tông môn: subcollection của chính mình (mô hình của firestore.rules.hardened)
        const myRef = firestore.collection('users').doc(authUid);
        const pushInbox = () => setUser(prev => (prev && prev.uid === authUid) ? { ...prev, friends: Array.from(new Set([...(prev.friends || []), ...friendsSubRef.current])), requests: [...requestsSubRef.current.friend, ...requestsSubRef.current.guild] } : prev);
        const unsubFriends = myRef.collection('friends').onSnapshot(
            snap => { if (!isMounted) return; friendsSubRef.current = snap.docs.map(d => d.id); pushInbox(); },
            e => console.warn("Không đọc được users/{uid}/friends:", e && e.message)
        );
        const unsubFriendReqs = myRef.collection('friendRequests').onSnapshot(
            snap => { if (!isMounted) return; requestsSubRef.current.friend = snap.docs.map(d => ({ id: 'f:' + d.id, type: 'friend', fromUid: d.id, fromName: String((d.data() || {}).fromName || '') })); pushInbox(); },
            e => console.warn("Không đọc được users/{uid}/friendRequests:", e && e.message)
        );
        const unsubGuildInvites = myRef.collection('guildInvites').onSnapshot(
            snap => { if (!isMounted) return; requestsSubRef.current.guild = snap.docs.map(d => { const x = d.data() || {}; return { id: 'g:' + d.id, type: 'guild', fromUid: x.fromUid, fromName: String(x.fromName || ''), guildId: d.id, guildName: d.id }; }); pushInbox(); },
            e => console.warn("Không đọc được users/{uid}/guildInvites:", e && e.message)
        );

        return () => { isMounted = false; unsubFriends(); unsubFriendReqs(); unsubGuildInvites(); unsubUsers(); unsubGuilds(); unsubHidden(); unsubSeason(); unsubGuild(); unsubExamPathDaily(); };
    }, [authUid]);
    useEffect(() => {
        const timerInterval = setInterval(() => {
            const now = Date.now();
            const cUser = latestUser.current; const cAllUsers = latestAllUsers.current; const cAllGuilds = latestAllGuilds.current;

            const seasonNextReset = seasonMetaRef.current.nextReset;
            if (seasonNextReset && now >= seasonNextReset) {
                // Chốt mùa + phát thưởng do Cloud Function finalizeSeason (server) xử lý. Client chỉ hiển thị trạng thái, KHÔNG ghi thưởng.
                setTimeLeftStr(prev => (String(prev).startsWith('Lỗi') ? prev : 'Đang chốt mùa giải...'));
            } else if (seasonNextReset) {
                const diffMs = seasonNextReset - now;
                setTimeLeftStr(`${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`);
            }

            const guildNextReset = guildMetaRef.current.nextReset;
            if (guildNextReset && now >= guildNextReset) {
                // Do Cloud Function finalizeGuildSeason xử lý; client chỉ hiển thị.
                setGuildTimeLeftStr('Đang chốt mùa Tông môn...');
            } else if (guildNextReset) {
                const diffMsG = guildNextReset - now;
                setGuildTimeLeftStr(`${Math.floor(diffMsG / (24 * 3600000))}d ${Math.floor((diffMsG % (24 * 3600000)) / 3600000).toString().padStart(2, '0')}h ${Math.floor((diffMsG % 3600000) / 60000).toString().padStart(2, '0')}m ${Math.floor((diffMsG % 60000) / 1000).toString().padStart(2, '0')}s`);
            }

            // 🗺️ ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ): giống hệt mô hình reset mùa giải/tông môn ở trên,
            // nhưng mốc reset LUÔN LÀ 4h00 sáng (giờ VN) kế tiếp thay vì 1 khoảng cố định. Top 3
            // (điểm = phút luyện thi tích luỹ trong khung 4h-23h hôm đó) nhận 1 danh hiệu Phong
            // Thái MIỄN PHÍ (không cộng Linh Thạch/Danh Vọng - đúng ý "thưởng NHỎ về phong thái").
            const examPathNextReset = examPathDailyMetaRef.current.nextReset;
            if (examPathNextReset && now >= examPathNextReset) {
                // Do Cloud Function finalizeExamPathDaily xử lý (danh hiệu + reset điểm ngày); client không ghi.
                
            } else if (examPathNextReset) {
                const diffMsE = examPathNextReset - now;
                setExamPathTimeLeftStr(`${Math.floor(diffMsE / 3600000)}h ${Math.floor((diffMsE % 3600000) / 60000)}m ${Math.floor((diffMsE % 60000) / 1000)}s`);
            }
            setExamPathWindowOpen(isExamPathWindowOpen(new Date(now)));

            // 🆕 BÙA NHÂN ĐÔI: đếm ngược hiệu lực còn lại (dùng latestUser.current qua ref nên luôn
            // đọc đúng dữ liệu mới nhất, không bị lỗi "đóng băng giá trị cũ" như closure state thường).
            const x2ExpiresAt = cUser && cUser.x2BoostExpiresAt;
            if (x2ExpiresAt && now < x2ExpiresAt) {
                const diffMsX = x2ExpiresAt - now;
                setX2BoostTimeLeftStr(`${Math.floor(diffMsX / 3600000)}h ${Math.floor((diffMsX % 3600000) / 60000).toString().padStart(2,'0')}m ${Math.floor((diffMsX % 60000) / 1000).toString().padStart(2,'0')}s`);
            } else {
                setX2BoostTimeLeftStr('');
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, []);

    return {  };
}
