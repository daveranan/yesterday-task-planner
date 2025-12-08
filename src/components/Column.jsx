import React, { useState } from 'react';
import TaskItem from './TaskItem';

const Column = ({ title, category, limit, tasks, allTasks, handleAddTask, handleDrop, handleDragStart, toggleTask, deleteTask, handleEditTask }) => {
    const [localNewTaskTitle, setLocalNewTaskTitle] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    // FIX: Filter out tasks that are completed AND/OR don't belong to this category 
    // to get the count of INCOMPLETE tasks for this specific column.
    const visibleTasks = tasks.filter(t => {
        const globalTask = allTasks[t.taskId];
        // CRITICAL FIX: Ensure the task belongs to this category AND is incomplete.
        // Uses GLOBAL category if available (fixing sync issues), falls back to entry data.
        const categoryMatch = (globalTask?.category || t.category) === category;
        return globalTask && !globalTask.completed && categoryMatch;
    });

    const isLimitReached = limit && visibleTasks.length >= limit;

    const addNewTask = () => {
        if (!localNewTaskTitle.trim()) return;
        // handleAddTask performs the limit check using the correct filtering logic
        handleAddTask(category, localNewTaskTitle.trim());
        setLocalNewTaskTitle('');
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        const targetElement = e.currentTarget;
        const relatedElement = e.relatedTarget;
        if (relatedElement && targetElement.contains(relatedElement)) return;
        setIsDragOver(false);
    };

    const handleColumnDrop = (e) => {
        setIsDragOver(false);
        handleDrop(e, category);
    };

    return (
        <div
            className={`flex-1 min-w-[200px] flex flex-col h-full rounded-xl border-dashed transition-all duration-150
                ${isDragOver
                    /* USE NEUTRAL: Darker drag over feedback */
                    ? 'bg-neutral-800 border-neutral-600 border-4 shadow-lg'
                    /* USE NEUTRAL: Set default column background to neutral-900 (from parent) and darker border */
                    : 'bg-neutral-50/50 border-neutral-200 border-2 dark:bg-neutral-900/50 dark:border-neutral-800'
                }`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleColumnDrop}
        >
            {/* USE NEUTRAL: Darken header border */}
            <div className="p-3 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="font-semibold text-neutral-700 dark:text-neutral-100 text-sm">{title}</h3>
                <span className="text-xs text-neutral-400">{limit} max</span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto scrollbar-style">
                {/* Only map over visible (incomplete and correctly categorized) tasks */}
                {visibleTasks.map(task =>
                    <TaskItem
                        key={task.taskId} // Use taskId as key for consistency
                        task={task}
                        allTasks={allTasks}
                        toggleTask={toggleTask}
                        deleteTask={deleteTask}
                        handleDragStart={handleDragStart}
                        handleEditTask={handleEditTask}
                    />)}

                {/* Inline Add Task Input */}
                <div className="mt-2 flex gap-2">
                    <input
                        type="text"
                        placeholder={isLimitReached ? `Limit Reached (${limit})` : "+ Add item"}
                        disabled={isLimitReached}
                        className={`
                            w-full text-sm px-2 py-1 
                            /* USE NEUTRAL: Input background to neutral-800, border to neutral-700 */
                            bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-700 dark:border-neutral-700 
                            focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-600 focus:ring-neutral-600 focus:ring-1 
                            rounded-t-md transition-all duration-150 focus:outline-none
                            placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-800 dark:text-neutral-100
                            ${isLimitReached ? 'text-neutral-400 cursor-not-allowed' : ''}
                        `}
                        value={localNewTaskTitle}
                        onChange={(e) => setLocalNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addNewTask();
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Column;
