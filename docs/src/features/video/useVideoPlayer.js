import { CJK_RE } from '../../lib/cjk.js';
import { SRS } from '../../lib/srs.js';
import { extractYouTubeId } from '../../lib/helpers.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { shortErr } from '../../lib/format.js';

const { useState, useEffect, useRef, useMemo } = React;

export function useVideoPlayer({ core, audio, gemini }) {
    const { appState } = core;
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    // ⏱️ THỜI GIAN ĐÃ HỌC (video): đếm số giây video đang thực sự phát trong phiên học hiện tại.
    const [videoStudySeconds, setVideoStudySeconds] = useState(0);
    // Video Learn State (Học qua Video)
    const [videoLink, setVideoLink] = useState('');
    const [videoStudyMode, setVideoStudyMode] = useState('auto'); // 'auto' | 'language' | 'academic'
    const [activeSecIdx, setActiveSecIdx] = useState(-1);
    const [videoResult, setVideoResult] = useState(null); // { summary, transcript: [{text}], translations: [{original, translated}] }
    const [playbackRate, setPlaybackRate] = useState(1);
    const [videoLandscapeMode, setVideoLandscapeMode] = useState(false); // chế độ xem ngang (chia đôi video + bảng từ vựng), xem enterVideoLandscape...
    const [supportedPlaybackRates, setSupportedPlaybackRates] = useState([1]); // các tốc độ mà chính video hiện tại hỗ trợ (tránh chọn tốc độ video không hỗ trợ -> lag/đứng hình)
    const [wordLookup, setWordLookup] = useState(null); // { word, loading, data:{meaning,partOfSpeech,usage,example,level,pinyin}, error }
    // 📖 BỘ NHỚ TRA TỪ: lưu lại các từ đã tra trong video hiện tại (key = "từ|câu ngữ cảnh") để
    // không phải gọi lại API khi bấm lại đúng từ đó, và để LƯU KÈM vào Bí Tịch (videoNotes) khi
    // lưu bài, giúp mở lại video đã lưu là thấy ngay bảng phân tích cũ, khỏi tra lại từ đầu.
    const [wordLookupCache, setWordLookupCache] = useState({});
    const [showPinyin, setShowPinyin] = useState(true); // 拼 bật/tắt hiện Pinyin dưới câu chữ Hán
    // Nhãn phiên âm theo ngôn ngữ video: có Kana -> Romaji (Nihongo), có Hangul -> Romaja, còn lại -> Pinyin
    const getPhoneticLabel = () => { const t = ((videoResult && videoResult.transcript) || []).join(''); if (/[\u3040-\u30ff]/.test(t)) return 'Romaji'; if (/[\uac00-\ud7af]/.test(t)) return 'Romaja'; return 'Pinyin'; };
    // 🎨 Danh sách từ vựng + độ quan trọng (importance 3/2/1 do AI chấm; video cũ chưa có thì chia theo thứ tự AI liệt kê)
    const vocabMarks = React.useMemo(() => {
        const tr = (videoResult && videoResult.translations) || [], n = tr.length;
        return tr.map((t, i) => {
            const o = String(t.original || '').trim().toLowerCase();
            if (!o || (/^[\u0000-\u024f]+$/.test(o) && o.length < 3)) return null;
            let tier = Number(t.importance); if (!(tier >= 1 && tier <= 3)) tier = i < n / 3 ? 3 : i < 2 * n / 3 ? 2 : 1;
            return { key: o, tier };
        }).filter(Boolean).sort((x, y) => y.key.length - x.key.length);
    }, [videoResult]);
    const [showTranslation, setShowTranslation] = useState(true); // 🇻🇳 bật/tắt hiện nghĩa tiếng Việt dưới mỗi câu trong Văn Bản (để không phải học chay 100% ngoại ngữ mà không có nghĩa kèm theo)
    // ✍️ LUYỆN VIẾT CHỮ: danh sách ký tự Hán rút ra từ từ vựng video hiện tại + ký tự đang chọn để luyện.
    const [writeCharModal, setWriteCharModal] = useState(false);
    const [writePracticeChar, setWritePracticeChar] = useState(null);
    // ✍️ Bộ nhớ nghĩa/cấp độ của từng chữ đã tra khi Luyện Viết Chữ, tránh gọi lại API khi quay lại đúng chữ đó.
    const [writeMeaningCache, setWriteMeaningCache] = useState({});
    // 🔄 ĐỒNG BỘ VĂN BẢN THEO VIDEO: chỉ số câu trong transcript đang tương ứng với thời điểm phát hiện tại,
    // dùng để tô sáng + tự cuộn tới đúng câu, giúp người học không bị lạc mất video đang nói tới đoạn nào.
    const [activeTranscriptIdx, setActiveTranscriptIdx] = useState(-1);
    const transcriptItemRefs = useRef({ portrait: [], landscape: [] });
    // ▶️ SỬA LỖI "DANH SÁCH PHÁT" KHÔNG PHÁT LẠI ĐƯỢC: trước đây bấm vào 1 mục trong Danh Sách
    // Phát chỉ setVideoLink(n.link) - nếu link đó TRÙNG với video đang mở sẵn (không đổi), React
    // không thấy currentYoutubeId thay đổi nên effect mount player KHÔNG chạy lại -> nếu trình phát
    // đang bị treo/dừng vì lý do gì đó, bấm "phát lại" không có tác dụng gì cả, coi như bị lỗi.
    // videoPlayNonce tăng lên mỗi lần người dùng bấm phát (dù cùng video hay khác video) để LUÔN ép
    // effect chạy lại và gắn lại trình phát từ đầu; forceReplayRef báo cho effect biết lần này là
    // "phát lại" nên phát từ đầu (giây 0) thay vì cố khôi phục vị trí xem dở trước đó.
    const [videoPlayNonce, setVideoPlayNonce] = useState(0);
    const forceReplayRef = useRef(false);
    const ytPlayerRef = useRef(null);
    // Nạp YouTube IFrame API 1 lần duy nhất, rồi khởi tạo player mỗi khi videoId đổi HOẶC khi
    // chuyển vào/ra Chế Độ Ngang (vì khung ngang portal ra ngoài body dùng 1 id div khác hẳn với
    // khung dọc, nên phải gắn lại player vào đúng div đang hiển thị). Trước khi huỷ player cũ, lưu
    // lại thời điểm đang xem + đang phát hay không, rồi phục hồi lại ngay sau khi player mới sẵn
    // sàng -> chuyển dọc/ngang không bị tua về đầu video.
    const currentYoutubeId = extractYouTubeId(videoLink);
    useEffect(() => {
        if (appState !== 'VIDEO_LEARN' || !currentYoutubeId) return;
        let cancelled = false;
        let savedTime = 0, wasPlaying = false;
        if (forceReplayRef.current) {
            // "PHÁT LẠI" từ Danh Sách Phát: luôn coi như phát mới lại từ đầu, không cố khôi phục
            // vị trí xem dở cũ (kể cả khi bấm lại đúng video đang mở sẵn để "hồi sinh" player bị treo).
            forceReplayRef.current = false;
            savedTime = 0; wasPlaying = true;
        } else if (ytPlayerRef.current) {
            try { savedTime = ytPlayerRef.current.getCurrentTime() || 0; } catch (e) {}
            try { wasPlaying = ytPlayerRef.current.getPlayerState() === 1; } catch (e) {}
        }
        const mountId = videoLandscapeMode ? 'yt-player-mount-landscape' : 'yt-player-mount';
        const mount = () => {
            if (cancelled) return;
            if (ytPlayerRef.current && ytPlayerRef.current.destroy) { try { ytPlayerRef.current.destroy(); } catch(e){} }
            if (!document.getElementById(mountId)) return;
            ytPlayerRef.current = new window.YT.Player(mountId, {
                width: '100%', height: '100%',
                videoId: currentYoutubeId,
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onReady: (e) => {
                        // SỬA LỖI LAG 2X/3X: không phải video YouTube nào cũng hỗ trợ hết mọi tốc độ.
                        // Ép setPlaybackRate(3) lên video chỉ hỗ trợ tối đa 2x khiến trình phát bị lỗi/đứng
                        // hình (trông như "lag"). Nay đọc đúng danh sách tốc độ video này hỗ trợ trước,
                        // rồi mới áp dụng, đồng thời chỉ hiện nút bấm cho tốc độ THỰC SỰ dùng được.
                        let rates = [1];
                        try { rates = e.target.getAvailablePlaybackRates() || [1]; } catch(err) {}
                        if (!rates.includes(1)) rates = [1, ...rates];
                        setSupportedPlaybackRates(rates);
                        const safeRate = rates.includes(playbackRate) ? playbackRate : 1;
                        setPlaybackRate(safeRate);
                        e.target.setPlaybackRate(safeRate);
                        // SỬA LỖI: trước đây playVideo() bị lồng bên trong "if (savedTime > 1)", nên khi
                        // "phát lại" từ đầu (savedTime = 0) thì wasPlaying=true cũng bị bỏ qua luôn, video
                        // nạp xong nhưng KHÔNG tự phát -> giống hệt hiện tượng "không mở lại được".
                        // Nay tách riêng: seekTo chỉ chạy khi có vị trí cũ cần khôi phục, còn playVideo
                        // chạy độc lập bất cứ khi nào cần tự phát (phục hồi phiên cũ HOẶC phát lại từ đầu).
                        if (savedTime > 1) e.target.seekTo(savedTime, true);
                        if (wasPlaying) e.target.playVideo();
                    }
                }
            });
        };
        if (window.YT && window.YT.Player) { mount(); }
        else {
            if (!document.getElementById('yt-iframe-api-script')) {
                const tag = document.createElement('script');
                tag.id = 'yt-iframe-api-script'; tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
            const prevReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => { if (prevReady) prevReady(); mount(); };
        }
        return () => { cancelled = true; };
    }, [appState, currentYoutubeId, videoLandscapeMode, videoPlayNonce]);
    // AN TOÀN: rời khỏi màn Học Qua Video vì bất kỳ lý do gì thì luôn tắt Chế Độ Ngang, tuyệt đối
    // không để kẹt lại trạng thái ngang khi quay lại Tàng Kinh Các hay các màn khác.
    useEffect(() => { if (appState !== 'VIDEO_LEARN') setVideoLandscapeMode(false); }, [appState]);
    // ⏱️ ĐẾM THỜI GIAN ĐÃ HỌC: mỗi giây kiểm tra video có đang thực sự phát không (getPlayerState===1)
    // rồi mới cộng dồn, tránh tính cả lúc dừng/thoát app. Reset về 0 khi đổi sang video khác.
    useEffect(() => { setVideoStudySeconds(0); }, [currentYoutubeId]);
    useEffect(() => {
        if (appState !== 'VIDEO_LEARN') return;
        const t = setInterval(() => {
            try { if (ytPlayerRef.current && ytPlayerRef.current.getPlayerState && ytPlayerRef.current.getPlayerState() === 1) setVideoStudySeconds(s => s + 1); } catch (e) {}
        }, 1000);
        return () => clearInterval(t);
    }, [appState]);
    // 🔄 ĐỒNG BỘ VĂN BẢN THEO VIDEO: mỗi giây kiểm tra thời điểm đang phát (getCurrentTime), so với
    // mảng "transcriptTime" (thời điểm bắt đầu ước lượng của từng câu, do AI trả về) để biết câu nào
    // đang được nói tới, rồi tô sáng đúng câu đó trong bảng Văn Bản (cả khung dọc lẫn khung ngang).
    useEffect(() => {
        if (appState !== 'VIDEO_LEARN' || !videoResult?.transcriptTime?.length) { setActiveTranscriptIdx(-1); return; }
        const times = videoResult.transcriptTime;
        const tick = () => {
            try {
                const pl = ytPlayerRef.current; if (!pl || !pl.getCurrentTime) return;
                const cur = pl.getCurrentTime(); let lo = 0, hi = times.length - 1, idx = -1;
                while (lo <= hi) { const m = (lo + hi) >> 1; if (typeof times[m] === 'number' && times[m] <= cur + 0.3) { idx = m; lo = m + 1; } else hi = m - 1; }
                setActiveTranscriptIdx(prev => prev === idx ? prev : idx);
            } catch (e) {}
        };
        const t = setInterval(tick, 250);
        return () => clearInterval(t);
    }, [appState, videoResult, currentYoutubeId]);
    // Câu đang active đổi -> tự cuộn khung Văn Bản (dọc lẫn ngang) tới đúng câu đó, không để người
    // học phải tự dò tay theo lời nói trong lúc mắt còn đang xem video.
    useEffect(() => {
        if (activeTranscriptIdx < 0) return;
        if (Date.now() - (window.__trUserScroll || 0) < 4000) return; // người dùng đang tự cuộn
        ['portrait', 'landscape'].forEach(loc => {
            const el = transcriptItemRefs.current[loc]?.[activeTranscriptIdx];
            if (!el || !el.offsetParent) return;
            // chỉ cuộn đúng khung chứa phụ đề (không dùng scrollIntoView vì nó kéo cả trang/video => giật)
            let box = el.parentElement;
            while (box && !(box.scrollHeight > box.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
            if (!box) return;
            const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
            if (er.top > br.top + box.clientHeight * 0.2 && er.bottom < br.bottom - box.clientHeight * 0.3) return; // đang nằm trong vùng giữa -> không cuộn
            box.scrollTo({ top: Math.max(0, box.scrollTop + (er.top - br.top) - (box.clientHeight / 2 - er.height / 2)), behavior: 'smooth' });
        });
    }, [activeTranscriptIdx]);
    const changePlaybackRate = (rate) => {
        playSfx('CLICK'); setPlaybackRate(rate);
        if (ytPlayerRef.current && ytPlayerRef.current.setPlaybackRate) ytPlayerRef.current.setPlaybackRate(rate);
    };
    // 🔄 CHẾ ĐỘ NGANG (v2 - SỬA LỖI): bản trước dùng Fullscreen API + screen.orientation.lock('landscape')
    // của trình duyệt. Hai API này KHÔNG đáng tin cậy trong WebView/APK đóng gói (nhiều WebView chặn
    // hẳn Fullscreen API, hoặc cho vào được nhưng không cho ra -> kẹt ngang vĩnh viễn, nút bấm coi
    // như "không phản hồi"). Đổi sang cách AN TOÀN HƠN: không đụng tới trạng thái xoay máy thật của hệ
    // điều hành, mà chỉ XOAY GIẢ bằng CSS transform: rotate(90deg) một khung overlay full màn hình -
    // cách này chạy được ở MỌI trình duyệt/WebView vì chỉ là CSS thuần, không phụ thuộc API nào, và
    // luôn có nút "✕ THOÁT NGANG" để tắt state videoLandscapeMode, quay lại dọc ngay lập tức, chắc chắn.
    // Khung overlay chia đôi: bên trái là video (KHÔNG remount lại player, chỉ đổi CSS bọc ngoài -
    // tránh mất vị trí đang xem), bên phải là bảng Văn Bản/Dịch Thuật để vừa xem vừa học từ vựng.
    const toggleVideoLandscapeMode = () => { playSfx('CLICK'); setVideoLandscapeMode(v => !v); };
    // Tra 1 từ/cụm từ: tạm dừng video ngay, gọi Gemini hỏi riêng nghĩa - từ loại/ngữ pháp -
    // hoàn cảnh sử dụng - ví dụ, dựa trên câu ngữ cảnh chứa từ đó để trả lời đúng nghĩa trong bài.
    // ✍️ Gom toàn bộ chữ Hán DUY NHẤT xuất hiện trong Từ Vựng đã phân tích của video hiện tại,
    // dùng làm danh sách để chọn luyện viết (chỉ lấy chữ Hán CJK, bỏ qua chữ Latinh/số/dấu câu).
    const getVideoHanziList = () => {
        const pool = (videoResult?.translations || []).map(t => t.original || '').join('');
        const uniq = Array.from(new Set(Array.from(pool).filter(ch => CJK_RE.test(ch))));
        return uniq;
    };
    const lookupWordAction = async (word, contextSentence) => {
        if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) ytPlayerRef.current.pauseVideo();
        playSfx('CLICK');
        const cacheKey = `${word}|${contextSentence || ''}`;
        // 💾 Đã tra từ này trong video đang xem rồi (kể cả từ lần trước, nếu Bí Tịch đã lưu có kèm
        // bộ nhớ tra từ) -> hiện lại NGAY, không gọi API/không cần "phân tích lại" như trước.
        if (wordLookupCache[cacheKey]) { setWordLookup({ word, loading: false, data: wordLookupCache[cacheKey], error: null }); return; }
        if (!anyGeminiKey) return alert("Ngài cần nhập API Key (Gemini) trước!");
        setWordLookup({ word, loading: true, data: null, error: null });
        try {
            const prompt = `Từ/cụm từ: "${word}"\nCâu ngữ cảnh: "${contextSentence || ''}"\nHãy giải nghĩa từ trên trong đúng ngữ cảnh câu này cho người Việt đang học ngoại ngữ. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"meaning": "nghĩa tiếng Việt trong ngữ cảnh này", "partOfSpeech": "từ loại/chức năng ngữ pháp (VD: danh từ, động từ, thành ngữ...)", "usage": "giải thích ngắn hoàn cảnh/cách dùng từ này", "example": "1 câu ví dụ khác có dùng từ này kèm dịch nghĩa", "pinyin": "cách đọc Latinh của từ này nếu là chữ tượng hình (Pinyin có dấu thanh cho tiếng Trung, Romaji Hepburn đọc theo âm Nhật cho tiếng Nhật - KHÔNG dùng Pinyin cho chữ Nhật...); để chuỗi rỗng nếu ngôn ngữ gốc đã là chữ Latinh", "level": "trình độ của từ này theo khung phổ biến nhất của ngôn ngữ đó (VD: HSK1-HSK6 cho tiếng Trung, N5-N1 cho tiếng Nhật, A1-C2 cho tiếng Anh/Âu); để 'Không rõ' nếu không xác định được"}`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
            if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
            const parsed = JSON.parse(raw);
            setWordLookup({ word, loading: false, data: parsed, error: null });
            setWordLookupCache(prev => ({ ...prev, [cacheKey]: parsed })); playSfx('DING'); try { SRS.addLookup(word, parsed, contextSentence); } catch (e) {}
        } catch (e) {
            setWordLookup({ word, loading: false, data: null, error: shortErr(e.message) });
        }
    };
    const seekVideoTo = (sec) => {
        playSfx('TAB');
        try { const pl = ytPlayerRef.current; if (pl && pl.seekTo) { pl.seekTo(Math.max(0, sec || 0), true); if (pl.playVideo) pl.playVideo(); } } catch (e) {}
    };
    useEffect(() => {
        if (appState !== 'VIDEO_LEARN' || !videoResult || videoResult.mode !== 'academic' || !(videoResult.sections || []).length) { setActiveSecIdx(-1); return; }
        const secs = videoResult.sections;
        const tick = () => { try { const pl = ytPlayerRef.current; if (!pl || !pl.getCurrentTime) return; const cur = pl.getCurrentTime(); let idx = -1; for (let i = 0; i < secs.length; i++) { if (secs[i].start <= cur + 0.5) idx = i; else break; } setActiveSecIdx(prev => prev === idx ? prev : idx); } catch (e) {} };
        const tm = setInterval(tick, 500); return () => clearInterval(tm);
    }, [appState, videoResult, currentYoutubeId]);

    return { activeSecIdx, activeTranscriptIdx, changePlaybackRate, currentYoutubeId, forceReplayRef, getPhoneticLabel, getVideoHanziList, lookupWordAction, playbackRate, seekVideoTo, setShowPinyin, setShowTranslation, setVideoLink, setVideoPlayNonce, setVideoResult, setVideoStudyMode, setWordLookup, setWordLookupCache, setWriteCharModal, setWriteMeaningCache, setWritePracticeChar, showPinyin, showTranslation, supportedPlaybackRates, toggleVideoLandscapeMode, transcriptItemRefs, videoLandscapeMode, videoLink, videoResult, videoStudyMode, videoStudySeconds, vocabMarks, wordLookup, wordLookupCache, writeCharModal, writeMeaningCache, writePracticeChar, ytPlayerRef };
}
