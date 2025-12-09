
import { describe, it, expect } from 'vitest';
import { matchesShortcut } from './keyboardUtils';

describe('matchesShortcut', () => {
    const createEvent = (key: string, modifiers: { ctrl?: boolean, shift?: boolean, alt?: boolean, meta?: boolean } = {}) => {
        return {
            key,
            ctrlKey: !!modifiers.ctrl,
            shiftKey: !!modifiers.shift,
            altKey: !!modifiers.alt,
            metaKey: !!modifiers.meta,
        } as KeyboardEvent;
    };

    it('matches simple keys', () => {
        expect(matchesShortcut(createEvent('x'), 'x')).toBe(true);
        expect(matchesShortcut(createEvent('g'), 'g')).toBe(true);
        expect(matchesShortcut(createEvent('Enter'), 'Enter')).toBe(true);
        expect(matchesShortcut(createEvent('Escape'), 'Escape')).toBe(true);
    });

    it('matches modifiers', () => {
        expect(matchesShortcut(createEvent('Enter', { ctrl: true }), 'Ctrl+Enter')).toBe(true);
        expect(matchesShortcut(createEvent('ArrowLeft', { ctrl: true }), 'Ctrl+ArrowLeft')).toBe(true);
        expect(matchesShortcut(createEvent('x', { shift: true }), 'Shift+x')).toBe(true);
    });

    it('is case insensitive', () => {
        expect(matchesShortcut(createEvent('X'), 'x')).toBe(true);
        expect(matchesShortcut(createEvent('x'), 'X')).toBe(true);
        expect(matchesShortcut(createEvent('enter'), 'Enter')).toBe(true);
        expect(matchesShortcut(createEvent('Enter', { ctrl: true }), 'ctrl+enter')).toBe(true);
    });

    it('does not match if modifiers are missing or extra', () => {
        expect(matchesShortcut(createEvent('Enter'), 'Ctrl+Enter')).toBe(false);
        expect(matchesShortcut(createEvent('Enter', { ctrl: true, shift: true }), 'Ctrl+Enter')).toBe(false); // Extra shift
    });

    it('handles Space key', () => {
        expect(matchesShortcut(createEvent(' '), 'Space')).toBe(true);
        expect(matchesShortcut(createEvent(' '), 'Spacebar')).toBe(true);
    });
});
