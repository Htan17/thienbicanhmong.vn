import { SRS } from '../lib/srs.js';
import { firestore } from '../config/firebase.js';

const { useState, useEffect, useRef } = React;

export function useAppCore() {
    const [appState, setAppState] = useState('LOADING');
    const [user, setUser] = useState(null);
    useEffect(() => { if (user && user.uid) { try { SRS.init(user, firestore); } catch (e) { console.warn('SRS init', e); } } }, [user && user.uid, user && (user.videoNotes || []).length]);
    // 🔐 SỬA LỖI ĐỒNG HỒ BXH BÁO "Lỗi kết nối (Rules?)" TRÊN MỘT SỐ TRÌNH DUYỆT/WEBVIEW:
    // Khác với "user" (hồ sơ Firestore, tải xong SAU khi đăng nhập), "authUid" chỉ phản ánh
    // việc Firebase Auth ĐÃ xác nhận đăng nhập xong (fbUser tồn tại) hay chưa. Các listener đọc
    // dữ liệu chung (users, guilds, meta/season...) phải đợi cờ này rồi mới được gọi - nếu gọi
    // ngay lúc component vừa mount (trước khi Auth kịp xác thực xong), Firestore Rules sẽ thấy
    // request.auth = null và từ chối, dù người dùng RÕ RÀNG đã đăng nhập. Lỗi này xảy ra ngẫu
    // nhiên tuỳ trình duyệt/thiết bị vì tốc độ khôi phục phiên đăng nhập từ bộ nhớ (IndexedDB)
    // nhanh/chậm khác nhau - đặc biệt chậm trên Safari iOS, WebView trong app khác (Zalo/Messenger...),
    // hoặc phiên trình duyệt mới hoàn toàn trên Windows.
    const [authUid, setAuthUid] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [allGuilds, setAllGuilds] = useState({});
    const [viewingUser, setViewingUser] = useState(null);
    // KIỂM DUYỆT (Lộ trình #3): đối tượng đang báo cáo, cờ quản trị viên, bản gốc users/guilds để che/hiện lại khi quản trị viên ẩn/khôi phục
    const [reportTarget, setReportTarget] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const hiddenSetRef = useRef(new Set());
    const rawUsersRef = useRef([]);
    const friendsSubRef = useRef([]);
 const requestsSubRef = useRef({ friend: [], guild: [] }); // bạn bè / lời mời đọc từ subcollection (rules hardened)
    const rawGuildsRef = useRef({});
    const [guildTab, setGuildTab] = useState('INFO');
    const [loadProgress, setLoadProgress] = useState(0);
    const [showMenuPanel, setShowMenuPanel] = useState(false); // ☰ menu gom Tông Môn/Cửa Hàng/Nhạc/Âm Thanh, tránh tràn hàng top bar
    const latestUser = useRef(user);
    const latestAllUsers = useRef(allUsers);
    const latestAllGuilds = useRef(allGuilds);
    const seasonMetaRef = useRef({ nextReset: null });
    const guildMetaRef = useRef({ nextReset: null });
    useEffect(() => { latestUser.current = user; }, [user]);
    useEffect(() => { latestAllUsers.current = allUsers; }, [allUsers]);
    useEffect(() => { latestAllGuilds.current = allGuilds; }, [allGuilds]);
    const syncUserData = async (newData) => { if (user && user.uid) await firestore.collection('users').doc(user.uid).set(newData, { merge: true }).catch(()=>{}); };

    return { allGuilds, allUsers, appState, authUid, friendsSubRef, guildMetaRef, guildTab, hiddenSetRef, isAdmin, latestAllGuilds, latestAllUsers, latestUser, loadProgress, rawGuildsRef, rawUsersRef, reportTarget, requestsSubRef, seasonMetaRef, setAllGuilds, setAllUsers, setAppState, setAuthUid, setGuildTab, setIsAdmin, setLoadProgress, setReportTarget, setShowMenuPanel, setUser, setViewingUser, showMenuPanel, syncUserData, user, viewingUser };
}
