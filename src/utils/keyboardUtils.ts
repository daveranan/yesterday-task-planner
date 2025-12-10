// Basic platform check
export const isMac = (): boolean => {
    if (typeof window === 'undefined') return false;
    // @ts-ignore - navigator.userAgentData is experimental but useful if available, fallbacks
    const platform = window.navigator?.userAgentData?.platform || window.navigator?.platform || 'unknown';
    return /mac|ipod|iphone|ipad/i.test(platform);
};

export const getMetaKeySymbol = (): string => {
    return isMac() ? '⌘' : 'Ctrl';
};

export const getMetaKeyName = (): string => {
    return isMac() ? 'Cmd' : 'Ctrl';
};

/**
 * Returns a display-friendly string for a shortcut.
 * Replaces "Ctrl" with "Cmd" or "⌘" on Mac.
 */
export const formatShortcut = (shortcut: string): string => {
    if (!shortcut) return '';
    const symbol = getMetaKeySymbol();
    // Replace 'Ctrl' (case insensitive) with the correct symbol
    return shortcut.replace(/ctrl/i, symbol).replace(/\+/g, ' + ');
};

/**
 * Helper to check if a keyboard event matches a defined shortcut string.
 * Shortcut string format examples: "Ctrl+Enter", "Shift+ArrowUp", "g", "Delete"
 * Auto-switches "Ctrl" to "Cmd" (Meta) on Mac.
 */
export const matchesShortcut = (event: KeyboardEvent | React.KeyboardEvent, shortcut: string): boolean => {
    if (!shortcut) return false;

    const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, parts.length - 1);

    const isMacPlatform = isMac();

    // Check modifiers
    let ctrlRequired = modifiers.includes('ctrl') || modifiers.includes('control');
    let metaRequired = modifiers.includes('meta') || modifiers.includes('cmd') || modifiers.includes('command');
    const shiftRequired = modifiers.includes('shift');
    const altRequired = modifiers.includes('alt');

    // Platform adaptation
    if (isMacPlatform) {
        // On Mac, "Ctrl" in the config means "Command" (Meta) usually
        if (ctrlRequired) {
            metaRequired = true;
            ctrlRequired = false;
        }
    }

    if (event.ctrlKey !== ctrlRequired) return false;
    if (event.shiftKey !== shiftRequired) return false;
    if (event.altKey !== altRequired) return false;
    if (event.metaKey !== metaRequired) return false;

    // Check key
    const eventKey = event.key.toLowerCase();

    // Space special handling
    if (key === 'space' && eventKey === ' ') return true;
    if (key === 'spacebar' && eventKey === ' ') return true;

    return eventKey === key;
};
