import React, { useState, useEffect } from 'react';
// import { AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DayData, TaskGlobal, TaskEntry, ScheduleSettings } from '../store/types';
import { useStore } from '../store/useStore';

interface TimeSlotProps {
    slotId: string;
    displayTime: string;
    isBlockStart: boolean;
    currentTimePercentage: number | null;
    slotTasks: TaskEntry[];
    allTasks: Record<string, TaskGlobal>;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (taskId: string, newTitle: string) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onDoubleClick: () => void;
}

// Helper component for a single droppable time slot
const TimeSlot: React.FC<TimeSlotProps> = ({
    slotId,
    displayTime,
    isBlockStart,
    currentTimePercentage,
    slotTasks,
    allTasks,
    onToggleTask,
    onDeleteTask,
    onEditTask,
    onMouseEnter,
    onMouseLeave,
    onDoubleClick
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: slotId,
    });

    // Sort tasks: completed tasks first, unfinished tasks at bottom
    const sortedSlotTasks = [...slotTasks].sort((a, b) => {
        const taskA = allTasks[a.taskId];
        const taskB = allTasks[b.taskId];

        if (!taskA || !taskB) return 0;

        // Completed tasks first (unfinished at bottom)
        if (taskA.completed !== taskB.completed) {
            return taskA.completed ? -1 : 1;
        }
        return 0; // Maintain original order for same completion status
    });

    return (
        <div
            ref={setNodeRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            className={`flex border-b border-neutral-200 dark:border-neutral-800 min-h-[32px] flex-1 relative
                ${isBlockStart ? 'border-t-4 border-t-neutral-200 dark:border-t-neutral-800' : ''}
            `}
        >
            {/* Red Current Time Line */}
            {
                currentTimePercentage !== null && (
                    <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${currentTimePercentage}%` }}
                    >
                        <div className="w-full h-[2px] bg-red-500 shadow-sm relative">
                            <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                    </div>
                )
            }

            <div className="w-16 p-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex-shrink-0">
                {displayTime}
            </div>
            <div className={`flex-1 min-w-0 p-1.5 relative transition-colors duration-150 flex flex-col gap-1.5
                ${isOver
                    ? 'bg-neutral-200 dark:bg-neutral-800 ring-2 ring-inset ring-neutral-400 dark:ring-neutral-500' // Use ring-inset to avoid layout shift
                    : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
            >
                <SortableContext
                    items={sortedSlotTasks.map(t => t.taskId)}
                    strategy={verticalListSortingStrategy}
                >
                    {sortedSlotTasks.map(task =>
                        <TaskItem
                            key={task.taskId}
                            task={task}
                            toggleTask={onToggleTask}
                            deleteTask={onDeleteTask}
                            handleEditTask={onEditTask}
                        />)}
                </SortableContext>
            </div>
        </div >
    );
};

interface TimelineProps {
    currentDayData: DayData;
    allTasks: Record<string, TaskGlobal>;
    isToday: boolean;
    config: ScheduleSettings;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (taskId: string, newTitle: string) => void;
    onOverrideClick: () => void;
    isActive?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
    currentDayData,
    allTasks,
    isToday,
    config,
    onToggleTask,
    onDeleteTask,
    onEditTask,
    onOverrideClick,
    isActive
}) => {
    const [now, setNow] = useState(new Date());
    const addTaskToSlot = useStore(state => state.addTaskToSlot);
    const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'n' || e.key === 'N') {
                const activeTag = document.activeElement?.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea') return;

                if (hoveredSlotId) {
                    e.preventDefault();
                    addTaskToSlot(hoveredSlotId);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hoveredSlotId, addTaskToSlot]);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return (
        <div className={`flex-[2] bg-white dark:bg-neutral-900 rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-150 border-2
            ${isActive
                ? 'border-neutral-500 dark:border-neutral-400'
                : 'border-neutral-200 dark:border-neutral-800'}
        `}>
            <div className="p-1.5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-100 dark:bg-neutral-800/50">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Work Blocks</h3>
                <div className="flex items-center gap-2">
                    {isToday && (() => {
                        const endOfDay = new Date(now);
                        endOfDay.setHours(config.endHour, 0, 0, 0);
                        const diff = endOfDay.getTime() - now.getTime();

                        if (diff <= 0) {
                            return <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">see you out there space cowboy</span>;
                        }

                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        const formatted = `${hours}h ${minutes}m ${seconds}s`;

                        return (
                            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
                                {formatted}
                            </span>
                        );
                    })()}
                    <button
                        className="text-xs px-2 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
                        onClick={onOverrideClick}
                    >
                        Override
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-style w-full">
                <div className="relative w-full min-h-full flex flex-col">


                    {/* Time Slots */}
                    {Array.from({ length: config.endHour - config.startHour + 1 }, (_, i) => config.startHour + i).map((hour) => {
                        const slotId = `${hour}:00`;
                        const displayTime = hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`;
                        const isLunch = hour === config.skipHour;

                        // Use itemDurationMinutes to determine blocks (default 60 mins -> 1 hour)
                        // This logic handles blocks of X hours.
                        // We check if the current hour is a multiple of the block duration relative to start hour.
                        const durationMinutes = config.itemDurationMinutes ?? 120;
                        const durationHours = durationMinutes / 60;
                        const isBlockStart = durationHours > 0 && ((hour - config.startHour) % durationHours === 0) && !isLunch;

                        const slotTasks = currentDayData.taskEntries.filter(t =>
                            t.category === 'scheduled' && t.slotId === slotId
                        );

                        const isCurrentHour = isToday && hour === currentHour;
                        const validPercentage = isCurrentHour ? (currentMin / 60) * 100 : null;

                        if (isLunch) {
                            return (
                                <div
                                    key={hour}
                                    className="flex border-b border-neutral-200 dark:border-neutral-800 min-h-[24px] flex-[0.24] bg-neutral-100 dark:bg-neutral-950/50 relative"
                                >
                                    {/* Red Current Time Line for Lunch */}
                                    {validPercentage !== null && (
                                        <div
                                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                                            style={{ top: `${validPercentage}%` }}
                                        >
                                            <div className="w-full h-[2px] bg-red-500 shadow-sm relative">
                                                <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="w-16 p-1 text-right text-xs font-medium text-neutral-400 dark:text-neutral-500 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-end">
                                        {displayTime}
                                    </div>
                                    <div className="flex-1 p-1 flex items-center justify-center text-neutral-400 dark:text-neutral-600 font-medium tracking-wide uppercase text-xs">
                                        Lunch Break
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <TimeSlot
                                key={hour}
                                slotId={slotId}
                                displayTime={displayTime}
                                isBlockStart={isBlockStart}
                                currentTimePercentage={validPercentage}
                                slotTasks={slotTasks}
                                allTasks={allTasks}
                                onToggleTask={onToggleTask}
                                onDeleteTask={onDeleteTask}
                                onEditTask={onEditTask}
                                onMouseEnter={() => setHoveredSlotId(slotId)}
                                onMouseLeave={() => setHoveredSlotId(null)}
                                onDoubleClick={() => addTaskToSlot(slotId)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
