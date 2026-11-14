import { firestore } from '../../config/firebase.js';
import { shortErr } from '../../lib/format.js';

const { useState } = React;

export function useFriends({ core, audio, nav }) {
    const { allUsers, setViewingUser, user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const [friendSearchUid, setFriendSearchUid] = useState('');
    const [globalSearchUid, setGlobalSearchUid] = useState('');
    const searchUserAction = () => {
        playSfx('CLICK'); const term = globalSearchUid.trim().toLowerCase();
        if (!term) return alert("Tông chủ hãy nhập ID hoặc Tên cần tra cứu!");
        const foundUser = allUsers.find(x => x.gameId === term || x.name.toLowerCase() === term || x.uid.toLowerCase() === term);
        if (foundUser) { setViewingUser(foundUser); changeAppState('VIEW_PROFILE'); setGlobalSearchUid(''); } 
        else { alert("Đại Lục rộng lớn, không tìm thấy tu sĩ nào trùng khớp!"); }
    };
    // Gửi lời mời kết giao: users/{đối phương}/friendRequests/{uid mình} (doc id = UID người gửi => mỗi người tối đa 1 lời mời)
    const sendFriendRequest = async (targetUid) => {
        const ref = firestore.collection('users').doc(targetUid).collection('friendRequests').doc(user.uid);
        const ex = await ref.get(); if (ex.exists) return false;
        await ref.set({ fromUid: user.uid, fromName: user.name, type: 'friend', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        return true;
    };
    const addFriendAction = async () => {
        if (!friendSearchUid) return alert("Xin hãy nhập ID hoặc Tên của Đạo hữu!");
        const term = friendSearchUid.trim().toLowerCase();
        const targetUser = allUsers.find(x => x.gameId === term || x.name.toLowerCase() === term);
        if (!targetUser) return alert("Không tìm thấy người này trên Đại Lục!");
        if (targetUser.uid === user.uid) return alert("Không thể tự kết duyên với chính mình!");
        if (user.friends?.includes(targetUser.uid)) return alert("Người này đã có trong danh sách Đạo hữu!");
        try { if (!(await sendFriendRequest(targetUser.uid))) return alert("Đã gửi thần thức cầu kết giao trước đó rồi, đang chờ hồi âm!"); }
        catch (e) { playSfx('ERROR'); return alert('Gửi thư thất bại: ' + shortErr((e && e.message) || String(e))); }
        alert("Đã gửi thư kết giao! Vui lòng chờ đối phương chấp nhận."); setFriendSearchUid('');
    };
    const addRandomFriendAction = async () => {
        const strangersList = allUsers.filter(x => x.uid !== user.uid && !(user.friends?.includes(x.uid)));
        if (strangersList.length === 0) return alert("Toàn đại lục hiện không còn ai để kết duyên hoặc đã gửi thư hết rồi!");
        const randomTarget = strangersList[Math.floor(Math.random() * strangersList.length)];
        try { if (!(await sendFriendRequest(randomTarget.uid))) return alert(`Đã gửi thư tới [${randomTarget.name}] trước đó rồi, hãy thử lại để chọn người khác!`); }
        catch (e) { playSfx('ERROR'); return alert('Gửi thư thất bại: ' + shortErr((e && e.message) || String(e))); }
        alert(`Đã gửi thư kết duyên tới [${randomTarget.name}]! Chờ đối phương hồi âm.`);
    };
    const sendFriendReqToUser = async (targetUser) => {
        playSfx('CLICK');
        if (targetUser.uid === user.uid) return alert("Không thể tự kết duyên với chính mình!");
        if (user.friends?.includes(targetUser.uid)) return alert("Người này đã là Đạo hữu của ngài từ trước!");
        try { if (!(await sendFriendRequest(targetUser.uid))) return alert("Đã gửi thần thức cầu kết giao rồi, xin kiên nhẫn chờ hồi âm!"); }
        catch (e) { playSfx('ERROR'); return alert('Gửi thư thất bại: ' + shortErr((e && e.message) || String(e))); }
        alert(`Đã truyền thư cầu kết giao đến [${targetUser.name}]!`); playSfx('SUCCESS');
    };
    // Chấp nhận: MỘT batch — tạo bản ghi bạn hai chiều + xoá lời mời (rules kiểm tra lời mời còn tồn tại trước batch)
    const acceptFriendReq = async (req) => {
        try {
            const ts = firebase.firestore.FieldValue.serverTimestamp();
            const me = firestore.collection('users').doc(user.uid), other = firestore.collection('users').doc(req.fromUid);
            const batch = firestore.batch();
            batch.set(me.collection('friends').doc(req.fromUid), { since: ts });
            batch.set(other.collection('friends').doc(user.uid), { since: ts });
            batch.delete(me.collection('friendRequests').doc(req.fromUid));
            await batch.commit();
        } catch (e) { playSfx('ERROR'); return alert('Không thể kết duyên: ' + shortErr((e && e.message) || String(e))); }
        playSfx('SUCCESS');
        alert(`Đã kết duyên cùng ${req.fromName}!`);
    };
    const rejectReq = async (req) => {
        playSfx('FAIL');
        try {
            const me = firestore.collection('users').doc(user.uid);
            await (req.type === 'guild' ? me.collection('guildInvites').doc(req.guildId) : me.collection('friendRequests').doc(req.fromUid)).delete();
        } catch (e) { console.warn('rejectReq:', e && e.message); }
    };

    return { acceptFriendReq, addFriendAction, addRandomFriendAction, friendSearchUid, globalSearchUid, rejectReq, searchUserAction, sendFriendReqToUser, setFriendSearchUid, setGlobalSearchUid };
}
