import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { getYYYYMMDD } from '../utils/dateUtils';
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
import { ScheduleOverrideModal } from './ScheduleOverrideModal'; // Import override modal

const DailyPlanner: React.FC = () => {
    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

    // --- Store Selectors ---
    // --- Store Selectors ---
    // --- Store Selectors ---
    const currentDate = useStore(state => state.currentDate);
    const settings = useStore(state => state.settings);
    const days = useStore(state => state.days);
    const allTasks = useStore(state => state.tasks);
    const activeColumnId = useStore(state => state.activeColumnId);

    // Actions (stable functions, can be destructured or fetched once)
    const setCurrentDate = useStore(state => state.setCurrentDate);
    const handleDateChange = useStore(state => state.handleDateChange);
    const jumpToToday = useStore(state => state.jumpToToday);
    const addTask = useStore(state => state.addTask);
    const toggleTask = useStore(state => state.toggleTask);
    const deleteTask = useStore(state => state.deleteTask);
    const updateTaskTitle = useStore(state => state.updateTaskTitle);
    const updateDayData = useStore(state => state.updateDayData);
    const moveTask = useStore(state => state.moveTask);
    const reorderTask = useStore(state => state.reorderTask);
    const checkRollover = useStore(state => state.checkRollover);
    const toggleDrawer = useStore(state => state.toggleDrawer);
    const moveTaskToDrawer = useStore(state => state.moveTaskToDrawer);
    const moveDrawerTask = useStore(state => state.moveDrawerTask);
    const reorderDrawerFolders = useStore(state => state.reorderDrawerFolders);
    const moveTaskFromDrawerToDay = useStore(state => state.moveTaskFromDrawerToDay);

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
        getCategoryTasks('communications').length +
        getCategoryTasks('todo').length;

    // effective schedule config
    const effectiveScheduleConfig = React.useMemo(() => {
        if (currentDayData.scheduleOverride) {
            return {
                ...settings.schedule,
                ...currentDayData.scheduleOverride,
                // Ensure null skipHour is respected
                skipHour: currentDayData.scheduleOverride.skipHour
            };
        }
        return settings.schedule;
    }, [settings.schedule, currentDayData.scheduleOverride]);

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



        // If sorting within same list (and it's a sortable list)
        if (active.id === over.id) return;

        const isDrawerTask = activeData?.type === 'DRAWER_TASK';

        // Drawer Folder Reordering
        if (activeData?.type === 'DRAWER_FOLDER' && overData?.type === 'DRAWER_FOLDER') {
            if (active.id !== over.id) {
                reorderDrawerFolders(active.id as string, over.id as string);
            }
            return;
        }

        // Helper: Check if dropping ON a drawer task (target is task in drawer)
        if (overData?.type === 'DRAWER_TASK') {
            const targetFolderId = overData.folderId || null;
            const overTaskId = overData.taskId || over.id;

            if (isDrawerTask) {
                // Reorder / Move within Drawer
                // Calculate index relative to the target folder's list
                const drawerTasks = useStore.getState().drawer.tasks;
                const targetFolderTasks = drawerTasks.filter(t => t.folderId === targetFolderId);
                const overIndex = targetFolderTasks.findIndex(t => t.taskId === overTaskId);

                moveDrawerTask(
                    active.id as string,
                    targetFolderId,
                    overIndex !== -1 ? overIndex : undefined
                );
            } else {
                // Board Task -> Drawer Task (equivalent to dropping in Folder)
                moveTaskToDrawer(active.id as string, targetFolderId);
            }
            return;
        }

        // Handle Drop on Drawer Targets (Inbox or Folder) - Catch-all for non-task drops inside drawer
        if (overData?.type === 'DRAWER_INBOX' || overData?.type === 'DRAWER_FOLDER' || overData?.type === 'DRAWER_FOLDER_DROP') {
            // If dragging a folder, we already handled reordering above. 
            // If we are here, it means we are dragging a folder ONTO a folder but maybe didn't trigger reorder? 
            // OR we are dragging a folder onto INBOX.
            if (activeData?.type === 'DRAWER_FOLDER') {
                // Folder dropped on Folder (handled by reorder check mostly, but if no change, just return)
                // Or Inbox (can't put folder in inbox)
                return;
            }

            const folderId = overData.folderId || null;
            moveTaskToDrawer(active.id as string, folderId);
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
                                            configLimits={settings.columnLimits}
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
                                            config={effectiveScheduleConfig} // Pass dynamic config
                                            onToggleTask={toggleTask}
                                            onDeleteTask={deleteTask}
                                            onEditTask={updateTaskTitle}
                                            onOverrideClick={() => setIsOverrideModalOpen(true)}
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
                {activeId ? (
                    activeTaskEntry ? (
                        <div className="opacity-90 rotate-2 cursor-grabbing pointer-events-none">
                            <TaskItemBase
                                task={activeTaskEntry}
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
                    ) : (
                        // Check for Folder
                        (() => {
                            const folder = useStore.getState().drawer.folders.find(f => f.id === activeId);
                            if (folder) {
                                return (
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-card border border-border shadow-xl opacity-90 rotate-2 w-48 pointer-events-none">
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <div className="p-0.5 rounded">
                                                {/* Using generic SVG since Icon component might need import or passing. 
                                                     Actually Icon is imported in DailyPlanner? No, in Drawer. 
                                                     DailyPlanner doesn't look like it imports Icon. 
                                                     Let's check imports. */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-muted-foreground"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-blue-500"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                                            <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )
                ) : null}
            </DragOverlay>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
            {isOverrideModalOpen && (
                <ScheduleOverrideModal
                    date={currentDate}
                    onClose={() => setIsOverrideModalOpen(false)}
                />
            )}
            <ShortcutsToast />
        </DndContext>
    );
};

export default DailyPlanner;
