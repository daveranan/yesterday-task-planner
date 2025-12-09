import React from 'react';
import { Icon } from './Icon';

interface PlannerHeaderProps {
    currentDate: string;
    setCurrentDate: (date: string) => void;
    onDateChange: (offset: number) => void;
    onJumpToToday: () => void;
    isToday: boolean;
    isDarkMode: boolean;
    onToggleTheme: () => void;
    incompleteCount: number;
}

const PlannerHeader: React.FC<PlannerHeaderProps> = ({
    currentDate,
    setCurrentDate,
    onDateChange,
    onJumpToToday,
    isToday,
    isDarkMode,
    onToggleTheme,
    incompleteCount
}) => {
    return (
        <div className="h-16 bg-neutral-900 dark:bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 shadow-xl z-20">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                    <Icon name="Calendar" className="w-5 h-5 text-neutral-500" />
                    Daily Planner
                </h1>
                <div className="flex items-center bg-neutral-800 rounded-lg p-1">
                    <button onClick={() => onDateChange(-1)} className="p-1 hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronLeft" className="w-4 h-4 text-neutral-200" /></button>
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium px-4 py-1 focus:ring-0 cursor-pointer text-neutral-200"
                    />
                    <button onClick={() => onDateChange(1)} className="p-1 hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronRight" className="w-4 h-4 text-neutral-200" /></button>
                </div>
                <button
                    onClick={onJumpToToday}
                    disabled={isToday}
                    className={`
                        flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg shadow-md transition-colors
                        ${isToday
                            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                    title="Jump to Today"
                >
                    <Icon name="Target" className="w-4 h-4" />
                    Today
                </button>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    <Icon name={isDarkMode ? "Sun" : "Moon"} className="w-5 h-5" />
                </button>
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                    {isToday ? 'Today' : 'Viewing Past/Future Day'}
                    <span className="ml-2 px-2 py-1 bg-neutral-950 text-neutral-300 rounded-full text-xs">
                        {incompleteCount} incomplete tasks
                    </span>
                </span>
            </div>
        </div>
    );
};

export default PlannerHeader;
