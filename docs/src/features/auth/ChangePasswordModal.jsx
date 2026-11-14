import { auth } from '../../config/firebase.js';

export function ChangePasswordModal({ auth }) {
    const { confirmChangePassword, forgotPasswordFromProfile, pwdModal, setPwdModal } = auth;
    return (
                <div className="absolute inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border border-red-500 p-6 w-full max-w-sm text-center shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                        <h3 className="text-red-500 font-black text-lg mb-2 uppercase tracking-widest">Đổi Mật Mã Phong Ấn</h3>
                        {(auth.currentUser?.providerData || []).some(p => p.providerId === 'password') && (
                            <input type="password" className="w-full bg-black border border-red-900 p-3 text-sm text-white mb-2 outline-none focus:border-red-500 transition-colors text-center" placeholder="Mật mã CŨ..." value={pwdModal.oldVal} onChange={e => setPwdModal({...pwdModal, oldVal: e.target.value})} />
                        )}
                        <input type="password" className="w-full bg-black border border-red-900 p-3 text-sm text-white mb-1 outline-none focus:border-red-500 transition-colors text-center" placeholder="Gõ mật mã mới..." value={pwdModal.val} onChange={e => setPwdModal({...pwdModal, val: e.target.value})} />
                        <p className="text-[9px] text-cyan-500 mt-2 mb-4 cursor-pointer font-bold hover:text-cyan-300" onClick={forgotPasswordFromProfile}>Quên Mật Mã Cũ? Gửi Liên Kết Qua Email</p>
                        <div className="flex gap-2">
                            <button onClick={confirmChangePassword} className="flex-1 bg-red-900 text-white py-3 text-[10px] font-black uppercase hover:bg-red-700">XÁC NHẬN</button>
                            <button onClick={() => setPwdModal({show: false, val: '', oldVal: ''})} className="flex-1 bg-zinc-800 text-zinc-400 py-3 text-[10px] font-black uppercase">HỦY BỎ</button>
                        </div>
                    </div>
                </div>
    );
}
