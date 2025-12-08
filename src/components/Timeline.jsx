import React, { useState, useEffect, useMemo } from 'react';
import TaskItem from './TaskItem';

const Timeline = ({
    currentDayData,
    allTasks,
    isToday,
    config,
    onDrop,
    onDragStart,
    onToggleTask,
    onDeleteTask,
    onEditTask
}) => {
    const [currentTimePercentage, setCurrentTimePercentage] = useState(-1);
    const [hoveredSlotId, setHoveredSlotId] = useState(null);

    // --- Time Logic ---
    const workWindowDurationMinutes = useMemo(() => {
        return (config.endHour - config.startHour + 1) * 60;
    }, [config]);

    useEffect(() => {
        const updateLinePosition = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();

            if (!isToday || currentHour < config.startHour || currentHour > config.endHour) {
                setCurrentTimePercentage(-1);
                return;
            }

            const elapsedMinutes = (currentHour - config.startHour) * 60 + currentMin;
            const position = (elapsedMinutes / workWindowDurationMinutes) * 100;
            setCurrentTimePercentage(Math.max(0, Math.min(100, position)));
        };

        updateLinePosition();
        const interval = setInterval(updateLinePosition, 60000);
        return () => clearInterval(interval);
    }, [isToday, workWindowDurationMinutes, config]);

    // Drag handlers
    const handleSlotDragEnter = (slotId) => (e) => {
        e.preventDefault();
        setHoveredSlotId(slotId);
    };
    const handleSlotDragLeave = (e) => {
        const targetElement = e.currentTarget;
        const relatedElement = e.relatedTarget;
        if (relatedElement && targetElement.contains(relatedElement)) return;
        setHoveredSlotId(null);
    };
    const handleSlotDrop = (slotId) => (e) => {
        onDrop(e, 'scheduled', slotId);
        setHoveredSlotId(null);
    };

    return (
        <div className="flex-[2] bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
                <h3 className="font-bold text-neutral-100">Work Blocks</h3>
                <span className="text-xs text-neutral-400">Skip 12 PM</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-style">
                <div className="relative">
                    {/* Red Current Time Line */}
                    {currentTimePercentage >= 0 && currentTimePercentage <= 100 && isToday && (
                        <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${currentTimePercentage}%` }}
                        >
                            <div className="w-full h-[2px] bg-red-500 shadow-sm relative">
                                <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                        </div>
                    )}

                    {/* Time Slots */}
                    {Array.from({ length: config.endHour - config.startHour + 1 }, (_, i) => config.startHour + i).map((hour) => {
                        const slotId = `${hour}:00`;
                        const displayTime = hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`;
                        const isLunch = hour === config.skipHour;
                        const isBlockStart = (hour === 10) || (hour === 13) || (hour === 15);

                        const slotTasks = currentDayData.taskEntries.filter(t =>
                            t.category === 'scheduled' && t.slotId === slotId
                        );

                        if (isLunch) {
                            return (
                                <div
                                    key={hour}
                                    className="flex border-b border-neutral-800 min-h-[60px] bg-neutral-950/50"
                                >
                                    <div className="w-16 p-3 text-right text-xs font-medium text-neutral-500 border-r border-neutral-800 bg-neutral-900/50 flex items-center justify-end">
                                        {displayTime}
                                    </div>
                                    <div className="flex-1 p-2 flex items-center justify-center text-neutral-600 font-medium tracking-wide uppercase text-xs">
                                        Lunch Break
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={hour}
                                className={`flex border-b border-neutral-800 min-h-[80px]
                                    ${isBlockStart ? 'border-t-4 border-t-neutral-800' : ''}
                                `}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={handleSlotDragEnter(slotId)}
                                onDragLeave={handleSlotDragLeave}
                                onDrop={handleSlotDrop(slotId)}
                            >
                                <div className="w-16 p-3 text-right text-xs font-medium text-neutral-400 border-r border-neutral-800 bg-neutral-800/50">
                                    {displayTime}
                                </div>
                                <div className={`flex-1 p-2 relative transition-colors duration-150 
                                    ${hoveredSlotId === slotId
                                        ? 'bg-neutral-800 border-4 border-neutral-600'
                                        : 'bg-neutral-900 hover:bg-neutral-800/50'
                                    }`}
                                >
                                    {slotTasks.map(task =>
                                        <TaskItem
                                            key={task.taskId}
                                            task={task}
                                            allTasks={allTasks}
                                            toggleTask={onToggleTask}
                                            deleteTask={onDeleteTask}
                                            handleDragStart={onDragStart}
                                            handleEditTask={onEditTask}
                                        />)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
