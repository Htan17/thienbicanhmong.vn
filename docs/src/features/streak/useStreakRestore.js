import { buffActive } from '../../config/gameData.js';
import { getVNSourceDate } from '../../lib/progress.js';
import { restoreStreak } from '../../lib/serverApi.js';
import { safeGetItem, safeSetItem } from '../../lib/storage.js';

const { useState, useEffect, useRef } = React;

export function useStreakRestore({ core, audio }) {
    const { user } = core;
    const { playSfx } = audio;
    const [streakRestoreModal, setStreakRestoreModal] = useState(null); // { oldStreak }
    // Phát hiện chuỗi điểm danh bị đứt (bỏ lỡ quá 24h): hiện modal 3 lựa chọn khôi phục thay vì
    // âm thầm reset về 1. Chỉ hiện khi có streak cũ > 0 và chưa chọn "Học để khôi phục" (đang chờ).
    // SỬA LỖI (modal khôi phục chuỗi hiện lặp / bấm rồi vẫn hiện):
    //  1) Trước đây modal chỉ đóng SAU khi `await update(...)` xong -> khi mạng chậm/offline hoặc Rules
    //     từ chối, promise treo/lỗi => modal không đóng, người dùng bấm nhiều lần => alert + trừ tiền lặp.
    //  2) Effect có 2 nhánh `return` mà KHÔNG đóng modal.
    // Nay: đóng modal NGAY khi bấm, khoá bấm lặp bằng ref, bắt lỗi (lỗi thì mở lại), và nhớ phiên đã xử lý.
    const streakRestoreBusyRef = React.useRef(false);
    const streakRestoreHandledRef = React.useRef(null); // lưu `${uid}:${lastPlayedDate}` đã xử lý trong phiên này
    useEffect(() => {
        const close = () => setStreakRestoreModal(prev => (prev === null ? prev : null));
        if (!user || !user.lastPlayedDate || !(user.streakCount > 0) || user.streakRestorePending) { close(); return; }
        const today = getVNSourceDate(new Date());
        const yesterday = getVNSourceDate(new Date(Date.now() - 86400000));
        if (user.lastPlayedDate === today || user.lastPlayedDate === yesterday) { close(); return; }
        // Tẩy Tủy Đan đang có hiệu lực -> tự cứu chuỗi (tiêu hao hiệu lực), không hiện bảng khôi phục
        if (buffActive(user, 'tay_tuy_dan') && !streakRestoreBusyRef.current) {
            streakRestoreBusyRef.current = true;
            restoreStreak('shield')
                .then(() => { playSfx('BUFF'); alert('🛡️ Tẩy Tủy Đan đã hộ chuỗi điểm danh cho Ngài! (hiệu lực đã dùng hết)'); })
                .catch(() => {}).finally(() => { streakRestoreBusyRef.current = false; });
            return;
        }
        if (streakRestoreHandledRef.current === `${user.uid}:${user.lastPlayedDate}` || safeGetItem('streakRestoreSkip') === `${user.uid}:${user.lastPlayedDate}`) return;
        setStreakRestoreModal(prev => (prev && prev.oldStreak === user.streakCount ? prev : { oldStreak: user.streakCount }));
    }, [user?.uid, user?.lastPlayedDate, user?.streakCount, user?.streakRestorePending]);
    const runStreakRestore = async (work, okMsg) => {
        if (streakRestoreBusyRef.current || !user) return;
        streakRestoreBusyRef.current = true;
        const key = `${user.uid}:${user.lastPlayedDate}`;
        streakRestoreHandledRef.current = key;
        setStreakRestoreModal(null); // đóng ngay, không chờ mạng
        try {
            await work();
            if (okMsg) setTimeout(() => alert(okMsg), 0);
        } catch (e) {
            console.error('Khôi phục chuỗi lỗi:', e && e.code, e && e.message, e);
            // KHÔNG mở lại modal (trước đây khiến người chơi kẹt, không vào được game). Ghi nhớ bỏ qua
            // trên thiết bị này cho mốc lastPlayedDate hiện tại để vào game bình thường.
            safeSetItem('streakRestoreSkip', key);
            alert('Không thể khôi phục chuỗi (' + ((e && (e.code || e.message)) || 'lỗi không rõ') + '). Bạn vẫn có thể chơi bình thường; hãy học 1 Ải để tiếp tục.');
        } finally { streakRestoreBusyRef.current = false; }
    };
    const streakRestoreByStudy = () => {
        playSfx('CLICK');
        runStreakRestore(
            () => restoreStreak('study'),
            "Hãy hoàn thành 1 Ải bất kỳ trong hôm nay để khôi phục chuỗi điểm danh!"
        );
    };
    const streakRestoreBySpirit = () => {
        const cost = Math.min((streakRestoreModal?.oldStreak || 1) * 20, 2000);
        if ((user.spirit || 0) < cost) return alert(`Không đủ Linh Thạch! Cần ${cost}💎.`);
        playSfx('SUCCESS');
        runStreakRestore(
            () => restoreStreak('spirit'),
            `Đã dùng ${cost}💎 Linh Thạch khôi phục chuỗi điểm danh! Hãy hoàn thành 1 Ải hôm nay để nối tiếp.`
        );
    };
    const streakRestoreByFame = () => {
        const cost = Math.min((streakRestoreModal?.oldStreak || 1) * 5, 500);
        if ((user.fame || 0) < cost) return alert(`Không đủ Danh Vọng! Cần ${cost}⭐.`);
        playSfx('SUCCESS');
        runStreakRestore(
            () => restoreStreak('fame'),
            `Đã dùng ${cost}⭐ Danh Vọng khôi phục chuỗi điểm danh! Hãy hoàn thành 1 Ải hôm nay để nối tiếp.`
        );
    };
    const streakRestoreDismiss = () => {
        playSfx('FAIL');
        runStreakRestore(() => restoreStreak('dismiss'), null);
    };

    return { streakRestoreByFame, streakRestoreBySpirit, streakRestoreByStudy, streakRestoreDismiss, streakRestoreModal };
}
