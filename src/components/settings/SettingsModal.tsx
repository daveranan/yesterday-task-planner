import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Icon } from '../Icon';
import { SHORTCUT_DESCRIPTIONS } from '../../constants/shortcuts';

interface SettingsModalProps {
    onClose: () => void;
}

type Tab = 'general' | 'shortcuts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const {
        settings,
        toggleTheme,
        toggleSound,
        toggleGratefulness,
        toggleReflection,
        setSavePath,
        updateShortcut
    } = useStore();

    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [recordingAction, setRecordingAction] = useState<string | null>(null);
    const [tempSavePath, setTempSavePath] = useState(settings.savePath || '');
    const [runOnStartup, setRunOnStartup] = useState(false);

    React.useEffect(() => {
        // Fetch initial startup setting
        try {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.invoke('get-startup-setting').then((isOpenAtLogin: boolean) => {
                setRunOnStartup(isOpenAtLogin);
            });
        } catch (error) {
            console.error('Failed to get startup setting:', error);
        }
    }, []);

    const toggleStartup = () => {
        const newValue = !runOnStartup;
        setRunOnStartup(newValue);
        try {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('set-startup-setting', newValue);
        } catch (error) {
            console.error('Failed to set startup setting:', error);
        }
    };

    // Keyboard configuration logic
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

    const handleSavePathChange = () => {
        if (tempSavePath && tempSavePath !== settings.savePath) {
            setSavePath(tempSavePath);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex overflow-hidden border border-neutral-200 dark:border-neutral-800">

                {/* Sidebar */}
                <div className="w-64 bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Icon name="Settings" className="w-6 h-6" />
                            Settings
                        </h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general'
                                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                                }`}
                        >
                            <Icon name="Sliders" className="w-4 h-4" />
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('shortcuts')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'shortcuts'
                                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                                }`}
                        >
                            <Icon name="Keyboard" className="w-4 h-4" />
                            Shortcuts
                        </button>
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-900">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {activeTab === 'general' ? 'General Settings' : 'Keyboard Shortcuts'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                            <Icon name="X" className="w-5 h-5 text-neutral-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'general' ? (
                            <div className="space-y-8 max-w-2xl">
                                {/* Appearance Section */}
                                <section className="space-y-4">
                                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Appearance & Behavior</h4>

                                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name={settings.isDarkMode ? "Moon" : "Sun"} className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Dark Mode</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Toggle application theme</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleTheme}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isDarkMode ? 'bg-neutral-900 dark:bg-blue-600' : 'bg-neutral-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name={settings.soundEnabled ? "Volume2" : "VolumeX"} className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Sound Effects</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Play sounds on interactions</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleSound}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.soundEnabled ? 'bg-neutral-900 dark:bg-blue-600' : 'bg-neutral-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name="BookOpen" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Reflections</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Show daily reflection section</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleReflection}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showReflection ? 'bg-neutral-900 dark:bg-blue-600' : 'bg-neutral-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showReflection ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name="Heart" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Gratefulness</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Show daily gratefulness section</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleGratefulness}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showGratefulness ? 'bg-neutral-900 dark:bg-blue-600' : 'bg-neutral-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showGratefulness ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name="Power" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Run on Startup</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Automatically start app when you log in</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleStartup}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${runOnStartup ? 'bg-neutral-900 dark:bg-blue-600' : 'bg-neutral-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${runOnStartup ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </section>

                                {/* Data Section */}
                                <section className="space-y-4">
                                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Data Management</h4>

                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                                                <Icon name="HardDrive" className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-white">Save File Location</div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    Path where your data is stored. Changing this will save data to the new location immediately.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tempSavePath}
                                                onChange={(e) => setTempSavePath(e.target.value)}
                                                placeholder="Default (Home Directory)"
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                                            />
                                            <button
                                                onClick={handleSavePathChange}
                                                disabled={tempSavePath === (settings.savePath || '')}
                                                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm font-medium"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(settings.shortcuts).map(([actionId, currentKey]) => (
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
                                                {currentKey as string}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
};
