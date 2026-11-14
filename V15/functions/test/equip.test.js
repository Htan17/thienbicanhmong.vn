const test = require('node:test'); const assert = require('node:assert'); const { equipPlan } = require('../lib/equip'); const C = require('../lib/catalog');
test('equipPlan: tháo luôn được; âm thanh tháo về default', () => {
  assert.deepStrictEqual(equipPlan('frame', '', []), { field: 'frame', value: '' }); assert.deepStrictEqual(equipPlan('sfx', '', []), { field: 'sfxPack', value: 'default' });
});
test('equipPlan: phải sở hữu (inventory) và đúng ô', () => {
  assert.ok(equipPlan('frame', 'luctruc', []).error); assert.deepStrictEqual(equipPlan('frame', 'luctruc', ['luctruc']), { field: 'frame', value: 'luctruc' });
  assert.ok(equipPlan('aura', 'luctruc', ['luctruc']).error); assert.ok(equipPlan('nameFrame', 'luctruc', ['luctruc']).error);
});
test('equipPlan: màu tên lưu mã màu, hào quang lưu class, sfx lưu id gói', () => {
  assert.deepStrictEqual(equipPlan('nameColor', 'nc_cyan', ['nc_cyan']), { field: 'nameColor', value: '#00ffff' });
  assert.deepStrictEqual(equipPlan('aura', 'pa_chaos', ['pa_chaos']), { field: 'aura', value: 'aura-chaos' });
  assert.deepStrictEqual(equipPlan('sfx', 'chime', ['sfx_chime']), { field: 'sfxPack', value: 'chime' }); assert.ok(equipPlan('sfx', 'chime', ['chime']).error);
  assert.deepStrictEqual(equipPlan('sfx', 'default', []), { field: 'sfxPack', value: 'default' });
});
test('equipPlan: ô/vật phẩm lạ, prototype key và aura_laoma (tự kích hoạt) bị từ chối', () => {
  assert.ok(equipPlan('hack', 'luctruc', ['luctruc']).error); assert.ok(equipPlan('__proto__', 'x', []).error); assert.ok(equipPlan('frame', '__proto__', ['x']).error); assert.ok(equipPlan('frame', 'constructor', ['x']).error);
  assert.ok(equipPlan('aura', 'aura_laoma', ['aura_laoma']).error); assert.ok(equipPlan('frame', 123, []).error);
});
test('mọi nameColor/aura trong SHOP có giá trị trang bị (trừ aura_laoma)', () => {
  Object.entries(C.SHOP).forEach(([id, it]) => { if (it.kind === 'nameColor') assert.ok(C.NAME_COLOR_VALUE[id], id); if (it.kind === 'aura' && id !== 'aura_laoma') assert.ok(C.AURA_CLASS[id], id); });
});
