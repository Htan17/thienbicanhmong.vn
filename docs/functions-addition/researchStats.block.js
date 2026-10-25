// ===================================================================================
// RESEARCH DASHBOARD - getResearchStats (Callable Gen 2, CHỈ ĐỌC, CHỈ ADMIN)
// DÁN NGUYÊN BLOCK NÀY VÀO CUỐI functions/index.js (không sửa gì phía trên).
// Mọi tên đều có tiền tố rs / Rs / RS_ để không đụng tên đã có trong index.js.
// Nếu functions/package.json có "type": "module" (ESM) thì xem phần "ESM" trong HUONG_DAN.md.
// ===================================================================================
const { onCall: rsOnCall, HttpsError: RsHttpsError } = require('firebase-functions/v2/https');
const rsLogger = require('firebase-functions/logger');
const { getApps: rsGetApps, initializeApp: rsInitializeApp } = require('firebase-admin/app');
const { getFirestore: rsGetFirestore, FieldPath: RsFieldPath } = require('firebase-admin/firestore');
const rsCrypto = require('crypto');

// PHẢI TRÙNG với hằng RS_REGION trong docs/src/components/ResearchDashboard.jsx.
// Đặt cùng region với các function hiện có của bạn.
const RS_REGION = 'us-central1';
const RS_ACTIVE_DAYS = 30;   // "hoạt động" = lastActive trong 30 ngày gần nhất
const RS_PAGE = 1000;        // đọc users theo từng trang, không nạp một lần
const RS_TOP = 10;
// Chỉ đọc đúng các trường này của users. KHÔNG đọc email, library, videoNotes, friends, requests, private, srs...
const RS_USER_FIELDS = ['studySeconds', 'streakCount', 'spirit', 'fame', 'seasonScore', 'lastActive'];

const rsNum = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const rsMillis = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    return 0;
};
// Mã ẩn danh ổn định, không thể suy ngược ra uid: HS-3F9A1C
const rsCode = (uid) => 'HS-' + rsCrypto.createHash('sha256').update(`${process.env.GCLOUD_PROJECT || ''}:${uid}`).digest('hex').slice(0, 6).toUpperCase();
const rsTop = (rows, key) => rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, RS_TOP).map((r) => ({ code: rsCode(r.uid), value: r[key] }));
const rsCount = async (db, name) => (await db.collection(name).count().get()).data().count;

async function rsComputeStats(db, now) {
    const rows = [];
    let totalStudy = 0, totalSpirit = 0, totalFame = 0, totalSeason = 0, totalStreak = 0, active = 0, learners = 0;
    const since = now - RS_ACTIVE_DAYS * 86400000;
    let lastId = null;
    for (;;) {
        let q = db.collection('users').orderBy(RsFieldPath.documentId()).select(...RS_USER_FIELDS).limit(RS_PAGE);
        if (lastId) q = q.startAfter(lastId);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach((d) => {
            const x = d.data();
            const study = rsNum(x.studySeconds), streak = rsNum(x.streakCount), season = rsNum(x.seasonScore);
            totalStudy += study; totalSpirit += rsNum(x.spirit); totalFame += rsNum(x.fame); totalSeason += season; totalStreak += streak;
            if (study > 0) learners += 1;
            if (rsMillis(x.lastActive) >= since) active += 1;
            rows.push({ uid: d.id, study, streak, season });
        });
        lastId = snap.docs[snap.docs.length - 1].id;
        if (snap.size < RS_PAGE) break;
    }
    const [totalQuizShares, totalVideoShares, totalGuilds] = await Promise.all([rsCount(db, 'quizShares'), rsCount(db, 'videoShares'), rsCount(db, 'guilds')]);
    const totalUsers = rows.length;
    return {
        generatedAt: now,
        activeWindowDays: RS_ACTIVE_DAYS,
        totalUsers,
        totalStudySeconds: totalStudy,
        averageStudySeconds: learners > 0 ? Math.round(totalStudy / learners) : 0, // trung bình trên người đã có thời gian học
        learnersCount: learners,
        totalSpirit, totalFame, totalSeasonScore: totalSeason, totalStreak,
        totalQuizShares, totalVideoShares, totalGuilds,
        activeUsers: active,
        inactiveUsers: Math.max(0, totalUsers - active),
        topStudyUsers: rsTop(rows, 'study'),
        topStreakUsers: rsTop(rows, 'streak'),
        topSeasonUsers: rsTop(rows, 'season'),
        // Trạng thái dữ liệu còn thiếu: nói thẳng thay vì suy đoán
        unavailable: [
            { key: 'dailyActiveUsers', missing: 'Chưa có log hoạt động theo ngày (users chỉ có lastActive mới nhất)' },
            { key: 'dailyStudySeconds', missing: 'Chưa có lịch sử thời gian học theo ngày (studySeconds chỉ là số tích lũy)' },
            { key: 'modeUsage', missing: 'Chưa có trường hoặc log ghi Chế độ Học tập / Bí Tịch' },
            { key: 'lessonCompletionRate', missing: 'Chưa có số bài bắt đầu và hoàn thành (seasonLessons bị đặt lại mỗi mùa)' }
        ]
    };
}

// request.data bị bỏ qua hoàn toàn: không nhận UID, role hay isAdmin từ client.
const rsHandler = async (request) => {
    if (!request.auth || !request.auth.uid) {
        throw new RsHttpsError('unauthenticated', 'Vui lòng đăng nhập.');
    }
    const uid = request.auth.uid;
    if (!rsGetApps().length) rsInitializeApp();
    const db = rsGetFirestore();

    let adminSnap;
    try {
        adminSnap = await db.collection('admins').doc(uid).get();
    } catch (e) {
        rsLogger.error('getResearchStats: lỗi kiểm tra quyền', e);
        throw new RsHttpsError('internal', 'Không thể xác minh quyền truy cập.');
    }
    if (!adminSnap.exists) {
        throw new RsHttpsError('permission-denied', 'Bạn không có quyền truy cập.');
    }

    try {
        return await rsComputeStats(db, Date.now());
    } catch (e) {
        rsLogger.error('getResearchStats: lỗi tổng hợp', e);
        throw new RsHttpsError('internal', 'Không thể tổng hợp số liệu. Vui lòng thử lại.');
    }
};

exports.getResearchStats = rsOnCall({ region: RS_REGION, memory: '512MiB', timeoutSeconds: 120, maxInstances: 3 }, rsHandler);
