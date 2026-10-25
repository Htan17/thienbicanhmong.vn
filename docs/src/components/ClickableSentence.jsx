import { CJK_RE, HANGUL_RE, KANA_RE, segmentCjkText } from '../lib/cjk.js';

// SỬA LỖI TRA CỤM TỪ (v2): cách cũ bắt bấm LẦN LƯỢT từng chữ liền kề trong 600ms mới ghép được
// cụm (VD 因为 phải bấm 因 rồi bấm ngay 为) -> rất dễ chỉ bấm trúng 1 chữ (VD chỉ bấm 为) vì
// người dùng không biết phải bấm nối tiếp. Giờ đổi cách chọn tự nhiên hơn, giống bôi đen văn bản:
// - Bấm chữ ĐẦU TIÊN của cụm -> chữ đó tô sáng, chờ người dùng bấm tiếp.
// - Bấm chữ THỨ HAI bất kỳ (không cần liền kề) -> tự động chọn TRỌN cả khoảng từ chữ đầu đến
//   chữ vừa bấm (VD bấm 因 rồi bấm 为 dù 2 chữ có tách token hay không) -> tra luôn cả cụm 因为.
// - Bấm lại đúng chữ đầu tiên, hoặc không bấm gì thêm sau ~900ms -> tra đúng 1 chữ đó như cũ.
export const ClickableSentence = ({ text, onWordClick, vocab }) => {
    const { useState, useRef, useEffect } = React;
    // Câu chứa chữ Hán/Kana -> tách theo từ CJK; câu dùng chữ Latinh (có dấu cách) -> tách theo khoảng trắng như cũ.
    const tokens = CJK_RE.test(text) || KANA_RE.test(text) || HANGUL_RE.test(text) ? segmentCjkText(text) : text.split(/(\s+)/);
    // 🎨 TÔ MÀU TỪ VỰNG: token nào nằm trong từ vựng AI đã rút ra sẽ được tô theo độ quan trọng (3 > 2 > 1)
    const marks = (() => {
        if (!vocab || !vocab.length) return null;
        const low = text.toLowerCase(), m = new Array(tokens.length).fill(0); let pos = 0;
        const offs = tokens.map(t => { const o = pos; pos += t.length; return [o, pos]; });
        const isL = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
        vocab.forEach(({ key, tier }) => {
            let from = 0, at; const latin = /^[\u0000-\u024f]+$/.test(key);
            while ((at = low.indexOf(key, from)) > -1) {
                const end = at + key.length;
                if (!latin || (!isL(low[at - 1]) && !isL(low[end]))) offs.forEach(([x, y], i) => { if (x < end && y > at && tier > m[i]) m[i] = tier; });
                from = end;
            }
        });
        return m;
    })();
    const [selIdx, setSelIdx] = useState([]); // các chỉ số token đang được tô sáng
    const anchorRef = useRef(null); // chỉ số chữ ĐẦU TIÊN vừa bấm, chờ bấm chữ thứ 2 để chọn cả cụm
    const timerRef = useRef(null);
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
    const commit = (indices) => {
        const range = []; for (let k = Math.min(...indices); k <= Math.max(...indices); k++) range.push(k);
        const phrase = range.map(idx => tokens[idx].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).join('');
        anchorRef.current = null;
        setSelIdx([]);
        onWordClick(phrase, text);
    };
    const handleClick = (i) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (anchorRef.current === null) {
            anchorRef.current = i;
            setSelIdx([i]);
            timerRef.current = setTimeout(() => commit([i]), 900); // không bấm gì thêm -> tra đúng 1 chữ này
        } else {
            const a = anchorRef.current;
            if (i === a) { commit([i]); return; } // bấm lại đúng chữ đầu -> tra 1 chữ đó luôn
            const lo = Math.min(a, i), hi = Math.max(a, i);
            setSelIdx(Array.from({length: hi - lo + 1}, (_, k) => lo + k));
            commit([a, i]); // bấm chữ thứ 2 (bất kỳ vị trí nào) -> chọn trọn khoảng giữa 2 chữ rồi tra luôn
        }
    };
    return (<>{tokens.map((tok, i) => {
        const clean = tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        if (!clean) return <React.Fragment key={i}>{tok}</React.Fragment>;
        const isSel = selIdx.includes(i);
        const tier = marks ? marks[i] : 0;
        const tierCls = tier === 3 ? 'text-yellow-300 font-bold bg-yellow-500/20 border-b-2 border-yellow-400' : tier === 2 ? 'text-emerald-300 bg-emerald-500/15 border-b-2 border-emerald-400' : tier === 1 ? 'text-sky-300 bg-sky-500/10 border-b border-sky-400/70' : '';
        return <span key={i} onClick={() => handleClick(i)} className={`cursor-pointer rounded-sm ${tierCls} ${isSel ? 'bg-cyan-600 text-white ring-1 ring-cyan-300' : 'hover:bg-cyan-800/50 hover:text-cyan-300 active:bg-cyan-700'}`}>{tok}</span>;
    })}</>);
};
