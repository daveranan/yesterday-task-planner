export const playSound = (type: string): void => {
    try {
        const audio = new Audio(`/assets/sounds/${type}.ogg`);
        audio.volume = 0.5;
        // Pitch variance: random between 0.9 and 1.1
        audio.playbackRate = 0.9 + Math.random() * 0.2;
        // In some browsers/settings preservesPitch might be true by default, 
        // we generally want the chipmunk effect for "variance" feel, 
        // but ensuring it plays is step 1.
        if ((audio as any).mozPreservesPitch !== undefined) (audio as any).mozPreservesPitch = false;
        if (audio.preservesPitch !== undefined) audio.preservesPitch = false;

        audio.play().catch(() => {
            // Suppress errors about interaction or missing files unless debugging
            // console.warn('Sound play failed:', e);
        });
    } catch (e) {
        // Ignore
    }
};
