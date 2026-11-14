import { ConfettiBurst } from './components/common.jsx';
import { DocxImportPreview } from './components/docx-import/DocxImportPreview.jsx';
import { ModerationPanel } from './components/ModerationPanel.jsx';
import { RESEARCH_UI_UIDS } from './config/researchUi.js';
import { ReportModal } from './components/ReportModal.jsx';
import { ResearchDashboard } from './components/ResearchDashboard.jsx';
import { SuPhuHub } from './components/SuPhuHub.jsx';
import { ZoomableImage } from './components/ZoomableImage.jsx';
import { useAppCore } from './app/useAppCore.js';
import { useLeaderboard } from './features/leaderboard/useLeaderboard.js';
import { useAudio } from './features/audio/useAudio.js';
import { useAuth } from './features/auth/useAuth.js';
import { useStreakRestore } from './features/streak/useStreakRestore.js';
import { useAppearance } from './features/profile/useAppearance.js';
import { useGeminiKeys } from './features/ai/useGeminiKeys.js';
import { useQuizLibrary } from './features/library/useQuizLibrary.js';
import { useVideoPlayer } from './features/video/useVideoPlayer.js';
import { useVideoQuiz } from './features/video/useVideoQuiz.js';
import { useExamPath } from './features/exam-path/useExamPath.js';
import { useNavigation } from './app/useNavigation.js';
import { useQuiz } from './features/quiz/useQuiz.js';
import { useGuild } from './features/guild/useGuild.js';
import { useQuizEditor } from './features/library/useQuizEditor.js';
import { useProfile } from './features/profile/useProfile.js';
import { useShop } from './features/shop/useShop.js';
import { useFriends } from './features/social/useFriends.js';
import { useVideoNotes } from './features/video/useVideoNotes.js';
import { useRealtimeSync } from './app/useRealtimeSync.js';
import { SeasonRewardModal } from './features/leaderboard/SeasonRewardModal.jsx';
import { ExamPathRewardModal } from './features/exam-path/ExamPathRewardModal.jsx';
import { ExamPathFinaleModal } from './features/exam-path/ExamPathFinaleModal.jsx';
import { VideoSaveRewardModal } from './features/video/VideoSaveRewardModal.jsx';
import { GuildInfoModal } from './features/guild/GuildInfoModal.jsx';
import { ChangePasswordModal } from './features/auth/ChangePasswordModal.jsx';
import { MailScreen } from './features/social/MailScreen.jsx';
import { AppHeader } from './app/AppHeader.jsx';
import { LoginScreen } from './features/auth/LoginScreen.jsx';
import { DashboardScreen } from './features/dashboard/DashboardScreen.jsx';
import { ExamPathScreen } from './features/exam-path/ExamPathScreen.jsx';
import { ExamPathNodeModal } from './features/exam-path/ExamPathNodeModal.jsx';
import { QuizEditScreen } from './features/library/QuizEditScreen.jsx';
import { VideoLearnScreen } from './features/video/VideoLearnScreen.jsx';
import { VideoQuizModal } from './features/video/VideoQuizModal.jsx';
import { StreakRestoreModal } from './features/streak/StreakRestoreModal.jsx';
import { WordLookupModal } from './features/video/WordLookupModal.jsx';
import { WriteCharModal } from './features/video/WriteCharModal.jsx';
import { ProfileScreen } from './features/profile/ProfileScreen.jsx';
import { ViewProfileScreen } from './features/profile/ViewProfileScreen.jsx';
import { ShopScreen } from './features/shop/ShopScreen.jsx';
import { GuildScreen } from './features/guild/GuildScreen.jsx';
import { LeaderboardScreen } from './features/leaderboard/LeaderboardScreen.jsx';
import { QuizScreen } from './features/quiz/QuizScreen.jsx';
import { MathKeyboard } from './features/library/MathKeyboard.jsx';
import { QuizResultScreen } from './features/quiz/QuizResultScreen.jsx';
import { LoadingScreen } from './app/LoadingScreen.jsx';

