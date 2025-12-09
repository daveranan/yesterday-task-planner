export interface TaskGlobal {
    title: string;
    createdOn: string; // YYYY-MM-DD
    completed: boolean;
    category: string;
}

export interface TaskEntry {
    taskId: string;
    category: string; // 'must-do' | 'communications' | 'todo' | 'scheduled'
    slotId: string | null;
    rolledOverFrom: string | null; // Date string or null
    _fallbackCategory?: string; // transient property used during rollover calculation
}

export interface DayData {
    taskEntries: TaskEntry[];
    gratefulness?: string;
    reflections?: string;
    rolloverComplete?: boolean;
}

export interface PlannerData {
    tasks: Record<string, TaskGlobal>;
    days: Record<string, DayData>;
}

export interface StoreState extends PlannerData {
    currentDate: string;
    isDarkMode: boolean;
}

export interface StoreActions {
    setCurrentDate: (newDate: string) => void;
    handleDateChange: (offset: number) => void;
    jumpToToday: () => void;
    setTheme: (isDark: boolean) => void;
    toggleTheme: () => void;
    addTask: (category: string, title: string) => void;
    toggleTask: (taskId: string) => void;
    deleteTask: (taskId: string) => void;
    updateTaskTitle: (taskId: string, newTitle: string) => void;
    updateDayData: (updates: Partial<DayData>) => void;
    moveTask: (taskId: string, targetCategory: string, slotId?: string | null, overTaskId?: string | null) => void;
    reorderTask: (activeTaskId: string, overTaskId: string) => void;
    checkRollover: (dateToCheck: string) => void;
}

export type Store = StoreState & StoreActions;
