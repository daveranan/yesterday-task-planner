import React, { useState } from 'react';
// import { AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskEntry, TaskGlobal } from '../store/types';
import { useStore } from '../store/useStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
    isActive?: boolean;
}

const Column: React.FC<ColumnProps> = ({ title, category, limit, tasks, allTasks, handleAddTask, toggleTask, deleteTask, handleEditTask, isActive }) => {
    const [localNewTaskTitle, setLocalNewTaskTitle] = useState('');

    const { setNodeRef, isOver } = useDroppable({
        id: category,
        data: { type: 'COLUMN', id: category }
    });

    // FIX: Filter out tasks that don't belong to this category
    // to get the count of tasks for this specific column.
    const visibleTasks = tasks.filter(t => {
        const globalTask = allTasks[t.taskId];

        // 1. Must check if global task exists
        if (!globalTask) return false;

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

    const setActiveColumn = useStore(state => state.setActiveColumn);
    const setHoveredNewTaskCategory = useStore(state => state.setHoveredNewTaskCategory);

    return (
        <div
            ref={setNodeRef}
            onMouseEnter={() => setActiveColumn(category)}
            className={cn(
                "flex-1 min-w-[200px] flex flex-col h-full rounded-xl border-dashed transition-all duration-150",
                isActive ? "border-primary/50" : "border-border",
                isOver
                    ? "bg-muted/50 border-2 shadow-lg ring-1 ring-primary/20"
                    : "bg-muted/20 border-2"
            )}
        >
            <div className="p-2 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                <span className="text-xs text-muted-foreground">
                    {visibleTasks.length} {limit ? `| ${limit} max` : ''}
                </span>
            </div>

            <div className="p-2 flex-1 overflow-y-auto scrollbar-style flex flex-col gap-1.5">
                <SortableContext
                    items={visibleTasks.map(t => t.taskId)}
                    strategy={verticalListSortingStrategy}
                >
                    {/* Only map over visible (incomplete and correctly categorized) tasks */}
                    {visibleTasks.map((task, index) =>
                        <TaskItem
                            key={task.taskId} // Use taskId as key for consistency
                            index={index}
                            task={task}
                            allTasks={allTasks}
                            toggleTask={toggleTask}
                            deleteTask={deleteTask}
                            handleEditTask={handleEditTask}
                        />)}
                </SortableContext>

                {/* Inline Add Task Input */}
                <div className="mt-2 flex gap-2">
                    <Input
                        id={`new-task-input-${category}`}
                        type="text"
                        placeholder={isLimitReached ? `Limit Reached (${limit})` : "+ Add item"}
                        className={cn(
                            "w-full h-8 text-sm px-2 py-1 bg-background border-border",
                            "focus-visible:ring-1 focus-visible:ring-ring",
                            isLimitReached && "text-muted-foreground cursor-not-allowed"
                        )}
                        value={localNewTaskTitle}
                        onChange={(e) => setLocalNewTaskTitle(e.target.value)}
                        onMouseEnter={() => setHoveredNewTaskCategory(category)}
                        onMouseLeave={() => setHoveredNewTaskCategory(null)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addNewTask();
                            }
                        }}
                        disabled={isLimitReached}
                    />
                </div>
            </div>
        </div>
    );
};

export default Column;
