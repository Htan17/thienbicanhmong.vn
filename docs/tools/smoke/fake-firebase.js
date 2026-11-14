// Firebase compat GIẢ trong bộ nhớ, chỉ dùng cho smoke test (tools/smoke/run-smoke.mjs). KHÔNG phải Emulator:
// không kiểm tra Rules/Functions, chỉ cho giao diện chạy được với dữ liệu mẫu cố định.
(function () {
  const qs = new URLSearchParams(location.search);
  const SIGNED_OUT = qs.get('auth') === 'out';
  const UID = 'uid-test-1';
  const store = {}; // 'users/uid' -> object
  const listeners = []; // { prefix, kind:'doc'|'col', path, cb }
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const FV = {
    serverTimestamp: () => ({ __fv: 'ts' }), delete: () => ({ __fv: 'del' }),
    increment: (n) => ({ __fv: 'inc', n }), arrayUnion: (...a) => ({ __fv: 'au', a }), arrayRemove: (...a) => ({ __fv: 'ar', a }),
  };
  const applyFv = (cur, v) => {
    if (v && v.__fv) {
      if (v.__fv === 'ts') return 1700000000000;
      if (v.__fv === 'inc') return (Number(cur) || 0) + v.n;
      if (v.__fv === 'au') return Array.from(new Set([...(Array.isArray(cur) ? cur : []), ...v.a]));
      if (v.__fv === 'ar') return (Array.isArray(cur) ? cur : []).filter((x) => !v.a.includes(x));
    }
    return v;
  };
  const merge = (cur, patch, deep) => {
    const out = { ...(cur || {}) };
    for (const k of Object.keys(patch)) {
      const v = patch[k];
      if (v && v.__fv === 'del') { delete out[k]; continue; }
      if (k.includes('.') && deep) { const [a, ...r] = k.split('.'); out[a] = merge(out[a], { [r.join('.')]: v }, true); continue; }
      out[k] = applyFv(out[k], v);
    }
    return out;
  };
  const docSnap = (path) => { const d = store[path]; const id = path.split('/').pop(); return { id, exists: d !== undefined, data: () => clone(d), ref: docRef(path) }; };
  const colDocs = (path) => Object.keys(store).filter((p) => p.startsWith(path + '/') && p.split('/').length === path.split('/').length + 1).sort();
  const colSnap = (path) => { const docs = colDocs(path).map(docSnap); return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) }; };
  const notify = (changed) => listeners.slice().forEach((l) => {
    if (l.kind === 'doc' && l.path === changed) l.cb(docSnap(l.path));
    if (l.kind === 'col' && changed.startsWith(l.path + '/')) l.cb(colSnap(l.path));
  });
  const sub = (kind, path, cb) => { const l = { kind, path, cb }; listeners.push(l); setTimeout(() => cb(kind === 'doc' ? docSnap(path) : colSnap(path)), 0); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }; };
  const write = (path, fn) => { store[path] = fn(store[path]); setTimeout(() => notify(path), 0); return Promise.resolve(); };
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      get: () => Promise.resolve(docSnap(path)),
      set: (d, o) => write(path, (cur) => (o && o.merge ? merge(cur, d, false) : merge({}, d, false))),
      update: (d) => (store[path] === undefined ? Promise.reject(Object.assign(new Error('not-found'), { code: 'not-found' })) : write(path, (cur) => merge(cur, d, true))),
      delete: () => { delete store[path]; setTimeout(() => notify(path), 0); return Promise.resolve(); },
      onSnapshot: (cb) => sub('doc', path, cb),
      collection: (n) => colRef(path + '/' + n),
    };
  }
  function colRef(path) {
    const q = {
      doc: (id) => docRef(path + '/' + (id || 'auto' + Object.keys(store).length)),
      get: () => Promise.resolve(colSnap(path)),
      onSnapshot: (cb) => sub('col', path, cb),
      add: (d) => { const id = 'auto' + Object.keys(store).length; return docRef(path + '/' + id).set(d).then(() => docRef(path + '/' + id)); },
    };
    q.where = () => q; q.orderBy = () => q; q.limit = () => q;
    return q;
  }
  // ---- dữ liệu mẫu cố định ----
  const mk = (uid, name, spirit, fame, extra) => ({ name, spirit, fame, seasonScore: spirit / 10, streakCount: 3, lastPlayedDate: '2026-11-13', library: [], videoNotes: [], inventory: [], friends: [], requests: [], guild: null, photo: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', rank: 'refining', bio: 'bio ' + name, gameId: 'TK' + uid.slice(-1).repeat(6), lastActive: 1700000000000, ...extra });
  store['users/' + UID] = mk(UID, 'tester', 5000, 300, {
    library: [{ id: 'lib1', title: 'Bộ đề mẫu', data: [{ q: 'Câu 1?', question: 'Câu 1?', options: ['A', 'B', 'C', 'D'], answer: 0, correct: 0 }, { q: 'Câu 2?', question: 'Câu 2?', options: ['A', 'B', 'C', 'D'], answer: 1, correct: 1 }], createdAt: 1700000000000 }],
    inventory: ['frame_gold'], guild: null,
  });
  store['users/uid-test-2'] = mk('uid-test-2', 'dao_huu_2', 9000, 800, { guild: 'Tong Mon Mau' });
  store['users/uid-test-3'] = mk('uid-test-3', 'dao_huu_3', 1200, 50, {});
  store['guilds/Tong Mon Mau'] = { name: 'Tong Mon Mau', leader: 'uid-test-2', members: ['uid-test-2'], level: 1, exp: 100, notice: 'xin chào', createdAt: 1700000000000 };
  store['meta/season'] = { nextReset: 1900000000000, id: 's1' }; store['meta/guildSeason'] = { nextReset: 1900000000000, id: 'g1' };

  const fbUser = { uid: UID, email: 'tester@thienkieu.com', displayName: 'tester', photoURL: null, providerData: [], emailVerified: true, getIdToken: () => Promise.resolve('tok'), getIdTokenResult: () => Promise.resolve({ claims: {} }), reload: () => Promise.resolve(), updatePassword: () => Promise.resolve(), reauthenticateWithCredential: () => Promise.resolve(), linkWithPopup: () => Promise.resolve({ user: fbUser }), verifyBeforeUpdateEmail: () => Promise.resolve() };
  let cur = SIGNED_OUT ? null : fbUser; const authCbs = [];
  const auth = {
    get currentUser() { return cur; },
    onAuthStateChanged: (cb) => { authCbs.push(cb); setTimeout(() => cb(cur), 0); return () => {}; },
    signOut: () => { cur = null; authCbs.forEach((c) => c(null)); return Promise.resolve(); },
    signInWithEmailAndPassword: () => { cur = fbUser; authCbs.forEach((c) => c(cur)); return Promise.resolve({ user: fbUser }); },
    createUserWithEmailAndPassword: () => { cur = fbUser; authCbs.forEach((c) => c(cur)); return Promise.resolve({ user: fbUser }); },
    signInWithPopup: () => { cur = fbUser; authCbs.forEach((c) => c(cur)); return Promise.resolve({ user: fbUser }); },
    sendPasswordResetEmail: () => Promise.resolve(), useEmulator() {}, setPersistence: () => Promise.resolve(),
  };
  const functionsInst = { httpsCallable: (name) => (data) => Promise.resolve({ data: { ok: true, name, result: {} } }), useEmulator() {} };
  const fs = () => ({
    collection: (n) => colRef(n), batch: () => { const ops = []; const b = { set: (r, d, o) => (ops.push(() => r.set(d, o)), b), update: (r, d) => (ops.push(() => r.update(d)), b), delete: (r) => (ops.push(() => r.delete()), b), commit: () => Promise.all(ops.map((f) => f())) }; return b; },
    runTransaction: (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => r.set(d, o), update: (r, d) => r.update(d), delete: (r) => r.delete() }), useEmulator() {}, enablePersistence: () => Promise.resolve(), settings() {},
  });
  fs.FieldValue = FV; fs.Timestamp = { now: () => ({ toMillis: () => 1700000000000 }), fromMillis: (m) => ({ toMillis: () => m }) };
  const authFn = () => auth;
  authFn.GoogleAuthProvider = function () {}; authFn.EmailAuthProvider = { credential: (e, p) => ({ e, p }) }; authFn.Auth = { Persistence: { LOCAL: 'local' } };
  const fb = { apps: [], initializeApp(c) { fb.apps.push({ c }); return fb.apps[0]; }, auth: authFn, firestore: fs, functions: () => functionsInst, app: () => ({ functions: () => functionsInst }) };
  window.firebase = fb; window.__fakeStore = store;
})();
