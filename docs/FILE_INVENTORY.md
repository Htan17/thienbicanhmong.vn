# FILE_INVENTORY — V15.0.0-rc.0 sau dọn dẹp (14/11/2026)

Mỗi file của gói hiện tại có đúng một dòng. Trạng thái: **KEEP** giữ nguyên nội dung · **UPDATE** sửa nội dung · **MOVE** chuyển chỗ · **ARCHIVE** chuyển vào `docs/archive/` · **NEW** file mới · **NEEDS_INVESTIGATION** chưa chứng minh được là thừa nên giữ nguyên, chờ quyết định · **DUPLICATE_CANDIDATE** và **REMOVE_CONFIRMED**: không có file nào (so sánh SHA-256 toàn bộ file không thấy hai file trùng nội dung; không xoá file nào).

Nhóm: A source/config · B testing · C tài liệu · D asset (không có file ảnh/font/audio/video nào trong gói) · E build/dev · F legacy · G file rác/sinh ra (không tìm thấy: không có node_modules, cache, log, .DS_Store, Thumbs.db, ZIP lồng, file backup).

Tổng: 158 file, 32 thư mục (không tính thư mục gốc). Phân bố trạng thái: ARCHIVE 5, ARCHIVE+UPDATE 4, KEEP 121, MOVE+UPDATE 1, NEEDS_INVESTIGATION 2, NEW 5, NEW (archive) 1, UPDATE 19.

