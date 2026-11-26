// LOGIC MÚI GIỜ CHUẨN XÁC TỪ NGÀI (ĐÃ ĐƯỢC TÍCH HỢP)
export const getVNSourceDate = (date) => {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
};

export const calculateStreak = (userData) => {
    const now = new Date();
    const today = getVNSourceDate(now);
    
    if (userData.lastPlayedDate === today) { return { streakCount: userData.streakCount || 0, lastPlayedDate: today }; }

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getVNSourceDate(yesterdayDate);

    const isConsecutive = userData.lastPlayedDate === yesterdayStr;
    return { streakCount: isConsecutive ? (userData.streakCount || 0) + 1 : 1, lastPlayedDate: today };
};

// ============================================================
// 🗺️ TU LUYỆN CHI LỘ - hàm thuần (không phụ thuộc state React) dùng chung cho Đạo Hữu Bảng
// (BXH thời gian luyện thi trong ngày) và Đạo Đồ (sơ đồ cây).
// ============================================================
// Đạo Hữu Bảng chỉ TÍNH ĐIỂM trong khung giờ 4h00 - 23h00 (giờ Việt Nam) mỗi ngày, để khuyến
// khích giờ học lành mạnh thay vì cày điểm lúc nửa đêm. Ngoài khung giờ này vẫn luyện Ải bình
// thường, chỉ là không cộng vào Đạo Hữu Bảng hôm đó.
const EXAM_PATH_WINDOW_START_HOUR = 4;
const EXAM_PATH_WINDOW_END_HOUR = 23;
const getVNHour = (date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(date)) % 24;
export const isExamPathWindowOpen = (date) => { const h = getVNHour(date || new Date()); return h >= EXAM_PATH_WINDOW_START_HOUR && h < EXAM_PATH_WINDOW_END_HOUR; };
// Tính mốc thời gian (ms) của lần 4h00 sáng (giờ VN) SẮP TỚI kế tiếp - dùng làm "nextReset" cho
// Đạo Hữu Bảng, theo đúng mô hình meta/season đã có sẵn (xem seasonDocRef trong useEffect chính).
export const getNextExamPathResetTs = (from) => {
    const now = from || new Date();
    const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const next = new Date(vnNow);
    next.setHours(EXAM_PATH_WINDOW_START_HOUR, 0, 0, 0);
    if (next <= vnNow) next.setDate(next.getDate() + 1);
    return now.getTime() + (next.getTime() - vnNow.getTime());
};
// Gộp lịch sử các lần luyện (attempts) của TỪNG node theo chủ đề (topics) thành % thành thạo mỗi
// chủ đề (0-100), dùng để vẽ Bát Quái Đồ. TÍNH THUẦN Ở CLIENT (không cần gọi AI) để luôn nhanh,
// miễn phí và không phụ thuộc API Key - phần AI (nếu có Key) chỉ dùng để viết THÊM 1 đoạn nhận
// xét bằng lời (xem getExamPathAiAdvice), không dùng để tính điểm.
export const computeTopicMastery = (examPath) => {
    const acc = {}; // { topic: { correct, total } }
    (examPath?.nodes || []).forEach(n => {
        if (!n.bestScore && n.bestScore !== 0) return; // node chưa luyện lần nào -> bỏ qua
        (n.topics && n.topics.length ? n.topics : ['Tổng Quát']).forEach(t => {
            if (!acc[t]) acc[t] = { correct: 0, total: 0 };
            acc[t].correct += n.bestScore; acc[t].total += 100; // bestScore đã là % (0-100)
        });
    });
    const result = {};
    Object.keys(acc).forEach(t => { result[t] = Math.round((acc[t].correct / acc[t].total) * 100); });
    return result;
};
