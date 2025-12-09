import { create } from 'zustand';
// import { CONFIG } from '../constants/config';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
import { loadDataFromFile, saveDataToFile, saveSettingsToFile, loadTheme, getCustomSavePath, setCustomSavePath } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';
import { toast } from 'sonner';
import { Store, StoreState, TaskEntry, TaskGlobal, DayData, HistorySnapshot } from './types';

const HISTORY_LIMIT = 100;

// Helper to snapshot state
const createSnapshot = (state: StoreState, description: string = 'Unknown Action'): HistorySnapshot => ({
    tasks: state.tasks,
    days: state.days,
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
    if (!data.days) data.days = {};

    const customSavePath = getCustomSavePath();

    if (!data.settings) {
        // Default settings
        data.settings = {
            isDarkMode: loadTheme(), // Fallback to existing local storage theme if present
            soundEnabled: true,
            showGratefulness: true,
            showReflection: true,
            shortcuts: { ...DEFAULT_SHORTCUTS },
            savePath: customSavePath || undefined
        };
    } else {
        // Migration: Merge shortcuts to ensure new defaults exist
        data.settings.shortcuts = {
            ...DEFAULT_SHORTCUTS,
            ...(data.settings.shortcuts || {})
        };

        // Ensure savePath is up to date with local storage source of truth
        data.settings.savePath = customSavePath || undefined;
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
            saveDataToFile({ tasks: state.tasks, days: state.days });
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
        const { currentDate, days, tasks } = get();
        const task = tasks[taskId];
        if (!task) return;

        const currentDay = days[currentDate];
        if (!currentDay) return;

        const entryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
        if (entryIndex === -1) return;

        const newTaskId = Date.now().toString();
        const newTaskGlobal: TaskGlobal = {
            ...task,
            title: `${task.title} (Copy)`,
            createdOn: currentDate,
            completed: false, // duplications are usually uncompleted
        };

        const originalEntry = currentDay.taskEntries[entryIndex];
        const newEntry: TaskEntry = {
            taskId: newTaskId,
            category: originalEntry.category,
            slotId: originalEntry.slotId,
            rolledOverFrom: null,
        };

        set((state) => {
            const past = addToHistory(state, state.past);
            const updatedEntries = [...state.days[currentDate].taskEntries];
            // Insert after original
            updatedEntries.splice(entryIndex + 1, 0, newEntry);

            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };

            const updatedTasks = { ...state.tasks, [newTaskId]: newTaskGlobal };

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, settings: state.settings });
            return { tasks: updatedTasks, days: updatedDays, past, future: [] };
        });
    },
    addTask: (category: string, title: string) => {
        const { currentDate, days } = get();

        const currentDayData: DayData = days[currentDate] || { taskEntries: [] };

        const newTaskId = Date.now().toString();
        const newTaskGlobal: TaskGlobal = {
            title,
            createdOn: currentDate,
            completed: false,
            category,
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
            saveDataToFile({ tasks: newState.tasks, days: newState.days });
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

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, settings: state.settings });
            return { tasks: updatedTasks, days: updatedDays, past, future: [] };
        });
    },

    deleteTask: (taskId: string) => {
        set((state) => {
            const past = addToHistory(state, state.past);
            const { [taskId]: _, ...restTasks } = state.tasks;

            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {} as Record<string, DayData>);

            saveDataToFile({ tasks: restTasks, days: updatedDays });
            return { tasks: restTasks, days: updatedDays, past, future: [] };
        });
    },

    updateTaskTitle: (taskId: string, newTitle: string) => {
        set((state) => {
            const past = addToHistory(state, state.past);
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], title: newTitle }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days });
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
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
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

            const newEntry: TaskEntry = {
                ...movedEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                rolledOverFrom: movedEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : movedEntry.rolledOverFrom
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

            saveDataToFile({ tasks: updatedTasks, days: updatedDays });

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
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
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
            saveDataToFile({ tasks: previous.tasks, days: previous.days, settings: state.settings });
            return {
                tasks: previous.tasks,
                days: previous.days,
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
            saveDataToFile({ tasks: next.tasks, days: next.days, settings: state.settings });
            return {
                tasks: next.tasks,
                days: next.days,
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
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
            return { days: updatedDays };
        });

        console.log(`Rollover executed for ${dateToCheck}. Added ${newRollovers.length} tasks.`);
    }

}));
