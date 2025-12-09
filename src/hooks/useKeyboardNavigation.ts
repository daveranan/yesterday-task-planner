import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';

// Helper to check if input is focused
const isInputFocused = () => {
    const active = document.activeElement as HTMLElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
};

export const useKeyboardNavigation = () => {
    const {
        settings,
        selectedTaskId,
        setSelectedTaskId,
        activeColumnId,
        setActiveColumn,
        days,
        currentDate,
        tasks: allTasks,
        toggleTask,
        deleteTask,
    } = useStore();

    const shortcuts = settings.shortcuts || DEFAULT_SHORTCUTS;

    // Helper to match event to action
    const getActionFromEvent = useCallback((e: KeyboardEvent): string | null => {
        const modifiers = [];
        if (e.shiftKey) modifiers.push('Shift');
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.metaKey) modifiers.push('Meta');

        let key = e.key;
        if (key === ' ') key = 'Space';

        const combo = [...modifiers, key].join('+');

        for (const [action, shortcut] of Object.entries(shortcuts)) {
            const normalizedShortcut = shortcut === ' ' ? 'Space' : shortcut;

            if (typeof normalizedShortcut === 'string' && normalizedShortcut.toLowerCase() === combo.toLowerCase()) {
                return action;
            }
            // Handle plain letters (e.g. 'j' matching 'j' or 'J')
            if (typeof shortcut === 'string' && modifiers.length === 0 && shortcut.toLowerCase() === key.toLowerCase()) {
                return action;
            }
        }
        return null;
    }, [shortcuts]);

    // Navigation Logic
    const handleNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
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
                // Default to first column if none active
                nextColumnIndex = 0;
            }

            const nextColumnId = COLUMNS[nextColumnIndex];
            setActiveColumn(nextColumnId);

            // Auto-select first task in new column
            const columnTasks = currentScore.taskEntries.filter(t => t.category === nextColumnId && !allTasks[t.taskId]?.completed); // Only nav incomplete? Or all? User said "iterate with tasks". Usually all visible.
            // Let's stick to ALL tasks for now, or maybe incomplete first?
            // Actually, TaskBoard filters incomplete tasks usually? No, it shows all but maybe styles them.
            // Let's navigate through VISIBLE tasks.
            // In TaskBoard: `tasks={currentDayData.taskEntries}`. It passes all entries.
            // BUT `getCategoryTasks` in DailyPlanner filters `!globalTask.completed` for the header count.
            // The Column component renders `tasks`. Let's assume we navigate all tasks in the list.

            if (columnTasks.length > 0) {
                setSelectedTaskId(columnTasks[0].taskId);
            } else {
                setSelectedTaskId(null);
            }
            return;
        }

        // 2. Task Navigation (Up/Down) - Iterate within active column
        if (!activeColumnId) {
            // If no column active, activate first one
            setActiveColumn(COLUMNS[0]);
            return;
        }

        // Get tasks for active column
        const columnTasks = currentScore.taskEntries.filter(t => {
            // Important: We need to match the visual order.
            // If the column filters out completed tasks, we should too.
            // Checking TaskBoard... it passes `tasks` prop which is ALL entries.
            // Checking Column.tsx... it maps `tasks`.
            // So we navigate ALL tasks in that category.
            return t.category === activeColumnId;
        });

        if (columnTasks.length === 0) return;

        const currentIndex = columnTasks.findIndex(t => t.taskId === selectedTaskId);

        if (direction === 'up') {
            if (currentIndex === -1 || currentIndex === 0) {
                // Wrap around to bottom? or stop? standard is stop.
                // Let's toggle to last if at top?
                // For now, stop at top.
                if (currentIndex === -1) setSelectedTaskId(columnTasks[columnTasks.length - 1].taskId);
                else setSelectedTaskId(columnTasks[Math.max(0, currentIndex - 1)].taskId);
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                return;
            }

            if (isInputFocused()) {
                if (e.key === 'Escape') {
                    (document.activeElement as HTMLElement).blur();
                }
                return;
            }

            const action = getActionFromEvent(e);
            if (!action) return;

            e.preventDefault();

            switch (action) {
                case 'navUp':
                    handleNavigation('up');
                    break;
                case 'navDown':
                    handleNavigation('down');
                    break;
                case 'navLeft':
                    handleNavigation('left');
                    break;
                case 'navRight':
                    handleNavigation('right');
                    break;
                case 'toggleComplete':
                    if (selectedTaskId) toggleTask(selectedTaskId);
                    break;
                case 'delete':
                    if (selectedTaskId) {
                        deleteTask(selectedTaskId);
                        setSelectedTaskId(null);
                    }
                    break;
                case 'escape':
                    setSelectedTaskId(null);
                    setActiveColumn(null); // Clear column focus too
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [getActionFromEvent, handleNavigation, selectedTaskId, toggleTask, deleteTask, setSelectedTaskId, setActiveColumn]);

    return {
        selectedTaskId
    };
};
