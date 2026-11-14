

export function LoadingScreen({ core }) {
    const { loadProgress } = core;
    return (
            <div className="h-full flex flex-col items-center justify-center bg-black animate-fadeIn relative">
                <div className="absolute inset-0 bg-[url('https://i.pinimg.com/originals/ea/4b/c9/ea4bc925bb08de1f744e8f9cb3a5f4f8.gif')] bg-cover bg-center opacity-30"></div>
                <div className="relative z-10 w-full max-w-xs px-6 text-center">
                    <h1 className="text-4xl font-black text-yellow-500 font-playfair italic mb-8 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] tracking-widest">THIÊN KIÊU</h1>
                    <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-3 drop-shadow-[0_0_5px_#00ffff]">Dung Hợp Nguyên Thần... {loadProgress}%</p>
                    <div className="w-full bg-zinc-900 h-2 border border-zinc-700 overflow-hidden rounded-full shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                        <div className="bg-gradient-to-r from-cyan-700 to-cyan-300 h-full transition-all duration-300 ease-out" style={{ width: `${loadProgress}%` }}></div>
                    </div>
                    <p className="text-zinc-600 text-[8px] italic mt-4">Thiên Đạo đang vận chuyển linh khí, xin kiên nhẫn...</p>
                </div>
            </div>
    );
}
