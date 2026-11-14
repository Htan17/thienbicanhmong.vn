import { BUFF_DAILY_LIMIT, BUFF_DEFS, BUFF_MAX_STACK_MS, RANKS } from '../../config/gameData.js';
import { activateBuff, buyRank, purchaseItem, rollGacha } from '../../lib/serverApi.js';
import { getVNSourceDate } from '../../lib/progress.js';
import { shortErr } from '../../lib/format.js';

const { useState, useRef } = React;

export function useShop({ core, audio, profile }) {
    const { user } = core;
    const { playSfx } = audio;
    const { equip } = profile;
    const buyingRef = useRef(false); // chống bấm mua nhiều lần khi đang chờ máy chủ
    const [gachaResultText, setGachaResultText] = useState('');
    const handleGachaRoll = async () => {
        if (user.spirit < 200) return alert("Không đủ 200 Linh Thạch!");
        playSfx('GACHA');
        try { const r = await rollGacha(); setGachaResultText(r.text); } // máy chủ quay số, trừ 200 LT, trao thưởng
        catch (e) { playSfx('ERROR'); setGachaResultText('Thất bại: ' + shortErr((e && e.message) || String(e))); }
        setTimeout(() => setGachaResultText(''), 3000);
    };
    const buyItemAction = async (price, itemId, currencyType = 'spirit', category = 'other') => {
        const todayDateStr = getVNSourceDate(new Date());
        let dailyRecord = user.dailyPurchases || { date: todayDateStr, count: 0, x2: 0 };
        if (dailyRecord.date !== todayDateStr) { dailyRecord = { date: todayDateStr, count: 0, x2: 0 }; }
        if (BUFF_DEFS[itemId]) { const bc = (dailyRecord.b && dailyRecord.b[itemId]) || 0; if (bc >= BUFF_DAILY_LIMIT) { playSfx('ERROR'); return alert(`Hôm nay đã mua tối đa ${BUFF_DAILY_LIMIT} ${BUFF_DEFS[itemId].name}! Mai hãy quay lại.`); } }
        if (itemId === 'x2_card') { if ((dailyRecord.x2 || 0) >= 2) return alert("Đã đổi tối đa 2 Bùa Nhân Đôi hôm nay! Khí huyết hao tổn, mai hãy quay lại."); }
        if ((user[currencyType] || 0) < price) { playSfx('ERROR'); return alert(`Thiếu ${currencyType === 'spirit' ? 'Linh Thạch' : 'Danh Vọng'}!`); }
        // GIAO DỊCH DO MÁY CHỦ QUYẾT ĐỊNH: giá, giới hạn ngày, kiểm tra số dư đều ở Cloud Function (`price` ở trên chỉ để kiểm tra nhanh phía UI).
        // Không có nhánh dự phòng ghi trực tiếp: lỗi thì báo lỗi, không trừ tiền.
        if (buyingRef.current) return; buyingRef.current = true;
        try { await purchaseItem(itemId); playSfx('BUY'); }
        catch (e) { playSfx('ERROR'); alert('Mua thất bại: ' + shortErr((e && e.message) || String(e))); }
        finally { buyingRef.current = false; }
    };
    // 🆕 KÍCH HOẠT BÙA NHÂN ĐÔI (bản mới): trước đây thẻ x2_card bị tiêu ÂM THẦM ngay tại thời điểm
    // nhận thưởng của lượt Vượt Ải/Lưu Video KẾ TIẾP - không có bước "kích hoạt" nào cả, người chơi
    // không chủ động chọn được LÚC NÀO nhân đôi phát huy tác dụng. Nay đổi thành: bấm nút "Kích Hoạt"
    // ngay trong Pháp Bảo Các -> tiêu 1 thẻ trong túi đồ NGAY LÚC BẤM, đổi lại 2 GIỜ hiệu lực nhân đôi
    // áp dụng cho MỌI lượt Vượt Ải/Lưu Bài Học Video trong 2 giờ đó (xem x2BoostExpiresAt được đọc ở
    // continueAfterAnswer/saveVideoNoteAction/nextVideoQuizRound). Giới hạn 2 thẻ/ngày vẫn giữ nguyên
    // ở buyItemAction phía trên - đây chỉ là bước TIÊU thẻ đã mua, không mua thêm.
    const activateBuffAction = async (id) => {
        const def = BUFF_DEFS[id]; if (!def || !user) return;
        const idx = (user.inventory || []).indexOf(id);
        if (idx === -1) { playSfx('ERROR'); return alert('Ngài chưa sở hữu vật phẩm này!'); }
        const now = Date.now(), cur = Math.max(now, (user.buffs && user.buffs[id]) || 0);
        if (cur - now >= BUFF_MAX_STACK_MS) { playSfx('ERROR'); return alert('Hiệu lực đã đạt tối đa 48 giờ, hãy dùng tiếp khi gần hết hạn.'); }
        const newInv = [...user.inventory]; newInv.splice(idx, 1);
        try {
            await activateBuff(id); // máy chủ tiêu 1 bùa trong túi và cộng giờ hiệu lực
            playSfx('BUFF'); alert(`${def.icon} Đã kích hoạt ${def.name}! ${def.desc}`);
        } catch (e) { playSfx('ERROR'); alert('Kích hoạt thất bại: ' + shortErr(e.message)); }
    };
    const buySfxPackAction = async (pk) => {
        if ((user.inventory || []).includes('sfx_' + pk.id)) return;
        if ((user.spirit || 0) < pk.price) { playSfx('ERROR'); return alert('Thiếu Linh Thạch!'); }
        playSfx('BUY');
        try { await purchaseItem(pk.id); await equip('sfx', pk.id); } catch (e) { playSfx('ERROR'); alert('Mua thất bại: ' + shortErr((e && e.message) || String(e))); }
    };
    const activateX2BoostAction = async () => {
        if (!user) return;
        const now = Date.now();
        if (user.x2BoostExpiresAt && now < user.x2BoostExpiresAt) { playSfx('WRONG'); return alert("Bùa Nhân Đôi đang có hiệu lực rồi, không thể kích hoạt chồng thêm lượt nữa!"); }
        const idx = (user.inventory || []).indexOf('x2_card');
        if (idx === -1) { playSfx('WRONG'); return alert("Ngài chưa sở hữu Bùa Nhân Đôi nào! Hãy đổi ở Pháp Bảo Các trước."); }
        const newInventory = [...user.inventory]; newInventory.splice(idx, 1);
        try {
            await activateBuff('x2_card'); // máy chủ tiêu thẻ và đặt hạn 2 giờ
            playSfx('VICTORY');
            alert("🧧 Đã kích hoạt Bùa Nhân Đôi! Linh Thạch nhận được từ Vượt Ải & Lưu Bài Học Video sẽ được NHÂN ĐÔI trong 2 giờ tới.");
        } catch (e) { alert("Kích hoạt thất bại! Mất kết nối mạng, thử lại sau."); }
    };
    // 🔒 KHÓA BẬC ĐỘT PHÁ: chỉ được đột phá TUẦN TỰ từng cảnh giới kế tiếp, không cho nhảy cóc dù
    // đủ Linh Thạch/Danh Vọng cho cảnh giới cao hơn (trước đây có thể mua thẳng cảnh giới bất kỳ).
    const breakthroughRankAction = async (rankObj) => {
        const currentRank = RANKS.find(r => r.id === user.rank) || RANKS[0];
        if (rankObj.level <= currentRank.level) return alert("Ngài đã vượt qua cảnh giới này rồi!");
        if (rankObj.level !== currentRank.level + 1) {
            const nextRank = RANKS.find(r => r.level === currentRank.level + 1);
            return alert(`Phải đột phá TUẦN TỰ từng cảnh giới! Cảnh giới tiếp theo của Ngài là [${nextRank ? nextRank.name : '???'}].`);
        }
        if (rankObj.price && user.spirit < rankObj.price) return alert("Thiếu Linh Thạch để đột phá!");
        if (rankObj.reqFame && user.fame < rankObj.reqFame) return alert("Thiếu Danh Vọng để độ kiếp!");
        try { await buyRank(rankObj.id); } catch (e) { playSfx('ERROR'); return alert('Đột phá thất bại: ' + shortErr((e && e.message) || String(e))); } // máy chủ tính LT/DV và đổi cảnh giới
        playSfx('SUCCESS');
        alert(`Đột phá [${rankObj.name}] thành công! Thiên địa chấn động! Từ nay Linh Thạch kiếm được +${rankObj.bonusPercent}% vĩnh viễn.`);
    };

    return { activateBuffAction, activateX2BoostAction, breakthroughRankAction, buyItemAction, buySfxPackAction, gachaResultText, handleGachaRoll };
}
