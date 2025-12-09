import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useSortable } from '@dnd-kit/sortable';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import { TaskEntry, TaskGlobal } from '../store/types';
import { useStore } from '../store/useStore';

interface TaskItemBaseProps {
    task: TaskEntry;
    allTasks: Record<string, TaskGlobal>;
    toggleTask: (taskId: string) => void;
    deleteTask: (taskId: string) => void;
    handleEditTask: (taskId: string, newTitle: string) => void;
    hoveredTaskId: string | null;
    grabbedTaskId: string | null;
    editingTaskId: string | null;
    setHoveredTaskId: (id: string | null) => void;
    setNodeRef: (element: HTMLElement | null) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isDragging?: boolean;
    isOverlay?: boolean;
    isSelected?: boolean;
}

// The UI Component (Pure, no DnD hooks yourself, but accepts refs/styles)
export const TaskItemBase: React.FC<TaskItemBaseProps> = ({
    task,
    allTasks,
    toggleTask,
    deleteTask,
    handleEditTask,
    hoveredTaskId,
    setHoveredTaskId,
    grabbedTaskId,
    editingTaskId,
    // DnD props
    setNodeRef,
    style,
    attributes,
    listeners,
    isDragging,
    isOverlay, // Helper to styling
    isSelected
}) => {
    const [localIsEditing, setLocalIsEditing] = useState(false);
    // Combine local click edit and global shortcut edit
    const isEditing = localIsEditing || editingTaskId === task.taskId;
    const setStoreEditing = useStore(state => state.setEditingTaskId);

    // Derived state: Is this task being manipulated? (Hovered but not dragging)
    const isManipulated = hoveredTaskId === task.taskId && !isDragging;
    const isGrabbed = grabbedTaskId === task.taskId;

    // Get the original task data from the global store
    const originalTask = allTasks[task.taskId];
    const [localTitle, setLocalTitle] = useState(originalTask ? originalTask.title : '');

    const inputRef = useRef<HTMLInputElement>(null);

    const isCompleted = originalTask ? originalTask.completed : false;

    useEffect(() => {
        if (isEditing) {
            // If triggered by store, we might need a tick
            setTimeout(() => inputRef.current?.focus(), 10);
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
        // Reset local state
        setLocalTitle(originalTask ? originalTask.title : '');
        setLocalIsEditing(false);
        if (editingTaskId === task.taskId) setStoreEditing(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Prevent dnd-kit from interpreting Space/Enter as drag signals
        e.stopPropagation();

        if (e.key === 'Enter') {
            saveEdit();
        }
        if (e.key === 'Escape') {
            setLocalTitle(originalTask ? originalTask.title : '');
            setLocalIsEditing(false);
            if (editingTaskId === task.taskId) setStoreEditing(null);
        }
    };

    if (!originalTask) return null; // Defensive check for missing task data

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                /* NOTE: Do NOT apply style (transform) here. We want the placeholder to stay in the list. */
                className="bg-white dark:bg-neutral-800 p-2 rounded border border-neutral-200 dark:border-neutral-600 opacity-50 shadow-xl h-[42px]"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onMouseEnter={() => setHoveredTaskId(task.taskId)}
            onMouseLeave={() => setHoveredTaskId(null)}
            /* USE NEUTRAL: Task item background/border */
            className={`group flex items-center gap-2 bg-white dark:bg-neutral-800 p-2 rounded border shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-500 dark:hover:border-neutral-400 transition-all duration-200 touch-none 
                ${(isOverlay || isGrabbed) ? 'opacity-90 rotate-2 scale-105 shadow-xl' : ''}
                ${isSelected || (isManipulated && !isSelected)
                    ? 'border-neutral-500 dark:border-neutral-400 relative z-10'
                    : 'border-neutral-200 dark:border-neutral-700'}
            `}
        >
            {/* USE NEUTRAL: Icons and text colors adjusted for deeper contrast against neutral-800 */}
            <button
                id={`checkbox-${task.taskId}`}
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking checkbox
                onClick={(e) => {
                    if (!isCompleted) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const x = (rect.left + rect.width / 2) / window.innerWidth;
                        const y = (rect.top + rect.height / 2) / window.innerHeight;

                        confetti({
                            particleCount: 50,
                            spread: 60,
                            origin: { x, y }
                        });
                    }
                    toggleTask(task.taskId);
                }}
                className="text-neutral-400 hover:text-neutral-300"
            >
                {isCompleted ? <Icon name="CheckSquare" className="w-5 h-5 text-neutral-400" /> : <Icon name="Square" className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />}
            </button>

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm p-0 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-neutral-400 focus:border-neutral-500 focus:outline-none text-neutral-900 dark:text-neutral-100"
                />
            ) : (
                // Display the title from the global task object
                <span
                    className={`flex-1 text-sm cursor-text ${isCompleted ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}
                    onDoubleClick={() => {
                        if (!isCompleted) setLocalIsEditing(true);
                    }}
                >
                    {originalTask.title}
                </span>
            )}

            {task.rolledOverFrom && (
                <span
                    className="text-xs text-yellow-600 dark:text-yellow-500 font-semibold italic bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded-full whitespace-nowrap"
                    title={`Originally created on ${task.rolledOverFrom}`}
                >
                    <Icon name="Rollover" className="w-3 h-3 inline mr-1" />
                    Rolled Over
                </span>
            )}

            <button
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag
                onClick={() => deleteTask(task.taskId)}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-colors"
                aria-label="Delete Task"
            >
                <Icon name="Trash2" className="w-4 h-4" />
            </button>
        </div>
    );
};

interface TaskItemSpecificProps {
    task: TaskEntry;
    allTasks: Record<string, TaskGlobal>;
    toggleTask: (taskId: string) => void;
    deleteTask: (taskId: string) => void;
    handleEditTask: (taskId: string, newTitle: string) => void;
}

// The Sortable Wrapper (Default)
const TaskItem: React.FC<TaskItemSpecificProps> = (props) => {
    // We need to access selectedTaskId here to pass to Base
    const selectedTaskId = useStore(state => state.selectedTaskId);
    const hoveredTaskId = useStore(state => state.hoveredTaskId);
    const setHoveredTaskId = useStore(state => state.setHoveredTaskId);
    const grabbedTaskId = useStore(state => state.grabbedTaskId);
    const editingTaskId = useStore(state => state.editingTaskId);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: props.task.taskId,
        data: { type: 'TASK', task: props.task }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TaskItemBase
            {...props}
            setNodeRef={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
            isDragging={isDragging}
            isSelected={selectedTaskId === props.task.taskId}
            hoveredTaskId={hoveredTaskId}
            setHoveredTaskId={setHoveredTaskId}
            grabbedTaskId={grabbedTaskId}
            editingTaskId={editingTaskId}
        />
    );
};

// The Draggable Wrapper (For Timeline)
export const DraggableTaskItem: React.FC<TaskItemSpecificProps> = (props) => {
    const selectedTaskId = useStore(state => state.selectedTaskId);
    const hoveredTaskId = useStore(state => state.hoveredTaskId);
    const setHoveredTaskId = useStore(state => state.setHoveredTaskId);
    const grabbedTaskId = useStore(state => state.grabbedTaskId);
    const editingTaskId = useStore(state => state.editingTaskId);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: props.task.taskId,
        data: { type: 'TASK', task: props.task }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <TaskItemBase
            {...props}
            setNodeRef={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
            isDragging={isDragging}
            isSelected={selectedTaskId === props.task.taskId}
            hoveredTaskId={hoveredTaskId}
            setHoveredTaskId={setHoveredTaskId}
            grabbedTaskId={grabbedTaskId}
            editingTaskId={editingTaskId}
        />
    );
};

export default TaskItem;
