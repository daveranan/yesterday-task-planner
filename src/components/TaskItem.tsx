import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useSortable } from '@dnd-kit/sortable';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import { TaskEntry, TaskGlobal } from '../store/types';
import { useStore } from '../store/useStore';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    index?: number;
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
    isSelected,
    index
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

    // Scroll Into View Effect - Moved to top level safely
    useEffect(() => {
        if (isSelected || (isManipulated && !isSelected) || isGrabbed) {
            const element = document.getElementById(`task-${task.taskId}`);
            if (element) {
                // Use 'auto' for instant scrolling to prevent interruption issues during rapid navigation
                element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        }
    }, [isSelected, isManipulated, isGrabbed, task.taskId, index]);

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
            id={`task-${task.taskId}`}
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onMouseEnter={() => setHoveredTaskId(task.taskId)}
            onMouseLeave={() => setHoveredTaskId(null)}
            className={cn(
                "group flex items-center gap-2 bg-card p-3 rounded-lg border shadow-sm transition-all duration-200 touch-none",
                "hover:border-primary/50",
                (isOverlay || isGrabbed) && "opacity-90 rotate-2 scale-105 shadow-xl cursor-grabbing",
                !isOverlay && !isGrabbed && "cursor-grab active:cursor-grabbing",
                isSelected || (isManipulated && !isSelected)
                    ? "border-primary ring-1 ring-primary relative z-10"
                    : "border-border"
            )}
        >
            <div
                className="flex items-center justify-center p-1"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Checkbox
                    id={`checkbox-${task.taskId}`}
                    checked={isCompleted}
                    onCheckedChange={() => {
                        toggleTask(task.taskId);
                    }}
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
                    }}
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-muted-foreground/50"
                />
            </div>

            {isEditing ? (
                <Input
                    ref={inputRef}
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-7 text-sm p-1 bg-background border-input focus-visible:ring-1 focus-visible:ring-ring"
                />
            ) : (
                <span
                    className={cn(
                        "flex-1 text-sm cursor-text transition-colors",
                        isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    )}
                    onDoubleClick={() => {
                        if (!isCompleted) setLocalIsEditing(true);
                    }}
                >
                    {originalTask.title}
                </span>
            )}

            {task.rolledOverFrom && (
                <span
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 font-medium italic bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full whitespace-nowrap border border-amber-200 dark:border-amber-800"
                    title={`Originally created on ${task.rolledOverFrom}`}
                >
                    <Icon name="Rollover" className="w-3 h-3" />
                    Rolled Over
                </span>
            )}

            <button
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag
                onClick={() => deleteTask(task.taskId)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors p-1"
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
    index?: number;
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
            index={props.index}
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
            index={props.index}
        />
    );
};

export default TaskItem;
