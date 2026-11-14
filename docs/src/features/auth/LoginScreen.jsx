

export function LoginScreen({ auth, theme }) {
    const { agreeTerms, authMode, handleEmailAuth, handleForgotPassword, handleGoogleLogin, password, setAgreeTerms, setAuthMode, setPassword, setShowPwd, setUsername, showPwd, username } = auth;
    const { setThemeAction, setUiModeAction, themeMode, uiMode } = theme;
    return (
                    <div className="w-full max-w-sm bg-zinc-900 border-2 border-yellow-600 p-8 text-center shadow-[0_0_40px_rgba(255,223,0,0.15)] animate-fadeIn">
                        <div className="flex justify-center gap-1 mb-3" role="radiogroup" aria-label="Chế độ giao diện">
                            {[['study', '📘 Học tập'], ['thienkieu', '🏯 Bí Tịch']].map(([m, lb]) => (<button key={m} role="radio" aria-checked={uiMode === m} onClick={() => setUiModeAction(m)} className={`px-3 py-1.5 text-[10px] font-black border ${uiMode === m ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-zinc-700 text-zinc-500'}`} data-noterm>{lb}</button>))}
                            <button onClick={() => setThemeAction(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'auto' : 'dark')} className="px-3 py-1.5 text-[10px] font-black border border-zinc-700 text-zinc-300" title="Đổi giao diện sáng/tối" aria-label="Đổi giao diện sáng/tối" data-noterm>{themeMode === 'dark' ? '🌙' : themeMode === 'light' ? '☀️' : '🖥️'}</button>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-relaxed mb-4 pb-3 border-b border-zinc-800">
                            Bằng việc đăng nhập hoặc tạo tài khoản, Ngài đồng ý với <a href="dieu-khoan.html" target="_blank" rel="noopener noreferrer" className="text-yellow-500 font-bold underline hover:text-white">Điều Khoản Dịch Vụ &amp; Chính Sách Bảo Mật</a>. Đây là dự án phi thương mại, bổ trợ tự học.
                        </p>
                        <h1 className="text-4xl font-black text-yellow-500 font-playfair italic mb-2 drop-shadow-[0_0_8px_rgba(255,223,0,0.5)]">THIÊN KIÊU</h1>
                        <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-6">{authMode==='login' ? 'Đăng Nhập' : 'Khai Sơn Lập Phái (Tạo Tài Khoản)'}</p>
                        <div className="space-y-4 mb-6">
                            <input className="w-full bg-black border border-yellow-700 p-4 text-sm text-center text-yellow-500 font-bold outline-none focus:border-yellow-400 transition-colors" placeholder="Danh Xưng (Đạo Hiệu)" value={username} onChange={e=>setUsername(e.target.value)} />
                            {authMode === 'register' && <p className="text-[9px] text-zinc-500 italic -mt-2">Chỉ dùng chữ không dấu (a-z) và số, không khoảng trắng. VD: "tieulong99"</p>}
                            <div className="relative w-full flex items-center">
                                <input className="w-full bg-black border border-yellow-700 p-4 text-sm text-center text-yellow-500 font-bold outline-none focus:border-yellow-400 transition-colors" type={showPwd ? "text" : "password"} placeholder="Mật Mã Phong Ấn" value={password} onChange={e=>setPassword(e.target.value)} />
                                <button onClick={()=>setShowPwd(!showPwd)} className="absolute right-4 text-zinc-500 hover:text-yellow-500 text-lg transition-colors">{showPwd ? '👁️' : '🙈'}</button>
                            </div>
                        </div>
                        {authMode === 'register' && (
                            <label className="flex items-start gap-2 text-left text-[10px] text-zinc-300 leading-relaxed mb-4 cursor-pointer">
                                <input type="checkbox" className="mt-0.5" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                                <span>Tôi đã đọc và đồng ý với <a href="dieu-khoan.html" target="_blank" rel="noopener noreferrer" className="text-yellow-500 font-bold underline">Điều Khoản Dịch Vụ &amp; Chính Sách Bảo Mật</a>.</span>
                            </label>
                        )}
                        <button onClick={handleEmailAuth} className="w-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 text-black py-4 font-black text-sm uppercase mb-4 hover:scale-105 shadow-lg">{authMode==='login' ? 'VÀO BÍ CẢNH' : 'LẬP TÀI KHOẢN'}</button>
                        <div className="relative flex py-4 items-center"><div className="flex-grow border-t border-zinc-700"></div><span className="flex-shrink-0 mx-4 text-[9px] text-zinc-500 uppercase font-black tracking-widest">Hoặc</span><div className="flex-grow border-t border-zinc-700"></div></div>
                        <button onClick={handleGoogleLogin} className="w-full bg-white text-black py-3 font-black text-xs uppercase flex items-center justify-center gap-2 hover:scale-105 shadow-md">
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            DU NHẬP BẰNG GOOGLE
                        </button>
                        <p className="text-[10px] text-zinc-400 mt-6 cursor-pointer uppercase font-bold tracking-wider hover:text-white" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login' ? 'Chưa có thế lực? Khai Sơn Ngay' : 'Đã có tài khoản? Đăng nhập'}</p>
                        {authMode === 'login' && <p className="text-[9px] text-cyan-500/80 mt-2 cursor-pointer font-bold tracking-wider hover:text-cyan-300" onClick={handleForgotPassword}>Quên Mật Khẩu?</p>}
                    </div>
    );
}
