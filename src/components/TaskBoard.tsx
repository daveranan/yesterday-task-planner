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
    onUpdateDayData
}) => {
    // To maintain existing layout, we need:
    // Row 1: Must-Do, Communications
    // Row 2: To-Do
    // Row 3: Journal Section

    return (
        <div className="flex-[3] flex flex-col gap-6">
            <div className="flex-[2] flex gap-6 min-h-0">
                <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden">
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
                    />
                </div>
                <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden">
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
                    />
                </div>
            </div>

            <div className="flex-[3] bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden min-h-0">
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
                />
            </div>

            <JournalSection
                gratefulness={currentDayData.gratefulness || ''}
                reflections={currentDayData.reflections || ''}
                onUpdate={onUpdateDayData}
            />
        </div>
    );
};

export default TaskBoard;
