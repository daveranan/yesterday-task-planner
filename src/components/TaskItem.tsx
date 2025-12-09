import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import { TaskEntry, TaskGlobal } from '../store/types';
import { useStore } from '../store/useStore';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

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
    const duplicateTask = useStore(state => state.duplicateTask);
    const moveTask = useStore(state => state.moveTask);

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
                className="bg-white dark:bg-neutral-800 p-1.5 rounded border border-neutral-200 dark:border-neutral-600 opacity-50 shadow-xl h-[36px]"
            />
        );
    }

    const getCategoryStyles = () => {
        if (isDragging || isOverlay) return "bg-card border-primary/50"; // Overlay style override

        // Use originalCategory if active task is scheduled, fall back to current category
        const effCategory = task.category === 'scheduled' && task.originalCategory
            ? task.originalCategory
            : task.category;

        switch (effCategory) {
            case 'must-do':
                return "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700";
            case 'communications':
                return "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 hover:border-sky-300 dark:hover:border-sky-700";
            default:
                return "bg-card border-border hover:border-primary/50";
        }
    };

    const isNew = originalTask.createdAt && (Date.now() - originalTask.createdAt < 1000);

    const resizeTask = useStore(state => state.resizeTask);
    const [previewDuration, setPreviewDuration] = useState(task.duration || 1);

    useEffect(() => {
        setPreviewDuration(task.duration || 1);
    }, [task.duration]);

    const handleResizeStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startDuration = task.duration || 1;

        // Dynamic slot height calculation
        // We find the closest task-wrapper to determine the 'base unit' height (1 slot)
        const wrapper = (e.currentTarget as HTMLElement).closest('.task-wrapper');
        const SLOT_HEIGHT = wrapper ? wrapper.getBoundingClientRect().height : 42;

        const onMove = (moveEvent: PointerEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const additionalSlots = Math.round(deltaY / SLOT_HEIGHT);
            const newDuration = Math.max(1, startDuration + additionalSlots);
            setPreviewDuration(newDuration);
        };

        const onUp = (upEvent: PointerEvent) => {
            const deltaY = upEvent.clientY - startY;
            const additionalSlots = Math.round(deltaY / SLOT_HEIGHT);
            const newDuration = Math.max(1, startDuration + additionalSlots);

            if (newDuration !== task.duration) {
                resizeTask(task.taskId, newDuration);
            }

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        // Wrapper holds the slot space and DND ref
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...(!isEditing ? listeners : {})}
            className="task-wrapper relative w-full h-full min-h-[2.5rem]" // Ensure it fills the slot or has min height
        >
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <motion.div
                        initial={isNew ? { opacity: 0, scale: 0.9 } : false}
                        animate={isNew ? { opacity: 1, scale: 1 } : false}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.2 }}
                        id={`task-${task.taskId}`}
                        onMouseEnter={() => setHoveredTaskId(task.taskId)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        className={cn(
                            "group flex items-center gap-2 p-1.5 rounded-lg border shadow-sm transition-colors duration-200 touch-none",
                            getCategoryStyles(),
                            (isOverlay || isGrabbed) && "opacity-90 rotate-2 scale-105 shadow-xl cursor-grabbing bg-card border-primary",
                            !isOverlay && !isGrabbed && "cursor-grab active:cursor-grabbing",
                            isSelected || (isManipulated && !isSelected)
                                ? "border-primary ring-1 ring-primary relative z-10"
                                : "",
                            "absolute top-0 left-0 w-full h-full" // Fill the wrapper div
                        )}
                        style={{
                            // Absolute positioning to overlay slots without expanding parent
                            // Only apply special positioning if it's scheduled tasks AND NOT dragging/overlay
                            ...(task.category === 'scheduled' && !isDragging && !isOverlay ? {
                                // The motion.div itself is now absolute, so we just need height and zIndex
                                height: `calc(${previewDuration} * 100% + ${(previewDuration - 1) * 1}px)`,
                                zIndex: previewDuration > 1 ? 50 : 10,
                            } : {
                                // Default behavior for non-scheduled or dragging (relative)
                                position: 'relative',
                                // If dragging a multi-block task, we might want to respect its height or shrink it?
                                // For now, let it be default height (auto) or fixed
                                ...(isOverlay && task.category === 'scheduled' && previewDuration > 1 ? {
                                    height: `${previewDuration * 3}rem` // Give it some fixed height appearance in overlay
                                } : {})
                            })
                        }}
                    >
                        {task.category === 'scheduled' && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize hover:bg-black/10 dark:hover:bg-white/10 flex justify-center items-end pb-0.5 z-20"
                                onPointerDown={handleResizeStart}
                            >
                                <div className="w-8 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                            </div>
                        )}
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
                    </motion.div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                    <ContextMenuItem onClick={() => duplicateTask(task.taskId)}>
                        <Icon name="Copy" className="w-4 h-4 mr-2" />
                        Duplicate
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => deleteTask(task.taskId)} className="text-destructive focus:text-destructive">
                        <Icon name="Trash2" className="w-4 h-4 mr-2" />
                        Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                        <ContextMenuSubTrigger>Move To...</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48">
                            <ContextMenuItem
                                onClick={() => moveTask(task.taskId, 'must-do')}
                                disabled={task.category === 'must-do'}
                                className={task.category === 'must-do' ? "text-muted-foreground" : ""}
                            >
                                Must Do
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => moveTask(task.taskId, 'communications')}
                                disabled={task.category === 'communications'}
                                className={task.category === 'communications' ? "text-muted-foreground" : ""}
                            >
                                Communications
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => moveTask(task.taskId, 'todo')}
                                disabled={task.category === 'todo'}
                                className={task.category === 'todo' ? "text-muted-foreground" : ""}
                            >
                                To-Do
                            </ContextMenuItem>
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                </ContextMenuContent>
            </ContextMenu>
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
