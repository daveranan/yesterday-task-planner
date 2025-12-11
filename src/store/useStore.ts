import { create } from 'zustand';
// import { CONFIG } from '../constants/config';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
import { loadDataFromFile, saveDataToFile, saveSettingsToFile, loadTheme, getCustomSavePath, setCustomSavePath } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';
import { toast } from 'sonner';
import { Store, StoreState, TaskEntry, TaskGlobal, DayData, HistorySnapshot, ScheduleSettings, DayScheduleOverride } from './types';

const HISTORY_LIMIT = 100;

// Helper to snapshot state
const createSnapshot = (state: StoreState, description: string = 'Unknown Action'): HistorySnapshot => ({
    tasks: state.tasks,
    days: state.days,
    drawer: state.drawer,
    actionDescription: description || 'Unknown Action'
});

// Helper to add to history
const addToHistory = (state: StoreState, past: HistorySnapshot[], description: string = 'Unknown Action'): HistorySnapshot[] => {
    const newPast = [...past, createSnapshot(state, description)];
    if (newPast.length > HISTORY_LIMIT) {
        return newPast.slice(newPast.length - HISTORY_LIMIT);
    }
    return newPast;
};

// Helper to get initial state
const getInitialState = (): Partial<StoreState> => {
    const data = loadDataFromFile();
    // Ensure minimal structure exists
    if (!data.tasks) data.tasks = {};
    if (!data.tasks) data.tasks = {};
    if (!data.days) data.days = {};
    if (!data.drawer) data.drawer = { folders: [], tasks: [] };

    const customSavePath = getCustomSavePath();

    if (!data.settings) {
        // Default settings
        data.settings = {
            isDarkMode: loadTheme(), // Fallback to existing local storage theme if present
            soundEnabled: true,
            showGratefulness: true,
            showReflection: true,
            shortcuts: { ...DEFAULT_SHORTCUTS },
            savePath: customSavePath || undefined,
            schedule: {
                startHour: 8,
                endHour: 17,
                skipHour: 12,
                itemDurationMinutes: 120
            },
            columnLimits: {
                'must-do': 3,
                'communications': 3,
                'todo': 7
            }
        };
    } else {
        // Migration: Merge shortcuts to ensure new defaults exist
        data.settings.shortcuts = {
            ...DEFAULT_SHORTCUTS,
            ...(data.settings.shortcuts || {})
        };

        // Ensure savePath is up to date with local storage source of truth
        data.settings.savePath = customSavePath || undefined;

        // Migration: Ensure schedule settings exist
        if (!data.settings.schedule) {
            data.settings.schedule = {
                startHour: 8,
                endHour: 17,
                skipHour: 12,
                itemDurationMinutes: 120
            };
        }

        // Migration: Ensure columnLimits exist
        if (!data.settings.columnLimits) {
            data.settings.columnLimits = {
                'must-do': 3,
                'communications': 3,
                'todo': 7
            };
        }
    }
    return data;
};

const initialState = getInitialState();

