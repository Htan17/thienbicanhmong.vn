# Rà soát điểm ghi Firestore phía client (src/App.jsx)
Quét regex + phân loại THÔ theo từ khoá; cần người rà từng dòng. (src/lib/srs.js đã chuyển sang `claimSrsReward`.)

Tổng: 63 dòng; còn cần chuyển backend: 20 (safeUserUpdate: 31, FieldValue.increment: 12).

| Dòng | Phân loại | Mã |
|---:|---|---|
| 83 | Client được phép (giao diện/nội dung cá nhân) | `const setThemeAction = (m) => { try { localStorage.setItem('themeChosen', '1'); } catch (e) {} playSfx('TOGGLE'); setThemeModeState(m); window.__apply` |
| 85 | Client được phép (giao diện/nội dung cá nhân) | `const setUiModeAction = (m) => { playSfx('TOGGLE'); setUiModeState(m); window.__applyUiMode(m); if (m === 'study') { let chosen = false; try { chosen ` |
| 762 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `const d = { spirit: firebase.firestore.FieldValue.increment(r.s) };` |
| 763 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `if (r.f) d.fame = firebase.firestore.FieldValue.increment(r.f);` |
| 796 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `batch.update(firestore.collection('guilds').doc(g.id), { exp: firebase.firestore.FieldValue.increment(guildRewardTiers[i]) });` |
| 850 | Client được phép (giao diện/nội dung cá nhân) | `const syncUserData = async (newData) => { if (user && user.uid) await firestore.collection('users').doc(user.uid).set(newData, { merge: true }).catch(` |
| 902 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(res.user.uid).set({` |
| 918 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(res2.user.uid).set({` |
| 1046 | Client được phép (giao diện/nội dung cá nhân) | `if (Object.keys(updatePayload).length) await safeUserUpdate(user.uid, updatePayload);` |
| 1209 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { name: clean, spirit: firebase.firestore.FieldValue.increment(-1000), fame: firebase.firestore.FieldValue.increment(-1` |
| 1255 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { photo: profileImage, bgImage: profileBg, bio }); }` |
| 1295 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { recoveryEmail: clean });` |
| 1335 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(spiritChange), fame: firebase.firestore.FieldValue.increment(fameChan` |
| 1358 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1367 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(randomTarget.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1379 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1386 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { friends: firebase.firestore.FieldValue.arrayUnion(req.fromUid), requests: updatedReqs });` |
| 1388 | Client được phép (giao diện/nội dung cá nhân) | `if(targetDoc.exists) { await firestore.collection('users').doc(req.fromUid).update({ friends: firebase.firestore.FieldValue.arrayUnion(user.uid) }); }` |
| 1399 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(req.guildId).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1401 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: req.guildName, requests: updatedReqs });` |
| 1405 | Client được phép (giao diện/nội dung cá nhân) | `const rejectReq = async (reqId) => { playSfx('FAIL'); const updatedReqs = (user.requests \|\| []).filter(r => r.id !== reqId); await safeUserUpdate(user` |
| 1416 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(safeName).set({ name: safeName, level: 1, members: [user.uid], leader: user.uid, guildId: newGId, notice: "Ch` |
| 1417 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(-500), guild: safeName });` |
| 1434 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(targetGuild.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1435 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: targetGuild.name });` |
| 1452 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });` |
| 1453 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { guild: guildObj.name });` |
| 1473 | Client được phép (giao diện/nội dung cá nhân) | `await firestore.collection('users').doc(targetUser.uid).update({ requests: firebase.firestore.FieldValue.arrayUnion(newReq) });` |
| 1483 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList });` |
| 1484 | Client được phép (giao diện/nội dung cá nhân) | `if (kickedUser) { await firestore.collection('users').doc(kickedUser.uid).update({ guild: null }); }` |
| 1493 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await firestore.collection('guilds').doc(guildObj.id).update({ members: newMembersList, leader: newLeader });` |
| 1495 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `await safeUserUpdate(user.uid, { spirit: firebase.firestore.FieldValue.increment(-500), guild: null }); playSfx('FAIL');` |
| 1526 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `try { await firestore.collection('guilds').doc(gObj.id).update({ notice: noticeText }); }` |
| 1844 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: fullTitle, data: qs, code: compressedCode,` |
| 2014 | Client được phép (giao diện/nội dung cá nhân) | `studySeconds: firebase.firestore.FieldValue.increment(videoStudySeconds)` |
| 2016 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, updatePayload).catch(()=>{});` |
| 2035 | Client được phép (giao diện/nội dung cá nhân) | `safeUserUpdate(user.uid, { videoNotes: updatedNotes }).catch(()=>{});` |
| 2244 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, {` |
| 2245 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `spirit: firebase.firestore.FieldValue.increment(stones),` |
| 2246 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `fame: firebase.firestore.FieldValue.increment(fame)` |
| 2386 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: newLib });` |
| 2427 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: parsedData.t, data: parsedData.d, code: (/` |
| 2499 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: quizTitle, data: questionList, code: compr` |
| 2510 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title, data: questions, code: compressedCode }) }` |
| 2623 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { examPath });` |
| 2643 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry) }); playSfx('SUCCESS'); alert(`Đã lưu Đạo Lộ "${entry.title}" vào Kho (` |
| 2651 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry), examPath: firebase.firestore.FieldValue.delete() }); playSfx('CLICK');` |
| 2663 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPath: sv.path, examPathSaves: next }); playSfx('SUCCESS'); setExamPathTab('TREE'); }` |
| 2668 | Client được phép (giao diện/nội dung cá nhân) | `try { await safeUserUpdate(user.uid, { examPathSaves: (user.examPathSaves \|\| []).filter(s => s.id !== sv.id) }); playSfx('FAIL'); }` |
| 2674 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { examPath: firebase.firestore.FieldValue.delete() });` |
| 2720 | Client được phép (giao diện/nội dung cá nhân) | `const setExamPathActiveTitle = (titleId) => { playSfx('CLICK'); syncUserData({ examPathActiveTitle: titleId }); };` |
| 2858 | Client được phép (giao diện/nội dung cá nhân) | `await safeUserUpdate(user.uid, { library: newLibrary });` |
| 2923 | Client được phép (giao diện/nội dung cá nhân) | `try { await purchaseItem(pk.id); await safeUserUpdate(user.uid, { sfxPack: pk.id }); } catch (e) { playSfx('ERROR'); alert('Mua thất bại: ' + shortErr` |
| 3339 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={async ()=>{ if(await askConfirm("Hủy bí tịch này?")){ safeUserUpdate(user.uid, {library: user.library.filter(x=>x.id!==s.id)}); playS` |
| 3895 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={async (e)=>{ e.stopPropagation(); if(await askConfirm("Xóa bí tịch này?")){ safeUserUpdate(user.uid, {videoNotes: user.videoNotes.fil` |
| 4321 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: ''}); }} className="bg-red-900 text-red-200 border border-red-500 px-3 py-1 text-[9px` |
| 4323 | Client được phép (giao diện/nội dung cá nhân) | `<button onClick={()=>{ playSfx('CLICK'); syncUserData({appTheme: theme.id}); }} className="bg-pink-600 text-white px-3 py-1 text-[9px] font-black">Dùn` |
| 4370 | Client được phép (giao diện/nội dung cá nhân) | `{using ? <span className="text-[9px] text-emerald-400 font-black px-2">ĐANG DÙNG</span> : owned ? <button onClick={() => { playSfx('EQUIP'); syncUserD` |
| 4379 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.aura === a.class ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({aura: ''}); }} className="bg-red-900 text-red-200 border border-red-50` |
| 4389 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.nameFrame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameFrame: ''}); }} className="bg-red-900 text-red-200 border border` |
| 4399 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.nameColor === c.color ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({nameColor: ''}); }} className="bg-red-900 text-red-200 border bor` |
| 4409 | CHUYỂN BACKEND (kinh tế/xếp hạng) | `{user.frame === f.id ? <button onClick={()=>{ playSfx('CLICK'); syncUserData({frame: ''}); }} className="bg-red-900 text-red-200 border border-red-500` |
| 4466 | Client được phép (giao diện/nội dung cá nhân) | `return (<div className="text-center mt-10"><p className="text-[12px] text-red-500 font-black uppercase mb-4 leading-relaxed">Tông môn này đã bị diệt v` |

## Đã chuyển sang backend
mã quà · mua đồ/âm thanh · bùa/Nhân Đôi · đột phá · kết thúc Ải (quiz) · lưu bài học video · SRS · nâng cấp Tông Môn · trang hoàng Tông Môn · đổi Công Trạng · khôi phục chuỗi.

## CHƯA chuyển
Các dòng còn lại trong bảng: đổi tên, tạo/rời Tông Môn (hàm `createGuild`/`leaveGuild` đã có ở server nhưng client CHƯA nối), ải video, reset mùa ở client, thao tác kết bạn/mời (rules mới dùng subcollection), v.v.
