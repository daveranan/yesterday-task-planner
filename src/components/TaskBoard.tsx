import React from 'react';
import Column from './Column';
import JournalSection from './JournalSection';
import { DayData, TaskGlobal } from '../store/types';

interface TaskBoardProps {
    categories?: any; // unused in implementation
    currentDayData: DayData;
    allTasks: Record<string, TaskGlobal>;
    configLimits: Record<string, number>;
    onAddTask: (category: string, title: string) => void;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (taskId: string, newTitle: string) => void;

    onUpdateDayData: (updates: Partial<DayData>) => void;
    showGratefulness: boolean;
    showReflection: boolean;
    activeColumnId: string | null;
}

const TaskBoard: React.FC<TaskBoardProps> = ({
    // categories, // Object containing { id, title, limit, data } or similar map -> Unused

    currentDayData,
    allTasks,
    configLimits,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onEditTask,

    onUpdateDayData,
    showGratefulness,
    showReflection,
    activeColumnId
}) => {
    // To maintain existing layout, we need:
    // Row 1: Must-Do, Communications
    // Row 2: To-Do
    // Row 3: Journal Section

    return (
        <div className="flex-[3] flex flex-col gap-2">
            <div className="flex-[2] flex gap-2 min-h-0">
                <div className="flex-1 bg-white dark:bg-muted/10 rounded-xl shadow-lg border border-border overflow-hidden">
                    <Column
                        title="Must-Do's"
                        category="must-do"
                        limit={configLimits['must-do']}
                        tasks={currentDayData.taskEntries}
                        allTasks={allTasks}
                        handleAddTask={onAddTask}
                        toggleTask={onToggleTask}
                        deleteTask={onDeleteTask}
                        handleEditTask={onEditTask}
                        isActive={activeColumnId === 'must-do'}
                    />
                </div>
                <div className="flex-1 bg-white dark:bg-muted/10 rounded-xl shadow-lg border border-border overflow-hidden">
                    <Column
                        title="Communications"
                        category="communications"
                        limit={configLimits['communications']}
                        tasks={currentDayData.taskEntries}
                        allTasks={allTasks}
                        handleAddTask={onAddTask}
                        toggleTask={onToggleTask}
                        deleteTask={onDeleteTask}
                        handleEditTask={onEditTask}
                        isActive={activeColumnId === 'communications'}
                    />
                </div>
            </div>

            <div className="flex-[3] bg-white dark:bg-muted/10 rounded-xl shadow-lg border border-border overflow-hidden min-h-0">
                <Column
                    title="To-Do's"
                    category="todo"
                    limit={configLimits['todo']}
                    tasks={currentDayData.taskEntries}
                    allTasks={allTasks}
                    handleAddTask={onAddTask}
                    toggleTask={onToggleTask}
                    deleteTask={onDeleteTask}
                    handleEditTask={onEditTask}
                    isActive={activeColumnId === 'todo'}
                />
            </div>

            <JournalSection
                gratefulness={currentDayData.gratefulness || ''}
                reflections={currentDayData.reflections || ''}
                onUpdate={onUpdateDayData}
                showGratefulness={showGratefulness}
                showReflection={showReflection}
            />
        </div>
    );
};

export default TaskBoard;
