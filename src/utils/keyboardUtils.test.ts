
import { describe, it, expect, afterEach } from 'vitest';
import { matchesShortcut } from './keyboardUtils';

describe('matchesShortcut', () => {
    // Mock window.navigator
    // Ensure window exists
    if (typeof window === 'undefined') {
        (global as any).window = {};
    }
    if (!window.navigator) {
        (window as any).navigator = {};
    }

    const originalNavigator = window.navigator;

    const setPlatform = (platform: string) => {
        Object.defineProperty(window, 'navigator', {
            value: {
                ...originalNavigator,
                platform
            },
            configurable: true,
            writable: true
        });
    };

    afterEach(() => {
        if (originalNavigator) {
            Object.defineProperty(window, 'navigator', {
                value: originalNavigator,
                configurable: true,
                writable: true
            });
        }
    });

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

    it('matches Ctrl modifiers on Windows/Linux', () => {
        setPlatform('Win32');
        expect(matchesShortcut(createEvent('Enter', { ctrl: true }), 'Ctrl+Enter')).toBe(true);
        expect(matchesShortcut(createEvent('ArrowLeft', { ctrl: true }), 'Ctrl+ArrowLeft')).toBe(true);
        // Meta should NOT match Ctrl on Windows
        expect(matchesShortcut(createEvent('Enter', { meta: true }), 'Ctrl+Enter')).toBe(false);
    });

    it('matches Cmd (Meta) modifiers on Mac for Ctrl shortcuts', () => {
        setPlatform('MacIntel');
        // 'Ctrl+Enter' config should match Meta+Enter on Mac
        expect(matchesShortcut(createEvent('Enter', { meta: true }), 'Ctrl+Enter')).toBe(true);
        // Real Ctrl on Mac should NOT match 'Ctrl' config (usually)
        expect(matchesShortcut(createEvent('Enter', { ctrl: true }), 'Ctrl+Enter')).toBe(false);
    });

    it('matches modifiers', () => {
        setPlatform('Win32');
        expect(matchesShortcut(createEvent('x', { shift: true }), 'Shift+x')).toBe(true);
    });

    it('is case insensitive', () => {
        expect(matchesShortcut(createEvent('X'), 'x')).toBe(true);
        expect(matchesShortcut(createEvent('x'), 'X')).toBe(true);
        expect(matchesShortcut(createEvent('enter'), 'Enter')).toBe(true);
        setPlatform('Win32');
        expect(matchesShortcut(createEvent('Enter', { ctrl: true }), 'ctrl+enter')).toBe(true);
    });

    it('does not match if modifiers are missing or extra', () => {
        setPlatform('Win32');
        expect(matchesShortcut(createEvent('Enter'), 'Ctrl+Enter')).toBe(false);
        expect(matchesShortcut(createEvent('Enter', { ctrl: true, shift: true }), 'Ctrl+Enter')).toBe(false); // Extra shift
    });

    it('handles Space key', () => {
        expect(matchesShortcut(createEvent(' '), 'Space')).toBe(true);
        expect(matchesShortcut(createEvent(' '), 'Spacebar')).toBe(true);
    });
});
