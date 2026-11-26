// Chạy: npm run test:rules   (cần Java + firebase-tools; xem AUDIT_REPORT mục 8)
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection,
  increment, arrayUnion, arrayRemove, serverTimestamp, writeBatch, deleteField,
} from 'firebase/firestore';

let env;
const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

const starter = (name, extra = {}) => ({
  name, spirit: 500, fame: 100, seasonScore: 0, seasonLessons: 0, streakCount: 0, lastPlayedDate: '',
  library: [], videoNotes: [], inventory: [], friends: [], requests: [], guild: null,
  gameId: '12345678', lastActive: 1, photo: 'x', rank: 'refining', bio: 'hi', ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tkbc',
    firestore: { rules: readFileSync(new URL('../../firestore.rules.hardened', import.meta.url), 'utf8') },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'users/alice'), starter('alice', { spirit: 1000, seasonScore: 50, seasonLessons: 5, examPathDailyScore: 3, examPathTitles: ['t1'], inventory: ['frame_a'], guild: 'Gate' }));
    await setDoc(doc(f, 'users/bob'), starter('bob', { seasonScore: 20, friends: ['zed'], requests: [{ id: 1, type: 'friend', fromUid: 'zed', fromName: 'zed' }] }));
    await setDoc(doc(f, 'users/carol'), starter('carol', { guild: 'Gate' }));
    await setDoc(doc(f, 'users/dave'), starter('dave'));
    await setDoc(doc(f, 'guilds/Gate'), { name: 'Gate', level: 1, members: ['alice', 'carol'], leader: 'alice', guildId: '123456', notice: 'hi', exp: 10 });
    await setDoc(doc(f, 'meta/season'), { nextReset: 9999999999999 });
    await setDoc(doc(f, 'admins/admin1'), {});
    await setDoc(doc(f, 'users/alice/private/settings'), { geminiApiKey: 'SECRET' });
    await setDoc(doc(f, 'reports/bob__user__alice'), { targetType: 'user', targetId: 'alice', reason: 'abuse', reporter: 'bob', status: 'open', createdAt: new Date() });
  });
});

