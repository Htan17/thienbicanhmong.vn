// Trang bị / tháo trang bị: server kiểm tra ô, sở hữu (inventory do server ghi) và quyết định giá trị ghi vào hồ sơ.
const C = require('./catalog');
const SLOT_KIND = { frame: 'frame', nameFrame: 'nameFrame', nameColor: 'nameColor', aura: 'aura', appTheme: 'appTheme', sfx: 'sfx' };
function equipValue(slot, itemId) {
  if (slot === 'nameColor') return C.NAME_COLOR_VALUE[itemId];
  if (slot === 'aura') return C.AURA_CLASS[itemId];
  if (slot === 'sfx') return itemId.replace(/^sfx_/, '');
  return itemId;
}
// itemId '' = tháo. Trả { field, value } hoặc { error }.
function equipPlan(slot, itemId, inventory) {
  if (!Object.prototype.hasOwnProperty.call(SLOT_KIND, slot)) return { error: 'Ô trang bị không hợp lệ' };
  const field = C.EQUIP_FIELD[slot];
  if (itemId === '' || itemId == null) return { field, value: slot === 'sfx' ? 'default' : '' };
  if (typeof itemId !== 'string') return { error: 'Vật phẩm không hợp lệ' };
  if (slot === 'sfx' && itemId === 'default') return { field, value: 'default' }; // gói âm thanh gốc miễn phí
  const item = Object.prototype.hasOwnProperty.call(C.SHOP, itemId) ? C.SHOP[itemId] : null;
  if (!item || item.kind !== SLOT_KIND[slot]) return { error: 'Vật phẩm không phù hợp với ô trang bị' };
  if (!Array.isArray(inventory) || !inventory.includes(item.inventoryId)) return { error: 'Chưa sở hữu vật phẩm này' };
  const value = equipValue(slot, itemId); if (!value) return { error: 'Vật phẩm không thể trang bị' };
  return { field, value };
}
module.exports = { equipPlan };
