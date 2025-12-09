
/**
 * Helper to check if a keyboard event matches a defined shortcut string.
 * Shortcut string format examples: "Ctrl+Enter", "Shift+ArrowUp", "g", "Delete"
 */
export const matchesShortcut = (event: KeyboardEvent | React.KeyboardEvent, shortcut: string): boolean => {
    if (!shortcut) return false;

    const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, parts.length - 1);

    // Check modifiers
    const ctrl = modifiers.includes('ctrl') || modifiers.includes('control');
    const shift = modifiers.includes('shift');
    const alt = modifiers.includes('alt');
    const meta = modifiers.includes('meta') || modifiers.includes('cmd') || modifiers.includes('command');

    if (event.ctrlKey !== ctrl) return false;
    if (event.shiftKey !== shift) return false;
    if (event.altKey !== alt) return false;
    if (event.metaKey !== meta) return false;

    // Check key
    // Handle special cases and normalization
    const eventKey = event.key.toLowerCase();

    // Space special handling
    if (key === 'space' && eventKey === ' ') return true;
    if (key === 'spacebar' && eventKey === ' ') return true;

    return eventKey === key;
};
