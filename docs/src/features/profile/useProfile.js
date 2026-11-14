import { blockMessage, checkContent, isPublicTextBlocked, isReservedName, sanitizePublicText } from '../../lib/contentFilter.js';
import { equipItem, renameUser } from '../../lib/serverApi.js';
import { safeUserUpdate } from '../../lib/userData.js';
import { shortErr } from '../../lib/format.js';

const { useState } = React;

export function useProfile({ core, audio, nav }) {
    const { allUsers, user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    const [profileImage, setProfileImage] = useState('');
    const [profileBg, setProfileBg] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [newName, setNewName] = useState('');
    // Trang bị / tháo: máy chủ kiểm tra sở hữu rồi mới ghi (itemId '' = tháo)
    const equip = async (slot, itemId = '') => { try { await equipItem(slot, itemId); return true; } catch (e) { playSfx('ERROR'); alert('Không thể trang bị: ' + shortErr((e && e.message) || String(e))); return false; } };
    const handleChangeNameAction = async () => {
        playSfx('CLICK');
        const clean = newName.toLowerCase().trim();
        if (!clean || clean.length < 3) return alert("Đạo hiệu quá ngắn hoặc không hợp lệ!");
        if (/[\W_]/g.test(clean)) return alert("Đạo hiệu chỉ được chứa chữ và số!");
            if (isReservedName(clean) || isPublicTextBlocked(clean)) return alert("Đạo hiệu này không được phép sử dụng (từ ngữ không phù hợp hoặc trùng tên dành riêng của quản trị).");
        if ((user.spirit || 0) < 1000 || (user.fame || 0) < 100) return alert("Hao tổn nguyên thần! Ngài không đủ Linh Thạch hoặc Danh Vọng để thực hiện!");
        if (allUsers.find(x => x.name === clean)) return alert("Đạo hiệu này đã được tu sĩ khác sử dụng!");
        if (!await askConfirm(`Xác nhận đổi Đạo hiệu thành [${clean}]? Phí tổn: 1000💎 & 100⭐.`)) return;

        try {
            await renameUser(clean); // máy chủ tự kiểm tra phí/trùng tên và trừ 1000 LT + 100 DV
            alert("Thay tên đổi họ thành công! Vận mệnh đã xoay chuyển!"); setNewName('');
        } catch(e) { alert("Đổi Đạo hiệu thất bại: " + shortErr((e && e.message) || String(e))); }
    };
    const saveProfileAction = async () => {
        const bio = sanitizePublicText(profileBio, 100);
        { const bc = checkContent(bio); if (!bc.ok) { playSfx('ERROR'); return alert(blockMessage(bc, 'Di ngôn')); } }
        try { await safeUserUpdate(user.uid, { photo: profileImage, bgImage: profileBg, bio }); }
        catch (e) { playSfx('WRONG'); return alert("Không lưu được ấn ký: " + shortErr((e && e.message) || '') + " (ảnh quá nặng? hãy thử ảnh nhỏ hơn)."); }
        playSfx('SUCCESS'); changeAppState('DASHBOARD');
    };

    return { equip, handleChangeNameAction, newName, profileBg, profileBio, profileImage, saveProfileAction, setNewName, setProfileBg, setProfileBio, setProfileImage };
}
