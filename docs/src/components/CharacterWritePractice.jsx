import { geminiGenerateContent } from '../lib/gemini.js';

// ✍️ LUYỆN VIẾT CHỮ THEO MẪU: dùng thư viện HanziWriter (chuẩn ngành, có sẵn dữ liệu thứ tự nét
// của hàng ngàn chữ Hán) để vừa trình diễn hoạt ảnh viết mẫu, vừa cho người học tự viết theo và
// TỰ ĐỘNG chấm đúng/sai từng nét ngay khi vẽ - đúng kiểu "luyện chữ tăng khả năng ghi nhớ"
// thay vì chỉ xem chữ suông. Component tách riêng vì HanziWriter tự quản lý canvas/SVG của nó,
// cần mount 1 lần cho mỗi chữ (qua targetRef), không để React re-render đè lên.
// ✍️ SỬA LỖI THEO YÊU CẦU: trước đây phải bấm "Tự Viết" mới bắt đầu được, viết xong lại phải tự
// bấm "Chữ Tiếp Theo" mới sang chữ mới - rất vướng tay. Giờ khung viết sẵn sàng là TỰ ĐỘNG vào
// luôn chế độ viết (không cần bấm gì cả), viết xong 1 chữ thì tự động chuyển sang chữ kế tiếp sau
// ít giây. Nút "Xem Mẫu" giờ CHỈ bật lên sau khi người học viết SAI ít nhất 1 nét (đúng ý: viết
// thử trước, sai thì mới cần xem mẫu để sửa) - trước đó không cho xem mẫu để buộc tự nhớ trước.
export const CharacterWritePractice = ({ char, playSfx, apiKey, meaningCache, onMeaningFetched, onAutoAdvance }) => {
    const { useEffect, useRef, useState } = React;
    const targetRef = useRef(null);
    const writerRef = useRef(null);
    const [status, setStatus] = useState('Đang chuẩn bị nét chữ...');
    const [mistakes, setMistakes] = useState(0);
    const [ready, setReady] = useState(typeof window.HanziWriter !== 'undefined');
    const [completed, setCompleted] = useState(false);
    const [meaning, setMeaning] = useState(meaningCache?.[char] || null);
    const [meaningLoading, setMeaningLoading] = useState(false);
    const advanceTimerRef = useRef(null);

    useEffect(() => {
        if (typeof window.HanziWriter === 'undefined') {
            // Thư viện tải từ CDN có thể chưa xong kịp lúc component mount lần đầu -> đợi rồi thử lại.
            const t = setInterval(() => { if (typeof window.HanziWriter !== 'undefined') { setReady(true); clearInterval(t); } }, 300);
            return () => clearInterval(t);
        }
    }, []);

    const startQuizInternal = (writer) => {
        if (!writer) return;
        setStatus('Viết nét đầu tiên vào khung đi nào...');
        writer.quiz({
            onMistake: () => { setMistakes(m => m + 1); setStatus('Sai nét rồi, thử lại nét này xem! (giờ có thể bấm "Xem Mẫu" nếu cần)'); playSfx('WRONG'); },
            onCorrectStroke: (data) => { setStatus(data.strokesRemaining > 0 ? 'Chuẩn! Viết tiếp nét sau...' : 'Nét cuối rồi, cố lên!'); },
            onComplete: (summary) => {
                setStatus(summary.totalMistakes === 0 ? '🎉 Hoàn Hảo! Không sai nét nào! Đang sang chữ tiếp...' : `✅ Hoàn thành! Sai ${summary.totalMistakes} lần. Đang sang chữ tiếp...`);
                setCompleted(true);
                playSfx('SUCCESS');
                // ⏭️ TỰ ĐỘNG CHUYỂN CHỮ: viết xong là tự sang chữ kế tiếp sau 1.6s, không cần bấm nút.
                if (onAutoAdvance) { advanceTimerRef.current = setTimeout(() => onAutoAdvance(), 1600); }
            }
        });
    };

    useEffect(() => {
        if (!ready || !targetRef.current) return;
        targetRef.current.innerHTML = '';
        setMistakes(0); setCompleted(false);
        setStatus('Đang chuẩn bị nét chữ...');
        if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
        let writer;
        try {
            writer = window.HanziWriter.create(targetRef.current, char, {
                width: 260, height: 260, padding: 8,
                showOutline: true,
                strokeColor: '#67e8f9',
                radicalColor: '#f472b6',
                outlineColor: '#3f3f46',
                drawingColor: '#facc15',
                highlightColor: '#a855f7',
                strokeAnimationSpeed: 1.1,
                delayBetweenStrokes: 250,
                showCharacter: false,
            });
            writerRef.current = writer;
            // 🚀 TỰ ĐỘNG VÀO CHẾ ĐỘ VIẾT NGAY, khỏi cần bấm "Tự Viết" như trước.
            startQuizInternal(writer);
        } catch (e) { setStatus('Không tải được dữ liệu nét chữ cho "' + char + '" (có thể không phải chữ Hán chuẩn).'); }
        return () => { if (targetRef.current) targetRef.current.innerHTML = ''; if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
    }, [char, ready]);

    // 📖 Tra sẵn nghĩa + cấp độ (HSK/N.../TOPIK...) của chữ đang luyện, dùng chung API Key Gemini
    // đã nhập ở màn Học Qua Video. Có cache theo từng chữ nên quay lại chữ cũ không tốn API nữa.
    useEffect(() => {
        setMeaning(meaningCache?.[char] || null);
        if (meaningCache?.[char] || !apiKey) return;
        let cancelled = false;
        setMeaningLoading(true);
        (async () => {
            try {
                const prompt = `Chữ Hán: "${char}"\nHãy giải nghĩa chữ này cho người Việt học ngoại ngữ. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"meaning": "nghĩa tiếng Việt của chữ này", "pinyin": "cách đọc Latinh (Pinyin có dấu thanh)", "level": "trình độ phổ biến nhất (VD: HSK1-HSK6); để 'Không rõ' nếu không xác định", "example": "1 từ/cụm ví dụ ngắn có dùng chữ này kèm nghĩa tiếng Việt"}`;
                const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
                let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
                const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
                if (s !== -1 && en !== -1) raw = raw.substring(s, en + 1);
                const parsed = JSON.parse(raw);
                if (!cancelled) { setMeaning(parsed); if (onMeaningFetched) onMeaningFetched(char, parsed); }
            } catch (e) { /* im lặng bỏ qua, không chặn luyện viết chỉ vì tra nghĩa lỗi */ }
            finally { if (!cancelled) setMeaningLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [char, apiKey]);

    const showSample = () => { if (writerRef.current) { setStatus('Đang trình diễn thứ tự nét mẫu...'); writerRef.current.animateCharacter({ onComplete: () => setStatus(completed ? 'Đang sang chữ tiếp...' : 'Giờ đến lượt Ngài, viết lại vào khung nhé!') }); } };

    return (
        <div className="text-center">
            <div ref={targetRef} className="mx-auto bg-black border-2 border-cyan-700 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.25)]" style={{ width: 260, height: 260 }}>
                {!ready && <p className="text-[10px] text-zinc-500 italic pt-24">Đang tải thư viện nét chữ...</p>}
            </div>
            <p className="text-[11px] text-cyan-300 mt-3 font-bold min-h-[32px] leading-snug px-2">{status}</p>
            {mistakes > 0 && <p className="text-[9px] text-red-400 uppercase font-black">Số lần sai: {mistakes}</p>}
            <div className="flex gap-2 mt-2">
                <button onClick={showSample} disabled={!ready || mistakes === 0} title={mistakes === 0 ? 'Viết thử trước đã, sai nét thì nút này mới mở!' : ''} className="flex-1 bg-purple-800 hover:bg-purple-600 disabled:opacity-30 text-white py-2.5 text-[10px] font-black uppercase">👁 Xem Mẫu</button>
            </div>
            {/* 📖 NGHĨA / CẤP ĐỘ CỦA CHỮ ĐANG LUYỆN */}
            <div className="mt-3 bg-black/60 border border-zinc-800 p-2 text-left text-[10px] min-h-[40px]">
                {meaningLoading && <p className="text-zinc-500 italic text-center">Đang tra nghĩa chữ này...</p>}
                {!meaningLoading && !meaning && !apiKey && <p className="text-zinc-600 italic text-center">Nhập API Key Gemini ở trên để xem nghĩa/cấp độ chữ này.</p>}
                {meaning && (
                    <div className="space-y-1">
                        <p><span className="text-yellow-500 font-black uppercase">Nghĩa: </span><span className="text-white">{meaning.meaning}</span> {meaning.level && meaning.level !== 'Không rõ' && <span className="text-[9px] text-purple-300 bg-purple-900/60 border border-purple-500 px-1.5 py-0.5 ml-1 font-black uppercase">{meaning.level}</span>}</p>
                        {meaning.pinyin && <p><span className="text-cyan-400 font-black uppercase">Phiên âm: </span><span className="text-white">{meaning.pinyin}</span></p>}
                        {meaning.example && <p><span className="text-green-400 font-black uppercase">Ví dụ: </span><span className="text-white">{meaning.example}</span></p>}
                    </div>
                )}
            </div>
        </div>
    );
};
