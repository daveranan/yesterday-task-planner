import React from 'react';
import { Icon } from './Icon';
import { Button } from '@/components/ui/button';

interface PlannerHeaderProps {
    currentDate: string;
    setCurrentDate: (date: string) => void;
    onDateChange: (offset: number) => void;
    onJumpToToday: () => void;
    isToday: boolean;
    incompleteCount: number;
    onOpenSettings: () => void;
    onToggleDrawer: () => void;
    isDrawerOpen: boolean;
}

const PlannerHeader: React.FC<PlannerHeaderProps> = ({
    currentDate,
    setCurrentDate,
    onDateChange,
    onJumpToToday,
    isToday,
    incompleteCount,
    onOpenSettings,
    onToggleDrawer,
    isDrawerOpen
}) => {
    const handleMinimize = () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('window-minimize');
        }
    };

    const handleMaximize = () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('window-maximize');
        }
    };

    const handleClose = () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('window-close');
        }
    };

    return (
        <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shadow-sm z-20 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleDrawer}
                    className={`h-8 w-8 ${isDrawerOpen ? 'bg-muted' : ''}`}
                    title="Drawer (Tab)"
                >
                    <Icon name="PanelLeft" className="w-5 h-5" />
                </Button>

                <h1 className="flex items-center gap-2">
                    <img src="assets/img/Yesterday_logo.svg" alt="Yesterday" className="h-6 invert dark:invert-0" />
                </h1>
                <div className="flex items-center bg-muted/50 rounded-lg p-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDateChange(-1)}
                        className="h-7 w-7"
                    >
                        <Icon name="ChevronLeft" className="w-4 h-4" />
                    </Button>
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium px-4 py-1 focus:ring-0 cursor-pointer text-foreground appearance-none"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDateChange(1)}
                        className="h-7 w-7"
                    >
                        <Icon name="ChevronRight" className="w-4 h-4" />
                    </Button>
                </div>
                <Button
                    variant={isToday ? "secondary" : "outline"}
                    size="sm"
                    onClick={onJumpToToday}
                    disabled={isToday}
                    className="gap-2"
                    title="Jump to Today"
                >
                    <Icon name="Target" className="w-4 h-4" />
                    Today
                </Button>
            </div>
            <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                        {incompleteCount} incomplete tasks
                    </span>
                </span>

                <div className="w-px h-6 bg-border mx-1"></div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenSettings}
                    className="rounded-full"
                    title="Settings"
                >
                    <Icon name="Settings" className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-1 ml-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMinimize}
                        className="h-8 w-8 hover:bg-muted"
                        title="Minimize"
                    >
                        <Icon name="Minus" className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMaximize}
                        className="h-8 w-8 hover:bg-muted"
                        title="Maximize"
                    >
                        <Icon name="Square" className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                        title="Close"
                    >
                        <Icon name="X" className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PlannerHeader;
