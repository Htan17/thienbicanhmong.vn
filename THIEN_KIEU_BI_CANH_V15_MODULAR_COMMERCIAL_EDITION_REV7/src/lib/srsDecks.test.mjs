import test from 'node:test';
import assert from 'node:assert/strict';
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.window = globalThis; globalThis.TKBC_USE_EMULATORS = true; globalThis.firebase = { apps: [{}], initializeApp() {}, auth: () => ({ useEmulator() {} }), firestore: () => ({ useEmulator() {} }), app: () => ({ functions: () => ({ useEmulator() {} }) }) };
const { SRS } = await import('./srs.js');
SRS.init({ uid: 'deck-test', videoNotes: [] }, null);
await new Promise(r => setTimeout(r, 20));

test('addDeck: tạo thẻ có deck/lang/src=doc, đếm đúng, không tạo bộ rỗng', () => {
  const r = SRS.addDeck({ name: 'Bài 1', lang: 'Tiếng Anh / Latinh', mode: 'BOTH' }, [{ original: 'print', translated: 'in' }, { original: 'open', translated: 'mở', pos: 'v', example: 'Open the door.' }]);
  assert.equal(r.added, 2); assert.ok(r.id);
  const d = SRS.deckList(); assert.equal(d.length, 1); assert.equal(d[0].n, 2); assert.equal(d[0].due, 2); assert.equal(d[0].mode, 'BOTH');
  const c = SRS.cards().find(x => x.original === 'open'); assert.equal(c.src, 'doc'); assert.equal(c.deck, r.id); assert.equal(c.partOfSpeech, 'v'); assert.equal(c.lang, 'Tiếng Anh / Latinh');
  assert.equal(SRS.addDeck({ name: 'Rỗng' }, [{ original: 'print', translated: 'in' }]).id, null, 'toàn từ trùng đã thuộc bộ khác -> không tạo bộ');
});

test('startDeck: chỉ thẻ của bộ, mới tối đa newCap; sau khi ôn đúng thì chưa đến hạn', () => {
  const id = SRS.deckList()[0].id;
  assert.equal(SRS.startDeck(id).length, 2); assert.equal(SRS.startDeck(id, 1).length, 1);
  const c = SRS.startDeck(id)[0]; SRS.grade(c.id, true);
  assert.equal(SRS.startDeck(id).length, 1);
  assert.equal(SRS.deckList()[0].started, 1); assert.ok(SRS.deckList()[0].pct > 0);
});

test('thẻ có sẵn (từ video/tra từ) được nhận vào bộ và KHÔNG bị xoá khi xoá bộ', () => {
  SRS.addLookup('hello', { meaning: 'xin chào' }, '');
  const r = SRS.addDeck({ name: 'Bài 2', lang: 'Tiếng Anh / Latinh' }, [{ original: 'hello', translated: 'xin chào' }, { original: 'book', translated: 'quyển sách' }]);
  assert.equal(r.adopted, 1); assert.equal(r.added, 1);
  const before = SRS.cards().length; const removed = SRS.removeDeck(r.id);
  assert.equal(removed, 1, 'chỉ xoá thẻ do bộ tạo');
  assert.equal(SRS.cards().length, before - 1); assert.ok(SRS.cards().some(x => x.original === 'hello' && !x.deck));
  assert.ok(!SRS.cards().some(x => x.original === 'book'));
});

test('xoá bộ rồi nhập lại cùng từ: thẻ tạo lại được (bỏ dấu đã xoá)', () => {
  const id = SRS.deckList()[0].id; SRS.removeDeck(id);
  assert.equal(SRS.deckList().length, 0);
  const r = SRS.addDeck({ name: 'Lại' }, [{ original: 'print', translated: 'in' }]); assert.equal(r.added, 1);
  assert.equal(SRS.deckList()[0].n, 1);
});

test('setDeck chỉ nhận chế độ hợp lệ', () => {
  const id = SRS.deckList()[0].id; SRS.setDeck(id, { mode: 'WORD' }); assert.equal(SRS.deckList()[0].mode, 'WORD');
  SRS.setDeck(id, { mode: 'HACK' }); assert.equal(SRS.deckList()[0].mode, 'WORD');
});

test('Ải học thuộc: setStage/deckList/resetPath', () => {
  const r = SRS.addDeck({ name: 'Ải', lang: 'Tiếng Anh / Latinh' }, [{ original: 'cat', translated: 'con mèo' }, { original: 'dog', translated: 'con chó' }]);
  const cat = SRS.deckCards(r.id).find(c => c.original === 'cat'); SRS.setStage(cat.id, 3); SRS.setStage(SRS.deckCards(r.id).find(c => c.original === 'dog').id, 9);
  let d = SRS.deckList().find(x => x.id === r.id); assert.deepEqual(d.st, [0, 0, 0, 1, 1]); assert.equal(d.remaining, 1); assert.equal(d.pathPct, Math.round((3 + 4) / 8 * 100));
  assert.equal(SRS.resetPath(r.id), 2); d = SRS.deckList().find(x => x.id === r.id); assert.deepEqual(d.st, [2, 0, 0, 0, 0]); assert.equal(d.pathPct, 0);
});
