import React, { useState } from 'react';
import TaskItem from './TaskItem';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskEntry, TaskGlobal } from '../store/types';

interface ColumnProps {
    title: string;
    category: string;
    limit?: number;
    tasks: TaskEntry[];
    allTasks: Record<string, TaskGlobal>;
    handleAddTask: (category: string, title: string) => void;
    toggleTask: (taskId: string) => void;
    deleteTask: (taskId: string) => void;
    handleEditTask: (taskId: string, newTitle: string) => void;
}

const Column: React.FC<ColumnProps> = ({ title, category, limit, tasks, allTasks, handleAddTask, toggleTask, deleteTask, handleEditTask }) => {
    const [localNewTaskTitle, setLocalNewTaskTitle] = useState('');

    const { setNodeRef, isOver } = useDroppable({
        id: category,
    });

    // FIX: Filter out tasks that are completed AND/OR don't belong to this category 
    // to get the count of INCOMPLETE tasks for this specific column.
    const visibleTasks = tasks.filter(t => {
        const globalTask = allTasks[t.taskId];

        // 1. Must check if global task exists and is not completed
        if (!globalTask || globalTask.completed) return false;

        // 2. Hide if the local entry is scheduled on the timeline
        if (t.category === 'scheduled') return false;

        // 3. Match category: Use global category for the column match
        // (This ensures tasks return to their column if un-scheduled)
        return (globalTask.category || t.category) === category;
    });

    const isLimitReached = !!limit && visibleTasks.length >= limit;

    const addNewTask = () => {
        if (!localNewTaskTitle.trim()) return;
        // handleAddTask performs the limit check using the correct filtering logic
        handleAddTask(category, localNewTaskTitle.trim());
        setLocalNewTaskTitle('');
    };

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[200px] flex flex-col h-full rounded-xl border-dashed transition-all duration-150
                ${isOver
                    /* USE NEUTRAL: Darker drag over feedback */
                    ? 'bg-neutral-800 border-neutral-500 border-2 shadow-lg ring-1 ring-neutral-700'
                    /* USE NEUTRAL: Set default column background to neutral-900 (from parent) and darker border */
                    : 'bg-neutral-900/50 border-neutral-800 border-2'
                }`}
        >
            {/* USE NEUTRAL: Darken header border */}
            <div className="p-3 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="font-semibold text-neutral-100 text-sm">{title}</h3>
                <span className="text-xs text-neutral-400">{limit} max</span>
            </div>

            <div className="p-3 flex-1 overflow-y-auto scrollbar-style flex flex-col gap-2">
                <SortableContext
                    items={visibleTasks.map(t => t.taskId)}
                    strategy={verticalListSortingStrategy}
                >
                    {/* Only map over visible (incomplete and correctly categorized) tasks */}
                    {visibleTasks.map(task =>
                        <TaskItem
                            key={task.taskId} // Use taskId as key for consistency
                            task={task}
                            allTasks={allTasks}
                            toggleTask={toggleTask}
                            deleteTask={deleteTask}
                            handleEditTask={handleEditTask}
                        />)}
                </SortableContext>

                {/* Inline Add Task Input */}
                <div className="mt-2 flex gap-2">
                    <input
                        type="text"
                        placeholder={isLimitReached ? `Limit Reached (${limit})` : "+ Add item"}
                        disabled={isLimitReached}
                        className={`
                            w-full text-sm px-2 py-1 
                            /* USE NEUTRAL: Input background to neutral-800, border to neutral-700 */
                            bg-neutral-800 border-b border-neutral-700 
                            focus:bg-neutral-900 focus:border-neutral-600 focus:ring-neutral-600 focus:ring-1 
                            rounded-t-md transition-all duration-150 focus:outline-none
                            placeholder-neutral-500 text-neutral-100
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