export const useStore = create<Store>((set, get) => ({
    // --- State ---
    currentDate: getYYYYMMDD(new Date()),
    settings: initialState.settings!, // We ensured it exists in getInitialState
    tasks: initialState.tasks || {},
    days: initialState.days || {},
    drawer: initialState.drawer || { folders: [], tasks: [] },
    past: [],
    future: [],
    activeColumnId: null,
    selectedTaskId: null,
    hoveredTaskId: null,
    grabbedTaskId: null,
    editingTaskId: null,
    hoveredNewTaskCategory: null,

    // --- Actions ---

    setHoveredNewTaskCategory: (category: string | null) => {
        set({ hoveredNewTaskCategory: category });
    },

    setCurrentDate: (newDate: string) => {
        set({ currentDate: newDate });
        // Trigger rollover check whenever date changes
        get().checkRollover(newDate);
    },

    handleDateChange: (offset: number) => {
        const newDate = getDateOffset(get().currentDate, offset);
        get().setCurrentDate(newDate);
    },

    jumpToToday: () => {
        const today = getYYYYMMDD(new Date());
        get().setCurrentDate(today);
    },

    setTheme: (isDark: boolean) => {
        set((state) => {
            const newSettings = { ...state.settings, isDarkMode: isDark };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
        document.documentElement.classList.toggle('dark', isDark);
    },

    toggleTheme: () => {
        const { settings } = get();
        get().setTheme(!settings.isDarkMode);
    },

    toggleSound: () => {
        set((state) => {
            const newSettings = { ...state.settings, soundEnabled: !state.settings.soundEnabled };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    toggleGratefulness: () => {
        set((state) => {
            const newSettings = { ...state.settings, showGratefulness: !state.settings.showGratefulness };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    toggleReflection: () => {
        set((state) => {
            const newSettings = { ...state.settings, showReflection: !state.settings.showReflection };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    setWindowSize: (width: number, height: number) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                windowWidth: width,
                windowHeight: height
            };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    setSavePath: (path: string) => {
        setCustomSavePath(path);
        set((state) => {
            const newSettings = {
                ...state.settings,
                savePath: path
            };
            // This will trigger a save to the NEW path immediately
            saveSettingsToFile(newSettings);
            // Also save data to new location
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: state.drawer });
            return { settings: newSettings };
        });
    },

    updateColumnLimits: (limits: Partial<Record<string, number>>) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                columnLimits: {
                    ...state.settings.columnLimits,
                    ...limits
                } as Record<string, number>
            };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    // Keyboard & Selection
    updateShortcut: (actionId: string, newKey: string) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                shortcuts: {
                    ...state.settings.shortcuts,
                    [actionId]: newKey
                }
            };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    setActiveColumn: (columnId: string | null) => {
        set({ activeColumnId: columnId });
    },

    setSelectedTaskId: (taskId: string | null) => {
        set({ selectedTaskId: taskId, hoveredTaskId: null });
    },

    setHoveredTaskId: (taskId: string | null) => {
        set({ hoveredTaskId: taskId, selectedTaskId: null });
    },

    setGrabbedTaskId: (taskId: string | null) => {
        set({ grabbedTaskId: taskId });
    },

    setEditingTaskId: (taskId: string | null) => {
        set({ editingTaskId: taskId });
    },

    // Task Actions
    duplicateTask: (taskId: string) => {
        const { currentDate, days, tasks, drawer } = get();
        const task = tasks[taskId];
        if (!task) return;

        // 1. Try finding in Current Day
        const currentDay = days[currentDate];
        const dayEntryIndex = currentDay ? currentDay.taskEntries.findIndex(t => t.taskId === taskId) : -1;

        if (dayEntryIndex !== -1 && currentDay) {
            // Duplicate Day Task
            const newTaskId = Date.now().toString();
            const newTaskGlobal: TaskGlobal = {
                ...task,
                title: `${task.title} (Copy)`,
                createdOn: currentDate,
                createdAt: Date.now(),
                completed: false,
            };
            const originalEntry = currentDay.taskEntries[dayEntryIndex];
            const newEntry: TaskEntry = {
                taskId: newTaskId,
                category: originalEntry.category,
                slotId: originalEntry.slotId,
                rolledOverFrom: null,
            };

            set((state) => {
                const past = addToHistory(state, state.past, 'Duplicate Task');
                const updatedEntries = [...state.days[currentDate].taskEntries];
                updatedEntries.splice(dayEntryIndex + 1, 0, newEntry);

                const updatedDays = {
                    ...state.days,
                    [currentDate]: { ...currentDay, taskEntries: updatedEntries }
                };
                const updatedTasks = { ...state.tasks, [newTaskId]: newTaskGlobal };
                saveDataToFile({ tasks: updatedTasks, days: updatedDays, drawer: state.drawer, settings: state.settings });
                toast.success('Task duplicated');
                return { tasks: updatedTasks, days: updatedDays, past, future: [] };
            });
            return;
        }

        // 2. Try finding in Drawer
        const drawerEntryIndex = drawer.tasks.findIndex(t => t.taskId === taskId);
        if (drawerEntryIndex !== -1) {
            const newTaskId = Date.now().toString();
            const newTaskGlobal: TaskGlobal = {
                ...task,
                title: `${task.title} (Copy)`,
                createdOn: currentDate,
                createdAt: Date.now(),
                completed: false,
            };
            const originalEntry = drawer.tasks[drawerEntryIndex];
            const newDrawerEntry = {
                taskId: newTaskId,
                folderId: originalEntry.folderId,
                addedAt: getYYYYMMDD(new Date())
            };

            set((state) => {
                const past = addToHistory(state, state.past, 'Duplicate Drawer Task');
                const updatedDrawerTasks = [...state.drawer.tasks];
                updatedDrawerTasks.splice(drawerEntryIndex + 1, 0, newDrawerEntry);

                const updatedDrawer = { ...state.drawer, tasks: updatedDrawerTasks };
                const updatedTasks = { ...state.tasks, [newTaskId]: newTaskGlobal };

                saveDataToFile({ tasks: updatedTasks, days: state.days, drawer: updatedDrawer, settings: state.settings });
                toast.success('Task duplicated');
                return { tasks: updatedTasks, drawer: updatedDrawer, past, future: [] };
            });
            return;
        }
    },
    addTask: (category: string, title: string) => {
        const { currentDate, days } = get();

        const currentDayData: DayData = days[currentDate] || { taskEntries: [] };

        const newTaskId = Date.now().toString();
        const newTaskGlobal: TaskGlobal = {
            title,
            createdOn: currentDate,
            createdAt: Date.now(),
            completed: false,
            category,
            dueDate: null,
        };

        const newDayEntry: TaskEntry = {
            taskId: newTaskId,
            category,
            slotId: null,
            rolledOverFrom: null,
        };

        set((state) => {
            const past = addToHistory(state, state.past);
            const newState = {
                tasks: { ...state.tasks, [newTaskId]: newTaskGlobal },
                days: {
                    ...state.days,
                    [currentDate]: {
                        ...currentDayData,
                        taskEntries: [...currentDayData.taskEntries, newDayEntry]
                    }
                }
            };
            saveDataToFile({ tasks: newState.tasks, days: newState.days, drawer: state.drawer });
            return { ...newState, past, future: [] };
        });
    },

    toggleTask: (taskId: string) => {
        const { currentDate } = get();
        set((state) => {
            const task = state.tasks[taskId];
            if (!task) return {};

            // Snapshot before toggling
            const past = addToHistory(state, state.past);

            const isCompleting = !task.completed;
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...task, completed: isCompleting }
            };

            let updatedDays = state.days;

            if (isCompleting) {
                const currentDay = state.days[currentDate];
                if (currentDay) {
                    const entryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
                    if (entryIndex !== -1 && currentDay.taskEntries[entryIndex].rolledOverFrom) {
                        const updatedEntries = [...currentDay.taskEntries];
                        updatedEntries[entryIndex] = {
                            ...updatedEntries[entryIndex],
                            rolledOverFrom: null // Adopt to today
                        };
                        updatedDays = {
                            ...state.days,
                            [currentDate]: { ...currentDay, taskEntries: updatedEntries }
                        };
                    }
                }
            }

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, drawer: state.drawer, settings: state.settings });
            return { tasks: updatedTasks, days: updatedDays, past, future: [] };
        });
    },

    deleteTask: (taskId: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Delete Task');
            const { [taskId]: _, ...restTasks } = state.tasks;

            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {} as Record<string, DayData>);

            // Also remove from Drawer if present
            const updatedDrawer = {
                ...state.drawer,
                tasks: state.drawer.tasks.filter(t => t.taskId !== taskId)
            };

            saveDataToFile({ tasks: restTasks, days: updatedDays, drawer: updatedDrawer });

            toast('Task deleted', {
                action: {
                    label: 'Undo',
                    onClick: () => get().undo(),
                },
            });

            return { tasks: restTasks, days: updatedDays, drawer: updatedDrawer, past, future: [] };
        });
    },

    addTaskToSlot: (slotId: string) => {
        const { currentDate } = get();

        // 1. Create Task Global
        const newTaskId = Date.now().toString();
        const newTaskGlobal: TaskGlobal = {
            title: '',
            createdOn: currentDate,
            createdAt: Date.now(),
            completed: false,
            category: 'scheduled',
            dueDate: null,
        };

        // 2. Create Task Entry
        const newEntry: TaskEntry = {
            taskId: newTaskId,
            category: 'scheduled',
            slotId: slotId,
            rolledOverFrom: null,
            originalCategory: 'todo'
        };

        set((state) => {
            const past = addToHistory(state, state.past, 'Add Task to Slot');
            const currentDayData = state.days[currentDate] || { taskEntries: [] };

            const newState = {
                tasks: { ...state.tasks, [newTaskId]: newTaskGlobal },
                days: {
                    ...state.days,
                    [currentDate]: {
                        ...currentDayData,
                        taskEntries: [...currentDayData.taskEntries, newEntry]
                    }
                },
                editingTaskId: newTaskId
            };

            saveDataToFile({ tasks: newState.tasks, days: newState.days, drawer: state.drawer });
            return { ...newState, past, future: [] };
        });
    },

    changeTaskCategory: (taskId: string, newCategory: string) => {
        const { tasks, currentDate, days } = get();
        const task = tasks[taskId];
        if (!task) return;

        const currentDay = days[currentDate];
        const entry = currentDay?.taskEntries.find(t => t.taskId === taskId);

        if (entry && entry.category === 'scheduled') {
            set((state) => {
                const past = addToHistory(state, state.past, 'Change Task Type');

                const updatedEntries = state.days[currentDate].taskEntries.map(t => {
                    if (t.taskId === taskId) {
                        return { ...t, originalCategory: newCategory };
                    }
                    return t;
                });

                const updatedDays = {
                    ...state.days,
                    [currentDate]: { ...state.days[currentDate], taskEntries: updatedEntries }
                };

                saveDataToFile({ tasks: state.tasks, days: updatedDays, drawer: state.drawer });
                return { days: updatedDays, past, future: [] };
            });
        } else {
            get().moveTask(taskId, newCategory);
        }
    },

    updateTaskTitle: (taskId: string, newTitle: string) => {
        set((state) => {
            const past = addToHistory(state, state.past);
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], title: newTitle }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days, drawer: state.drawer });
            return { tasks: updatedTasks, past, future: [] };
        });
    },

    setTaskDueDate: (taskId: string, dueDate: string | null) => {
        set((state) => {
            const task = state.tasks[taskId];
            if (!task) return {};

            const past = addToHistory(state, state.past, dueDate ? 'Set Due Date' : 'Clear Due Date');
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...task, dueDate }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days, drawer: state.drawer, settings: state.settings });
            return { tasks: updatedTasks, past, future: [] };
        });
    },

    updateDayData: (updates: Partial<DayData>) => {
        const { currentDate, days } = get();
        set((state) => {
            const past = addToHistory(state, state.past);
            const currentDay = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, ...updates }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, drawer: state.drawer });
            return { days: updatedDays, past, future: [] };
        });
    },

    moveTask: (taskId: string, targetCategory: string, slotId: string | null = null, overTaskId: string | null = null) => {
        const { currentDate, days, tasks } = get();
        const currentDay = days[currentDate];
        if (!currentDay) return;

        const taskEntryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDay.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        let newGlobalCategory = tasks[taskId].category;
        if (targetCategory !== 'scheduled') {
            newGlobalCategory = targetCategory;
        }

        set((state) => {
            const past = addToHistory(state, state.past);
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], category: newGlobalCategory }
            };

            const updatedEntries = [...state.days[currentDate].taskEntries];
            const [movedEntry] = updatedEntries.splice(taskEntryIndex, 1);

            // Determine originalCategory persistence
            let originalCategory = movedEntry.originalCategory;

            // If we are entering scheduled state for the first time (or from non-scheduled), save the source category
            if (targetCategory === 'scheduled' && movedEntry.category !== 'scheduled') {
                originalCategory = movedEntry.category;
            }
            // If moving OUT of scheduled, we typically drop the originalCategory (or it becomes the new category naturally)
            // But here we are creating a new entry object. If target is NOT scheduled, originalCategory should probably be undefined/cleared.
            else if (targetCategory !== 'scheduled') {
                originalCategory = undefined;
            }

            const newEntry: TaskEntry = {
                ...movedEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                rolledOverFrom: movedEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : movedEntry.rolledOverFrom,
                originalCategory: originalCategory
            };

            let insertIndex = updatedEntries.length;

            if (overTaskId) {
                const overIndex = updatedEntries.findIndex(t => t.taskId === overTaskId);
                if (overIndex !== -1) {
                    insertIndex = overIndex;
                }
            }

            updatedEntries.splice(insertIndex, 0, newEntry);

            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, drawer: state.drawer });

            return { tasks: updatedTasks, days: updatedDays, past, future: [] };
        });
    },

    reorderTask: (activeTaskId: string, overTaskId: string) => {
        const { currentDate, days } = get();
        const currentDay = days[currentDate];
        if (!currentDay) return;

        const oldIndex = currentDay.taskEntries.findIndex(t => t.taskId === activeTaskId);
        const newIndex = currentDay.taskEntries.findIndex(t => t.taskId === overTaskId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const updatedEntries = [...currentDay.taskEntries];
        const [movedItem] = updatedEntries.splice(oldIndex, 1);
        updatedEntries.splice(newIndex, 0, movedItem);

        set((state) => {
            const past = addToHistory(state, state.past);
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, drawer: state.drawer });
            return { days: updatedDays, past, future: [] };
        });
    },

    undo: () => {
        set((state) => {
            const { past, future } = state;
            if (past.length === 0) return {};

            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);

            // Push current to future
            const newFuture = [createSnapshot(state), ...future];

            // Restore state
            saveDataToFile({ tasks: previous.tasks, days: previous.days, drawer: previous.drawer, settings: state.settings });
            return {
                tasks: previous.tasks,
                days: previous.days,
                drawer: previous.drawer,
                past: newPast,
                future: newFuture
            };
        });
    },

    redo: () => {
        set((state) => {
            const { past, future } = state;
            if (future.length === 0) return {};

            const next = future[0];
            const newFuture = future.slice(1);

            // Push current to past
            const newPast = addToHistory(state, past);

            toast.info('Redid last action');

            // Restore state
            saveDataToFile({ tasks: next.tasks, days: next.days, drawer: next.drawer, settings: state.settings });
            return {
                tasks: next.tasks,
                days: next.days,
                drawer: next.drawer,
                past: newPast,
                future: newFuture
            };
        });
    },

    checkRollover: (dateToCheck: string) => {
        const { days, tasks } = get();
        const dayData = days[dateToCheck] || { taskEntries: [], gratefulness: '', reflections: '', rolloverComplete: false };

        const prevDateString = getDateOffset(dateToCheck, -1);
        const prevDayData = days[prevDateString];

        if (!prevDayData) return;

        const tasksToRollover = prevDayData.taskEntries.filter(entry => {
            const task = tasks[entry.taskId];
            return task && !task.completed;
        }).map(entry => {
            const task = tasks[entry.taskId];
            return {
                taskId: entry.taskId,
                category: task.category,
                slotId: null,
                rolledOverFrom: prevDateString,
                _fallbackCategory: task.category
            };
        });

        const tasksToKeep = dayData.taskEntries.filter(entry => {
            const task = tasks[entry.taskId];
            if (entry.rolledOverFrom && task && task.completed) {
                return false;
            }
            return task;
        });

        const existingIds = new Set(tasksToKeep.map(t => t.taskId));
        const newRollovers = tasksToRollover.filter(t => !existingIds.has(t.taskId));
        const hasChanges = newRollovers.length > 0 || tasksToKeep.length !== dayData.taskEntries.length;

        if (!hasChanges) {
            if (!dayData.rolloverComplete) {
                set((state) => ({
                    days: {
                        ...state.days,
                        [dateToCheck]: { ...dayData, rolloverComplete: true }
                    }
                }));
            }
            return;
        }

        const finalEntries: TaskEntry[] = [...tasksToKeep, ...newRollovers].map(entry => ({
            taskId: entry.taskId,
            category: entry.category || (entry as any)._fallbackCategory || 'todo',
            slotId: entry.slotId,
            rolledOverFrom: entry.rolledOverFrom
        }));

        set((state) => {
            const updatedDays = {
                ...state.days,
                [dateToCheck]: {
                    ...dayData,
                    taskEntries: finalEntries,
                    rolloverComplete: true
                }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, drawer: state.drawer });
            return { days: updatedDays };
        });

        console.log(`Rollover executed for ${dateToCheck}. Added ${newRollovers.length} tasks.`);
    },

    // --- Drawer Actions ---

    toggleDrawer: () => {
        set((state) => {
            const newSettings = { ...state.settings, isDrawerOpen: !state.settings.isDrawerOpen };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    addDrawerFolder: (name: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Add Drawer Folder');
            const newFolder = {
                id: Date.now().toString(),
                name,
                isExpanded: true
            };
            const updatedDrawer = {
                ...state.drawer,
                folders: [...state.drawer.folders, newFolder]
            };
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer, past, future: [] };
        });
    },

    deleteDrawerFolder: (folderId: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Delete Drawer Folder');
            // Delete folder and move tasks to Inbox (null folderId)
            const updatedFolders = state.drawer.folders.filter(f => f.id !== folderId);
            const updatedTasks = state.drawer.tasks.map(t =>
                t.folderId === folderId ? { ...t, folderId: null } : t
            );

            const updatedDrawer = {
                folders: updatedFolders,
                tasks: updatedTasks
            };
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer, past, future: [] };
        });
    },

    toggleDrawerFolder: (folderId: string) => {
        set((state) => {
            const updatedFolders = state.drawer.folders.map(f =>
                f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f
            );
            const updatedDrawer = { ...state.drawer, folders: updatedFolders };
            // Folders expansion state is purely UI usually, but we persist it in data struct so valid to save.
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer };
        });
    },

    updateDrawerFolder: (folderId: string, name: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Rename Drawer Folder');
            const updatedFolders = state.drawer.folders.map(f =>
                f.id === folderId ? { ...f, name } : f
            );
            const updatedDrawer = { ...state.drawer, folders: updatedFolders };
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer, past, future: [] };
        });
    },

    addDrawerTask: (title: string, folderId: string | null) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Add Drawer Task');
            const currentDate = getYYYYMMDD(new Date());

            // Create Global Task
            const newTaskId = Date.now().toString();
            const newTaskGlobal: TaskGlobal = {
                title,
                createdOn: currentDate,
                createdAt: Date.now(),
                completed: false,
                category: 'drawer', // Marker category
                dueDate: null,
            };

            // Create Drawer Entry
            const newDrawerEntry = {
                taskId: newTaskId,
                folderId,
                addedAt: currentDate
            };

            const updatedTasks = { ...state.tasks, [newTaskId]: newTaskGlobal };
            const updatedDrawer = {
                ...state.drawer,
                tasks: [...state.drawer.tasks, newDrawerEntry]
            };

            saveDataToFile({ tasks: updatedTasks, days: state.days, drawer: updatedDrawer });
            return { tasks: updatedTasks, drawer: updatedDrawer, past, future: [] };
        });
    },

    toggleDrawerTask: (taskId: string) => {
        // Just wraps toggleTask but we might want history context?
        // Actually toggleTask is generic enough.
        get().toggleTask(taskId);
    },

    deleteDrawerTask: (taskId: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Delete Drawer Task');

            // Remove from Drawer List
            const updatedDrawerTasks = state.drawer.tasks.filter(t => t.taskId !== taskId);
            const updatedDrawer = { ...state.drawer, tasks: updatedDrawerTasks };

            // Optional: Remove from global tasks? 
            // If we treat drawer as just a view, maybe we should keep it unless explicitly deleted?
            // Use case: "Delete from Drawer" -> likely "Archive/Delete".
            // Let's delete it fully like normal delete.
            const { [taskId]: _, ...restTasks } = state.tasks;

            // Also ensure it's gone from any days (if it was somehow there too)
            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {} as Record<string, DayData>);


            saveDataToFile({ tasks: restTasks, days: updatedDays, drawer: updatedDrawer });
            return { tasks: restTasks, days: updatedDays, drawer: updatedDrawer, past, future: [] };
        });
    },

    updateDrawerTaskTitle: (taskId: string, newTitle: string) => {
        get().updateTaskTitle(taskId, newTitle);
    },

    moveDrawerTask: (taskId: string, targetFolderId: string | null, targetIndex?: number) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Move Drawer Task');
            let updatedTasks = [...state.drawer.tasks];
            const taskIndex = updatedTasks.findIndex(t => t.taskId === taskId);
            if (taskIndex === -1) return {};

            // Remove from old position
            const [task] = updatedTasks.splice(taskIndex, 1);
            task.folderId = targetFolderId;

            // If index is provided, insert at specific position relative to the filtered list
            if (typeof targetIndex === 'number') {
                const targetFolderTasks = updatedTasks.filter(t => t.folderId === targetFolderId);

                if (targetIndex >= targetFolderTasks.length) {
                    updatedTasks.push(task);
                } else {
                    const splitTask = targetFolderTasks[targetIndex];
                    const splitGlobalIndex = updatedTasks.indexOf(splitTask);
                    updatedTasks.splice(splitGlobalIndex, 0, task);
                }
            } else {
                // Default: Append to end of list (or maybe top? usually end)
                updatedTasks.push(task);
            }

            const updatedDrawer = { ...state.drawer, tasks: updatedTasks };
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer, past, future: [] };
        });
    },

    reorderDrawerFolders: (activeId: string, overId: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Reorder Drawer Folders');
            const oldIndex = state.drawer.folders.findIndex(f => f.id === activeId);
            const newIndex = state.drawer.folders.findIndex(f => f.id === overId);

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return {};

            const updatedFolders = [...state.drawer.folders];
            const [moved] = updatedFolders.splice(oldIndex, 1);
            updatedFolders.splice(newIndex, 0, moved);

            const updatedDrawer = { ...state.drawer, folders: updatedFolders };
            saveDataToFile({ tasks: state.tasks, days: state.days, drawer: updatedDrawer });
            return { drawer: updatedDrawer, past, future: [] };
        });
    },

    moveTaskToDrawer: (taskId: string, targetFolderId: string | null) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Move Task To Drawer');
            const currentDate = getYYYYMMDD(new Date());

            // 1. Remove from all Days (clean rollover)
            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {} as Record<string, DayData>);

            // 2. Add to Drawer (if not exists)
            let updatedDrawerTasks = [...state.drawer.tasks];
            if (!updatedDrawerTasks.find(t => t.taskId === taskId)) {
                updatedDrawerTasks.push({
                    taskId,
                    folderId: targetFolderId,
                    addedAt: currentDate
                });
            } else {
                // Update folder if already there
                updatedDrawerTasks = updatedDrawerTasks.map(t =>
                    t.taskId === taskId ? { ...t, folderId: targetFolderId } : t
                );
            }

            const updatedDrawer = { ...state.drawer, tasks: updatedDrawerTasks };

            // 3. Update Global Category for housekeeping
            const updatedTasksGlobal = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], category: 'drawer' }
            };

            saveDataToFile({ tasks: updatedTasksGlobal, days: updatedDays, drawer: updatedDrawer });
            return { tasks: updatedTasksGlobal, days: updatedDays, drawer: updatedDrawer, past, future: [] };
        });
    },

    moveTaskFromDrawerToDay: (taskId: string, date: string, category: string, index?: number, slotId?: string) => {
        set((state) => {
            const past = addToHistory(state, state.past, 'Move Task From Drawer');

            // 1. Remove from Drawer
            const updatedDrawerTasks = state.drawer.tasks.filter(t => t.taskId !== taskId);
            const updatedDrawer = { ...state.drawer, tasks: updatedDrawerTasks };

            // 2. Update Global Category
            const updatedTasksGlobal = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], category }
            };

            // 3. Add to Day
            const updatedEntries = [...(state.days[date]?.taskEntries || [])];
            const newDayEntry: TaskEntry = {
                taskId,
                category,
                slotId: slotId || null,
                rolledOverFrom: null,
                // If moving to scheduled, use existing category if known, else undefined?
                // Actually if we move from drawer to day, we are "resetting" its context usually.
            };

            if (typeof index === 'number') {
                updatedEntries.splice(index, 0, newDayEntry);
            } else {
                updatedEntries.push(newDayEntry);
            }

            const updatedDays = {
                ...state.days,
                [date]: { ...state.days[date], taskEntries: updatedEntries }
            };

            saveDataToFile({ tasks: updatedTasksGlobal, days: updatedDays, drawer: updatedDrawer });
            return { tasks: updatedTasksGlobal, days: updatedDays, drawer: updatedDrawer, past, future: [] };
        });
    },

    updateScheduleSettings: (newScheduleSettings: Partial<ScheduleSettings>) => {
        set((state) => {
            const newSettings = {
                ...state.settings,
                schedule: {
                    ...state.settings.schedule,
                    ...newScheduleSettings
                }
            };
            saveSettingsToFile(newSettings);
            return { settings: newSettings };
        });
    },

    setDayScheduleOverride: (date: string, override: DayScheduleOverride | null) => {
        set((state) => {
            const currentDay = state.days[date] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [date]: { ...currentDay, scheduleOverride: override || undefined }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, drawer: state.drawer });
            return { days: updatedDays };
        });
    }

}));
