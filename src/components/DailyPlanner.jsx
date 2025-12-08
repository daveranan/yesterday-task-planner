import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icon } from './Icon';
import Column from './Column';
import TaskItem from './TaskItem';
import { CONFIG } from '../constants/config';
import { loadDataFromFile, saveDataToFile, loadTheme, saveTheme } from '../utils/storage';
import { getYYYYMMDD, getDateOffset } from '../utils/dateUtils';

const DailyPlanner = () => {
    // Pre-calculate today's date string for comparison
    const todayDateString = useMemo(() => getYYYYMMDD(new Date()), []);
    const todayRef = useRef(todayDateString); // Use ref to keep today's date stable for comparisons

    // --- State ---
    const [currentDate, setCurrentDate] = useState(todayDateString);
    const [store, setStore] = useState(() => loadDataFromFile());
    const [currentTimePercentage, setCurrentTimePercentage] = useState(-1);
    const [hoveredSlotId, setHoveredSlotId] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() => loadTheme());

    const allTasks = store.tasks;

    // --- Derived State ---
    const getDayData = useCallback((date) => store.days[date] || {
        taskEntries: [], // NEW: Stores list of { taskId, category, slotId, rolledOverFrom }
        gratefulness: '',
        reflections: '',
        rolloverComplete: false
    }, [store.days]);

    const currentDayData = getDayData(currentDate);
    const isToday = currentDate === todayRef.current; // Use ref for stable comparison

    // Helper to get task entries for a category, filtered by global completion status
    const getCategoryTasks = (category) => {
        return currentDayData.taskEntries.filter(t => {
            const globalTask = allTasks[t.taskId];
            // Defensive check: Only include if the global task exists and is not completed
            return globalTask && t.category === category && !globalTask.completed;
        });
    };


    // --- Task Rollover Logic (FIXED: Continuous & Auto-Correcting) ---
    useEffect(() => {
        // This effect should run whenever the date changes
        const dayData = getDayData(currentDate);
        const prevDateString = getDateOffset(currentDate, -1);
        const prevDayData = getDayData(prevDateString);

        // Check if the previous day is in the store and has tasks (or was visited)
        const previousDayExists = prevDayData && (prevDayData.taskEntries.length > 0 || prevDayData.rolloverComplete);

        // Rollover needs to run if previous day data exists. 
        // Removed the !dayData.rolloverComplete check to allow "catching up" if previous day changes later.
        if (previousDayExists) {

            // 1. Identify tasks from the previous day that need to be rolled over
            const tasksToRollover = prevDayData.taskEntries.filter(entry => {
                const task = allTasks[entry.taskId];
                // Only roll over incomplete tasks. Check GLOBAL category to exclude scheduled items if needed.
                // Assuming 'scheduled' items (time slots) shouldn't roll over as "to-dos".
                const category = task.category || entry.category;
                return task && !task.completed;
            }).map(entry => {
                const task = allTasks[entry.taskId];
                return {
                    taskId: entry.taskId,
                    category: task.category, // RESET: Use global category, effectively "unscheduling" if it was scheduled
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
                // Ensure the entry has a category helper if needed, but we prefer global lookup now.
                // We keep local 'category' for 'scheduled' slots or legacy support.
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
    }, [currentDate, getDayData, allTasks]); // Re-run when date changes or global tasks/days change

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

    // --- Time Logic ---
    // The total time span from 8:00 AM to the end of the 5 PM hour (17:59)
    const workWindowDurationMinutes = useMemo(() => {
        // Total hours spanned (8 AM to 6 PM) is (17 - 8 + 1) = 10 hours = 600 minutes
        // We NOW include the lunch hour in the total span for linear rendering
        return (CONFIG.endHour - CONFIG.startHour + 1) * 60;
    }, []);


    useEffect(() => {
        const updateLinePosition = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();

            if (!isToday || currentHour < CONFIG.startHour || currentHour > CONFIG.endHour) {
                setCurrentTimePercentage(-1);
                return;
            }

            // Calculate elapsed minutes from the start of the work day (CONFIG.startHour)
            // No need to subtract skip hour anymore as it's part of the timeline
            const elapsedMinutes = (currentHour - CONFIG.startHour) * 60 + currentMin;

            // Calculate percentage relative to the total work window duration
            const position = (elapsedMinutes / workWindowDurationMinutes) * 100;

            // console.log(`Time Line Debug: Time: ${currentHour}:${currentMin}, Elapsed: ${elapsedMinutes}min, Total Span: ${workWindowDurationMinutes}min, Position: ${position.toFixed(2)}%`);


            setCurrentTimePercentage(Math.max(0, Math.min(100, position)));
        };

        updateLinePosition();
        const interval = setInterval(updateLinePosition, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isToday, workWindowDurationMinutes]);

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

    // MODIFIED: Adds a task to the global store and to the current day's entries
    const handleAddTask = (category, title) => {

        // --- CORRECTED LIMIT CHECK ---
        // Calculate the count based on INCOMPLETE tasks for the current day/category
        const currentCount = currentDayData.taskEntries.filter(t => {
            const globalTask = allTasks[t.taskId];
            return globalTask && !globalTask.completed && t.category === category;
        }).length;

        if (CONFIG.limits[category] && currentCount >= CONFIG.limits[category]) {
            console.error(`Limit reached for ${category}`);
            return;
        }
        // -----------------------------

        const newTaskId = Date.now().toString();

        const newTaskGlobal = {
            title: title,
            createdOn: currentDate,
            completed: false,
            category: category, // NEW Task Property: Global Category
        };

        const newDayEntry = {
            taskId: newTaskId,
            category: category, // This ensures it is only associated with the correct column
            slotId: null,
            rolledOverFrom: null, // New tasks are not rolled over
        };

        // 1. Update the global tasks list
        setStore(prev => ({
            ...prev,
            tasks: {
                ...prev.tasks,
                [newTaskId]: newTaskGlobal
            },
            // 2. Update the current day's list of entries
            days: {
                ...prev.days,
                [currentDate]: {
                    ...currentDayData,
                    taskEntries: [...currentDayData.taskEntries, newDayEntry]
                }
            }
        }));
    };

    // MODIFIED: Toggles completion status in the global task store
    const toggleTask = (taskId) => {
        const task = allTasks[taskId];
        if (!task) return;

        // Update the task's completed status in the global store
        updateTaskInStore(taskId, { completed: !task.completed });
    };

    // MODIFIED: Deletes a task from the global store AND the current day's entries
    const deleteTask = (taskId) => {

        // 1. Remove the task from the global store
        setStore(prev => {
            const { [taskId]: _, ...restTasks } = prev.tasks;
            return {
                ...prev,
                tasks: restTasks,
                days: Object.entries(prev.days).reduce((acc, [date, day]) => {
                    // 2. Remove the task from ALL day entries (prevents future rollovers)
                    acc[date] = {
                        ...day,
                        taskEntries: day.taskEntries.filter(t => t.taskId !== taskId)
                    };
                    return acc;
                }, {})
            };
        });
    };

    // MODIFIED: Edit Task title in the global store
    const handleEditTask = (taskId, newTitle) => {
        updateTaskInStore(taskId, { title: newTitle });
    };


    // MODIFIED: Drag uses taskId
    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    // MODIFIED: Drop updates the current day's entries
    const handleDrop = (e, targetCategory, slotId = null) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');

        setHoveredSlotId(null);

        const taskEntryIndex = currentDayData.taskEntries.findIndex(t => t.taskId === taskId);
        const taskEntry = currentDayData.taskEntries[taskEntryIndex];
        if (!taskEntry) return;

        // Limit check when dropping into a non-scheduled, limited category
        if (targetCategory !== 'scheduled' && targetCategory !== taskEntry.category) {

            // Correct limit check: only count INCOMPLETE tasks in the target category
            const currentCount = currentDayData.taskEntries.filter(t => {
                const globalTask = allTasks[t.taskId];
                return globalTask && !globalTask.completed && t.category === targetCategory;
            }).length;

            if (CONFIG.limits[targetCategory] && currentCount >= CONFIG.limits[targetCategory]) {
                console.error(`Limit reached for ${targetCategory}`);
                return;
            }
        }

        // Update the category in GLOBAL TASK store if it's a category move (not just time slot)
        if (targetCategory !== 'scheduled') {
            updateTaskInStore(taskId, { category: targetCategory });
        }

        const updatedEntries = [...currentDayData.taskEntries];
        if (taskEntryIndex !== -1) {
            updatedEntries[taskEntryIndex] = {
                ...taskEntry,
                category: targetCategory,
                slotId: targetCategory === 'scheduled' ? slotId : null,
                // Clear rolledOverFrom if manually moved by user
                rolledOverFrom: taskEntry.rolledOverFrom && targetCategory === 'scheduled' ? null : taskEntry.rolledOverFrom
            };
        }

        updateDayData({ taskEntries: updatedEntries });
    };

    // Drag handlers for the time slots
    const handleSlotDragEnter = (slotId) => (e) => {
        e.preventDefault();
        setHoveredSlotId(slotId);
    };
    const handleSlotDragLeave = (e) => {
        const targetElement = e.currentTarget;
        const relatedElement = e.relatedTarget;
        if (relatedElement && targetElement.contains(relatedElement)) return;
        setHoveredSlotId(null);
    };
    const handleSlotDrop = (slotId) => (e) => {
        handleDrop(e, 'scheduled', slotId);
    };


    return (
        // Theme wrapper: applies 'dark' class to the entire container
        <div className={`flex flex-col h-full ${isDarkMode ? 'dark' : ''}`}>
            {/* USE NEUTRAL: Use neutral-950 for the absolute darkest background */}
            <div className="flex flex-col h-full bg-neutral-950 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans overflow-hidden">

                {/* --- Header & Date Nav --- */}
                {/* USE NEUTRAL: Use neutral-900 for the header, neutral-800 for border */}
                <div className="h-16 bg-neutral-900 dark:bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 shadow-xl z-20">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                            <Icon name="Calendar" className="w-5 h-5 text-neutral-500" />
                            Daily Planner
                        </h1>
                        {/* USE NEUTRAL: Use neutral-800 for date selector background, neutral-700 for hover */}
                        <div className="flex items-center bg-neutral-800 rounded-lg p-1">
                            <button onClick={() => handleDateChange(-1)} className="p-1 hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronLeft" className="w-4 h-4 text-neutral-200" /></button>
                            <input
                                type="date"
                                value={currentDate}
                                onChange={(e) => setCurrentDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium px-4 py-1 focus:ring-0 cursor-pointer text-neutral-200"
                            />
                            <button onClick={() => handleDateChange(1)} className="p-1 hover:bg-neutral-700 rounded shadow-sm transition"><Icon name="ChevronRight" className="w-4 h-4 text-neutral-200" /></button>
                        </div>
                        {/* USE NEUTRAL: Use neutral-800 for today button default, neutral-700 for hover */}
                        <button
                            onClick={jumpToToday}
                            disabled={isToday}
                            className={`
                                flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg shadow-md transition-colors
                                ${isToday
                                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                                }`}
                            title="Jump to Today"
                        >
                            <Icon name="Target" className="w-4 h-4" />
                            Today
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* USE NEUTRAL: Use neutral-800 for theme button hover background */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            <Icon name={isDarkMode ? "Sun" : "Moon"} className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-neutral-400 flex items-center gap-2">
                            {isToday ? 'Today' : 'Viewing Past/Future Day'}
                            {/* USE NEUTRAL: Use neutral-950 for badge for maximum contrast */}
                            <span className="ml-2 px-2 py-1 bg-neutral-950 text-neutral-300 rounded-full text-xs">
                                {getCategoryTasks('must-do').length + getCategoryTasks('communications').length + getCategoryTasks('todo').length} incomplete tasks
                            </span>
                        </span>
                    </div>
                </div>

                {/* --- Main Content Area --- */}
                <div className="flex-1 flex overflow-hidden p-6 gap-6">

                    {/* LEFT SECTION (Columns) */}
                    <div className="flex-[3] flex flex-col gap-6">
                        {/* USE NEUTRAL: Column containers use bg-neutral-900 (darker card base) and border-neutral-800 */}
                        <div className="flex-[2] flex gap-6 min-h-0">
                            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden">
                                <Column
                                    title="Must-Do's"
                                    category="must-do"
                                    limit={CONFIG.limits['must-do']}
                                    tasks={currentDayData.taskEntries} // Pass ALL entries
                                    allTasks={allTasks}
                                    handleAddTask={handleAddTask}
                                    handleDrop={handleDrop}
                                    handleDragStart={handleDragStart}
                                    toggleTask={toggleTask}
                                    deleteTask={deleteTask}
                                    handleEditTask={handleEditTask}
                                />
                            </div>
                            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden">
                                <Column
                                    title="Communications"
                                    category="communications"
                                    limit={CONFIG.limits['communications']}
                                    tasks={currentDayData.taskEntries} // Pass ALL entries
                                    allTasks={allTasks}
                                    handleAddTask={handleAddTask}
                                    handleDrop={handleDrop}
                                    handleDragStart={handleDragStart}
                                    toggleTask={toggleTask}
                                    deleteTask={deleteTask}
                                    handleEditTask={handleEditTask}
                                />
                            </div>
                        </div>

                        <div className="flex-[3] bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 overflow-hidden min-h-0">
                            <Column
                                title="To-Do's"
                                category="todo"
                                limit={CONFIG.limits['todo']}
                                tasks={currentDayData.taskEntries} // Pass ALL entries
                                allTasks={allTasks}
                                handleAddTask={handleAddTask}
                                handleDrop={handleDrop}
                                handleDragStart={handleDragStart}
                                toggleTask={toggleTask}
                                deleteTask={deleteTask}
                                handleEditTask={handleEditTask}
                            />
                        </div>

                        {/* USE NEUTRAL: Text area containers use bg-neutral-900 and border-neutral-800 */}
                        <div className="flex-[2] flex gap-6 min-h-0">
                            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 p-4 flex flex-col">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Gratefulness</h3>
                                {/* USE NEUTRAL: Textarea internal background to neutral-800 */}
                                <textarea
                                    className="flex-1 w-full resize-none text-sm border border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-800 text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 focus:shadow-md focus:outline-none"
                                    placeholder="I am grateful for..."
                                    value={currentDayData.gratefulness}
                                    onChange={(e) => updateDayData({ gratefulness: e.target.value })}
                                />
                            </div>
                            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 p-4 flex flex-col">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Reflections</h3>
                                {/* USE NEUTRAL: Textarea internal background to neutral-800 */}
                                <textarea
                                    className="flex-1 w-full resize-none text-sm border border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-800 text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 focus:shadow-md focus:outline-none"
                                    placeholder="Today I learned..."
                                    value={currentDayData.reflections}
                                    onChange={(e) => updateDayData({ reflections: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SECTION (Work Blocks) */}
                    {/* USE NEUTRAL: Work Blocks container to bg-neutral-900 and border-neutral-800 */}
                    <div className="flex-[2] bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 flex flex-col overflow-hidden">
                        {/* USE NEUTRAL: Work Blocks header to bg-neutral-800/50 and border-neutral-800 */}
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
                            <h3 className="font-bold text-neutral-100">Work Blocks</h3>
                            <span className="text-xs text-neutral-400">Skip 12 PM</span>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-style">
                            <div className="relative">
                                {/* Red Current Time Line */}
                                {currentTimePercentage >= 0 && currentTimePercentage <= 100 && isToday && (
                                    <div
                                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                                        style={{ top: `${currentTimePercentage}%` }}
                                    >
                                        <div className="w-full h-[2px] bg-red-500 shadow-sm relative">
                                            <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Time Slots */}
                                {Array.from({ length: CONFIG.endHour - CONFIG.startHour + 1 }, (_, i) => CONFIG.startHour + i).map((hour) => {
                                    const slotId = `${hour}:00`;
                                    const displayTime = hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`;
                                    const isLunch = hour === CONFIG.skipHour;

                                    // Grouping: Start of a 2-hour block (8, 10, 1, 3). Lunch is 12.
                                    // We want separators at 10:00 (end of 8-10), 12:00 (Lunch Start), 13:00 (Lunch End), 15:00 (end of 1-3)
                                    // Standard block starts: 8, 10, 13, 15.
                                    // Visual separation: Add extra top margin or border if it's the start of a new block group (except first).
                                    const isBlockStart = (hour === 10) || (hour === 13) || (hour === 15);

                                    // Filter tasks by slot and completion status
                                    const slotTasks = currentDayData.taskEntries.filter(t =>
                                        t.category === 'scheduled' && t.slotId === slotId
                                    );

                                    if (isLunch) {
                                        return (
                                            <div
                                                key={hour}
                                                className="flex border-b border-neutral-800 min-h-[60px] bg-neutral-950/50"
                                            >
                                                <div className="w-16 p-3 text-right text-xs font-medium text-neutral-500 border-r border-neutral-800 bg-neutral-900/50 flex items-center justify-end">
                                                    {displayTime}
                                                </div>
                                                <div className="flex-1 p-2 flex items-center justify-center text-neutral-600 font-medium tracking-wide uppercase text-xs">
                                                    Lunch Break
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={hour}
                                            className={`flex border-b border-neutral-800 min-h-[80px]
                                                ${isBlockStart ? 'border-t-4 border-t-neutral-800' : ''}
                                            `}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDragEnter={handleSlotDragEnter(slotId)}
                                            onDragLeave={handleSlotDragLeave}
                                            onDrop={handleSlotDrop(slotId)}
                                        >
                                            {/* USE NEUTRAL: Time Label column to neutral-800/50 and border-neutral-800 */}
                                            <div className="w-16 p-3 text-right text-xs font-medium text-neutral-400 border-r border-neutral-800 bg-neutral-800/50">
                                                {displayTime}
                                            </div>
                                            <div className={`flex-1 p-2 relative transition-colors duration-150 
                                                ${hoveredSlotId === slotId
                                                    /* USE NEUTRAL: Drag hover to neutral-800 with neutral-600 border */
                                                    ? 'bg-neutral-800 border-4 border-neutral-600'
                                                    /* USE NEUTRAL: Slot background to neutral-900 and hover to neutral-800/50 */
                                                    : 'bg-neutral-900 hover:bg-neutral-800/50'
                                                }`}
                                            >
                                                {/* Only show incomplete tasks in the slot block */}
                                                {slotTasks.map(task =>
                                                    <TaskItem
                                                        key={task.taskId} // Use taskId as key for consistency
                                                        task={task}
                                                        allTasks={allTasks}
                                                        toggleTask={toggleTask}
                                                        deleteTask={deleteTask}
                                                        handleDragStart={handleDragStart}
                                                        handleEditTask={handleEditTask}
                                                    />)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DailyPlanner;
