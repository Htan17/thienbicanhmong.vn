**P0 (mới 13/11): chạy emulator + test thủ công kết bạn / mời Tông môn (client đã đổi sang subcollection nhưng CHƯA chạy thử); chạy migrate-friends-requests.js dry-run trên Emulator; rồi xử lý meta/* ghi từ client trước khi bật rules hardened.**
# NEXT_TASKS (theo thứ tự ưu tiên)
**P0 — cần máy có mạng**
1. Lấy `package-lock.json` + `functions/package-lock.json` từ máy Windows đã `npm ci` thành công (hoặc `npm install`), đặt vào gói. Chạy `npm run build` lại bằng esbuild đúng phiên bản pin.
2. `npm audit` hai nơi → hoàn thiện `docs/DEPENDENCY_SECURITY_AUDIT.md`, đặc biệt 1 critical.
3. Chạy `npm run emulators`, `emulators:seed`, `test:rules`; sửa lỗi; ghi `docs/TEST_REPORT.md`.
**P0 (mới) — chạy lại `npm run emulators` trên Windows: xác nhận Pub/Sub READY, 3 hàm scheduled được nạp, project hiển thị demo-tkbc; gửi ảnh CMD để cập nhật.**
**P0 — bảo mật/backend**
4. Viết server: gacha, `claimVideoQuizRound`, `joinGuild`, kick/transferLeader/duyệt lời mời, studySeconds; nối client; xoá các `safeUserUpdate` kinh tế còn lại (xem FULL_SYSTEM_AUDIT).
5. Chấm quiz phía server (lưu đề + đáp án phía server). 6. Custom Claims admin, App Check, rate limit, audit log admin. 7. Sửa Auth (email giả sau đổi email). 8. Migration guild theo UID, friends/requests → subcollection, publicProfiles.
9. Chỉ khi 3 và 4 xong: `rules:activate-hardened` cùng lúc deploy client mới.
**P1/P2**: tách App.jsx theo nghiệp vụ; UI/UX + responsive; E2E/browser smoke; hiệu năng; demo + ảnh chụp; tài liệu còn thiếu (PRODUCT_OVERVIEW, FEATURE_MATRIX, TECHNICAL_DUE_DILIGENCE, ARCHITECTURE, API_DOCUMENTATION, SECURITY_AUDIT, TEST_REPORT, PERFORMANCE_REPORT, SERVICE_COST_ESTIMATE, THIRD_PARTY_ASSETS, AI_CONTRIBUTION_RECORD, BACKUP_RESTORE, COMMERCIAL_ROADMAP).
**Hạn Node**: nâng Functions lên Node 24 trước 2027-04-30.
