

export function useNavigation({ core, audio }) {
    const { setAppState, setGuildTab } = core;
    const { playSfx } = audio;
    const changeAppState = (newState) => { playSfx('CLICK'); setAppState(newState); if (newState === 'GUILD') setGuildTab('INFO'); };

    return { changeAppState };
}