| Đường dẫn | Nhóm | Trạng thái | Ghi chú |
|---|---|---|---|
| `.env.example` | A Source/Config | KEEP |  |
| `.firebaserc.example` | A Source/Config | KEEP |  |
| `.gitignore` | E Build/Dev | UPDATE | Thêm mẫu file rác |
| `.nvmrc` | E Build/Dev | KEEP |  |
| `CHANGELOG.md` | C Tài liệu | UPDATE |  |
| `README.md` | C Tài liệu | UPDATE |  |
| `build.sh` | E Build/Dev | KEEP | Giữ: được tham chiếu bởi script build:sh |
| `css/styles.css` | A Source/Config | KEEP |  |
| `dieu-khoan.html` | A Source/Config | KEEP | Giữ nguyên; còn tuyên bố "phi thương mại" và URL người bán (người mua phải thay) |
| `docs/ARCHIVE_INDEX.md` | C Tài liệu | NEW |  |
| `docs/CLEANUP_CHANGELOG.md` | C Tài liệu | NEW |  |
| `docs/CLEANUP_REPORT.md` | C Tài liệu | NEW |  |
| `docs/FILE_INVENTORY.md` | C Tài liệu | NEW |  |
| `docs/NEXT_TASKS.md` | C Tài liệu | UPDATE | Đồng bộ theo code/CHANGELOG |
| `docs/PROJECT_STATUS.md` | C Tài liệu | NEW |  |
| `docs/README.md` | C Tài liệu | UPDATE |  |
| `docs/WORK_LOG.md` | C Tài liệu | MOVE+UPDATE | từ `docs/history/WORK_LOG.md` |
| `docs/archive/AUDIT_HISTORY_V14.md` | F Legacy | ARCHIVE+UPDATE | từ `docs/history/AUDIT_HISTORY.md` |
| `docs/archive/FINAL_REPORT_V13.md` | F Legacy | ARCHIVE+UPDATE | từ `docs/history/FINAL_REPORT.md` |
| `docs/archive/FULL_SYSTEM_AUDIT_V14.md` | F Legacy | ARCHIVE+UPDATE | từ `docs/history/FULL_SYSTEM_AUDIT.md` |
| `docs/archive/KNOWN_ISSUES_V13_V14_HISTORY.md` | F Legacy | NEW (archive) | Bản sao nguyên văn KNOWN_ISSUES trước 14/11 + banner |
| `docs/archive/README_V11.md` | F Legacy | ARCHIVE+UPDATE | từ `docs/history/README_V11.md` |
| `docs/archive/addons/alep-0.1/App.jsx.patch` | F Legacy | ARCHIVE | từ `docs/history/addons/alep-0.1/App.jsx.patch` |
| `docs/archive/addons/alep-0.1/HUONG_DAN.md` | F Legacy | ARCHIVE | từ `docs/history/addons/alep-0.1/HUONG_DAN.md` |
| `docs/archive/addons/docx-image-import/App.jsx.patch` | F Legacy | ARCHIVE | từ `docs/history/addons/docx-image-import/App.jsx.patch` |
| `docs/archive/addons/docx-image-import/HUONG_DAN.md` | F Legacy | ARCHIVE | từ `docs/history/addons/docx-image-import/HUONG_DAN.md` |
| `docs/archive/addons/quiz-engine-v2/HUONG_DAN_GD2.md` | F Legacy | ARCHIVE | từ `docs/history/addons/quiz-engine-v2/HUONG_DAN_GD2.md` |
| `docs/commercial/PRODUCT_AND_FEATURES.md` | C Tài liệu | UPDATE |  |
| `docs/commercial/READINESS_AND_ROADMAP.md` | C Tài liệu | UPDATE |  |
| `docs/guides/DEPLOYMENT_AND_HANDOVER.md` | C Tài liệu | UPDATE |  |
| `docs/guides/LOCAL_DEVELOPMENT.md` | C Tài liệu | UPDATE |  |
| `docs/legal/LICENSE_AND_ASSETS.md` | C Tài liệu | UPDATE |  |
| `docs/technical/API_DOCUMENTATION.md` | C Tài liệu | KEEP |  |
| `docs/technical/ARCHITECTURE.md` | C Tài liệu | KEEP |  |
| `docs/technical/KNOWN_ISSUES.md` | C Tài liệu | UPDATE | Viết lại theo trạng thái 14/11/2026; bản cũ nguyên văn ở archive |
| `docs/technical/PERFORMANCE_AND_COST.md` | C Tài liệu | UPDATE |  |
| `docs/technical/SECURITY_AUDIT.md` | C Tài liệu | UPDATE |  |
| `docs/technical/STRUCTURE_REPORT.md` | C Tài liệu | KEEP |  |
| `docs/technical/TEST_REPORT.md` | C Tài liệu | UPDATE | Viết lại bằng kết quả chạy 14/11/2026 |
| `firebase.emulator-full.json` | A Source/Config | KEEP |  |
| `firebase.emulator-hardened.json` | A Source/Config | KEEP |  |
| `firebase.json` | A Source/Config | KEEP |  |
| `firestore.indexes.json` | A Source/Config | KEEP |  |
| `firestore.rules` | A Source/Config | UPDATE | Chỉ sửa 2 dòng chú thích tham chiếu tài liệu; logic rules không đổi |
| `firestore.rules.hardened` | A Source/Config | KEEP | Rules đích, chưa test, chưa kích hoạt |
| `functions/index.js` | A Source/Config | KEEP |  |
| `functions/lib/admin.js` | A Source/Config | KEEP |  |
| `functions/lib/catalog.js` | A Source/Config | KEEP |  |
| `functions/lib/checkpoint.js` | A Source/Config | KEEP |  |
| `functions/lib/config.js` | A Source/Config | KEEP |  |
| `functions/lib/economy.js` | A Source/Config | KEEP |  |
| `functions/lib/equip.js` | A Source/Config | KEEP |  |
| `functions/lib/guild-catalog.json` | A Source/Config | KEEP | Được test catalog-sync đối chiếu |
| `functions/package.json` | A Source/Config | KEEP |  |
| `functions/scripts/grant-admin.js` | A Source/Config | KEEP |  |
| `functions/scripts/migrate-friends-requests.js` | A Source/Config | KEEP |  |
| `functions/scripts/scrub-recovery-email.js` | A Source/Config | KEEP |  |
| `functions/scripts/seed-meta-and-gifts.js` | A Source/Config | KEEP |  |
| `functions/test/admin.test.js` | B Testing | KEEP |  |
| `functions/test/catalog-sync.test.mjs` | B Testing | KEEP |  |
| `functions/test/checkpoint.test.js` | B Testing | KEEP |  |
| `functions/test/economy.test.js` | B Testing | KEEP |  |
| `functions/test/equip.test.js` | B Testing | KEEP |  |
| `functions/test/guild.test.js` | B Testing | KEEP |  |
| `functions/test/parity.test.mjs` | B Testing | KEEP |  |
| `functions/test/region.test.js` | B Testing | KEEP |  |
| `index.html` | A Source/Config | UPDATE | Trang giới thiệu tĩnh, nút Bắt đầu → app.html; còn URL GitHub Pages của người bán (người mua phải đổi) |
| `app.html` | A Source/Config | NEW | Trang ứng dụng (trước đây là index.html); `npm run build` cập nhật ?v= của app.min.js/styles.css tại đây |
| `sw.js` | A Source/Config | NEW | Service worker: lưu đệm app + CDN để mở khi ngoại tuyến |
| `js/guard.js` | A Source/Config | NEW | Kiểm tra thư viện CDN, màn hình ngoại tuyến, thanh trạng thái mạng, đăng ký sw.js |
| `js/app.min.js` | E Build/Dev (output được phục vụ) | UPDATE | Bản build; gói gốc LỆCH src/ -> build lại 14/11/2026 (esbuild 0.28.2) |
| `js/boot.js` | A Source/Config | KEEP |  |
| `js/firebase-config.example.js` | A Source/Config | KEEP |  |
| `package.json` | E Build/Dev | UPDATE | Sửa mô tả V14->V15; script test:integration; version giữ 15.0.0-rc.0 |
| `postcss.config.cjs` | A Source/Config | KEEP |  |
| `src/App.jsx` | A Source/Config | KEEP |  |
| `src/adaptive/adaptiveConfig.js` | A Source/Config | KEEP |  |
| `src/adaptive/adaptiveEngine.test.js` | B Testing | KEEP |  |
| `src/adaptive/adaptiveExplain.js` | A Source/Config | KEEP |  |
| `src/adaptive/adaptiveLocalStore.js` | A Source/Config | KEEP |  |
| `src/adaptive/adaptiveSession.js` | A Source/Config | KEEP |  |
| `src/adaptive/adaptiveTypes.js` | A Source/Config | KEEP |  |
| `src/adaptive/adjustedScore.js` | A Source/Config | KEEP |  |
| `src/adaptive/confidenceCalculator.js` | A Source/Config | KEEP |  |
| `src/adaptive/forgettingModel.js` | A Source/Config | KEEP |  |
| `src/adaptive/masteryCalculator.js` | A Source/Config | KEEP |  |
| `src/adaptive/typeProfile.js` | A Source/Config | KEEP |  |
| `src/adaptive/typeProfile.test.js` | B Testing | KEEP |  |
| `src/components/CharacterWritePractice.jsx` | A Source/Config | KEEP |  |
| `src/components/ClickableSentence.jsx` | A Source/Config | KEEP |  |
| `src/components/ModerationPanel.jsx` | A Source/Config | KEEP |  |
| `src/components/ReportModal.jsx` | A Source/Config | KEEP |  |
| `src/components/ResearchDashboard.jsx` | A Source/Config | KEEP |  |
| `src/components/SuPhuHub.jsx` | A Source/Config | KEEP |  |
| `src/components/ZoomableImage.jsx` | A Source/Config | KEEP |  |
| `src/components/adaptive/MasteryCard.jsx` | A Source/Config | KEEP |  |
| `src/components/common.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/DeleteQuestionModal.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/DocxImportPreview.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/ImageAssignmentModal.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/QuestionEditModal.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/QuestionImagePreview.jsx` | A Source/Config | KEEP |  |
| `src/components/docx-import/UnresolvedImagesPanel.jsx` | A Source/Config | KEEP |  |
| `src/components/quiz-v2/QuizV2Panels.jsx` | A Source/Config | KEEP |  |
| `src/config/constants.js` | A Source/Config | NEEDS_INVESTIGATION | không còn file nào import; chỉ được nhắc trong `tools/split-app.cjs` (script tách một lần); server có hằng riêng trong `functions/lib/catalog.js`. Chưa xoá, cần xác nhận |
| `src/config/firebase.js` | A Source/Config | KEEP |  |
| `src/config/functionsConfig.js` | A Source/Config | KEEP |  |
| `src/config/gameData.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxImageExtractor.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxImport.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxImport.test.js` | B Testing | KEEP |  |
| `src/docx-import/docxImportTypes.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxPhase1.test.js` | B Testing | KEEP |  |
| `src/docx-import/docxPhase2.test.js` | B Testing | KEEP |  |
| `src/docx-import/docxQuestionParser.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxSectionParser.js` | A Source/Config | KEEP |  |
| `src/docx-import/docxTypeDetector.js` | A Source/Config | KEEP |  |
| `src/docx-import/imageCompressor.js` | A Source/Config | KEEP |  |
| `src/docx-import/imageQuestionMatcher.js` | A Source/Config | KEEP |  |
| `src/docx-import/previewValidation.js` | A Source/Config | KEEP |  |
| `src/docx-import/questionEditLogic.js` | A Source/Config | KEEP |  |
| `src/lib/audio.js` | A Source/Config | KEEP |  |
| `src/lib/cjk.js` | A Source/Config | KEEP |  |
| `src/lib/contentFilter.js` | A Source/Config | KEEP |  |
| `src/lib/format.js` | A Source/Config | KEEP |  |
| `src/lib/gemini.js` | A Source/Config | KEEP |  |
| `src/lib/helpers.js` | A Source/Config | KEEP |  |
| `src/lib/moderation.js` | A Source/Config | KEEP |  |
| `src/lib/progress.js` | A Source/Config | KEEP |  |
| `src/lib/quizFingerprint.js` | A Source/Config | KEEP |  |
| `src/lib/quizFingerprint.test.mjs` | B Testing | KEEP |  |
| `src/lib/serverApi.js` | A Source/Config | KEEP |  |
| `src/lib/srs.js` | A Source/Config | KEEP |  |
| `src/lib/storage.js` | A Source/Config | KEEP |  |
| `src/lib/userData.js` | A Source/Config | KEEP |  |
| `src/main.jsx` | A Source/Config | KEEP |  |
| `src/quiz-v2/essayRubric.js` | A Source/Config | KEEP |  |
| `src/quiz-v2/questionTypes.js` | A Source/Config | KEEP |  |
| `src/quiz-v2/quizScoringConfig.js` | A Source/Config | KEEP |  |
| `src/quiz-v2/quizSections.js` | A Source/Config | KEEP |  |
| `src/quiz-v2/quizV2.test.js` | B Testing | KEEP |  |
| `src/quiz-v2/shortAnswer.js` | A Source/Config | KEEP |  |
| `src/quiz-v2/validateQuestion.js` | A Source/Config | KEEP |  |
| `src/styles/tailwind.css` | A Source/Config | KEEP |  |
| `tailwind.config.cjs` | A Source/Config | KEEP |  |
| `tests/contentFilter.test.mjs` | B Testing | KEEP |  |
| `tests/fixtures/emulator-seed.json` | B Testing | KEEP |  |
| `tests/integration/functions.emulator.test.mjs` | B Testing | KEEP |  |
| `tests/moderation.test.mjs` | B Testing | KEEP |  |
| `tests/rules/firestore.rules.test.mjs` | B Testing | KEEP |  |
| `tools/analyze-structure.mjs` | E Build/Dev | KEEP |  |
| `tools/apply-app-edits.py` | E Build/Dev | NEEDS_INVESTIGATION | Script chỉnh App.jsx một lần (thời V11); chỉ README_V11 nhắc tới; không chứng minh được vô dụng -> giữ |
| `tools/build.mjs` | E Build/Dev | KEEP |  |
| `tools/check-globals.cjs` | E Build/Dev | KEEP |  |
| `tools/gen-api-docs.mjs` | E Build/Dev | KEEP |  |
| `tools/gen-light-theme.py` | E Build/Dev | KEEP | Sinh theme sáng cho css/styles.css (css có nhắc tên); giữ |
| `tools/preflight.mjs` | E Build/Dev | KEEP |  |
| `tools/run-tests.mjs` | E Build/Dev | UPDATE | Thêm nhóm integration |
| `tools/seed-emulator.mjs` | E Build/Dev | KEEP |  |
| `tools/split-app.cjs` | E Build/Dev | NEEDS_INVESTIGATION | Script tách App một lần; chỉ README_V11 nhắc tới; giữ, chờ quyết định |
| `vite.config.js` | A Source/Config | KEEP |  |

