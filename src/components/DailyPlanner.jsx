import React from 'react';
import { usePlannerState } from '../hooks/usePlannerState';
import { CONFIG } from '../constants/config';
import PlannerHeader from './PlannerHeader';
import TaskBoard from './TaskBoard';
import Timeline from './Timeline';

const DailyPlanner = () => {
    const {
        currentDate,
        setCurrentDate,
        handleDateChange,
        jumpToToday,
        isToday,
        isDarkMode,
        toggleTheme,
        currentDayData,
        allTasks,
        handleAddTask,
        toggleTask,
        deleteTask,
        handleEditTask,
        handleDragStart,
        handleDrop,
        updateDayData,
        getCategoryTasks
    } = usePlannerState();

    const incompleteCount =
        getCategoryTasks('must-do').length +
        getCategoryTasks('communications').length +
        getCategoryTasks('todo').length;

    return (
        <div className={`flex flex-col h-full ${isDarkMode ? 'dark' : ''}`}>
            <div className="flex flex-col h-full bg-neutral-950 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans overflow-hidden">

                <PlannerHeader
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onDateChange={handleDateChange}
                    onJumpToToday={jumpToToday}
                    isToday={isToday}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                    incompleteCount={incompleteCount}
                />

                <div className="flex-1 flex overflow-hidden p-6 gap-6">

                    <TaskBoard
                        categories={CONFIG.limits} // Just creating a dependency if we need it later, but component uses explicit columns for now
                        currentDayData={currentDayData}
                        allTasks={allTasks}
                        configLimits={CONFIG.limits}
                        onAddTask={handleAddTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onEditTask={handleEditTask}
                        onUpdateDayData={updateDayData}
                    />

                    <Timeline
                        currentDayData={currentDayData}
                        allTasks={allTasks}
                        isToday={isToday}
                        config={CONFIG}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onEditTask={handleEditTask}
                    />

                </div>
            </div>
        </div>
    );
};

export default DailyPlanner;
