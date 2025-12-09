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
}

export interface PlannerData {
    tasks: Record<string, TaskGlobal>;
    days: Record<string, DayData>;
    settings: PlannerSettings;
}

export interface StoreState extends PlannerData {
    currentDate: string;
    selectedTaskId: string | null;
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
    addTask: (category: string, title: string) => void;

