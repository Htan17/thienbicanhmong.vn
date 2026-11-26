export const safeGetItem = (key) => { try { return localStorage.getItem(key); } catch(e) { return null; } };
export const safeSetItem = (key, val) => { try { localStorage.setItem(key, val); } catch(e) { console.warn("Lỗi ghi nhớ:", e); } };
