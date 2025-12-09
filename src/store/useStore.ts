import { create } from 'zustand';
// import { CONFIG } from '../constants/config';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
import { loadDataFromFile, saveDataToFile, loadTheme, getCustomSavePath, setCustomSavePath } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';
import { Store, StoreState, TaskEntry, TaskGlobal, DayData } from './types';

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
        if (!data.settings.shortcuts) {
            // Migration: Add shortcuts if missing in existing settings
            data.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
        }
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
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
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
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
            return { settings: newSettings };
        });
    },

    toggleGratefulness: () => {
        set((state) => {
            const newSettings = { ...state.settings, showGratefulness: !state.settings.showGratefulness };
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
            return { settings: newSettings };
        });
    },

    toggleReflection: () => {
        set((state) => {
            const newSettings = { ...state.settings, showReflection: !state.settings.showReflection };
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
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
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
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
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
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
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
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
            const updatedEntries = [...state.days[currentDate].taskEntries];
            // Insert after original
            updatedEntries.splice(entryIndex + 1, 0, newEntry);

            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };

            const updatedTasks = { ...state.tasks, [newTaskId]: newTaskGlobal };

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, settings: state.settings });
            return { tasks: updatedTasks, days: updatedDays };
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
            saveDataToFile({ tasks: newState.tasks, days: newState.days, settings: state.settings });
            return newState;
        });
    },

    toggleTask: (taskId: string) => {
        const { currentDate } = get();
        set((state) => {
            const task = state.tasks[taskId];
            if (!task) return {};

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
            return { tasks: updatedTasks, days: updatedDays };
        });
    },

    deleteTask: (taskId: string) => {
        set((state) => {
            const { [taskId]: _, ...restTasks } = state.tasks;

            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {} as Record<string, DayData>);

            saveDataToFile({ tasks: restTasks, days: updatedDays, settings: state.settings });
            return { tasks: restTasks, days: updatedDays };
        });
    },

    updateTaskTitle: (taskId: string, newTitle: string) => {
        set((state) => {
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], title: newTitle }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days, settings: state.settings });
            return { tasks: updatedTasks };
        });
    },

    updateDayData: (updates: Partial<DayData>) => {
        const { currentDate, days } = get();
        set((state) => {
            const currentDay = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, ...updates }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, settings: state.settings });
            return { days: updatedDays };
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

            saveDataToFile({ tasks: updatedTasks, days: updatedDays, settings: state.settings });
            return { tasks: updatedTasks, days: updatedDays };
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
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, settings: state.settings });
            return { days: updatedDays };
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
            saveDataToFile({ tasks: state.tasks, days: updatedDays, settings: state.settings });
            return { days: updatedDays };
        });

        console.log(`Rollover executed for ${dateToCheck}. Added ${newRollovers.length} tasks.`);
    }

}));
