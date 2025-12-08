import { create } from 'zustand';
import { CONFIG } from '../constants/config';
import { loadDataFromFile, saveDataToFile, loadTheme, saveTheme } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';

// Helper to get initial state
const getInitialState = () => {
    const data = loadDataFromFile();
    // Ensure minimal structure exists
    if (!data.tasks) data.tasks = {};
    if (!data.days) data.days = {};
    return data;
};

export const useStore = create((set, get) => ({
    // --- State ---
    currentDate: getYYYYMMDD(new Date()),
    isDarkMode: loadTheme(),
    tasks: {}, // Global task registry { [taskId]: { title, category, completed, ... } }
    days: {},  // Daily logs { [date]: { taskEntries: [], gratefulness, ... } }

    // Initialize from storage
    ...getInitialState(),

    // --- Actions ---

    setCurrentDate: (newDate) => {
        set({ currentDate: newDate });
        // Trigger rollover check whenever date changes
        get().checkRollover(newDate);
    },

    handleDateChange: (offset) => {
        const newDate = getDateOffset(get().currentDate, offset);
        get().setCurrentDate(newDate);
    },

    jumpToToday: () => {
        const today = getYYYYMMDD(new Date());
        get().setCurrentDate(today);
    },

    setTheme: (isDark) => {
        set({ isDarkMode: isDark });
        saveTheme(isDark);
        document.documentElement.classList.toggle('dark', isDark);
    },

    toggleTheme: () => {
        const newTheme = !get().isDarkMode;
        get().setTheme(newTheme);
    },

    // Task Actions
    addTask: (category, title) => {
        const { currentDate, days, tasks } = get();

        // Limit Check
        const currentDayData = days[currentDate] || { taskEntries: [] };
        const categoryCount = currentDayData.taskEntries.filter(t => {
            const task = tasks[t.taskId];
            return task && !task.completed && t.category === category;
        }).length;

        if (CONFIG.limits[category] && categoryCount >= CONFIG.limits[category]) {
            console.warn(`Limit reached for ${category}`);
            return; // Or throw error / return false to UI
        }

        const newTaskId = Date.now().toString();
        const newTaskGlobal = {
            title,
            createdOn: currentDate,
            completed: false,
            category,
        };

        const newDayEntry = {
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
            saveDataToFile({ tasks: newState.tasks, days: newState.days });
            return newState;
        });
    },

    toggleTask: (taskId) => {
        set(state => {
            const task = state.tasks[taskId];
            if (!task) return state;

            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...task, completed: !task.completed }
            };

            saveDataToFile({ tasks: updatedTasks, days: state.days });
            return { tasks: updatedTasks };
        });
    },

    deleteTask: (taskId) => {
        set(state => {
            const { [taskId]: _, ...restTasks } = state.tasks;

            // Clean up daily references
            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {});

            saveDataToFile({ tasks: restTasks, days: updatedDays });
            return { tasks: restTasks, days: updatedDays };
        });
    },

    updateTaskTitle: (taskId, newTitle) => {
        set(state => {
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], title: newTitle }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days });
            return { tasks: updatedTasks };
        });
    },

    updateDayData: (updates) => {
        const { currentDate, days } = get();
        set(state => {
            const currentDay = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, ...updates }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
            return { days: updatedDays };
        });
    },

    // Move logic (Drag and Drop Helper)
    moveTask: (taskId, targetCategory, slotId = null) => {
        const { currentDate, days, tasks } = get();
        const currentDay = days[currentDate];
        if (!currentDay) return;

        const taskEntryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDay.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        // Limit Check for target category
        if (targetCategory !== 'scheduled' && targetCategory !== taskEntry.category) {
            const count = currentDay.taskEntries.filter(t => {
                const globalTask = tasks[t.taskId];
                return globalTask && !globalTask.completed && t.category === targetCategory;
            }).length;

            if (CONFIG.limits[targetCategory] && count >= CONFIG.limits[targetCategory]) {
                return; // Limit reached
            }
        }

        // Global category update (unless scheduled)
        // If moved to scheduled, we keep its "conceptual" category but assign it a time slot
        // If moved to "todo" from "must-do", we change its category.
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
            updatedEntries[taskEntryIndex] = {
                ...taskEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                // If moving BACK to list from scheduled, keep rollover status? 
                // Logic from before: if moving to scheduled, maybe clear rollover? 
                // Let's keep it simple: preserve unless specifically cleared.
                rolledOverFrom: taskEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : taskEntry.rolledOverFrom
            };

            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, taskEntries: updatedEntries }
            };

            saveDataToFile({ tasks: updatedTasks, days: updatedDays });
            return { tasks: updatedTasks, days: updatedDays };
        });
    },
    tasks: {}, // Global task registry { [taskId]: { title, category, completed, ... } }
    days: {},  // Daily logs { [date]: { taskEntries: [], gratefulness, ... } }

    // Initialize from storage
    ...getInitialState(),

    // --- Actions ---

    setCurrentDate: (newDate) => {
        set({ currentDate: newDate });
        // Trigger rollover check whenever date changes
        get().checkRollover(newDate);
    },

    handleDateChange: (offset) => {
        const newDate = getDateOffset(get().currentDate, offset);
        get().setCurrentDate(newDate);
    },

    jumpToToday: () => {
        const today = getYYYYMMDD(new Date());
        get().setCurrentDate(today);
    },

    setTheme: (isDark) => {
        set({ isDarkMode: isDark });
        saveTheme(isDark);
        document.documentElement.classList.toggle('dark', isDark);
    },

    toggleTheme: () => {
        const newTheme = !get().isDarkMode;
        get().setTheme(newTheme);
    },

    // Task Actions
    addTask: (category, title) => {
        const { currentDate, days, tasks } = get();

        // Limit Check
        const currentDayData = days[currentDate] || { taskEntries: [] };
        const categoryCount = currentDayData.taskEntries.filter(t => {
            const task = tasks[t.taskId];
            return task && !task.completed && t.category === category;
        }).length;

        if (CONFIG.limits[category] && categoryCount >= CONFIG.limits[category]) {
            console.warn(`Limit reached for ${category}`);
            return; // Or throw error / return false to UI
        }

        const newTaskId = Date.now().toString();
        const newTaskGlobal = {
            title,
            createdOn: currentDate,
            completed: false,
            category,
        };

        const newDayEntry = {
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
            saveDataToFile({ tasks: newState.tasks, days: newState.days });
            return newState;
        });
    },

    toggleTask: (taskId) => {
        set(state => {
            const task = state.tasks[taskId];
            if (!task) return state;

            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...task, completed: !task.completed }
            };

            saveDataToFile({ tasks: updatedTasks, days: state.days });
            return { tasks: updatedTasks };
        });
    },

    deleteTask: (taskId) => {
        set(state => {
            const { [taskId]: _, ...restTasks } = state.tasks;

            // Clean up daily references
            const updatedDays = Object.entries(state.days).reduce((acc, [date, day]) => {
                acc[date] = {
                    ...day,
                    taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                };
                return acc;
            }, {});

            saveDataToFile({ tasks: restTasks, days: updatedDays });
            return { tasks: restTasks, days: updatedDays };
        });
    },

    updateTaskTitle: (taskId, newTitle) => {
        set(state => {
            const updatedTasks = {
                ...state.tasks,
                [taskId]: { ...state.tasks[taskId], title: newTitle }
            };
            saveDataToFile({ tasks: updatedTasks, days: state.days });
            return { tasks: updatedTasks };
        });
    },

    updateDayData: (updates) => {
        const { currentDate, days } = get();
        set(state => {
            const currentDay = days[currentDate] || { taskEntries: [], gratefulness: '', reflections: '' };
            const updatedDays = {
                ...state.days,
                [currentDate]: { ...currentDay, ...updates }
            };
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
            return { days: updatedDays };
        });
    },

    // Move logic (Drag and Drop Helper)
    // Move logic (Drag and Drop Helper)
    moveTask: (taskId, targetCategory, slotId = null, overTaskId = null) => {
        const { currentDate, days, tasks } = get();
        const currentDay = days[currentDate];
        if (!currentDay) return;

        const taskEntryIndex = currentDay.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDay.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        // Limit Check for target category
        if (targetCategory !== 'scheduled' && targetCategory !== taskEntry.category) {
            const count = currentDay.taskEntries.filter(t => {
                const globalTask = tasks[t.taskId];
                return globalTask && !globalTask.completed && t.category === targetCategory;
            }).length;

            if (CONFIG.limits[targetCategory] && count >= CONFIG.limits[targetCategory]) {
                return; // Limit reached
            }
        }

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
            const newEntry = {
                ...movedEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                // Preserve rollover unless specifically cleared or loop logic requires it
                rolledOverFrom: movedEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : movedEntry.rolledOverFrom
            };

            // Calculate insert position
            let insertIndex = updatedEntries.length; // Default to append

            if (overTaskId) {
                // If overTaskId is provided, try to insert *before* it? 
                // Or at its index (pushing it down).
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

            saveDataToFile({ tasks: updatedTasks, days: updatedDays });
            return { tasks: updatedTasks, days: updatedDays };
        });
    },

    reorderTask: (activeTaskId, overTaskId) => {
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
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
            return { days: updatedDays };
        });
    },

    // Rollover Logic
    checkRollover: (dateToCheck) => {
        const { days, tasks } = get();
        const dayData = days[dateToCheck] || { taskEntries: [], gratefulness: '', reflections: '', rolloverComplete: false };

        // Note: We intentionally do NOT return early if rolloverComplete is true.
        // We want to allow re-evaluating in case the *previous* day changed (e.g. user went back and added a todo).

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
            // Keep if uncompleted OR locally created
            // If it was a rollover, we only keep it if it's still uncompleted.
            // If the user checked it off, we keep it (completed).
            // Wait, logic:
            // - If I created it today (rolledOverFrom is null), keep it.
            // - If it was rolled over, keep it only if uncompleted?
            //   No, if I completed a rolled-over task today, I want to keep it in today's list as completed.

            // Correction: Rollover logic should essentially "sync" the INCOMPLETE tasks from yesterday.
            // If I completed a rolled-over task, it stays in today's list.
            return task && (!entry.rolledOverFrom || task.completed || !task.completed);
            // Simplified: "return task;" ?
            // No, we want to remove rolled-over tasks that are NO LONGER valid candidates? 
            // Actually, once it's in today's list, it's a first-class citizen.
            // The only thing we want to avoid is DUPLICATES.

            // Let's stick to the previous SAFE logic but consider the "Update" scenario.
            // If I rolled over Task A. It's in Day B.
            // I go to Day A. Task A is still incomplete.
            // I come back to Day B. `tasksToRollover` has Task A.
            // `tasksToKeep` has Task A.
            // `existingIds` will filter it out. Result: No change. Correct.

            // Scenario: I go to Day A. I complete Task A.
            // I come to Day B. `tasksToRollover` does NOT have Task A.
            // `tasksToKeep` HAS Task A.
            // Result: Task A remains in Day B. 
            // Is this desired? If I completed it yesterday, should it vanish from today?
            // Ideally yes.

            if (!task) return false;

            // If it's a rolled over task, we should verify if it's still a valid rollover from the source?
            // Or just check if it's completed?
            // If I completed it *yesterday* (source), `task.completed` is true.
            // So if `entry.rolledOverFrom` is true AND `task.completed` is true, it means it's completed.
            // NOTE: We don't know WHEN it was completed.

            // Let's keep it simple: We keep local tasks. 
            // We rely on the "Merge" to add *missing* candidates.
            // We do NOT remove existing rolled-over tasks even if they are no longer candidates in previous day,
            // because the user might have interacted with them today.
            return true;
        });

        const existingIds = new Set(tasksToKeep.map(t => t.taskId));

        // Only add tasks that are NOT already in today's list
        const newRollovers = tasksToRollover.filter(t => !existingIds.has(t.taskId));

        if (newRollovers.length === 0) {
            // Nothing new to add.
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

        const finalEntries = [...tasksToKeep, ...newRollovers].map(entry => ({
            ...entry,
            category: entry.category || entry._fallbackCategory
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
            saveDataToFile({ tasks: state.tasks, days: updatedDays });
            return { days: updatedDays };
        });

        console.log(`Rollover executed for ${dateToCheck}. Added ${newRollovers.length} tasks.`);
    }

}));
