// Màn hình mở app. KHÔNG còn thanh % giả: hiển thị các bước THẬT đang chạy (kết nối → xác thực → tải dữ liệu)
// do useRealtimeSync cập nhật qua core.loadStage (0 = đang khởi động, 1 = đã xác thực, 2 = đã có hồ sơ).
// Mất mạng / mạng chậm: hiện thông báo rõ ràng + nút "Thử lại" thay vì treo im lặng.
const { useState, useEffect } = React;

const STEPS = ['Kết nối máy chủ', 'Xác thực tài khoản', 'Tải dữ liệu học tập'];
const SLOW_AFTER_MS = 8000;

export function LoadingScreen({ core }) {
    const { loadStage = 0 } = core;
    const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
    const [slow, setSlow] = useState(false);
    useEffect(() => {
        const on = () => setOnline(true), off = () => setOnline(false);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearTimeout(t); };
    }, []);
    const problem = !online ? 'offline' : (slow ? 'slow' : null);
    const status = problem === 'offline' ? 'Không có kết nối mạng' : (problem === 'slow' ? 'Kết nối đang chậm hơn bình thường…' : (STEPS[Math.min(loadStage, STEPS.length - 1)] + '…'));

    return (
        <div className="h-full flex flex-col items-center justify-center bg-black animate-fadeIn relative px-6" role="status" aria-live="polite">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(234,179,8,0.10), transparent 60%)' }}></div>
            <div className="relative z-10 w-full max-w-xs text-center">
                <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center border border-yellow-600/60" style={{ background: 'linear-gradient(135deg,#1c1917,#0a0a0a)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M9.5 8.5l5 3-5 3z" fill="#eab308" stroke="none" /></svg>
                </div>
                <h1 className="text-3xl font-black text-yellow-500 font-playfair italic tracking-wide">Thiên Kiêu Bí Cảnh</h1>
                <p className="text-zinc-400 text-xs mt-1 mb-7">Học ngoại ngữ qua video &amp; luyện đề</p>

                {problem ? (
                    <div className="border border-zinc-700 bg-zinc-900/70 rounded-xl p-4">
                        <p className={`text-sm font-bold ${problem === 'offline' ? 'text-red-400' : 'text-yellow-400'}`}>{status}</p>
                        <p className="text-zinc-400 text-[11px] leading-relaxed mt-2">
                            {problem === 'offline' ? 'Hãy kiểm tra Wi-Fi hoặc dữ liệu di động. Ứng dụng sẽ tự tiếp tục khi có mạng trở lại.' : 'Mạng yếu hoặc máy chủ đang bận. Bạn có thể đợi thêm hoặc thử tải lại.'}
                        </p>
                        <button onClick={() => window.location.reload()} className="mt-3 w-full bg-yellow-500 text-black font-black text-[11px] uppercase tracking-widest py-2.5 rounded-lg hover:bg-yellow-400 transition-colors">Thử lại</button>
                    </div>
                ) : (
                    <div>
                        <div className="tk-loadbar w-full h-1 bg-zinc-800 rounded-full overflow-hidden" aria-hidden="true"><div className="tk-loadbar-fill"></div></div>
                        <p className="text-zinc-300 text-xs font-bold mt-4">{status}</p>
                        <ol className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                            {STEPS.map((s, i) => <li key={s} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${i < loadStage ? 'bg-yellow-500' : (i === loadStage ? 'bg-yellow-500/50' : 'bg-zinc-700')}`}></li>)}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
