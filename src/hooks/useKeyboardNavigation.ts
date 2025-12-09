import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { CONFIG } from '../constants/config';
import confetti from 'canvas-confetti';
import { TaskEntry } from '../store/types';

// Helper to check if input is focused
const isInputFocused = () => {
    const active = document.activeElement as HTMLElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
};

export const useKeyboardNavigation = () => {
    const {
        selectedTaskId,
        setSelectedTaskId,
        activeColumnId,
        setActiveColumn,
        days,
        currentDate,
        tasks: allTasks,
        toggleTask,
        deleteTask,
        handleDateChange,
        hoveredTaskId,
        setHoveredTaskId,
        grabbedTaskId,
        setGrabbedTaskId,
        duplicateTask,
        setEditingTaskId,
        moveTask,
        reorderTask,
        hoveredNewTaskCategory
    } = useStore();

    // Derived active task (Manipulated or Selected)
    // "Manipulated" generally means Hovered, but we fallback to Selected if keyboard was used
    const activeTaskId = hoveredTaskId || selectedTaskId;
    // But grab mode strictly uses grabbedTaskId

    // Navigation Logic for Standard Mode
    const handleStandardNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        const currentScore = days[currentDate];
        if (!currentScore) return;

        const COLUMNS = ['must-do', 'communications', 'todo', 'scheduled'];

        // 1. Column Navigation (Left/Right)
        if (direction === 'left' || direction === 'right') {
            let nextColumnIndex = 0;
            if (activeColumnId) {
                const currentIndex = COLUMNS.indexOf(activeColumnId);
                if (currentIndex !== -1) {
                    if (direction === 'left') {
                        nextColumnIndex = (currentIndex - 1 + COLUMNS.length) % COLUMNS.length;
                    } else {
                        nextColumnIndex = (currentIndex + 1) % COLUMNS.length;
                    }
                }
            } else {
                nextColumnIndex = 0;
            }

            const nextColumnId = COLUMNS[nextColumnIndex];
            setActiveColumn(nextColumnId);

            // Select first task in the new column
            // We strictly use t.category (local visual placement)
            let columnTasks = currentScore.taskEntries.filter((t: TaskEntry) => t.category === nextColumnId);

            // Special sort for scheduled to ensure we pick the top visual one
            if (nextColumnId === 'scheduled') {
                columnTasks = columnTasks.sort((a: TaskEntry, b: TaskEntry) => {
                    const getHour = (t: TaskEntry) => parseInt((t.slotId || `${CONFIG.startHour}:00`).split(':')[0]);
                    const hA = getHour(a);
                    const hB = getHour(b);
                    if (hA !== hB) return hA - hB;
                    // If same slot, rely on original index order
                    const idxA = currentScore.taskEntries.findIndex((x: TaskEntry) => x.taskId === a.taskId);
                    const idxB = currentScore.taskEntries.findIndex((x: TaskEntry) => x.taskId === b.taskId);
                    return idxA - idxB;
                });
            }

            if (columnTasks.length > 0) {
                setSelectedTaskId(columnTasks[0].taskId);
            } else {
                setSelectedTaskId(null);
            }
            return;
        }

        // 2. Task Navigation (Up/Down)
        if (!activeColumnId) {
            setActiveColumn(COLUMNS[0]);
            return;
        }

        // Strictly use t.category here as well to match visual column
        let columnTasks = currentScore.taskEntries.filter((t: TaskEntry) => t.category === activeColumnId);

        // Special handling for Scheduled column: must sort by time slot to match UI
        if (activeColumnId === 'scheduled') {
            columnTasks = columnTasks.sort((a: TaskEntry, b: TaskEntry) => {
                const getHour = (t: TaskEntry) => parseInt((t.slotId || `${CONFIG.startHour}:00`).split(':')[0]);
                const hA = getHour(a);
                const hB = getHour(b);
                if (hA !== hB) return hA - hB;
                // If same slot, rely on original index order
                const idxA = currentScore.taskEntries.findIndex((x: TaskEntry) => x.taskId === a.taskId);
                const idxB = currentScore.taskEntries.findIndex((x: TaskEntry) => x.taskId === b.taskId);
                return idxA - idxB;
            });
        }

        if (columnTasks.length === 0) return;

        const currentIndex = columnTasks.findIndex((t: TaskEntry) => t.taskId === selectedTaskId);

        if (direction === 'up') {
            if (currentIndex === -1 || currentIndex === 0) {
                // Stay at top or wrap? Let's stop.
                if (currentIndex === -1) setSelectedTaskId(columnTasks[columnTasks.length - 1].taskId);
            } else {
                setSelectedTaskId(columnTasks[currentIndex - 1].taskId);
            }
        } else if (direction === 'down') {
            if (currentIndex === -1) {
                setSelectedTaskId(columnTasks[0].taskId);
            } else {
                setSelectedTaskId(columnTasks[Math.min(columnTasks.length - 1, currentIndex + 1)].taskId);
            }
        }

    }, [activeColumnId, setActiveColumn, days, currentDate, setSelectedTaskId, selectedTaskId, allTasks]);


    // Navigation Logic for Grabbed Mode
    const handleGrabbedNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!grabbedTaskId) return;

        const currentScore = days[currentDate];
        if (!currentScore) return;
        const COLUMNS = ['must-do', 'communications', 'todo', 'scheduled'];

        const taskEntry = currentScore.taskEntries.find((t: TaskEntry) => t.taskId === grabbedTaskId);
        if (!taskEntry) return;

        // Current Category - Use Local Entry Category for visual correctness
        const currentCategory = taskEntry.category;

        if (direction === 'left' || direction === 'right') {
            // Move across columns
            const curColIndex = COLUMNS.indexOf(currentCategory);
            if (curColIndex === -1) return;

            let nextColIndex;
            if (direction === 'left') {
                nextColIndex = (curColIndex - 1 + COLUMNS.length) % COLUMNS.length;
            } else {
                nextColIndex = (curColIndex + 1) % COLUMNS.length;
            }
            const nextCategory = COLUMNS[nextColIndex];

            // Trigger Move
            let targetSlotId: string | null = null;
            if (nextCategory === 'scheduled') {
                targetSlotId = `${CONFIG.startHour}:00`;
            }
            moveTask(grabbedTaskId, nextCategory, targetSlotId);
            setActiveColumn(nextCategory); // Follow logic
        } else {
            // Up/Down reordering
            if (currentCategory === 'scheduled') {
                // Scheduled Column Logic (Time Slots)
                const currentSlotId = taskEntry.slotId || `${CONFIG.startHour}:00`;

                // Get all valid slots
                const validSlots: string[] = [];
                for (let h: number = CONFIG.startHour; h <= CONFIG.endHour; h++) {
                    if (h !== CONFIG.skipHour) {
                        validSlots.push(`${h}:00`);
                    }
                }

                // Get tasks in current slot
                const tasksInSlot = currentScore.taskEntries.filter((t: TaskEntry) =>
                    t.category === 'scheduled' && t.slotId === currentSlotId
                );
                const currentIndex = tasksInSlot.findIndex((t: TaskEntry) => t.taskId === grabbedTaskId);

                if (direction === 'up') {
                    if (currentIndex > 0) {
                        // Swap with prev in same slot
                        reorderTask(grabbedTaskId, tasksInSlot[currentIndex - 1].taskId);
                    } else {
                        // Move to previous slot
                        const slotIndex = validSlots.indexOf(currentSlotId);
                        if (slotIndex > 0) {
                            const prevSlotId = validSlots[slotIndex - 1];
                            moveTask(grabbedTaskId, 'scheduled', prevSlotId);
                        }
                    }
                } else if (direction === 'down') {
                    if (currentIndex !== -1 && currentIndex < tasksInSlot.length - 1) {
                        // Swap with next in same slot
                        reorderTask(grabbedTaskId, tasksInSlot[currentIndex + 1].taskId);
                    } else {
                        // Move to next slot
                        const slotIndex = validSlots.indexOf(currentSlotId);
                        if (slotIndex !== -1 && slotIndex < validSlots.length - 1) {
                            const nextSlotId = validSlots[slotIndex + 1];
                            moveTask(grabbedTaskId, 'scheduled', nextSlotId);
                        }
                    }
                }

            } else {
                // Standard Column Logic
                const colTasks = currentScore.taskEntries.filter((t: TaskEntry) => t.category === currentCategory);

                const currentIndex = colTasks.findIndex((t: TaskEntry) => t.taskId === grabbedTaskId);
                if (currentIndex === -1) return;

                if (direction === 'up') {
                    if (currentIndex > 0) {
                        const swapTarget = colTasks[currentIndex - 1];
                        reorderTask(grabbedTaskId, swapTarget.taskId);
                    }
                } else if (direction === 'down') {
                    if (currentIndex < colTasks.length - 1) {
                        const swapTarget = colTasks[currentIndex + 1];
                        reorderTask(grabbedTaskId, swapTarget.taskId);
                    }
                }
            }
        }

    }, [grabbedTaskId, days, currentDate, allTasks, moveTask, reorderTask, setActiveColumn]);


    // Helper: Copy to Clipboard
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }, []);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Global Date Switching (Ctrl + Arrows)
            // Priority over input focus because it's a modifier key
            if (e.ctrlKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handleDateChange(-1);
                    return;
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleDateChange(1);
                    return;
                }
                // Ctrl + Enter (Create Task in Active Column)
                if (e.key === 'Enter') {
                    if (activeColumnId) {
                        e.preventDefault();
                        const inputId = `new-task-input-${activeColumnId}`;
                        document.getElementById(inputId)?.focus();
                    }
                    return;
                }
            }

            // Global Ignore inputs for other shortcuts
            if (isInputFocused()) {
                if (e.key === 'Escape') {
                    (document.activeElement as HTMLElement).blur();
                }
                return;
            }

            // 2. Grabbing Mode
            if (grabbedTaskId) {
                e.preventDefault(); // Block scrolling
                switch (e.key) {
                    case 'ArrowUp': handleGrabbedNavigation('up'); break;
                    case 'ArrowDown': handleGrabbedNavigation('down'); break;
                    case 'ArrowLeft': handleGrabbedNavigation('left'); break;
                    case 'ArrowRight': handleGrabbedNavigation('right'); break;
                    case 'g':
                    case 'Escape':
                        setGrabbedTaskId(null);
                        break;
                }
                return;
            }

            // 3. Independent New Task Bar Hover
            // "While hovering over an empty 'new task' bar, pressing enter will edit it."
            if (e.key === 'Enter' && hoveredNewTaskCategory && !e.ctrlKey) {
                e.preventDefault();
                const inputId = `new-task-input-${hoveredNewTaskCategory}`;
                document.getElementById(inputId)?.focus();
                return;
            }

            // 4. Manipulated Task (Hovered or Selected)
            // But if we are just navigating (Arrows), we default to standard nav logic
            if (e.key.startsWith('Arrow')) {
                // If standard nav
                e.preventDefault();
                const dir = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
                handleStandardNavigation(dir);
                return;
            }

            // Task Actions (Require active task)
            if (activeTaskId) {
                const task = allTasks[activeTaskId];
                if (!task) return;

                switch (e.key.toLowerCase()) {
                    case 'x': // Delete
                        deleteTask(activeTaskId);
                        // If it was selected, clear selection
                        if (selectedTaskId === activeTaskId) setSelectedTaskId(null);
                        if (hoveredTaskId === activeTaskId) setHoveredTaskId(null);
                        break;
                    case 'd': // Duplicate
                        duplicateTask(activeTaskId);
                        break;
                    case 'c': // Copy
                        copyToClipboard(task.title);
                        break;
                    case ' ': // Toggle
                    case 'spacebar':
                        e.preventDefault(); // prevent scroll
                        // Trigger confetti
                        if (!task.completed) {
                            // Find position of task? Hard without ref. 
                            // Just center or random confetti?
                            // User "with confetti".
                            // Let's do a center burst or random.
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        }
                        toggleTask(activeTaskId);
                        break;
                    case 'enter': // Edit
                        e.preventDefault();
                        setEditingTaskId(activeTaskId);
                        break;
                    case 'escape': // Cancel state
                        setHoveredTaskId(null);
                        setSelectedTaskId(null);
                        setActiveColumn(null);
                        break;
                    case 'g': // Enter Grab Mode
                        setGrabbedTaskId(activeTaskId);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        activeTaskId, grabbedTaskId, activeColumnId, hoveredNewTaskCategory,
        handleDateChange, handleStandardNavigation, handleGrabbedNavigation,
        deleteTask, duplicateTask, copyToClipboard, toggleTask, setEditingTaskId,
        setGrabbedTaskId, setHoveredTaskId, setSelectedTaskId, setActiveColumn,
        selectedTaskId, hoveredTaskId, allTasks
    ]);

    return {
        selectedTaskId
    };
};