export const ThienKieuApp = () => {
    const core = useAppCore();
    const leaderboard = useLeaderboard({ core });
    const audio = useAudio({ core });
    const auth = useAuth({ core, audio });
    const streak = useStreakRestore({ core, audio });
    const theme = useAppearance({ core, audio });
    const gemini = useGeminiKeys({ core, audio });
    const library = useQuizLibrary({ core, audio, gemini });
    const videoplayer = useVideoPlayer({ core, audio, gemini });
    const videoquiz = useVideoQuiz({ core, audio, gemini, videoplayer });
    const exampath = useExamPath({ core, audio, gemini });
    const nav = useNavigation({ core, audio });
    const quiz = useQuiz({ core, audio, gemini, exampath, nav });
    const guild = useGuild({ core, audio, nav });
    const editor = useQuizEditor({ core, audio, nav });
    const profile = useProfile({ core, audio, nav });
    const shop = useShop({ core, audio, profile });
    const social = useFriends({ core, audio, nav });
    const videonotes = useVideoNotes({ core, audio, gemini, videoplayer, videoquiz, quiz });
    const sync = useRealtimeSync({ core, leaderboard, gemini, exampath });
    const { audioErrors, isMuted, playSfx, setAudioErrors } = audio;
    const { pwdModal } = auth;
    const { allGuilds, allUsers, appState, isAdmin, reportTarget, setReportTarget, user, viewingUser } = core;
    const { editingLibItem } = editor;
    const { examPathFinaleInfo, examPathRewardModal, examPathViewNode, showVictoryFx } = exampath;
    const { viewGuildModal } = guild;
    const { seasonRewardModal } = leaderboard;
    const { docxPreview, saveDocxImportedQuiz, setDocxPreview, showMathKeyboard } = library;
    const { changeAppState } = nav;
    const { activeQuiz, lightboxImg, setLightboxImg } = quiz;
    const { streakRestoreModal } = streak;
    const { videoSaveReward } = videonotes;
    const { wordLookup, writeCharModal } = videoplayer;
    const { videoQuizActive, videoQuizRounds } = videoquiz;

    if (appState === 'LOADING') {
        return <LoadingScreen core={core} />;
    }

    return (
        <div className={`w-full h-full flex flex-col items-center relative bg-black overflow-hidden animate-fadeIn ${user?.appTheme || ''}`} style={{ backgroundImage: user?.bgImage ? `url(${user.bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {user?.bgImage && <div className="absolute inset-0 bg-black/90 z-0"></div>}

            {/* MODAL NHẬN QUÀ SỰ KIỆN MÙA GIẢI */}
            {seasonRewardModal && (
                <SeasonRewardModal leaderboard={leaderboard} />
            )}

            {/* 🗺️ TỔNG KẾT ĐẠO HỮU BẢNG (Tu Luyện Chi Lộ) - hiện khi vừa chốt hạng Top 3 ngày hôm qua,
                y hệt cơ chế seasonRewardModal ở trên nhưng thưởng là 1 Danh Hiệu Phong Thái (miễn phí). */}
            {examPathRewardModal && (
                <ExamPathRewardModal exampath={exampath} />
            )}
            {showVictoryFx && <ConfettiBurst />}
            {/* 🆕 MODAL TỔNG KẾT ĐẠO LỘ HOÀN THÀNH: đứng riêng, ở lại tới khi người dùng tự bấm
                "TIẾP TỤC" - khắc phục cảm giác "đoạn kết cụt lủn" trước đây (chỉ có 4s pháo hoa). */}
            {examPathFinaleInfo && (
                <ExamPathFinaleModal exampath={exampath} />
            )}

            {videoSaveReward && (
                <VideoSaveRewardModal core={core} leaderboard={leaderboard} videonotes={videonotes} />
            )}

            {/* MODAL SOI TÔNG MÔN */}
            {viewGuildModal && (
                <GuildInfoModal core={core} nav={nav} guild={guild} />
            )}

            {/* MODAL ĐỔI MẬT KHẨU */}
            {pwdModal.show && (
                <ChangePasswordModal auth={auth} />
            )}

            {/* HỘP THƯ */}
            {appState === 'MAIL' && user && (
                <MailScreen core={core} audio={audio} nav={nav} guild={guild} social={social} />
            )}

            {/* TOP BAR */}
            {user && appState !== 'LOGIN' && appState !== 'QUIZ' && appState !== 'MAIL' && (
                <AppHeader core={core} audio={audio} videoplayer={videoplayer} nav={nav} profile={profile} />
            )}
            {audioErrors.BGM && !isMuted && appState !== 'LOGIN' && (
                <div className="fixed top-14 left-0 right-0 z-40 mx-auto max-w-sm bg-red-950/95 border border-red-600 text-red-200 text-[10px] px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
                    <span>⚠️ Nhạc nền không phát được (link ngoài bị chặn). Hãy tự tải 1 bài nhạc .mp3 lên ở Cài Đặt.</span>
                    <button onClick={() => setAudioErrors(prev => ({ ...prev, BGM: false }))} className="text-red-300 font-black px-1">✕</button>
                </div>
            )}

            <div className={`relative z-10 w-full h-full flex flex-col items-center ${appState==='LOGIN' ? 'justify-center' : 'pt-16'}`}>
                
                {/* LOGIN - ĐÃ KHÔI PHỤC NÚT HIỆN ẨN MẬT KHẨU */}
                {appState === 'LOGIN' && (
                    <LoginScreen auth={auth} theme={theme} />
                )}

                {/* DASHBOARD */}
                {appState === 'DASHBOARD' && user && (
                    <DashboardScreen core={core} audio={audio} library={library} nav={nav} quiz={quiz} editor={editor} shop={shop} />
                )}

                {/* 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): lộ trình ôn thi có sơ đồ cây (Đạo Đồ) kiểu Duolingo,
                    Bát Quái Đồ phân tích thực lực, Đạo Hữu Bảng (BXH thời gian luyện thi 4h-23h) và
                    Bảng Phong Thưởng. Xem toàn bộ logic ở khu vực "TU LUYỆN CHI LỘ" phía trên. */}
                {appState === 'EXAM_PATH' && user && (
                    <ExamPathScreen core={core} audio={audio} theme={theme} gemini={gemini} exampath={exampath} nav={nav} />
                )}

                {/* Xem trước 1 Ải trong Đạo Đồ trước khi VÀO ẢI */}
                {examPathViewNode && (
                    <ExamPathNodeModal exampath={exampath} quiz={quiz} />
                )}

                {/* 🆕 CHỈNH SỬA ẢI: sửa tên/câu hỏi/đáp án/ảnh minh hoạ của 1 Bí Tịch đã tạo */}
                {appState === 'QUIZ_EDIT' && user && editingLibItem && (
                    <QuizEditScreen library={library} quiz={quiz} editor={editor} />
                )}

                {/* HỌC QUA VIDEO */}
                {appState === 'VIDEO_LEARN' && user && (
                    <VideoLearnScreen core={core} audio={audio} gemini={gemini} videoplayer={videoplayer} videoquiz={videoquiz} nav={nav} videonotes={videonotes} />
                )}

                {/* MODAL ẢI ÔN TỪ VỰNG SAU VIDEO */}
                {/* 🎨 ĐỒNG BỘ UI: khung ải ôn tập video dùng ĐÚNG cấu trúc như Ải Bí Tịch văn bản
                    (viền indigo, nền ảnh động huyền ảo, khung cuộn riêng chống tràn nền, gợi ý khi
                    chọn sai, AI phân tích sau khi trả lời). */}
                {videoQuizActive && videoQuizRounds.length > 0 && (
                    <VideoQuizModal core={core} leaderboard={leaderboard} audio={audio} videoquiz={videoquiz} />
                )}

                {/* MODAL KHÔI PHỤC CHUỖI ĐIỂM DANH: 3 lựa chọn khi bỏ lỡ quá 24h */}
                {streakRestoreModal && user && (
                    <StreakRestoreModal streak={streak} />
                )}

                {/* MODAL TRA TỪ: nghĩa - từ loại/ngữ pháp - hoàn cảnh sử dụng - ví dụ
                    SỬA LỖI (Chế Độ Ngang): trước đây modal này z-[999] và nằm trong cây DOM bình
                    thường, trong khi khung .landscape-fs lại là 1 portal ra thẳng document.body với
                    z-index 9990 -> khi đang ở Chế Độ Ngang, modal bị khung landscape đè lên, bấm từ
                    coi như "không có phản hồi" dù thực ra nó vẫn mở, chỉ là bị che khuất phía sau.
                    Sửa bằng cách portal luôn modal này ra document.body (giống hệt cách landscape-fs
                    đang làm) + nâng z-index lên 9995 (cao hơn 9990 nhưng vẫn thấp hơn banner lỗi 9999)
                    để nó LUÔN nổi lên trên cùng, dù đang ở chế độ dọc hay chế độ ngang. */}
                {wordLookup && <WordLookupModal videoplayer={videoplayer} />}

                {/* ✍️ MODAL LUYỆN VIẾT CHỮ: bước 1 chọn 1 chữ Hán trong danh sách từ vựng video, bước 2
                    hiện khung viết HanziWriter cho đúng chữ đó (component CharacterWritePractice). */}
                {writeCharModal && <WriteCharModal audio={audio} gemini={gemini} videoplayer={videoplayer} />}

                {/* PROFILE */}
                {appState === 'SUPHU' && user && (<SuPhuHub user={user} onBack={() => changeAppState('DASHBOARD')} playSfx={playSfx} />)}
                {appState === 'PROFILE' && user && (
                    <ProfileScreen core={core} audio={audio} auth={auth} theme={theme} gemini={gemini} nav={nav} profile={profile} />
                )}

                {/* XEM PROFILE NGƯỜI KHÁC */}
                {appState === 'VIEW_PROFILE' && viewingUser && (
                    <ViewProfileScreen core={core} nav={nav} social={social} />
                )}

                {/* ===== KIỂM DUYỆT: bảng quản trị + hộp báo cáo ===== */}
                {appState === 'MODERATION' && isAdmin && user && (
                    <ModerationPanel adminUid={user.uid} onBack={() => changeAppState('PROFILE')} playSfx={playSfx} />
                )}
                {/* ===== RESEARCH_DASHBOARD: bảng nghiên cứu KHKT (chỉ đọc, chỉ admin) ===== */}
                {appState === 'RESEARCH_DASHBOARD' && (isAdmin || (user && RESEARCH_UI_UIDS.includes(user.uid))) && user && (
                    <ResearchDashboard adminUid={user.uid} users={allUsers} guilds={allGuilds} onBack={() => changeAppState('PROFILE')} playSfx={playSfx} />
                )}
                {docxPreview && user && <DocxImportPreview result={docxPreview.result} defaultTitle={docxPreview.title} existingLibraryBytes={JSON.stringify(user.library || []).length} onConfirm={saveDocxImportedQuiz} onCancel={() => setDocxPreview(null)} onZoom={setLightboxImg} playSfx={playSfx} />}
                {reportTarget && user && <ReportModal target={reportTarget} reporterUid={user.uid} onClose={() => setReportTarget(null)} playSfx={playSfx} />}

                {/* SHOP (CÁ NHÂN) - THÊM BÁN MÀU NỀN */}
                {appState === 'SHOP' && user && (
                    <ShopScreen core={core} audio={audio} exampath={exampath} nav={nav} profile={profile} shop={shop} />
                )}

                {/* GUILD */}
                {appState === 'GUILD' && user && (
                    <GuildScreen core={core} audio={audio} nav={nav} guild={guild} />
                )}

                {/* LEADERBOARD - TÍCH HỢP TAB "DANH VỌNG" */}
                {appState === 'LEADERBOARD' && user && (
                    <LeaderboardScreen core={core} leaderboard={leaderboard} audio={audio} nav={nav} guild={guild} social={social} />
                )}

                {/* QUIZ */}
                {appState === 'QUIZ' && activeQuiz.length > 0 && user && (
                    <QuizScreen audio={audio} exampath={exampath} nav={nav} quiz={quiz} />
                )}

                {/* 🆕 MODAL XEM ẢNH PHÓNG TO (dùng cho ảnh minh hoạ câu hỏi & ảnh trong màn hình Chỉnh Sửa Ải) */}
                {lightboxImg && ReactDOM.createPortal(
                    <ZoomableImage src={lightboxImg} onClose={() => setLightboxImg(null)} />, document.body
                )}

                {/* 🆕 BÀN PHÍM KÝ HIỆU TOÁN/LÝ: bấm 1 ký hiệu để chèn vào đúng vị trí con trỏ của ô đang gõ dở */}
                {showMathKeyboard && <MathKeyboard library={library} />}

                {/* RESULT - SỬA LỖI UNTERMINATED JSX */}
                {appState === 'RESULT' && user && (
                    <QuizResultScreen core={core} leaderboard={leaderboard} exampath={exampath} nav={nav} quiz={quiz} />
                )}
                
            </div> {/* ĐÓNG CONTAINER CHÍNH */}

        </div>
    );
};