// ============================ PHẢI BỊ TỪ CHỐI ============================
test('DENY 1a: A tăng spirit của chính mình', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/alice'), { spirit: increment(1000) }));
});
test('DENY 1b: A tăng fame của chính mình', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/alice'), { fame: increment(1000) }));
});
test('DENY 2: A tăng spirit/fame của B', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { spirit: increment(1) }));
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { fame: increment(1) }));
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { spirit: increment(1), fame: increment(1) }));
});
test('DENY 3: A reset seasonScore/seasonLessons/examPathDailyScore của B (và của mình)', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { seasonScore: 0 }));
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { seasonScore: 0, seasonLessons: 0 }));
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { examPathDailyScore: 0 }));
  await assertFails(updateDoc(doc(db('alice'), 'users/alice'), { seasonScore: 999 }));
});
test('DENY 4: A trao examPathTitles cho B (và cho mình)', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/bob'), { examPathTitles: arrayUnion('t1') }));
  await assertFails(updateDoc(doc(db('alice'), 'users/alice'), { examPathTitles: arrayUnion('t2') }));
});
test('DENY 5: tăng EXP guild (leader, thành viên, người ngoài)', async () => {
  for (const u of ['alice', 'carol', 'dave']) {
    await assertFails(updateDoc(doc(db(u), 'guilds/Gate'), { exp: increment(100) }));
  }
});
test('DENY 6: thêm/xoá tuỳ ý thành viên guild, thay mảng, làm rỗng, xoá guild', async () => {
  await assertFails(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: ['dave'] }));                    // thay cả mảng
  await assertFails(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: arrayUnion('eve') }));           // thêm người khác
  await assertFails(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: arrayUnion('dave', 'eve') }));  // thêm 2 người
  await assertFails(updateDoc(doc(db('carol'), 'guilds/Gate'), { members: arrayRemove('alice') }));       // thành viên đuổi bang chủ
  await assertFails(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: arrayRemove('carol') }));       // người ngoài đuổi người
  await assertFails(updateDoc(doc(db('alice'), 'guilds/Gate'), { members: [] }));                          // leader làm rỗng
  await assertFails(updateDoc(doc(db('alice'), 'guilds/Gate'), { leader: 'dave' }));                      // đổi leader tuỳ ý
  await assertFails(updateDoc(doc(db('alice'), 'guilds/Gate'), { level: 5 }));                             // level do server
  await assertFails(deleteDoc(doc(db('dave'), 'guilds/Gate')));
  await assertFails(deleteDoc(doc(db('carol'), 'guilds/Gate')));
  await assertFails(setDoc(doc(db('dave'), 'guilds/Mine'), { name: 'Mine', level: 1, members: ['dave'], leader: 'dave' })); // create qua Function
});
test('DENY 7: user thường sửa/tạo meta (nextReset)', async () => {
  await assertFails(setDoc(doc(db('alice'), 'meta/season'), { nextReset: 1 }));
  await assertFails(updateDoc(doc(db('alice'), 'meta/season'), { nextReset: 1 }));
  await assertFails(setDoc(doc(db('alice'), 'meta/examPathDaily'), { nextReset: 1 }));
});
test('DENY 8: ghi admins / tự nâng quyền', async () => {
  await assertFails(setDoc(doc(db('alice'), 'admins/alice'), {}));
  await assertFails(setDoc(doc(db('admin1'), 'admins/alice'), {}));
  await assertFails(deleteDoc(doc(db('admin1'), 'admins/admin1')));
});
test('DENY 9: đọc/ghi private/settings của người khác; ẩn danh', async () => {
  await assertFails(getDoc(doc(db('bob'), 'users/alice/private/settings')));
  await assertFails(setDoc(doc(db('bob'), 'users/alice/private/settings'), { geminiApiKey: 'x' }));
  await assertFails(getDoc(doc(db(null), 'users/alice/private/settings')));
  await assertFails(getDoc(doc(db('admin1'), 'users/alice/private/settings')));
});
test('DENY 10: thay toàn bộ friends/requests bằng dữ liệu tuỳ ý (mảng cũ bị đóng băng)', async () => {
  await assertFails(updateDoc(doc(db('dave'), 'users/bob'), { requests: [{ id: 9, type: 'friend', fromUid: 'dave', fromName: 'dave' }] }));
  await assertFails(updateDoc(doc(db('dave'), 'users/bob'), { friends: ['dave'] }));
  await assertFails(updateDoc(doc(db('dave'), 'users/bob'), { requests: arrayUnion({ id: 9, fromUid: 'dave' }) }));
  await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { friends: ['dave', 'zed'] }));
  await assertFails(updateDoc(doc(db('bob'), 'users/bob'), { requests: [] }));
});
test('DENY extra: chủ tài khoản sửa các field nhạy cảm khác / xoá hồ sơ / tạo hồ sơ giàu', async () => {
  for (const patch of [
    { inventory: arrayUnion('x2_card') }, { rank: 'god' }, { usedCodes: [] }, { streakCount: 999 },
    { buffs: { a: 1 } }, { x2BoostExpiresAt: 9999999999999 }, { dailyPurchases: {} }, { name: 'hacker' }, { guild: 'Other' },
    { examPathActiveTitle: 'not_owned' }, { frame: 'not_owned' }, { lastPlayedDate: '2026-01-01' },
  ]) await assertFails(updateDoc(doc(db('alice'), 'users/alice'), patch));
  await assertFails(deleteDoc(doc(db('alice'), 'users/alice')));
  await assertFails(setDoc(doc(db('eve'), 'users/eve'), starter('eve', { spirit: 999999 })));
});
test('DENY extra: trang bị khác rỗng và email khôi phục không ghi trực tiếp (equipItem / Firebase Auth)', async () => {
  const a = doc(db('alice'), 'users/alice');
  for (const patch of [{ appTheme: 'theme-gold' }, { aura: 'aura-chaos' }, { nameColor: '#ff00ff' }, { sfxPack: 'thunder' }, { frame: 'mathan' }, { nameFrame: 'nf_tongsu' }, { recoveryEmail: 'a@b.com' }])
    await assertFails(updateDoc(a, patch));
  await assertSucceeds(updateDoc(a, { appTheme: '', aura: '', nameColor: '', sfxPack: '', frame: '', nameFrame: '' })); // tháo thì được
});

