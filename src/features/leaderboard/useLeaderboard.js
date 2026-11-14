import { isLbRanked } from '../../config/gameData.js';

const { useState, useMemo } = React;

export function useLeaderboard({ core }) {
    const { allGuilds, allUsers, user } = core;
    // Quản lý Modal nhận thưởng Mùa Giải
    const [seasonRewardModal, setSeasonRewardModal] = useState(null);
    const [leaderboardTab, setLeaderboardTab] = useState('ALL');
    const [timeLeftStr, setTimeLeftStr] = useState('Đang tính toán...');
    const [guildTimeLeftStr, setGuildTimeLeftStr] = useState('Đang tính toán...');
    // 🏆 BXH tổng theo Season Score, KHÔNG phụ thuộc tab đang chọn ở màn Thiên Bảng (sửa lỗi cũ:
    // bảng TOP 5 ở màn Kết Quả từng bị trống trơn nếu lần trước ngài xem tab DANH VỌNG/ĐẠO HỮU).
    // Dùng chung cho mọi màn "kết quả sau khi học": Vượt Ải, Ôn Tập Từ Vựng Video, Lưu Bài Video.
    const topSeasonList = useMemo(() => [...allUsers].filter(isLbRanked).sort((a,b) => (b.seasonScore || 0) - (a.seasonScore || 0)), [allUsers]);
    const leaderboardRenderList = useMemo(() => {
        let sortedList = [...allUsers].filter(isLbRanked).sort((a,b) => (b.seasonScore || 0) - (a.seasonScore || 0));
        if (leaderboardTab === 'FRIENDS' && user) { sortedList = sortedList.filter(p => user.friends?.includes(p.uid) || p.uid === user.uid); }
        else if (leaderboardTab === 'FAME') { sortedList = [...allUsers].sort((a,b) => (b.fame || 0) - (a.fame || 0)); }
        return sortedList;
    }, [allUsers, leaderboardTab, user]);
    const guildLeaderboardRenderList = useMemo(() => {
        return Object.values(allGuilds).sort((a,b) => { if (b.level !== a.level) return b.level - a.level; return (b.exp || 0) - (a.exp || 0); });
    }, [allGuilds]);

    return { guildLeaderboardRenderList, guildTimeLeftStr, leaderboardRenderList, leaderboardTab, seasonRewardModal, setGuildTimeLeftStr, setLeaderboardTab, setSeasonRewardModal, setTimeLeftStr, timeLeftStr, topSeasonList };
}
