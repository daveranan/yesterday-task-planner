import React from 'react';
import { Icon } from './Icon';

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
        <div className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 shadow-xl z-20">
            <div className="flex items-center gap-4">
                <h1 className="flex items-center gap-2">
                    <img src="assets/img/favicon.png" alt="Icon" className="w-8 h-8" />
                    <img src="assets/img/Yesterday_logo.svg" alt="Yesterday" className="h-8" />
                </h1>
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                    <button onClick={() => onDateChange(-1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronLeft" className="w-4 h-4 text-neutral-600 dark:text-neutral-200" /></button>
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium px-4 py-1 focus:ring-0 cursor-pointer text-neutral-800 dark:text-neutral-200"
                    />
                    <button onClick={() => onDateChange(1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronRight" className="w-4 h-4 text-neutral-600 dark:text-neutral-200" /></button>
                </div>
                <button
                    onClick={onJumpToToday}
                    disabled={isToday}
                    className={`
                        flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg shadow-md transition-colors
                        ${isToday
                            ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                    title="Jump to Today"
                >
                    <Icon name="Target" className="w-4 h-4" />
                    Today
                </button>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span className="ml-2 px-2 py-1 bg-neutral-200 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 rounded-full text-xs">
                        {incompleteCount} incomplete tasks
                    </span>
                </span>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

                <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                    title="Settings"
                >
                    <Icon name="Settings" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default PlannerHeader;