test('DENY extra: không tạo/sửa giftCodes, collection lạ bị chặn', async () => {
  await assertFails(getDoc(doc(db('alice'), 'giftCodes/ABC')));
  await assertFails(setDoc(doc(db('alice'), 'giftCodes/ABC'), { s: 1 }));
  await assertFails(setDoc(doc(db('alice'), 'whatever/x'), { a: 1 }));
  await assertFails(getDocs(collection(db('alice'), 'whatever')));
});
test('DENY extra: guild invite/friend request mạo danh hoặc ghi đè', async () => {
  // gửi thay người khác
  await assertFails(setDoc(doc(db('dave'), 'users/bob/friendRequests/alice'), { fromUid: 'alice', fromName: 'alice', type: 'friend', createdAt: serverTimestamp() }));
  // mạo tên
  await assertFails(setDoc(doc(db('dave'), 'users/bob/friendRequests/dave'), { fromUid: 'dave', fromName: 'alice', type: 'friend', createdAt: serverTimestamp() }));
  // tự thêm mình vào friends của người khác mà không có lời mời
  await assertFails(setDoc(doc(db('dave'), 'users/bob/friends/dave'), { since: serverTimestamp() }));
  await assertFails(setDoc(doc(db('dave'), 'users/dave/friends/bob'), { since: serverTimestamp() }));
  // xoá lời mời của người khác
  await assertFails(deleteDoc(doc(db('dave'), 'users/bob/friendRequests/zed')));
});
test('DENY extra: quizShare owner giả / update / video thiếu owner', async () => {
  await assertFails(setDoc(doc(db('alice'), 'quizShares/ABCDEFGH'), { t: 'x', d: [{ q: 1 }], owner: 'bob', createdAt: Date.now() }));
  await assertFails(setDoc(doc(db('alice'), 'quizShares/ABCDEFGH'), { t: 'x', d: [{ q: 1 }], owner: 'alice', createdAt: Date.now(), extra: 1 }));
  await assertFails(setDoc(doc(db('alice'), 'quizShares/ABCDEFGH'), { t: 'x', d: [], owner: 'alice', createdAt: Date.now() }));
  await assertFails(setDoc(doc(db('alice'), 'videoShares/ABCDEFGH'), { link: 'https://y', summary: 's', createdAt: Date.now() }));
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'quizShares/ZZZZZZZZ'), { t: 'x', d: [1], owner: 'alice', createdAt: 1 }));
  await assertFails(updateDoc(doc(db('alice'), 'quizShares/ZZZZZZZZ'), { t: 'y' }));
  await assertFails(deleteDoc(doc(db('bob'), 'quizShares/ZZZZZZZZ')));
  await assertFails(getDocs(collection(db('alice'), 'quizShares')));
});
test('DENY extra: reporter tự đổi trạng thái; report sai định dạng', async () => {
  await assertFails(updateDoc(doc(db('bob'), 'reports/bob__user__alice'), { status: 'dismissed', reviewedBy: 'bob', reviewedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db('bob'), 'reports/bob__user__dave'), { targetType: 'user', targetId: 'dave', reason: 'abuse', reporter: 'bob', status: 'hidden', createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db('bob'), 'reports/alice__user__dave'), { targetType: 'user', targetId: 'dave', reason: 'abuse', reporter: 'bob', status: 'open', createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('admin1'), 'reports/bob__user__alice'), { status: 'hidden', reviewedBy: 'someone', reviewedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db('bob'), 'hiddenContent/user__alice'), { targetType: 'user', targetId: 'alice', reason: 'abuse', hiddenBy: 'bob', hiddenAt: serverTimestamp() }));
});

