import { DOCX_IMPORT_CONFIG as CFG } from './docxImportTypes.js';

// Phát hiện NHANH (đồng bộ) DOCX có ảnh nhúng hay không: DOCX là file zip, tên file nằm dạng chữ thường trong
// tiêu đề zip, nên chỉ cần dò chuỗi "word/media/". Không giải nén, không cần thư viện.
export const docxHasMedia = (arrayBuffer) => {
    try {
        const u8 = new Uint8Array(arrayBuffer); const needle = 'word/media/';
        outer: for (let i = 0; i <= u8.length - needle.length; i++) {
            if (u8[i] !== 119) continue; // 'w'
            for (let j = 1; j < needle.length; j++) if (u8[i + j] !== needle.charCodeAt(j)) continue outer;
            return true;
        }
    } catch (e) {}
    return false;
};

export const normalizeMime = (m) => { const s = String(m || '').toLowerCase().trim(); return CFG.mimeAlias[s] || s; };
export const base64Bytes = (b64) => { const s = String(b64 || ''); const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0; return Math.max(0, Math.floor(s.length * 3 / 4) - pad); };

// Dùng mammoth.convertToHtml (giữ ảnh theo đúng thứ tự tài liệu). Mỗi ảnh nhận id ổn định, giữ MIME thật.
// mammothLib được truyền vào (window.mammoth) để module test được và không phụ thuộc biến toàn cục.
export const extractDocx = async (arrayBuffer, mammothLib) => {
    const images = [];
    const convertImage = mammothLib.images.imgElement((image) => {
        const id = 'img_' + String(images.length + 1).padStart(3, '0');
        const rec = { id, mime: normalizeMime(image.contentType), dataUri: null, bytes: 0, readable: false, reason: '' };
        images.push(rec);
        return image.read('base64').then((b64) => {
            if (!CFG.supportedMime.includes(rec.mime)) { rec.reason = `Định dạng ảnh không hỗ trợ (${rec.mime || 'không rõ'}).`; return { src: '', 'data-img-id': id }; }
            if (!b64) { rec.reason = 'Ảnh rỗng.'; return { src: '', 'data-img-id': id }; }
            rec.dataUri = `data:${rec.mime};base64,${b64}`; rec.bytes = base64Bytes(b64); rec.readable = true;
            return { src: '', 'data-img-id': id }; // KHÔNG nhét data URI vào HTML (nhẹ hơn); dữ liệu nằm trong `images`
        }).catch(() => { rec.reason = 'Lỗi khi đọc ảnh.'; return { src: '', 'data-img-id': id }; });
    });
    const res = await mammothLib.convertToHtml({ arrayBuffer }, { convertImage });
    return { html: res.value || '', images, messages: res.messages || [] };
};

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g) => {
    if (g[0] === '#') { const n = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[g.toLowerCase()] != null ? ENT[g.toLowerCase()] : m;
});

// HTML của mammoth -> mảng dòng [{ text, imgIds }] đúng thứ tự xuất hiện (kể cả ảnh/chữ trong ô bảng).
export const htmlToLines = (html) => {
    const marked = String(html || '')
        .replace(/<img\b[^>]*>/gi, (tag) => { const m = tag.match(/data-img-id="([^"]+)"/i); return m ? `\u0001${m[1]}\u0002` : ''; })
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|h[1-6]|li|tr|td|th|div|table|ul|ol)>/gi, '\n')
        .replace(/<(p|h[1-6]|li|tr|td|th|div|table|ul|ol)\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    return marked.split('\n').map((raw) => {
        const imgIds = []; const text = decode(raw.replace(/\u0001([^\u0002]+)\u0002/g, (m, id) => { imgIds.push(id); return ''; })).trim();
        return { text, imgIds };
    }).filter(l => l.text || l.imgIds.length);
};
