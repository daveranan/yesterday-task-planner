import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Icon } from '../Icon';
import { SHORTCUT_DESCRIPTIONS } from '../../constants/shortcuts';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsModalProps {
    onClose: () => void;
}

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
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Icon name="Settings" className="w-5 h-5" />
                        Settings
                    </DialogTitle>
                    <DialogDescription>
                        Manage your preferences and keyboard shortcuts.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b bg-muted/20">
                        <TabsList>
                            <TabsTrigger value="general" className="gap-2">
                                <Icon name="Sliders" className="w-4 h-4" />
                                General
                            </TabsTrigger>
                            <TabsTrigger value="shortcuts" className="gap-2">
                                <Icon name="Keyboard" className="w-4 h-4" />
                                Shortcuts
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <TabsContent value="general" className="p-6 m-0 space-y-8">
                            {/* Appearance Section */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance & Behavior</h4>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name={settings.isDarkMode ? "Moon" : "Sun"} className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Dark Mode</div>
                                            <div className="text-xs text-muted-foreground">Toggle application theme</div>
                                        </div>
                                    </div>
                                    <Switch checked={settings.isDarkMode} onCheckedChange={toggleTheme} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name={settings.soundEnabled ? "Volume2" : "VolumeX"} className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Sound Effects</div>
                                            <div className="text-xs text-muted-foreground">Play sounds on interactions</div>
                                        </div>
                                    </div>
                                    <Switch checked={settings.soundEnabled} onCheckedChange={toggleSound} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name="BookOpen" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Reflections</div>
                                            <div className="text-xs text-muted-foreground">Show daily reflection section</div>
                                        </div>
                                    </div>
                                    <Switch checked={settings.showReflection} onCheckedChange={toggleReflection} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name="Heart" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Gratefulness</div>
                                            <div className="text-xs text-muted-foreground">Show daily gratefulness section</div>
                                        </div>
                                    </div>
                                    <Switch checked={settings.showGratefulness} onCheckedChange={toggleGratefulness} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name="Power" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Run on Startup</div>
                                            <div className="text-xs text-muted-foreground">Automatically start app when you log in</div>
                                        </div>
                                    </div>
                                    <Switch checked={runOnStartup} onCheckedChange={toggleStartup} />
                                </div>
                            </section>

                            {/* Data Section */}
                            <section className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Management</h4>

                                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Icon name="HardDrive" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Save File Location</div>
                                            <div className="text-xs text-muted-foreground">
                                                Path where your data is stored. Changing this will save data to the new location immediately.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={tempSavePath}
                                            onChange={(e) => setTempSavePath(e.target.value)}
                                            placeholder="Default (Home Directory)"
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleSavePathChange}
                                            disabled={tempSavePath === (settings.savePath || '')}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </TabsContent>

                        <TabsContent value="shortcuts" className="p-6 m-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(settings.shortcuts).map(([actionId, currentKey]) => (
                                    <div key={actionId} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                                        <span className="font-medium">
                                            {SHORTCUT_DESCRIPTIONS[actionId] || actionId}
                                        </span>

                                        {recordingAction === actionId ? (
                                            <div className="relative">
                                                <Input
                                                    autoFocus
                                                    readOnly
                                                    className="w-32 px-3 h-8 text-center text-primary border-primary ring-1 ring-primary animate-pulse cursor-pointer"
                                                    value="Press keys..."
                                                    onKeyDown={(e) => handleKeyDown(e, actionId)}
                                                    onBlur={() => setRecordingAction(null)}
                                                />
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setRecordingAction(actionId)}
                                                className="w-32 h-8 font-mono text-xs"
                                                title="Click to remap"
                                            >
                                                {currentKey as string}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