// ============================ PHẢI ĐƯỢC CHO PHÉP ============================
test('ALLOW 1: đọc/ghi private/settings của chính mình', async () => {
  await assertSucceeds(getDoc(doc(db('alice'), 'users/alice/private/settings')));
  await assertSucceeds(setDoc(doc(db('alice'), 'users/alice/private/settings'), { geminiApiKey: 'NEW', geminiApiKey2: '' }, { merge: true }));
});
test('ALLOW 2: sửa field hồ sơ whitelist', async () => {
  const d = doc(db('alice'), 'users/alice');
  await assertSucceeds(updateDoc(d, { bio: 'xin chào', photo: 'data:image/png;base64,AAA', bgImage: '' }));
  await assertSucceeds(updateDoc(d, { theme: 'dark', uiMode: 'study', appTheme: '', aura: '', nameColor: '' }));
  await assertFails(updateDoc(d, { frame: 'frame_a' }));            // trang bị phải qua Cloud Function equipItem, kể cả vật phẩm đã sở hữu
  await assertFails(updateDoc(d, { aura: 'aura-chaos' }));
  await assertFails(updateDoc(d, { nameColor: '#ff00ff' }));
  await assertSucceeds(updateDoc(d, { frame: '', nameFrame: '' }));  // tháo thì được
  await assertSucceeds(updateDoc(d, { examPathActiveTitle: 't1' })); // đã được trao
  await assertSucceeds(updateDoc(d, { lastActive: Date.now() }));
  await assertSucceeds(updateDoc(d, { library: arrayUnion({ id: 1, title: 't', data: [], code: 'c' }) }));
  await assertSucceeds(updateDoc(d, { examPath: { title: 'p', nodes: [] } }));
  await assertSucceeds(updateDoc(d, { examPath: deleteField() }));
  await assertSucceeds(getDoc(doc(db('bob'), 'users/alice'))); // vẫn đọc được để lên bảng xếp hạng
});
test('ALLOW 2b: tạo hồ sơ khởi điểm hợp lệ', async () => {
  const { uid: _u, ...p } = { ...starter('eve') };
  await assertSucceeds(setDoc(doc(db('eve'), 'users/eve'), p));
});
test('ALLOW 3: tạo quizShare hợp lệ (owner = chính mình), owner xoá, không list', async () => {
  const ref = doc(db('alice'), 'quizShares/ABCDEFGH');
  await assertSucceeds(setDoc(ref, { t: 'Bí tịch', d: [{ q: 'a' }], owner: 'alice', createdAt: Date.now() }));
  await assertSucceeds(getDoc(doc(db('bob'), 'quizShares/ABCDEFGH')));
  await assertSucceeds(deleteDoc(ref));
  await assertSucceeds(setDoc(doc(db('alice'), 'videoShares/QRSTUVWX'), { link: 'https://youtu.be/x', summary: 's', translations: [], transcript: [], isCjk: false, owner: 'alice', createdAt: Date.now() }));
});
test('ALLOW 4: reporter tạo report hợp lệ; admin KHÔNG ghi trực tiếp hiddenContent/reports/adminAudit (qua adminModerate)', async () => {
  const a = db('admin1');
  await assertFails(setDoc(doc(a, 'hiddenContent/user__alice'), { targetType: 'user', targetId: 'alice', reason: 'abuse', hiddenBy: 'admin1', hiddenAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(a, 'reports/bob__user__alice'), { status: 'hidden', reviewedBy: 'admin1', reviewedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(a, 'adminAudit/x1'), { actor: 'admin1', action: 'hide', at: serverTimestamp() }));
  await assertFails(getDoc(doc(db('alice'), 'adminAudit/x1')));
  await assertSucceeds(getDoc(doc(a, 'adminAudit/x1')));
  await assertSucceeds(setDoc(doc(db('dave'), 'reports/dave__guild__Gate'), { targetType: 'guild', targetId: 'Gate', targetLabel: 'Gate', reason: 'scam', note: '', reporter: 'dave', status: 'open', createdAt: serverTimestamp() }));
});
test('ALLOW 5: gửi + chấp nhận lời mời kết bạn đúng thiết kế', async () => {
  const sendRef = doc(db('dave'), 'users/bob/friendRequests/dave');
  await assertSucceeds(setDoc(sendRef, { fromUid: 'dave', fromName: 'dave', type: 'friend', createdAt: serverTimestamp() }));
  const b = db('bob'); const w = writeBatch(b);
  w.set(doc(b, 'users/bob/friends/dave'), { since: serverTimestamp() });
  w.set(doc(b, 'users/dave/friends/bob'), { since: serverTimestamp() });
  w.delete(doc(b, 'users/bob/friendRequests/dave'));
  await assertSucceeds(w.commit());
  await assertSucceeds(deleteDoc(doc(db('dave'), 'users/dave/friends/bob'))); // huỷ kết bạn
});
test('ALLOW 6: leader/thành viên thực hiện thay đổi guild được phép', async () => {
  await assertSucceeds(updateDoc(doc(db('alice'), 'guilds/Gate'), { notice: 'Cáo thị mới' }));
  // dave gia nhập: members trước, users.guild sau
  await assertSucceeds(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: arrayUnion('dave') }));
  await assertSucceeds(updateDoc(doc(db('dave'), 'users/dave'), { guild: 'Gate' }));
  // leader trục xuất carol
  await assertSucceeds(updateDoc(doc(db('alice'), 'guilds/Gate'), { members: arrayRemove('carol') }));
  await assertSucceeds(updateDoc(doc(db('alice'), 'users/carol'), { guild: null }));
  // dave tự rời
  await assertSucceeds(updateDoc(doc(db('dave'), 'guilds/Gate'), { members: arrayRemove('dave') }));
  await assertSucceeds(updateDoc(doc(db('dave'), 'users/dave'), { guild: null }));
});
test('ALLOW 6b: leader giải tán (batch xoá guild + gỡ guild của thành viên)', async () => {
  const a = db('alice'); const w = writeBatch(a);
  w.update(doc(a, 'users/carol'), { guild: null });
  w.update(doc(a, 'users/alice'), { guild: null });
  w.delete(doc(a, 'guilds/Gate'));
  await assertSucceeds(w.commit());
});
