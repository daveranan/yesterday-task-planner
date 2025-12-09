import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { getYYYYMMDD } from '../utils/dateUtils';
import { CONFIG } from '../constants/config';
import PlannerHeader from './PlannerHeader';
import TaskBoard from './TaskBoard';
import Timeline from './Timeline';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { TaskItemBase } from './TaskItem';
import { playSound } from '../utils/soundUtils';
import { TaskEntry } from '../store/types';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { SettingsModal } from './settings/SettingsModal';
import ShortcutsToast from './ShortcutsToast';
import Drawer from './Drawer';

const DailyPlanner: React.FC = () => {
    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // --- Store Selectors ---
    // --- Store Selectors ---
    const {
        currentDate,
        setCurrentDate,
        handleDateChange,
        jumpToToday,

        settings,
        days,
        tasks: allTasks,
        addTask,
        toggleTask,
        deleteTask,
        updateTaskTitle,
        updateDayData,
        moveTask,
        reorderTask,
        checkRollover,
        activeColumnId,
        toggleDrawer,
        moveTaskToDrawer,
        moveDrawerTask,
        moveTaskFromDrawerToDay,
    } = useStore();

    // Enable Keyboard Navigation
    useKeyboardNavigation();

    // Trigger rollover check on mount (for the current date)
    React.useEffect(() => {
        checkRollover(currentDate);
    }, [currentDate, checkRollover]);

    // Sync theme to DOM on mount and change
    React.useEffect(() => {
        document.documentElement.classList.toggle('dark', settings.isDarkMode);
    }, [settings.isDarkMode]);

    // Sync theme to DOM on mount and change
    React.useEffect(() => {
        document.documentElement.classList.toggle('dark', settings.isDarkMode);
    }, [settings.isDarkMode]);



    // Force defocus on mount
    React.useEffect(() => {
        (document.activeElement as HTMLElement)?.blur();

        // Restore window size if saved
        if (settings.windowWidth && settings.windowHeight) {
            try {
                window.resizeTo(settings.windowWidth, settings.windowHeight);
            } catch (e) {
                console.warn('Failed to resize window:', e);
            }
        }
    }, []);

    const setWindowSize = useStore(state => state.setWindowSize);

    // Track and save window size
    React.useEffect(() => {
        let timeoutId: number;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                setWindowSize(window.innerWidth, window.innerHeight);
            }, 500); // Save 500ms after resize ends
        };

        window.addEventListener('resize', handleResize);

        // Save initial size on mount just in case
        setWindowSize(window.innerWidth, window.innerHeight);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, [setWindowSize]);

    // Derived Data
    const currentDayData = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
    const isToday = currentDate === getYYYYMMDD(new Date());

    const getCategoryTasks = (category: string) => {
        return currentDayData.taskEntries.filter((t: TaskEntry) => {
            const globalTask = allTasks[t.taskId];
            return globalTask && t.category === category && !globalTask.completed;
        });
    };

    const incompleteCount =
        getCategoryTasks('must-do').length +
        getCategoryTasks('communications').length +
        getCategoryTasks('todo').length;

    // --- Drag and Drop ---
    const [activeId, setActiveId] = useState<string | null>(null); // Track active drag ID

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag (prevents accidental drags)
            },
        })
    );

    const lastOverId = React.useRef<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        lastOverId.current = null;
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        // If sorting context changes (ratchet effect)
        if (over && lastOverId.current !== over.id) {
            // Play click only if we are actually sorting or moving over a drop target
            playSound('click');
            lastOverId.current = over.id as string;
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null); // Reset active ID
        lastOverId.current = null;

        if (!over) return;

        // Pop only on drop release (successful drop)
        playSound('pop');

        if (!over) return;

        const overData = over.data.current;
        const activeData = active.data.current;

        // Handle Drop on Drawer Targets
        if (overData?.type === 'DRAWER_INBOX' || overData?.type === 'DRAWER_FOLDER') {
            const folderId = overData.folderId || null;
            moveTaskToDrawer(active.id as string, folderId);
            return;
        }

        // If sorting within same list (and it's a sortable list)
        if (active.id === over.id) return;

        const isDrawerTask = activeData?.type === 'DRAWER_TASK';

        // Helper: Check if dropping ON a drawer task (target is task in drawer)
        if (overData?.type === 'DRAWER_TASK') {
            const targetFolderId = overData.folderId || null;

            if (isDrawerTask) {
                // Reorder / Move within Drawer
                // Only move if folder is different. Reorder in same folder is visual only for now (unless we add reorder action)
                if (activeData.folderId !== targetFolderId) {
                    moveDrawerTask(active.id as string, targetFolderId);
                }
            } else {
                // Board Task -> Drawer Task (equivalent to dropping in Folder)
                moveTaskToDrawer(active.id as string, targetFolderId);
            }
            return;
        }

        // Drawer -> Daily Board
        if (isDrawerTask) {
            // Check if dropping on a column or a task in a column
            const targetCategory = overData?.type === 'COLUMN'
                ? over.id
                : (overData?.type === 'TASK' ? (overData?.task as TaskEntry)?.category : null);

            // Allow dropping on timeline slots too
            const targetSlot = overData?.type === 'SLOT' || (typeof over.id === 'string' && (over.id as string).includes(':'))
                ? over.id as string
                : null;

            if (targetCategory || targetSlot) {
                // Determine standard category if dropped on slot
                const finalCategory = targetSlot ? 'scheduled' : (targetCategory as string);

                moveTaskFromDrawerToDay(
                    active.id as string,
                    currentDate,
                    finalCategory,
                    undefined,
                    targetSlot || undefined
                );
            }
            return;
        }



        // Reset data refs if not drawer drop for further logic
        // const activeData = active.data.current; // Re-using above
        // const overData = over.data.current; // Re-using above
        const isOverTask = overData?.type === 'TASK';

        if (isOverTask) {
            const overTask = overData?.task as TaskEntry;
            const activeTask = activeData?.task as TaskEntry;

            // Check if same category/context (including scheduled slots)
            if (activeTask?.category === overTask?.category) {
                // If it's scheduled, we also need to check if they are in the same slot? 
                // Actually, reorderTask logic just swaps them in the array, so if they are in the same filtered list, it works.
                // But wait, "scheduled" tasks are filtered by slotId. 
                // If we reorder across slots, that's a move.
                // If we reorder in same slot, it's a reorder.

                // Let's simplify: If reordering functionality covers it, great.
                // But strictly speaking, if slotId matches, it's a reorder.

                if (activeTask?.category !== 'scheduled' || activeTask?.slotId === overTask?.slotId) {
                    reorderTask(active.id as string, over.id as string);
                    return;
                }
            }

            // Cross-list drop onto a task
            if (overTask.category === 'scheduled') {
                moveTask(active.id as string, 'scheduled', overTask.slotId);
            } else {
                // Insert relative to the target task
                moveTask(active.id as string, overTask.category, null, over.id as string);
            }
        } else {
            // Drop on Container/Slot
            const targetId = over.id as string; // Combined category or slotId
            const isTimeSlot = targetId.includes(':');

            if (isTimeSlot) {
                moveTask(active.id as string, 'scheduled', targetId);
            } else {
                moveTask(active.id as string, targetId);
            }
        }
    };

    // Get the active task object for the overlay
    const activeTaskEntry = activeId
        ? (currentDayData.taskEntries.find((t: TaskEntry) => t.taskId === activeId)
            || (() => {
                // Fallback: Check Drawer
                // We need access to drawer state here. 
                // Accessing drawer from store hook (need to ensure it's destructured)
                const drawerTask = useStore.getState().drawer.tasks.find(t => t.taskId === activeId);
                if (drawerTask) {
                    return {
                        taskId: drawerTask.taskId,
                        category: 'drawer', // Pseudo-category for overlay
                        slotId: null,
                        rolledOverFrom: null
                    } as TaskEntry;
                }
                return null;
            })()
        )
        : null;
    // const activeGlobalTask = activeId ? allTasks[activeId] : null; // Ensure we have the global data too
    // Combine them for the TaskItem prop, similar to how it receives props in the list
    // const overlayTask = activeTaskEntry ? { ...activeTaskEntry, ...activeGlobalTask } : null; // TaskItem expects the entry + title from store. Actually TaskItem expects `task` (entry) and looks up `allTasks`.


    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className={`flex flex-col h-full ${settings.isDarkMode ? 'dark' : ''}`}>
                <div className="flex flex-col h-full bg-background text-foreground font-sans overflow-hidden">

                    <div className="flex-1 flex overflow-hidden">
                        <Drawer />
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <PlannerHeader
                                currentDate={currentDate}
                                setCurrentDate={setCurrentDate}
                                onDateChange={handleDateChange}
                                onJumpToToday={jumpToToday}
                                isToday={isToday}
                                incompleteCount={incompleteCount}
                                onOpenSettings={() => setIsSettingsOpen(true)}
                                onToggleDrawer={toggleDrawer}
                                isDrawerOpen={settings.isDrawerOpen || false}
                            />

                            <div className="flex-1 flex overflow-hidden p-2 gap-2">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentDate}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-1 flex overflow-hidden gap-2 w-full h-full"
                                    >
                                        <TaskBoard
                                            // Use explicit limits from CONFIG
                                            configLimits={CONFIG.limits}
                                            currentDayData={currentDayData}
                                            allTasks={allTasks}
                                            onAddTask={addTask}
                                            onToggleTask={toggleTask}
                                            onDeleteTask={deleteTask}
                                            onEditTask={updateTaskTitle}
                                            onUpdateDayData={updateDayData}
                                            showGratefulness={settings.showGratefulness}
                                            showReflection={settings.showReflection}
                                            activeColumnId={activeColumnId}
                                        />

                                        <Timeline
                                            currentDayData={currentDayData}
                                            allTasks={allTasks}
                                            isToday={isToday}
                                            config={CONFIG}
                                            onToggleTask={toggleTask}
                                            onDeleteTask={deleteTask}
                                            onEditTask={updateTaskTitle}
                                            isActive={activeColumnId === 'scheduled'}
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeId && activeTaskEntry ? (
                    <div className="opacity-90 rotate-2 cursor-grabbing pointer-events-none">
                        <TaskItemBase
                            task={activeTaskEntry}
                            allTasks={allTasks}
                            toggleTask={() => { }} // No-op during drag
                            deleteTask={() => { }} // No-op during drag
                            handleEditTask={() => { }} // No-op during drag
                            hoveredTaskId={null}
                            setHoveredTaskId={() => { }}
                            grabbedTaskId={null} // Overlay shouldn't show grabbed state specifically, or maybe yes? But drag overrides grab visual.
                            editingTaskId={null}
                            setNodeRef={() => { }} // dummy
                            isOverlay
                        />
                    </div>
                ) : null}
            </DragOverlay>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
            <ShortcutsToast />
        </DndContext>
    );
};

export default DailyPlanner;
