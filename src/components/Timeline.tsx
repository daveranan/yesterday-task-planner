import React, { useState, useEffect } from 'react';
import TaskItem from './TaskItem';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DayData, TaskGlobal, TaskEntry } from '../store/types';
import { CONFIG } from '../constants/config';

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
    onEditTask
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: slotId,
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex border-b border-neutral-200 dark:border-neutral-800 min-h-[50px] flex-1 relative
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

            <div className="w-16 p-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex-shrink-0">
                {displayTime}
            </div>
            <div className={`flex-1 min-w-0 p-2 relative transition-colors duration-150 flex flex-col gap-2
                ${isOver
                    ? 'bg-neutral-200 dark:bg-neutral-800 ring-2 ring-inset ring-neutral-400 dark:ring-neutral-500' // Use ring-inset to avoid layout shift
                    : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
            >
                <SortableContext
                    items={slotTasks.map(t => t.taskId)}
                    strategy={verticalListSortingStrategy}
                >
                    {slotTasks.map(task =>
                        <TaskItem
                            key={task.taskId}
                            task={task}
                            allTasks={allTasks}
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
    config: typeof CONFIG;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (taskId: string, newTitle: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({
    currentDayData,
    allTasks,
    isToday,
    config,
    onToggleTask,
    onDeleteTask,
    onEditTask
}) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return (
        <div className="flex-[2] bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-100 dark:bg-neutral-800/50">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Work Blocks</h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Skip 12 PM</span>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-style w-full">
                <div className="relative w-full min-h-full flex flex-col">


                    {/* Time Slots */}
                    {Array.from({ length: config.endHour - config.startHour + 1 }, (_, i) => config.startHour + i).map((hour) => {
                        const slotId = `${hour}:00`;
                        const displayTime = hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`;
                        const isLunch = hour === config.skipHour;
                        const isBlockStart = (hour === 10) || (hour === 13) || (hour === 15);

                        const slotTasks = currentDayData.taskEntries.filter(t =>
                            t.category === 'scheduled' && t.slotId === slotId
                        );

                        const isCurrentHour = isToday && hour === currentHour;
                        const validPercentage = isCurrentHour ? (currentMin / 60) * 100 : null;

                        if (isLunch) {
                            return (
                                <div
                                    key={hour}
                                    className="flex border-b border-neutral-200 dark:border-neutral-800 min-h-[50px] flex-1 bg-neutral-100 dark:bg-neutral-950/50 relative"
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

                                    <div className="w-16 p-3 text-right text-xs font-medium text-neutral-400 dark:text-neutral-500 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-end">
                                        {displayTime}
                                    </div>
                                    <div className="flex-1 p-2 flex items-center justify-center text-neutral-400 dark:text-neutral-600 font-medium tracking-wide uppercase text-xs">
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
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
