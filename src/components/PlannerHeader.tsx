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
}

const PlannerHeader: React.FC<PlannerHeaderProps> = ({
    currentDate,
    setCurrentDate,
    onDateChange,
    onJumpToToday,
    isToday,
    incompleteCount,
    onOpenSettings
}) => {
    return (
        <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6 shadow-sm z-20">
            <div className="flex items-center gap-4">
                <h1 className="flex items-center gap-2">
                    <img src="assets/img/favicon.png" alt="Icon" className="w-8 h-8" />
                    <img src="assets/img/Yesterday_logo.svg" alt="Yesterday" className="h-8" />
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
            <div className="flex items-center gap-4">
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
            </div>
        </div>
    );
};

export default PlannerHeader;
