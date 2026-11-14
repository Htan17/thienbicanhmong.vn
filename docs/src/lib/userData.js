import { auth, firestore } from '../config/firebase.js';
import { isContentBlocked, isReservedName } from './contentFilter.js';

// Hồ sơ mặc định + hàm cập nhật an toàn: nếu hồ sơ chưa tồn tại (lỗi "No document to update") thì tạo rồi cập nhật lại.
const buildDefaultProfile = (fb) => {
    const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    return {
        // Lọc tên tự sinh từ tài khoản Google/email: tên dành riêng hoặc thô tục thì dùng mã số ngẫu nhiên thay thế
        name: (() => { const nm = slug(fb.displayName) || slug((fb.email || '').split('@')[0]) || generateGameId(); return (isReservedName(nm) || isContentBlocked(nm)) ? generateGameId() : nm; })(),
        spirit: 500, fame: 100, seasonScore: 0, seasonLessons: 0, streakCount: 0, lastPlayedDate: '',
        library: [], videoNotes: [], inventory: [], friends: [], requests: [], guild: null,
        photo: fb.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${fb.uid}`,
        rank: 'refining', bio: 'Kẻ vô danh, chưa lưu lại di ngôn.'
    };
};
export const safeUserUpdate = async (uid, payload) => {
    const ref = firestore.collection('users').doc(uid);
    try { return await ref.update(payload); }
    catch (e) {
        if (e && (e.code === 'not-found' || /no document to update/i.test(e.message || ''))) {
            const fb = auth.currentUser || {};
            await ref.set({ ...buildDefaultProfile({ uid, displayName: fb.displayName, email: fb.email, photoURL: fb.photoURL }), gameId: generateGameId(), lastActive: Date.now() }, { merge: true });
            return ref.update(payload);
        }
        throw e;
    }
};
export const generateGameId = () => Math.floor(10000000 + Math.random() * 90000000).toString();
export const generateGuildId = () => Math.floor(100000 + Math.random() * 900000).toString();
