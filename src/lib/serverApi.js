import { getFunctions } from '../config/firebase.js';
// Lớp gọi Cloud Functions (firebase-functions-compat đã được nạp trong index.html).
// Đã nối một phần vào App.jsx (xem docs/technical/SECURITY_AUDIT.md và docs/technical/KNOWN_ISSUES.md). Instance Functions + Emulator nằm ở config/firebase.js.
const fn = () => getFunctions();
const call = async (name, data) => { const r = await fn().httpsCallable(name)(data); return r.data; };
export const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(36).slice(2, 12));
export const startQuiz = (total, fingerprint = null) => call('startQuiz', { total, fingerprint });
export const claimQuizReward = (sessionId, correct, examPath = false) => call('claimQuizReward', { sessionId, correct, examPath });
export const claimVideoReward = (link, requestId = newRequestId()) => call('claimVideoReward', { link, requestId });
export const claimSrsReward = ({ spirit = 0, fame = 0, ct = 0 }, requestId = newRequestId()) => call('claimSrsReward', { spirit, fame, ct, requestId });
export const redeemGiftCode = (code) => call('redeemGiftCode', { code });
export const purchaseItem = (itemId, requestId = newRequestId()) => call('purchaseItem', { itemId, requestId });
export const buyRank = (rankId, requestId = newRequestId()) => call('buyRank', { rankId, requestId });
export const activateBuff = (itemId, requestId = newRequestId()) => call('activateBuff', { itemId, requestId });
export const renameUser = (name, requestId = newRequestId()) => call('renameUser', { name, requestId });
export const createGuild = (name, requestId = newRequestId()) => call('createGuild', { name, requestId });
export const joinGuild = (guild, inviteId = null, requestId = newRequestId()) => call('joinGuild', { guild, inviteId, requestId });
export const rollGacha = (requestId = newRequestId()) => call('rollGacha', { requestId });
export const claimVideoQuizRound = (score, total, requestId = newRequestId()) => call('claimVideoQuizRound', { score, total, requestId });
export const kickGuildMember = (targetUid, requestId = newRequestId()) => call('kickGuildMember', { targetUid, requestId });
export const transferGuildLeader = (targetUid, requestId = newRequestId()) => call('transferGuildLeader', { targetUid, requestId });
export const dissolveGuild = (requestId = newRequestId()) => call('dissolveGuild', { requestId });
export const leaveGuild = (requestId = newRequestId()) => call('leaveGuild', { requestId });
export const deleteAccount = () => call('deleteAccount', { confirm: 'DELETE' });
export const getResearchStats = () => call('getResearchStats', {});

export const upgradeGuild = (requestId = newRequestId()) => call('upgradeGuild', { requestId });
export const buyGuildPerk = (perkType, value, requestId = newRequestId()) => call('buyGuildPerk', { perkType, value, requestId });
export const exchangeGuildExp = (offerId, requestId = newRequestId()) => call('exchangeGuildExp', { offerId, requestId });
export const restoreStreak = (method, requestId = newRequestId()) => call('restoreStreak', { method, requestId });
export const adminModerate = (payload) => call('adminModerate', payload);
export const equipItem = (slot, itemId = '') => call('equipItem', { slot, itemId });
