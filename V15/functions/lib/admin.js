// Logic thuần cho thao tác quản trị (kiểm duyệt). Khoá phải khớp src/lib/moderation.js hiddenKey().
const TYPES = ['user', 'guild', 'quiz', 'video'];
const hiddenKey = (type, id) => `${type}__${encodeURIComponent(String(id))}`;
const isAdminToken = (token) => !!token && token.admin === true;
// Chuẩn hoá + kiểm tra đầu vào adminModerate. Trả { error } hoặc kế hoạch đã sạch.
function moderationPlan(d) {
  d = d || {}; const action = d.action;
  if (!['hide', 'unhide', 'dismiss'].includes(action)) return { error: 'Hành động không hợp lệ' };
  if (action === 'unhide') {
    const key = typeof d.key === 'string' ? d.key : '';
    const m = /^(user|guild|quiz|video)__.{1,600}$/.exec(key); if (!m || key.length > 700 || key.includes('/')) return { error: 'Khoá không hợp lệ' };
    return { action, key };
  }
  if (!TYPES.includes(d.type)) return { error: 'Loại đối tượng không hợp lệ' };
  if (typeof d.id !== 'string' || !d.id || d.id.length > 200) return { error: 'Mã đối tượng không hợp lệ' };
  const ids = Array.isArray(d.reportIds) ? d.reportIds : [];
  if (ids.length > 200 || ids.some((r) => typeof r !== 'string' || !r || r.length > 700 || r.includes('/'))) return { error: 'Danh sách báo cáo không hợp lệ' };
  const key = hiddenKey(d.type, d.id);
  // báo cáo phải thuộc đúng đối tượng: <uid>__<type>__<id mã hoá>
  if (ids.some((r) => !r.endsWith('__' + key))) return { error: 'Báo cáo không khớp đối tượng' };
  const reason = typeof d.reason === 'string' ? d.reason.slice(0, 200) : 'abuse';
  return { action, type: d.type, id: d.id, key, reportIds: ids, reason: reason || 'abuse' };
}
module.exports = { TYPES, hiddenKey, isAdminToken, moderationPlan };
