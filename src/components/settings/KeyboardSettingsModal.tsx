import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Icon } from '../Icon';
import { SHORTCUT_DESCRIPTIONS } from '../../constants/shortcuts';

interface KeyboardSettingsModalProps {
    onClose: () => void;
}

export const KeyboardSettingsModal: React.FC<KeyboardSettingsModalProps> = ({ onClose }) => {
    const { settings, updateShortcut } = useStore();
    const shortcuts = settings.shortcuts;
    const [recordingAction, setRecordingAction] = useState<string | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent, actionId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const modifiers = [];
        if (e.shiftKey) modifiers.push('Shift');
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.metaKey) modifiers.push('Meta');

        let key = e.key;

        // Ignore modifier-only presses
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return;

        if (key === ' ') key = 'Space';

        const combo = [...modifiers, key].join('+');

        updateShortcut(actionId, combo);
        setRecordingAction(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-neutral-200 dark:border-neutral-800">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Icon name="Keyboard" className="w-6 h-6" />
                        Keyboard Shortcuts
                    </h2>

                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <Icon name="X" className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(shortcuts).map(([actionId, currentKey]) => (
                            <div key={actionId} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                    {SHORTCUT_DESCRIPTIONS[actionId] || actionId}
                                </span>

                                {recordingAction === actionId ? (
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            readOnly
                                            className="w-32 px-3 py-1.5 text-sm text-center bg-blue-100 text-blue-800 border-2 border-blue-500 rounded outline-none shadow-sm animate-pulse cursor-pointer"
                                            value="Press keys..."
                                            onKeyDown={(e) => handleKeyDown(e, actionId)}
                                            onBlur={() => setRecordingAction(null)}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRecordingAction(actionId)}
                                        className="w-32 px-3 py-1.5 text-sm font-mono text-center bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-sm transition-all text-neutral-600 dark:text-neutral-400"
                                        title="Click to remap"
                                    >
                                        {currentKey}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center gap-4">
                    <div className="text-xs text-neutral-500 flex flex-col gap-1">
                        <span>Click a shortcut to record a new key combination.</span>
                        <span>Use 'Space', 'Shift', 'Ctrl', 'Alt' modifiers.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
