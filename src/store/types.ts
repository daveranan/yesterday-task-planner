export interface TaskGlobal {
    title: string;
    createdOn: string; // YYYY-MM-DD
    createdAt?: number; // Timestamp for animation handling
    completed: boolean;
    category: string;
}

export interface TaskEntry {
    taskId: string;
    category: string; // 'must-do' | 'communications' | 'todo' | 'scheduled'
    slotId: string | null;
    rolledOverFrom: string | null; // Date string or null
    originalCategory?: string; // Persists category when moved to scheduled
    _fallbackCategory?: string; // transient property used during rollover calculation
    duration?: number; // Duration in blocks (default 1)
}

export interface DayData {
    taskEntries: TaskEntry[];
    gratefulness?: string;
    reflections?: string;
    rolloverComplete?: boolean;
    scheduleOverride?: DayScheduleOverride;
}

export interface DayScheduleOverride {
    startHour: number;
    endHour: number;
    skipHour: number | null; // null means no lunch break
    itemDurationMinutes: number;
}

export interface ScheduleSettings {
    startHour: number;
    endHour: number;
    skipHour: number | null; // null if disabled
    itemDurationMinutes: number; // For future use, mostly
}

export interface DrawerFolder {
    id: string;
    name: string;
    isExpanded: boolean;
}

export interface DrawerTaskEntry {
    taskId: string;
    folderId: string | null; // null for root/inbox
    addedAt: string;
}

export interface PlannerSettings {
    isDarkMode: boolean;
    soundEnabled: boolean;
    showGratefulness: boolean;
    showReflection: boolean;
    shortcuts: Record<string, string>;
    windowWidth?: number;
    windowHeight?: number;
    savePath?: string;
    isDrawerOpen?: boolean;
    schedule: ScheduleSettings;
    columnLimits: Record<string, number>;
}

export interface PlannerData {
    tasks: Record<string, TaskGlobal>;
    days: Record<string, DayData>;
    settings: PlannerSettings;
    drawer: {
        folders: DrawerFolder[];
        tasks: DrawerTaskEntry[];
    };
}

export interface HistorySnapshot {
    tasks: Record<string, TaskGlobal>;
    days: Record<string, DayData>;
    drawer: {
        folders: DrawerFolder[];
        tasks: DrawerTaskEntry[];
    };
    actionDescription?: string;
}

export interface StoreState extends PlannerData {
    currentDate: string;

    // History
    past: HistorySnapshot[];
    future: HistorySnapshot[];

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
    setSavePath: (path: string) => void;
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
    undo: () => void;
    redo: () => void;

    // Drawer Actions
    toggleDrawer: () => void;
    addDrawerFolder: (name: string) => void;
    deleteDrawerFolder: (folderId: string) => void;
    toggleDrawerFolder: (folderId: string) => void;
    updateDrawerFolder: (folderId: string, name: string) => void;
    addDrawerTask: (title: string, folderId: string | null) => void;
    toggleDrawerTask: (taskId: string) => void;
    deleteDrawerTask: (taskId: string) => void;
    updateDrawerTaskTitle: (taskId: string, newTitle: string) => void;
    moveDrawerTask: (taskId: string, targetFolderId: string | null, targetIndex?: number) => void; // null = inbox
    moveTaskToDrawer: (taskId: string, targetFolderId: string | null, targetIndex?: number) => void;
    moveTaskFromDrawerToDay: (taskId: string, date: string, category: string, index?: number, slotId?: string) => void;
    // Schedule Actions
    updateScheduleSettings: (settings: Partial<ScheduleSettings>) => void;
    setDayScheduleOverride: (date: string, override: DayScheduleOverride | null) => void;
    updateColumnLimits: (limits: Partial<Record<string, number>>) => void;
    resizeTask: (taskId: string, duration: number) => void;
}

export type Store = StoreState & StoreActions;
