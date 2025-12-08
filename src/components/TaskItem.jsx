import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

const TaskItem = ({ task, allTasks, toggleTask, deleteTask, handleDragStart, handleEditTask }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Get the original task data from the global store
    const originalTask = allTasks[task.taskId];
    const [localTitle, setLocalTitle] = useState(originalTask ? originalTask.title : '');

    const inputRef = useRef(null);

    const isCompleted = originalTask ? originalTask.completed : false;

    useEffect(() => {
        if (isEditing) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    // Sync local title with global state if it changes externally
    useEffect(() => {
        if (originalTask && localTitle !== originalTask.title) {
            setLocalTitle(originalTask.title);
        }
    }, [originalTask?.title]);


    const saveEdit = () => {
        const trimmedTitle = localTitle.trim();
        if (trimmedTitle && trimmedTitle !== (originalTask ? originalTask.title : '')) {
            handleEditTask(task.taskId, trimmedTitle);
        }
        // Reset local state in case the new title was invalid or the same
        setLocalTitle(originalTask ? originalTask.title : task.title);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
        if (e.key === 'Escape') {
            setLocalTitle(originalTask ? originalTask.title : task.title);
            setIsEditing(false);
        }
    };

    if (!originalTask) return null; // Defensive check for missing task data

    return (
        <div
            draggable
            onDragStart={(e) => {
                // Drag using the unique taskId
                handleDragStart(e, task.taskId);
                e.currentTarget.classList.add('opacity-50', 'shadow-xl');
            }}
            onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-50', 'shadow-xl');
            }}
            /* USE NEUTRAL: Task item background/border */
            className="group flex items-center gap-2 bg-neutral-800 p-2 rounded border border-neutral-700 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:border-neutral-600 transition-colors"
        >
            {/* USE NEUTRAL: Icons and text colors adjusted for deeper contrast against neutral-800 */}
            {/* Toggle uses the unique taskId to update the global task object */}
            <button onClick={() => toggleTask(task.taskId)} className="text-neutral-400 hover:text-neutral-300">
                {isCompleted ? <Icon name="CheckSquare" className="w-5 h-5 text-neutral-400" /> : <Icon name="Square" className="w-5 h-5 text-neutral-400" />}
            </button>

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm p-0 bg-neutral-700 border border-neutral-600 rounded focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500 focus:outline-none text-neutral-100"
                />
            ) : (
                // Display the title from the global task object
                <span
                    className={`flex-1 text-sm cursor-text ${isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'}`}
                    onDoubleClick={() => {
                        if (!isCompleted) setIsEditing(true);
                    }}
                >
                    {originalTask.title}
                </span>
            )}

            {task.rolledOverFrom && (
                <span
                    className="text-xs text-yellow-500 font-semibold italic bg-neutral-700 px-2 py-0.5 rounded-full whitespace-nowrap"
                    title={`Originally created on ${task.rolledOverFrom}`}
                >
                    <Icon name="Rollover" className="w-3 h-3 inline mr-1" />
                    Rolled Over
                </span>
            )}

            {/* Delete uses the unique taskId to update the global task object and the day list */}
            <button onClick={() => deleteTask(task.taskId)} className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-colors">
                <Icon name="Trash2" className="w-4 h-4" />
            </button>
        </div>
    );
};

export default TaskItem;
