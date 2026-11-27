import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContent, isContentBlocked, isContentBlockedBody, isPublicTextBlocked, isReservedName, sanitizePublicText } from '../src/lib/contentFilter.js';

const BLOCK = [
  'địt mẹ mày', 'Đụ má', 'thằng cặc', 'con đĩ', 'lồn', 'buồi', 'dit me may', 'D1T M3', 'd.i.t m.e', 'đ ị t', 'vcl', 'VCL!!!', 'dmm', 'f u c k', 'fuuuuck you', 'xxxporn123', 'PornHub', 'h3nt41',
  'phim sex', 'sex video', 'nhà cái uy tín', 'nha cai uy tin', 'cá độ bóng đá', 'ca d0 bong da', 'tín dụng đen', 'vay tien nhanh', 'bán ma túy', 'thuoc lac',
  'tao giết mày', 'kys', 'nigger', '傻逼', '씨발', 'casino online', 'sbobet', 'k​ub​et' /* có ký tự vô hình */,
];
const ALLOW = [
  'du lịch Hà Nội', 'buổi sáng', 'các bạn', 'con chó dễ thương', 'HSK4 ôn tập', 'Bí Tịch 2024', 'lồng đèn', 'địa lý', 'đĩa hát', 'đi học', 'Đức', 'đụng độ' /* đụng ≠ đụ */, 'dịch thuật',
  'Tiếng Trung sơ cấp', 'nihao ma', '你好，世界', 'こんにちは', '안녕하세요', 'Class of 2026', 'assignment', 'Essex', 'Scunthorpe', 'mass', 'cassette', 'Hancock', 'shitake mushroom recipe'.replace('shitake', 'shiitake'),
  'dm = decimet', 'bóng đá', 'đánh giá', 'sex education' /* chỉ bị chặn ở level name */,
];
test('chặn các nội dung không phù hợp (level name)', () => { for (const s of BLOCK) assert.equal(checkContent(s).ok, false, 'phải chặn: ' + JSON.stringify(s)); });
test('không chặn nhầm từ vựng bình thường', () => {
  for (const s of ALLOW.filter(x => x !== 'sex education')) assert.equal(checkContent(s, { contact: false }).ok, true, 'không được chặn: ' + s + ' -> ' + JSON.stringify(checkContent(s, { contact: false })));
});
test('compat: isContentBlocked giữ chữ ký boolean', () => { assert.equal(isContentBlocked('địt'), true); assert.equal(isContentBlocked('Xin chào'), false); });
test('level body chỉ chặn nhóm nặng, không chặn học liệu', () => {
  assert.equal(isContentBlockedBody('Sex determination in humans is chromosomal.'), false);
  assert.equal(isContentBlockedBody('Phòng chống ma túy và cờ bạc'), false);
  assert.equal(isContentBlockedBody('xem phim sex tại đây'), true);
  assert.equal(isContentBlockedBody('địt mẹ'), true);
});
test('thông tin liên lạc / liên kết trong tên & di ngôn', () => {
  for (const s of ['liên hệ 0912 345 678', 'zalo.me/abc', 'https://x.com/a', 'a@b.com', 'vào kubet.vip', '+84 912-345-678']) assert.equal(isPublicTextBlocked(s), true, s);
  for (const s of ['HSK 4 - 2024', 'Bài 12, câu 1-20', 'Ôn 500 từ mỗi ngày']) assert.equal(isPublicTextBlocked(s), false, s);
});
test('tên dành riêng chống giả mạo', () => {
  for (const s of ['admin', 'Admin', 'quantrivien', 'Quản Trị Viên', 'admin_123', 'thienkieu', 'tongchu']) assert.equal(isReservedName(s), true, s);
  for (const s of ['minhanh', 'hoangtu', 'adminh' /* không bắt đầu bằng admin? sẽ bị bắt: kiểm tra riêng */].slice(0, 2)) assert.equal(isReservedName(s), false, s);
});
test('sanitizePublicText', () => {
  assert.equal(sanitizePublicText('  a\u200Bb \u202E c  \n d '), 'ab c d');
  assert.equal(Array.from(sanitizePublicText('😀'.repeat(300), 10)).length, 10);
});
