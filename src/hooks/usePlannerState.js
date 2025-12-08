import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CONFIG } from '../constants/config';
import { loadDataFromFile, saveDataToFile, loadTheme, saveTheme } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';

export const usePlannerState = () => {
    // Pre-calculate today's date string for comparison
    const todayDateString = useMemo(() => getYYYYMMDD(new Date()), []);
    const todayRef = useRef(todayDateString); // Use ref to keep today's date stable for comparisons

    // --- State ---
    const [currentDate, setCurrentDate] = useState(todayDateString);
    const [store, setStore] = useState(() => loadDataFromFile());
    const [isDarkMode, setIsDarkMode] = useState(() => loadTheme());

    const allTasks = store.tasks;

    // --- Derived State ---
    const getDayData = useCallback((date) => store.days[date] || {
        taskEntries: [], // list of { taskId, category, slotId, rolledOverFrom }
        gratefulness: '',
        reflections: '',
        rolloverComplete: false
    }, [store.days]);

    const currentDayData = getDayData(currentDate);
    const isToday = currentDate === todayRef.current; // Use ref for stable comparison

    // Helper to get task entries for a category, filtered by global completion status
    const getCategoryTasks = useCallback((category) => {
        return currentDayData.taskEntries.filter(t => {
            const globalTask = allTasks[t.taskId];
            // Defensive check: Only include if the global task exists and is not completed
            return globalTask && t.category === category && !globalTask.completed;
        });
    }, [currentDayData.taskEntries, allTasks]);


    // --- Task Rollover Logic ---
    useEffect(() => {
        // This effect should run whenever the date changes
        const dayData = getDayData(currentDate);
        const prevDateString = getDateOffset(currentDate, -1);
        const prevDayData = getDayData(prevDateString);

        // Check if the previous day is in the store and has tasks (or was visited)
        const previousDayExists = prevDayData && (prevDayData.taskEntries.length > 0 || prevDayData.rolloverComplete);

        if (previousDayExists) {

            // 1. Identify tasks from the previous day that need to be rolled over
            const tasksToRollover = prevDayData.taskEntries.filter(entry => {
                const task = allTasks[entry.taskId];
                return task && !task.completed;
            }).map(entry => {
                const task = allTasks[entry.taskId];
                return {
                    taskId: entry.taskId,
                    category: task.category, // RESET: Use global category
                    slotId: null, // Reset scheduled time
                    rolledOverFrom: prevDateString, // Flag
                    _fallbackCategory: task.category
                };
            });

            // 2. Clear completed tasks from the *current* day's list that were rolled over
            const tasksToKeep = dayData.taskEntries.filter(entry => {
                const task = allTasks[entry.taskId];
                // Keep if it's an uncompleted task OR it was originally created on this day (rolledOverFrom is falsy)
                return task && (!task.completed || !entry.rolledOverFrom);
            });

            // 3. Merge: Tasks to keep + Tasks to rollover (excluding duplicates)
            const existingTaskIds = new Set(tasksToKeep.map(t => t.taskId));
            const newEntries = [
                ...tasksToKeep,
                ...tasksToRollover.filter(t => !existingTaskIds.has(t.taskId))
            ].map(entry => ({
                ...entry,
                category: entry.category || entry._fallbackCategory
            }));

            // Check if anything actually changed to avoid infinite loops
            const currentIds = dayData.taskEntries.map(t => t.taskId).sort().join(',');
            const newIds = newEntries.map(t => t.taskId).sort().join(',');

            if (currentIds !== newIds || !dayData.rolloverComplete) {

                setStore(prev => ({
                    ...prev,
                    days: {
                        ...prev.days,
                        [currentDate]: {
                            ...dayData,
                            taskEntries: newEntries,
                            rolloverComplete: true, // Mark rollover as complete for this day
                        }
                    }
                }));

                console.log(`Rollover: Updated tasks for ${currentDate}`);
            }
        }
    }, [currentDate, getDayData, allTasks]);

    // --- Persistence Effects ---
    // Save store data on change (local/file system)
    useEffect(() => {
        saveDataToFile(store);
    }, [store]);

    // Save theme preference
    useEffect(() => {
        saveTheme(isDarkMode);
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    // --- Handlers ---

    const handleDateChange = (offset) => {
        setCurrentDate(getDateOffset(currentDate, offset));
    };

    const jumpToToday = () => {
        setCurrentDate(todayRef.current);
    };

    const updateDayData = (updates) => {
        setStore(prev => ({
            ...prev,
            days: {
                ...prev.days,
                [currentDate]: { ...getDayData(currentDate), ...updates }
            }
        }));
    };

    // NEW HANDLER: Update task details in the global store
    const updateTaskInStore = (taskId, updates) => {
        setStore(prev => ({
            ...prev,
            tasks: {
                ...prev.tasks,
                [taskId]: {
                    ...(prev.tasks[taskId] || {}),
                    ...updates
                }
            }
        }));
    };

    const handleAddTask = (category, title) => {
        // --- CORRECTED LIMIT CHECK ---
        const currentCount = currentDayData.taskEntries.filter(t => {
            const globalTask = allTasks[t.taskId];
            return globalTask && !globalTask.completed && t.category === category;
        }).length;

        if (CONFIG.limits[category] && currentCount >= CONFIG.limits[category]) {
            console.error(`Limit reached for ${category}`);
            return;
        }

        const newTaskId = Date.now().toString();

        const newTaskGlobal = {
            title: title,
            createdOn: currentDate,
            completed: false,
            category: category,
        };

        const newDayEntry = {
            taskId: newTaskId,
            category: category,
            slotId: null,
            rolledOverFrom: null,
        };

        setStore(prev => ({
            ...prev,
            tasks: {
                ...prev.tasks,
                [newTaskId]: newTaskGlobal
            },
            days: {
                ...prev.days,
                [currentDate]: {
                    ...currentDayData,
                    taskEntries: [...currentDayData.taskEntries, newDayEntry]
                }
            }
        }));
    };

    const toggleTask = (taskId) => {
        const task = allTasks[taskId];
        if (!task) return;
        updateTaskInStore(taskId, { completed: !task.completed });
    };

    const deleteTask = (taskId) => {
        setStore(prev => {
            const { [taskId]: _, ...restTasks } = prev.tasks;
            return {
                ...prev,
                tasks: restTasks,
                days: Object.entries(prev.days).reduce((acc, [date, day]) => {
                    acc[date] = {
                        ...day,
                        taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                    };
                    return acc;
                }, {})
            };
        });
    };

    const handleEditTask = (taskId, newTitle) => {
        updateTaskInStore(taskId, { title: newTitle });
    };

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e, targetCategory, slotId = null) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');

        const taskEntryIndex = currentDayData.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDayData.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        // Limit check
        if (targetCategory !== 'scheduled' && targetCategory !== taskEntry.category) {
            const currentCount = currentDayData.taskEntries.filter(t => {
                const globalTask = allTasks[t.taskId];
                return globalTask && !globalTask.completed && t.category === targetCategory;
            }).length;

            if (CONFIG.limits[targetCategory] && currentCount >= CONFIG.limits[targetCategory]) {
                console.error(`Limit reached for ${targetCategory}`);
                return;
            }
        }

        if (targetCategory !== 'scheduled') {
            updateTaskInStore(taskId, { category: targetCategory });
        }

        const updatedEntries = [...currentDayData.taskEntries];
        if (taskEntryIndex !== -1) {
            updatedEntries[taskEntryIndex] = {
                ...taskEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                rolledOverFrom: taskEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : taskEntry.rolledOverFrom
            };
        }

        updateDayData({ taskEntries: updatedEntries });
    };


    return {
        // State
        currentDate,
        isToday,
        isDarkMode,
        store,
        currentDayData,
        allTasks,

        // Actions
        setCurrentDate,
        handleDateChange,
        jumpToToday,
        toggleTheme,
        updateDayData,
        handleAddTask,
        toggleTask,
        deleteTask,
        handleEditTask,
        handleDragStart,
        handleDrop,
        getCategoryTasks
    };
};
