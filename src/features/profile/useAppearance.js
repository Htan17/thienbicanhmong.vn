const { useState, useEffect } = React;

export function useAppearance({ core, audio }) {
    const { syncUserData, user } = core;
    const { playSfx } = audio;
    // 🎨 CHẾ ĐỘ GIAO DIỆN: "thienkieu" (mặc định, phong cách tu tiên) vs "study"/"Học tập" (nghiêm túc,
    // tự đổi thuật ngữ sang tiếng phổ thông — xem window.__term trong boot.js) + sáng/tối/tự động theo hệ thống.
    const [uiMode, setUiModeState] = useState(window.__uiMode === 'study' ? 'study' : 'thienkieu');
    const [themeMode, setThemeModeState] = useState(window.__themeMode || 'dark');
    const setThemeAction = (m) => { try { localStorage.setItem('themeChosen', '1'); } catch (e) {} playSfx('TOGGLE'); setThemeModeState(m); window.__applyTheme(m); if (user && user.uid) syncUserData({ theme: m }); };
    useEffect(() => { if (user && user.theme && user.theme !== window.__themeMode) { setThemeModeState(user.theme); window.__applyTheme(user.theme); } }, [user && user.uid]);
    const setUiModeAction = (m) => { playSfx('TOGGLE'); setUiModeState(m); window.__applyUiMode(m); if (m === 'study') { let chosen = false; try { chosen = !!localStorage.getItem('themeChosen'); } catch (e) {} if (!chosen) { setThemeModeState('light'); window.__applyTheme('light'); } } if (user && user.uid) syncUserData({ uiMode: m }); };
    // Đồng bộ chế độ giao diện đã lưu trong tài khoản khi đăng nhập
    useEffect(() => { if (user && user.uiMode && user.uiMode !== window.__uiMode && !new URLSearchParams(location.search).get('mode')) { setUiModeState(user.uiMode); window.__applyUiMode(user.uiMode); } }, [user && user.uid]);

    return { setThemeAction, setUiModeAction, themeMode, uiMode };
}
