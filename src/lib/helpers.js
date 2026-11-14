// Lấy ID video từ mọi kiểu link YouTube phổ biến (watch?v=, youtu.be/, shorts/, embed/)
export const extractYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
};
export const shuffleArray = (array) => { let res = [...array]; for (let i = res.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [res[i], res[j]] = [res[j], res[i]]; } return res; };

// 🆕 TÁCH RIÊNG bộ phân tích cú pháp văn bản đề thi thành hàm dùng chung (dùng khi TẠO Bí Tịch mới
// VÀ khi THÊM câu hỏi bằng cách dán văn bản trong màn hình CHỈNH SỬA ẢI) - tránh lặp code 2 nơi.
// Hỗ trợ 3 kiểu câu hỏi:
// - Mặc định (1 đáp án): "Đáp án: A"
// - Nhiều ý đúng/sai (dạng đề Vật Lý/Hoá mới): "Đáp án: A,C" (liệt kê từ 2 chữ cái trở lên)
// - Điền số (câu tính toán, KHÔNG cần liệt kê A/B/C/D): chỉ ghi thẳng "Đáp án: 12.5"
export const parseRawQuizText = (rawQuizText) => {
    const questionList = []; let currentQuestion = null;
    const canPush = (q) => q && (q.o.length >= 2 || q.type === 'numeric');
    (rawQuizText || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
        if (/^(Câu|Bài|Q)\s*\d+/i.test(line) || line.includes('?')) {
            if (canPush(currentQuestion)) questionList.push(currentQuestion);
            currentQuestion = { q: line.replace(/^(Câu|Bài|Q)\s*\d+[\.\:\s\-]*/i,'').trim(), o: [], c: 0, type: 'single' };
        } else if (/^[A-D][\.\:\)]/i.test(line)) {
            if (currentQuestion && currentQuestion.o.length < 4) { currentQuestion.o.push(line.replace(/^[A-D][\.\:\)]\s*/i,'').trim()); }
        } else if (/^(Đáp án|DA)[\s\:\.]*/i.test(line)) {
            if (!currentQuestion) return;
            const rest = line.replace(/^(Đáp án|DA)[\s\:\.]*/i, '').trim();
            const letters = [...new Set((rest.match(/[A-D]/gi) || []).map(l => l.toUpperCase()))];
            if (currentQuestion.o.length > 0 && letters.length >= 2) {
                currentQuestion.type = 'multi';
                currentQuestion.c = letters.map(l => l.charCodeAt(0) - 65).sort((a,b) => a - b);
            } else if (currentQuestion.o.length > 0 && letters.length === 1) {
                currentQuestion.type = 'single';
                currentQuestion.c = letters[0].charCodeAt(0) - 65;
            } else {
                const numMatch = rest.replace(/,/g, '.').match(/-?\d+(\.\d+)?/);
                if (numMatch) { currentQuestion.type = 'numeric'; currentQuestion.c = numMatch[0]; }
            }
        }
    });
    if (canPush(currentQuestion)) questionList.push(currentQuestion);
    return questionList;
};

// 🆕 Nén 1 file ảnh thành chuỗi base64 (JPEG, tối đa 900px chiều dài cạnh lớn nhất) để đính kèm
// vào câu hỏi (ảnh sơ đồ, đồ thị...) mà không làm phình quá to dữ liệu lưu trên Firestore.
export const compressImageFile = (file, maxDim = 900, quality = 0.72) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
    reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Ảnh bị lỗi hoặc không đúng định dạng'));
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
                else { width = Math.round(width * (maxDim / height)); height = maxDim; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// 🆕 SỬA LỖI HIỂN THỊ KÝ TỰ TOÁN/LÝ TỪ AI: Gemini đôi khi trả về công thức bằng cú pháp LaTeX
// (\pi, \frac{a}{b}, \(...\), $...$) hoặc bằng bộ ký tự Unicode "in nghiêng/đậm" đặc biệt (Mathematical
// Alphanumeric Symbols, ví dụ 𝑥, 𝐴) mà rất nhiều máy/phông không hiển thị được, hiện ra toàn ô vuông
// hoặc ký tự lạ. Hàm này chuẩn hoá lại về chữ/ký hiệu Unicode thông thường, hiển thị được trên mọi máy.
export const sanitizeAiMathText = (text) => {
    if (!text) return text;
    // Chuyển chữ Toán in nghiêng/đậm Unicode đặc biệt (𝑥,𝐴,𝜋...) về chữ cái/số bình thường
    let s = String(text).normalize('NFKD');
    // Bỏ dấu phân cách công thức kiểu LaTeX: \( \) \[ \] $$ $
    s = s.replace(/\\\(|\\\)|\\\[|\\\]|\$\$|\$/g, '');
    // Quy đổi 1 số lệnh Hy Lạp/ký hiệu LaTeX phổ biến sang ký hiệu Unicode thường gặp
    const latexMap = [
        [/\\pi/g, 'π'], [/\\omega/g, 'ω'], [/\\theta/g, 'θ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'],
        [/\\gamma/g, 'γ'], [/\\Delta/g, 'Δ'], [/\\delta/g, 'δ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
        [/\\varphi/g, 'φ'], [/\\phi/g, 'φ'], [/\\Sigma/g, 'Σ'], [/\\sigma/g, 'σ'], [/\\infty/g, '∞'],
        [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\approx/g, '≈'], [/\\neq/g, '≠'], [/\\times/g, '×'],
        [/\\cdot/g, '·'], [/\\pm/g, '±'], [/\\rightarrow/g, '→'], [/\\to/g, '→'], [/\\sqrt/g, '√'],
        [/\\Omega/g, 'Ω'], [/\\circ/g, '°'],
    ];
    latexMap.forEach(([re, val]) => { s = s.replace(re, val); });
    // \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
    // ^{...} và _{...} -> ^(...) và _(...)
    s = s.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_($1)');
    // dọn dấu { } LaTeX còn sót lại + dấu \ thừa trước chữ cái
    s = s.replace(/[{}]/g, '').replace(/\\(?=[a-zA-Z])/g, '');
    return s;
};
