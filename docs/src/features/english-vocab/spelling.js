// Chính tả tiếng Anh cho AI Sư Phụ (chế độ gõ từ). Logic THUẦN: không React/Firebase, không quyết định thưởng.
// Dùng cùng chấm điểm của lib/srsTyping.js: ở đây chỉ bổ sung (1) chế độ chấm CHẶT từng chữ, (2) đánh dấu chữ sai để người học thấy mình sai ở đâu.

const clean = (s) => String(s == null ? '' : s).normalize('NFC').replace(/[‘’ʼ]/g, "'").replace(/[‐-―]/g, '-');

// Bỏ khác biệt hoa/thường, khoảng trắng thừa, kiểu nháy; KHÔNG bỏ dấu nháy/gạch nối thật (don't ≠ dont, ice-cream ≠ ice cream).
export const normalizeWord = (s) => clean(s).trim().replace(/\s+/g, ' ').toLowerCase();

// Từ/cụm từ tiếng Anh thuần chữ cái (cho phép khoảng trắng, dấu nháy, gạch nối giữa các chữ).
export const isEnglishWord = (w) => /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/.test(clean(w).trim());

export const strictSpellOk = (typed, answer) => { const t = normalizeWord(typed); return !!t && t === normalizeWord(answer); };

const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

// 'exact' | 'near' (lệch đúng 1 ký tự) | 'wrong' | 'empty'
export const spellVerdict = (typed, answer) => {
  const x = normalizeWord(typed), y = normalizeWord(answer);
  if (!x) return 'empty'; if (x === y) return 'exact';
  return lev(x, y) <= 1 ? 'near' : 'wrong';
};

// Đánh dấu từng ký tự của ĐÁP ÁN: đã gõ đúng (ok) hay thiếu/sai. Dùng LCS để lệch 1 chữ không đỏ cả từ.
export const diffMarks = (typed, answer) => {
  const a = [...normalizeWord(answer)], b = [...normalizeWord(typed)];
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { out.push({ ch: a[i], ok: true }); i++; j++; }
    else if (j < b.length && L[i][j + 1] >= L[i + 1][j]) j++;
    else { out.push({ ch: a[i], ok: false }); i++; }
  }
  return out;
};
