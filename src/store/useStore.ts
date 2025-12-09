import { create } from 'zustand';
import { CONFIG } from '../constants/config';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
import { loadDataFromFile, saveDataToFile, loadTheme } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';
import { Store, StoreState, TaskEntry, TaskGlobal, DayData } from './types';

// Helper to get initial state
const getInitialState = (): Partial<StoreState> => {
    const data = loadDataFromFile();
    // Ensure minimal structure exists
    if (!data.tasks) data.tasks = {};
    if (!data.days) data.days = {};
    if (!data.settings) {
        // Default settings
        data.settings = {
            isDarkMode: loadTheme(), // Fallback to existing local storage theme if present
            soundEnabled: true,
            showGratefulness: true,
            showReflection: true,
            shortcuts: { ...DEFAULT_SHORTCUTS }
        };
    } else if (!data.settings.shortcuts) {
        // Migration: Add shortcuts if missing in existing settings
        data.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
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

    // --- Actions ---

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
        set(state => {
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
        set(state => {
            const newSettings = { ...state.settings, soundEnabled: !state.settings.soundEnabled };
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
            return { settings: newSettings };
        });
    },

    toggleGratefulness: () => {
        set(state => {
            const newSettings = { ...state.settings, showGratefulness: !state.settings.showGratefulness };
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
            return { settings: newSettings };
        });
    },

    toggleReflection: () => {
        set(state => {
            const newSettings = { ...state.settings, showReflection: !state.settings.showReflection };
            saveDataToFile({ tasks: state.tasks, days: state.days, settings: newSettings });
            return { settings: newSettings };
        });
    },

    // Keyboard & Selection
    updateShortcut: (actionId: string, newKey: string) => {
        set(state => {
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
        set({ selectedTaskId: taskId });
    },

    setHoveredTaskId: (taskId: string | null) => {
        set({ hoveredTaskId: taskId });
    },

    // Task Actions
    addTask: (category: string, title: string) => {
        const { currentDate, days, tasks } = get();

        // Limit Check - REMOVED (User Request: Suggestion only)
        const currentDayData: DayData = days[currentDate] || { taskEntries: [] };
        // const categoryCount = currentDayData.taskEntries.filter(t => {
        //     const task = tasks[t.taskId];
        //     return task && !task.completed && t.category === category;
        // }).length;

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

        set(state => {
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
        const { currentDate, days } = get();
        set(state => {
            const task = state.tasks[taskId];
            if (!task) return state;

            const isCompleting = !task.completed;
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...task, completed: isCompleting }
            };

            let updatedDays = state.days;

            // If we are completing the task, check if we need to "adopt" it to the current day
            // (Remove rolledOverFrom marker)
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
        set(state => {
            const { [taskId]: _, ...restTasks } = state.tasks;

            // Clean up daily references
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
        set(state => {
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
        set(state => {
            const currentDay = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, ...updates }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, settings: state.settings });
            return { days: updatedDays };
        });
    },

    // Move logic (Drag and Drop Helper)
    moveTask: (taskId: string, targetCategory: string, slotId: string | null = null, overTaskId: string | null = null) => {
        const { currentDate, days, tasks } = get();
        const currentDay = days[currentDate];
        if (!currentDay) return;

        const taskEntryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDay.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        // Global category update (unless scheduled)
        let newGlobalCategory = tasks[taskId].category;
        if (targetCategory !== 'scheduled') {
            newGlobalCategory = targetCategory;
        }

        set(state => {
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], category: newGlobalCategory }
            };

            const updatedEntries = [...state.days[currentDate].taskEntries];

            // Remove from old position
            const [movedEntry] = updatedEntries.splice(taskEntryIndex, 1);

            // Update entry data
            const newEntry: TaskEntry = {
                ...movedEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                // Preserve rollover unless specifically cleared or loop logic requires it
                rolledOverFrom: movedEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : movedEntry.rolledOverFrom
            };

            // Calculate insert position
            let insertIndex = updatedEntries.length; // Default to append

            if (overTaskId) {
                const overIndex = updatedEntries.findIndex(t => t.taskId === overTaskId);
                if (overIndex !== -1) {
                    insertIndex = overIndex;
                }
            }

            // Insert at new position
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

        set(state => {
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays, settings: state.settings });
            return { days: updatedDays };
        });
    },

    // Rollover Logic
    checkRollover: (dateToCheck: string) => {
        const { days, tasks } = get();
        const dayData = days[dateToCheck] || { taskEntries: [], gratefulness: '', reflections: '', rolloverComplete: false };

        const prevDateString = getDateOffset(dateToCheck, -1);
        const prevDayData = days[prevDateString];

        // Ensure previous day actually exists or has data
        if (!prevDayData) return;

        // 1. Identify rollover candidates
        const tasksToRollover = prevDayData.taskEntries.filter(entry => {
            const task = tasks[entry.taskId];
            return task && !task.completed;
        }).map(entry => {
            const task = tasks[entry.taskId];

            // Actually entry is TaskEntry.

            return {
                taskId: entry.taskId,
                category: task.category, // Reset to global category
                slotId: null,
                rolledOverFrom: prevDateString,
                _fallbackCategory: task.category
            };
        });

        // 2. Merge with existing "Keepers"
        const tasksToKeep = dayData.taskEntries.filter(entry => {
            const task = tasks[entry.taskId];
            // Fix: If a task was rolled over and is now completed, remove it from this day
            if (entry.rolledOverFrom && task && task.completed) {
                return false;
            }
            return task;
        });

        const existingIds = new Set(tasksToKeep.map(t => t.taskId));

        // Only add tasks that are NOT already in today's list
        const newRollovers = tasksToRollover.filter(t => !existingIds.has(t.taskId));

        // Check if we need to update:
        // 1. If we have new rollovers to add
        // 2. OR if we filtered out some existing tasks (completed rollovers) - i.e. count changed
        const hasChanges = newRollovers.length > 0 || tasksToKeep.length !== dayData.taskEntries.length;

        if (!hasChanges) {
            // Nothing new to add and nothing removed.
            // If we haven't marked rolloverComplete yet, do it.
            if (!dayData.rolloverComplete) {
                set(state => ({
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
            category: entry.category || (entry as any)._fallbackCategory || 'todo', // Ensure string
            slotId: entry.slotId,
            rolledOverFrom: entry.rolledOverFrom
        }));

        set(state => {
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
