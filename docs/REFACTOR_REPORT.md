# REFACTOR_REPORT — Tách `src/App.jsx` theo module

## Kết quả
| Mục | Trước | Sau |
|---|---|---|
| `src/App.jsx` | 4.757 dòng (145 useState, 29 useEffect) | 268 dòng (điều phối) |
| Số file trong `src/` | — | 123 |
| Nhóm tính năng `src/features/` | — | 14: auth, audio, ai, dashboard, exam-path, guild, leaderboard, library, profile, quiz, shop, social, streak, video |
| Hook lõi `src/app/` | — | useAppCore, useNavigation, useRealtimeSync + AppHeader, LoadingScreen |

Hook theo miền: useAuth, useAudio, useGeminiKeys, useExamPath, useGuild, useLeaderboard, useQuizLibrary, useQuizEditor, useAppearance, useProfile, useQuiz, useShop, useFriends, useStreakRestore, useVideoPlayer, useVideoQuiz, useVideoNotes.
Màn hình/modal mới: Login, ChangePassword, Dashboard, ExamPath (+3 modal), Guild (+Info), Leaderboard, SeasonReward, QuizEdit, MathKeyboard, Profile, ViewProfile, Quiz, QuizResult, Shop, Mail, StreakRestore, VideoLearn, VideoQuiz, VideoSaveReward, WordLookup, WriteChar.
File helper mới: `authHelpers.js`, `videoHelpers.js`, `quizImportHelpers.js`, `examPathHelpers.js`, `lib/shareCode.js`, `features/quiz/scoringConfig.js`, `config/researchUi.js`.
Không đổi: `adaptive/`, `docx-import/`, `quiz-v2/`, `components/`, `lib/*` (hiện có), `config/*`, `functions/*`, `firestore.rules`, Firebase Project ID.

## Cách làm
Tách tự động bằng AST (TypeScript compiler API): đồ thị phụ thuộc từng câu lệnh, sắp xếp thứ tự hook, phát hiện vòng, đưa hàm thuần ra mức module. Không viết lại logic. Không chuyển nghiệp vụ nhạy cảm từ Cloud Functions về client; không sửa Rules.

## Kiểm chứng (bằng chứng thực tế)
- Unit test `npm run test:all`: 11 + 91 + 50 = **152 pass, 0 fail**. 3 test đọc mã nguồn App.jsx được sửa để đọc cả `app/` và `features/`.
- `npm run build:check`: **PASS** (bundle đồng bộ với src; esbuild 0.28.2 — package.json ghim phiên bản khác).
- Kiểm tra tĩnh: 0 định danh chưa khai báo, 0 import vòng, 0 import trỏ ra ngoài dự án (trên lần sinh mã trước khi sửa comment).
- Smoke giao diện (Chromium + Firebase giả, `tools/smoke/`): lần chạy trước đó 0/48 khác biệt DOM giữa trước/sau. **Chưa chạy lại trên lần sinh mã cuối** → NOT VERIFIED cho phiên bản cuối.
- Integration/Emulator/Rules test: **BLOCKED** (không có mạng, thiếu firebase-admin). Không chạy thử trên trình duyệt thật với Firebase thật → NOT VERIFIED.
- Cài `npm` lockfile: BLOCKED (không có mạng).

## Thứ tự effect
Hook được chuyển miền nên thứ tự chạy useEffect giữa các miền có thể khác bản gốc; các effect đó chỉ chia sẻ giá trị chỉ-đọc (đã phân tích). Cần kiểm tra thủ công trên trình duyệt.

## Chưa làm / tồn đọng
- Dọn comment (Phase 5) chỉ làm tối thiểu; comment bảo mật/nghiệp vụ được giữ nguyên.
- Bảng đối chiếu đầy đủ OLD LOCATION → NEW MODULE → DEPENDENCIES → TEST STATUS chưa hoàn tất; thay bằng cấu trúc trong `docs/technical/STRUCTURE_REPORT.md` (`npm run docs:structure`).
- ARCHITECTURE.md còn mô tả cũ ở một số chỗ; cần rà lại.
- Vấn đề bảo mật đã biết (20 chỗ `safeUserUpdate`, quiz chấm phía client, chưa App Check) **không đổi** — xem KNOWN_ISSUES.md.
