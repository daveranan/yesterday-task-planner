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

export interface PlannerSettings {
    isDarkMode: boolean;
    soundEnabled: boolean;
    showGratefulness: boolean;
    showReflection: boolean;
    shortcuts: Record<string, string>;
    windowWidth?: number;
    windowHeight?: number;
}

export interface PlannerData {
    tasks: Record<string, TaskGlobal>;
    days: Record<string, DayData>;
    settings: PlannerSettings;
}

export interface StoreState extends PlannerData {
    currentDate: string;
    activeColumnId: string | null; // 'must-do' | 'communications' | 'todo' | 'scheduled'
    selectedTaskId: string | null;
    hoveredTaskId: string | null;
    grabbedTaskId: string | null;
    editingTaskId: string | null;
    hoveredNewTaskCategory: string | null;
}

export interface StoreActions {
    setCurrentDate: (newDate: string) => void;
    handleDateChange: (offset: number) => void;
    jumpToToday: () => void;
    setTheme: (isDark: boolean) => void;
    toggleTheme: () => void;
    toggleSound: () => void;
    toggleGratefulness: () => void;
    toggleReflection: () => void;
    updateShortcut: (actionId: string, newKey: string) => void;
    setWindowSize: (width: number, height: number) => void; // New action
    addTask: (category: string, title: string) => void;
    setActiveColumn: (columnId: string | null) => void;
    setSelectedTaskId: (taskId: string | null) => void;
    setHoveredTaskId: (taskId: string | null) => void;
    setHoveredNewTaskCategory: (category: string | null) => void;
    setGrabbedTaskId: (taskId: string | null) => void;
    setEditingTaskId: (taskId: string | null) => void;
    duplicateTask: (taskId: string) => void;
    moveTask: (taskId: string, targetCategory: string, slotId?: string | null, overTaskId?: string | null) => void;
    reorderTask: (activeTaskId: string, overTaskId: string) => void;
    checkRollover: (dateToCheck: string) => void;
    toggleTask: (taskId: string) => void;
    deleteTask: (taskId: string) => void;
    updateTaskTitle: (taskId: string, newTitle: string) => void;
    updateDayData: (updates: Partial<DayData>) => void;
}

export type Store = StoreState & StoreActions;
