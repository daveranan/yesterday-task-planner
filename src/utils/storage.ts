/* eslint-disable @typescript-eslint/no-explicit-any */
export const isElectron = window && (window as any).process && (window as any).process.type;
// Note: In strict Electron nodeIntegration:true, window.require is available.
// However, checking window.process.type is safer for renderer.
// The original code used window.require check.
const isElectronApp = (): boolean => {
    return typeof window !== 'undefined' && typeof (window as any).require === 'function';
};

const storageKey = 'daily_planner_data';
const themeKey = 'planner_theme';

const saveDataToLocalStorage = (key: string, data: any): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Could not save data to localStorage", e);
    }
};

export const loadDataFromLocalStorage = (key: string): any => {
    try {
        const savedData = localStorage.getItem(key);
        return savedData ? JSON.parse(savedData) : null;
    } catch (e) {
        console.error("Could not load data from localStorage", e);
        return null;
    }
};

export const saveDataToFile = (data: any): void => {
    if (!isElectronApp()) {
        saveDataToLocalStorage(storageKey, data);
        return;
    }
    try {
        const requireFunc = (window as any).require;
        const fs = requireFunc('fs');
        const path = requireFunc('path');
        const os = requireFunc('os');
        const savePath = path.join(os.homedir(), 'DailyPlannerData.json');
        fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('Data saved successfully to:', savePath);
    } catch (e) {
        console.error("Error saving file via Electron FS:", e);
        saveDataToLocalStorage(storageKey, data);
    }
};

export const loadDataFromFile = (): any => {
    if (!isElectronApp()) {
        return loadDataFromLocalStorage(storageKey) || { tasks: {}, days: {} };
    }
    try {
        const requireFunc = (window as any).require;
        const fs = requireFunc('fs');
        const path = requireFunc('path');
        const os = requireFunc('os');
        const loadPath = path.join(os.homedir(), 'DailyPlannerData.json');
        if (fs.existsSync(loadPath)) {
            const data = fs.readFileSync(loadPath, 'utf-8');
            console.log('Data loaded successfully from:', loadPath);
            return JSON.parse(data);
        }
        return { tasks: {}, days: {} };
    } catch (e) {
        console.error("Error loading file via Electron FS:", e);
        return loadDataFromLocalStorage(storageKey) || { tasks: {}, days: {} };
    }
};

export const saveTheme = (isDark: boolean): void => {
    saveDataToLocalStorage(themeKey, isDark ? 'dark' : 'light');
};

export const loadTheme = (): boolean => {
    return loadDataFromLocalStorage(themeKey) === 'dark';
};
