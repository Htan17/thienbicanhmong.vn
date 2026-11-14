import { RANKS } from '../../config/gameData.js';
import { blockMessage, checkContent, isReservedName, sanitizePublicText } from '../../lib/contentFilter.js';
import { buyGuildPerk, createGuild, dissolveGuild, exchangeGuildExp, joinGuild, kickGuildMember, leaveGuild, transferGuildLeader, upgradeGuild } from '../../lib/serverApi.js';
import { firestore } from '../../config/firebase.js';
import { shortErr } from '../../lib/format.js';

const { useState } = React;

export function useGuild({ core, audio, nav }) {
    const { allGuilds, allUsers, user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const [viewGuildModal, setViewGuildModal] = useState(null);
    const [newGuildName, setNewGuildName] = useState('');
    const [joinGuildIdStr, setJoinGuildIdStr] = useState('');
    // SỬA LỖI: vừa tạo/vào tông môn xong bị hiện nhầm "đã diệt vong" do 2 listener (users & guilds)
    // đồng bộ không cùng lúc. Dùng mốc thời gian này để hiển thị "Đang đồng bộ..." thay vì báo diệt vong.
    const [guildSyncingUntil, setGuildSyncingUntil] = useState(0);
    const [inviteGuildMemberId, setInviteGuildMemberId] = useState('');
    const [editNotice, setEditNotice] = useState('');
    const acceptGuildReq = async (req) => {
        if (user.guild) return alert("Ngài đã có Tông môn rồi! Phải rời môn phái hiện tại trước khi gia nhập phái mới.");
        try { await joinGuild(req.guildId, req.id); } // máy chủ kiểm tra chỗ trống, cập nhật thành viên + xoá lời mời
        catch (e) { playSfx('ERROR'); alert('Không thể gia nhập: ' + shortErr((e && e.message) || String(e))); return; }
        setGuildSyncingUntil(Date.now() + 8000);
        playSfx('SUCCESS');
        alert(`Đã gia nhập [${req.guildName}] thành công!`);
    };
    const createGuildAction = async () => {
        if (user.spirit < 500) return alert("Không đủ 500 Linh Thạch!");

        // Lọc bỏ ký tự đặc biệt có thể làm sập Firestore Document ID
        const safeName = sanitizePublicText(newGuildName, 30).replace(/[\/\.\#\$\[\]]/g, '');
            if (!safeName || allGuilds[safeName]) return alert("Tên Tông môn không hợp lệ hoặc đã tồn tại trên giang hồ!");
            { const gc = checkContent(safeName); if (!gc.ok || isReservedName(safeName)) { playSfx('ERROR'); return alert(gc.ok ? "Tên Tông môn trùng tên dành riêng của quản trị. Vui lòng đổi tên." : blockMessage(gc, 'Tên Tông môn')); } }

        let newGId;
        try { newGId = (await createGuild(safeName)).guildId; } // máy chủ tạo Tông môn + trừ 500 LT trong một transaction
        catch (e) { playSfx('ERROR'); return alert('Lập Tông môn thất bại: ' + shortErr((e && e.message) || String(e))); }
        setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: cho 8s để listener guilds đồng bộ, tránh hiện nhầm "diệt vong"

        playSfx('SUCCESS');
        alert(`Khai tông lập phái thành công! Mã mời của Tông môn là: ${newGId}`);
        setNewGuildName(''); // Dọn dẹp ô nhập liệu
    };
    const joinGuildByCodeAction = async () => {
        const term = joinGuildIdStr.trim();
        if (!term) return alert("Xin hãy nhập Mã Tông Môn hoặc Tên bang!");

        const targetGuild = Object.values(allGuilds).find(g => g.guildId === term || g.name === term);
        if (!targetGuild) return alert("Không tìm thấy Tông Môn nào có mã này!");
        if (targetGuild.members.length >= targetGuild.level * 5) return alert("Tông môn này đã đầy người!");
        if (targetGuild.members.includes(user.uid)) return alert("Ngài đã ở trong Tông môn này rồi, đừng tẩu hỏa nhập ma!");

        try { await joinGuild(targetGuild.id); } catch (e) { playSfx('ERROR'); return alert('Không thể gia nhập: ' + shortErr((e && e.message) || String(e))); }
        setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: chờ đồng bộ, tránh hiện nhầm "diệt vong"

        playSfx('SUCCESS');
        alert(`Đã quy phục [${targetGuild.name}] thành công!`);
        setJoinGuildIdStr(''); // Dọn dẹp ô nhập liệu
    };
    // BỔ SUNG HÀM CÒN THIẾU: nút "QUY PHỤC" trong danh sách Thế Lực gọi hàm này nhưng
    // trước đây chưa từng được định nghĩa -> bấm vào sẽ báo lỗi (ReferenceError) ngay lập tức.
    const joinGuildAction = async (guildObj) => {
        if (!guildObj) return;
        if (user.guild) return alert("Ngài đã có Tông môn rồi, hãy rời khỏi trước khi gia nhập nơi khác!");
        if (guildObj.members.length >= guildObj.level * 5) return alert("Tông môn này đã đầy người!");
        if (guildObj.members.includes(user.uid)) return alert("Ngài đã ở trong Tông môn này rồi!");

        try {
            await joinGuild(guildObj.id);
            setGuildSyncingUntil(Date.now() + 8000); // SỬA LỖI: chờ đồng bộ, tránh hiện nhầm "diệt vong"

            playSfx('SUCCESS');
            alert(`Đã quy phục [${guildObj.name}] thành công!`);
        } catch (e) {
            alert("Lỗi gia nhập Tông môn: " + e.message);
        }
    };
    const inviteToGuildAction = async (guildObj) => {
        const term = inviteGuildMemberId.trim(); if (!term) return alert("Nhập ID Đạo hữu cần lôi kéo!");
        const targetUser = allUsers.find(u => u.gameId === term);
        if (!targetUser) return alert("Không tìm thấy tu sĩ này trên giang hồ!");
        if (targetUser.guild) return alert("Đạo hữu này đã có Tông môn rồi!");
        if (guildObj.members.length >= guildObj.level * 5) return alert("Tông môn đã đầy, không thể chứa thêm!");
        // Lời mời Tông môn: users/{đối phương}/guildInvites/{tên Tông môn}; rules chỉ cho Bang Chủ tạo
        const invRef = firestore.collection('users').doc(targetUser.uid).collection('guildInvites').doc(guildObj.name);
        try {
            if ((await invRef.get()).exists) return alert("Đã gửi chiếu thư mời gia nhập bang phái cho tu sĩ này rồi!");
            await invRef.set({ fromUid: user.uid, fromName: user.name, guildId: guildObj.name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        } catch (e) { playSfx('ERROR'); return alert('Gửi chiếu thư thất bại: ' + shortErr((e && e.message) || String(e))); }
        alert(`Đã gửi chiếu thư mời [${targetUser.name}] gia nhập bang! Vui lòng chờ họ quy phục.`); setInviteGuildMemberId(''); playSfx('SUCCESS');
    };
    const leaveOrKickGuildAction = async (guildObj, kickMemberUid = null) => {
        if (kickMemberUid) {
            const kickedUser = allUsers.find(x => x.uid === kickMemberUid || x.name === kickMemberUid);
            const kickName = kickedUser ? kickedUser.name : "Kẻ Này";
            if (!await askConfirm(`Trục xuất [${kickName}] khỏi Tông môn?`)) return;
            try { await kickGuildMember(kickMemberUid); } // máy chủ kiểm tra Bang Chủ, cập nhật members + gỡ guild của người bị trục xuất
            catch (e) { playSfx('ERROR'); return alert('Trục xuất thất bại: ' + shortErr((e && e.message) || String(e))); }
            playSfx('FAIL');
        } else {
            if (!await askConfirm("Phản bội Tông môn sẽ bị thiên lôi giáng phạt mất 500 LT, tiếp tục?")) return;
            if (user.spirit < 500) return alert("Không đủ tài sản để nộp phạt!");
            try { await leaveGuild(); playSfx('FAIL'); } // máy chủ cập nhật thành viên/bang chủ + trừ 500 LT
            catch (e) { playSfx('ERROR'); alert('Rời Tông môn thất bại: ' + shortErr((e && e.message) || String(e))); }
        }
    };
    const transferLeaderAction = async (guildObj, memberUid) => {
        const m = allUsers.find(x => x.uid === memberUid);
        if (!await askConfirm(`Truyền ngôi Bang Chủ cho [${m ? m.name : 'đạo hữu này'}]? Ngài sẽ mất quyền quản lý Tông môn.`)) return;
        try { await transferGuildLeader(memberUid); playSfx('SUCCESS'); alert('Đã truyền ngôi Bang Chủ!'); }
        catch (e) { playSfx('ERROR'); alert('Truyền ngôi thất bại: ' + shortErr((e && e.message) || String(e))); }
    };
    // ⚰️ KHAI TỬ TÔNG MÔN: Bang Chủ giải tán thẳng Tông môn (miễn phí, không phạt) - cần thiết để
    // dọn dẹp các bang lập ra lúc test/thử nghiệm, tránh database chất đầy bang "ma" không ai dùng.
    // Xóa hẳn document guild + gỡ "guild" khỏi TOÀN BỘ thành viên trong 1 lượt (batch), không cần
    // từng người tự rời.
    const dissolveGuildAction = async (guildObj) => {
        const isLeaderNow = (guildObj.leader === user.uid || guildObj.leader === user.name);
        if (!isLeaderNow) return alert("Chỉ Bang Chủ mới có quyền Khai Tử Tông Môn!");
        if (!await askConfirm(`Khai Tử VĨNH VIỄN Tông Môn [${guildObj.name}]? Toàn bộ thành viên sẽ bị đuổi ra, KHÔNG THỂ hoàn tác!`)) return;
        try {
            await dissolveGuild(); // máy chủ xoá Tông môn + gỡ guild của mọi thành viên trong một transaction
            playSfx('FAIL');
            alert(`Đã khai tử Tông Môn [${guildObj.name}]!`);
            changeAppState('DASHBOARD');
        } catch (e) { alert("Khai tử thất bại: " + shortErr(e.message)); }
    };
    const updateGuildNoticeAction = async (gObj) => {
        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
        if (!isLeader) return alert("Chỉ Bang Chủ mới có quyền này!");
        const noticeText = sanitizePublicText(editNotice, 200);
            { const nc = checkContent(noticeText); if (!nc.ok) { playSfx('ERROR'); return alert(blockMessage(nc, 'Cáo thị')); } }
            try { await firestore.collection('guilds').doc(gObj.id).update({ notice: noticeText }); }
            catch (e) { playSfx('WRONG'); return alert("Không ban bố được cáo thị: " + shortErr((e && e.message) || '')); }
            playSfx('SUCCESS'); alert("Đã ban bố thông báo mới cho toàn tông môn!");
    };
    const upgradeGuildLevelAction = async (gObj) => {
        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
        if (!isLeader) return alert("Chỉ Bang Chủ mới có quyền này!");
        if (gObj.level >= 5) return alert("Tông môn đã đạt đỉnh cấp!");
        let reqRankLevel = gObj.level + 1; let reqCount = 3; let qualifiedMembers = 0;
        gObj.members.forEach(memberUid => {
            const memberData = allUsers.find(u => u.uid === memberUid || u.name === memberUid);
            if (memberData && memberData.rank) { const rObj = RANKS.find(r => r.id === memberData.rank); if (rObj && rObj.level >= reqRankLevel) qualifiedMembers++; }
        });
        const reqRankName = RANKS.find(r => r.level === reqRankLevel)?.name || 'Không rõ';
        if (qualifiedMembers < reqCount) { playSfx('FAIL'); return alert(`Chưa đủ môn đồ! Để lên Cấp ${gObj.level + 1}, Tông môn cần ít nhất ${reqCount} môn đồ đạt cảnh giới [${reqRankName}] trở lên. (Hiện có: ${qualifiedMembers}/${reqCount})`); }
        try { await upgradeGuild(); } catch (e) { playSfx('FAIL'); return alert('Nâng cấp thất bại: ' + shortErr((e && e.message) || String(e))); } // máy chủ kiểm tra bang chủ + số môn đồ đạt cảnh giới
        playSfx('SUCCESS'); alert(`Đột phá Tông môn Cấp ${gObj.level + 1} thành công! Uy phong vang dội!`);
    };
    const buyGuildPerkAction = async (gObj, perkType, val, costSpirit) => {
        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
        if (!isLeader) return alert("Càn rỡ! Ngươi không phải Bang Chủ, lấy tư cách gì mà tu sửa Tông Môn?");
        if (costSpirit > 0 && (user.spirit || 0) < costSpirit) return alert("Ngài không đủ Linh Thạch để đài thọ cho Tông môn!");
        if (costSpirit > 0 && !await askConfirm(`Tiêu hao ${costSpirit} 💎 từ kho riêng của ngài để nâng cấp Tông môn?`)) return;
        try { await buyGuildPerk(perkType, val); } catch (e) { playSfx('FAIL'); return alert('Trang hoàng thất bại: ' + shortErr((e && e.message) || String(e))); } // giá & quyền do máy chủ quyết định
        playSfx('SUCCESS'); alert("Trang hoàng Tông môn thành công!");
    };
    const buyGuildPerkWithExpAction = async (gObj, perkType, val, costExp) => {
        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
        if (!isLeader) return alert("Càn rỡ! Ngươi không phải Bang Chủ!");
        if ((gObj.exp || 0) < costExp) return alert(`Tông môn không đủ Công Trạng! Cần ${costExp} điểm.`);
        if (!await askConfirm(`Tiêu hao ${costExp} Công Trạng để đổi báu vật này cho Tông môn?`)) return;
        try { await buyGuildPerk(perkType, val); } catch (e) { playSfx('FAIL'); return alert('Đổi báu vật thất bại: ' + shortErr((e && e.message) || String(e))); }
        playSfx('SUCCESS'); alert("Tuyệt vời! Tông môn đã được thăng cấp báu vật!");
    };
    const exchangeGuildExpAction = async (gObj, cost, type, value, itemName) => {
        const isLeader = (gObj.leader === user.uid || gObj.leader === user.name);
        if (!isLeader) return alert("Càn rỡ! Chỉ Bang Chủ mới có quyền mở Thánh Khố rút Công Trạng!");
        if ((gObj.exp || 0) < cost) return alert(`Tông môn không đủ Công Trạng! Cần ${cost} điểm.`);
        if (!await askConfirm(`Rút ${cost} Công Trạng của Tông môn để lấy [${itemName}] cho bản thân?`)) return;
        
        const offerId = type === 'spirit' ? 'spirit5000' : (type === 'x2' ? 'x2pair' : value); // máy chủ giữ giá/loại/giá trị từng phần thưởng
        let ex; try { ex = await exchangeGuildExp(offerId); } catch (e) { playSfx('FAIL'); return alert('Trao đổi thất bại: ' + shortErr((e && e.message) || String(e))); }
        if (ex && ex.note === 'duplicate_refund') alert('Ngài đã có vật phẩm này, đền bù 2000 Linh Thạch!');
        playSfx('SUCCESS'); alert(`Trao đổi thành công! Nhận được: ${itemName}`);
    };

    return { acceptGuildReq, buyGuildPerkAction, buyGuildPerkWithExpAction, createGuildAction, dissolveGuildAction, editNotice, exchangeGuildExpAction, guildSyncingUntil, inviteGuildMemberId, inviteToGuildAction, joinGuildAction, joinGuildByCodeAction, joinGuildIdStr, leaveOrKickGuildAction, newGuildName, setEditNotice, setInviteGuildMemberId, setJoinGuildIdStr, setNewGuildName, setViewGuildModal, transferLeaderAction, updateGuildNoticeAction, upgradeGuildLevelAction, viewGuildModal };
}
