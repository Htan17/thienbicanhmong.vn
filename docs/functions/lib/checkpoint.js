// Chạy tác vụ định kỳ có CHECKPOINT: nextReset chỉ được đẩy lên SAU KHI mọi batch đã hoàn tất.
// Lỗi giữa chừng => tick kế tiếp tiếp tục từ cursor đã lưu (cursor được ghi cùng batch với phần thưởng => không phát trùng).
async function runCheckpointed(db, { name, now = Date.now(), nextFn, snapshot, applyItem, resetLoop, chunkSize = 200 }) {
  const metaRef = db.doc(`meta/${name}`);
  const meta = (await metaRef.get()).data() || {};
  if (!meta.nextReset || now < meta.nextReset) return { ran: false };
  const runRef = db.doc(`maintenanceRuns/${name}_${meta.nextReset}`);
  let run = (await runRef.get()).data();
  if (!run) { run = { status: 'running', items: await snapshot(), cursor: 0, startedAt: now }; await runRef.set(run); }
  if (run.status === 'done') { await metaRef.set({ nextReset: nextFn(now) }, { merge: true }); return { ran: true, resumed: true }; }
  while (run.cursor < run.items.length) {
    const part = run.items.slice(run.cursor, run.cursor + chunkSize); const b = db.batch();
    part.forEach((it) => applyItem(b, it));
    b.update(runRef, { cursor: run.cursor + part.length }); // atomic với phần thưởng của lô
    await b.commit(); run.cursor += part.length;
  }
  if (resetLoop) await resetLoop();
  const fin = db.batch(); fin.set(metaRef, { nextReset: nextFn(now) }, { merge: true }); fin.update(runRef, { status: 'done', finishedAt: Date.now() }); await fin.commit();
  return { ran: true, items: run.items.length };
}
module.exports = { runCheckpointed };