File gốc không còn ở vị trí cũ: các đường dẫn dưới `docs/history/` (đã chuyển, xem cột Ghi chú). Thư mục `docs/history/` không còn tồn tại.

## Bổ sung 2026-11-23 (sau khi tách `App.jsx`): 57 file chưa có trong bảng trên
| File | Nhóm | Trạng thái | Ghi chú |
|---|---|---|---|
| `docs/REFACTOR_REPORT.md` | C Tài liệu | UPDATE | file mới/sửa sau lần lập inventory trước |
| `src/app/AppHeader.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/app/LoadingScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/app/useAppCore.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/app/useNavigation.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/app/useRealtimeSync.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/config/researchUi.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/ai/useGeminiKeys.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/audio/useAudio.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/auth/ChangePasswordModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/auth/LoginScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/auth/authHelpers.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/auth/useAuth.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/dashboard/DashboardScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/ExamPathFinaleModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/ExamPathNodeModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/ExamPathRewardModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/ExamPathScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/examPathHelpers.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/exam-path/useExamPath.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/guild/GuildInfoModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/guild/GuildScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/guild/useGuild.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/leaderboard/LeaderboardScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/leaderboard/SeasonRewardModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/leaderboard/useLeaderboard.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/library/MathKeyboard.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/library/QuizEditScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/library/quizImportHelpers.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/library/useQuizEditor.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/library/useQuizLibrary.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/profile/ProfileScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/profile/ViewProfileScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/profile/useAppearance.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/profile/useProfile.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/quiz/QuizResultScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/quiz/QuizScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/quiz/scoringConfig.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/quiz/useQuiz.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/shop/ShopScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/shop/useShop.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/social/MailScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/social/useFriends.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/streak/StreakRestoreModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/streak/useStreakRestore.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/VideoLearnScreen.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/VideoQuizModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/VideoSaveRewardModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/WordLookupModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/WriteCharModal.jsx` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/useVideoNotes.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/useVideoPlayer.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/useVideoQuiz.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/features/video/videoHelpers.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `src/lib/shareCode.js` | A Source | UPDATE | file mới do tách `App.jsx` (xem `docs/REFACTOR_REPORT.md`) |
| `tools/smoke/fake-firebase.js` | E Build/dev | UPDATE | file mới: smoke giao diện bằng Chromium + Firebase giả (không phải E2E) |
| `tools/smoke/run-smoke.mjs` | E Build/dev | UPDATE | file mới: smoke giao diện bằng Chromium + Firebase giả (không phải E2E) |
