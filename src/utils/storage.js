export const isElectron = window && window.process && window.process.type;
// Note: In strict Electron nodeIntegration:true, window.require is available.
// However, checking window.process.type is safer for renderer.
// The original code used window.require check.
const isElectronApp = () => {
    return typeof window !== 'undefined' && typeof window.require === 'function';
};

const storageKey = 'daily_planner_data_v2';
const themeKey = 'planner_theme';

const saveDataToLocalStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Could not save data to localStorage", e);
    }
};

export const loadDataFromLocalStorage = (key) => {
    try {
        const savedData = localStorage.getItem(key);
        return savedData ? JSON.parse(savedData) : null;
    } catch (e) {
        console.error("Could not load data from localStorage", e);
        return null;
    }
};

export const saveDataToFile = (data) => {
    if (!isElectronApp()) {
        saveDataToLocalStorage(storageKey, data);
        return;
    }
    try {
        const fs = window.require('fs');
        const path = window.require('path');
        const os = window.require('os');
        const savePath = path.join(os.homedir(), 'DailyPlannerData_v2.json');
        fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('Data saved successfully to:', savePath);
    } catch (e) {
        console.error("Error saving file via Electron FS:", e);
        saveDataToLocalStorage(storageKey, data);
    }
};

export const loadDataFromFile = () => {
    if (!isElectronApp()) {
        return loadDataFromLocalStorage(storageKey) || { tasks: {}, days: {} };
    }
    try {
        const fs = window.require('fs');
        const path = window.require('path');
        const os = window.require('os');
        const loadPath = path.join(os.homedir(), 'DailyPlannerData_v2.json');
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

export const saveTheme = (isDark) => {
    saveDataToLocalStorage(themeKey, isDark ? 'dark' : 'light');
};

export const loadTheme = () => {
    return loadDataFromLocalStorage(themeKey) === 'dark';
};
