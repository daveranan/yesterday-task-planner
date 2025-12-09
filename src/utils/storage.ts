export const isElectron = window && (window as any).process && (window as any).process.type;
// Note: In strict Electron nodeIntegration:true, window.require is available.
// However, checking window.process.type is safer for renderer.
// The original code used window.require check.
const isElectronApp = (): boolean => {
    return typeof window !== 'undefined' && typeof (window as any).require === 'function';
};

const storageKey = 'daily_planner_data';
const settingsKey = 'daily_planner_settings';
const themeKey = 'planner_theme';
const savePathKey = 'planner_save_path';

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

export const getCustomSavePath = (): string | null => {
    try {
        const path = localStorage.getItem(savePathKey);
        return path ? JSON.parse(path) : null;
    } catch {
        return null;
    }
};

export const setCustomSavePath = (path: string): void => {
    saveDataToLocalStorage(savePathKey, path);
};

// --- Settings Storage ---

export const saveSettingsToFile = (settings: any): void => {
    if (!isElectronApp()) {
        saveDataToLocalStorage(settingsKey, settings);
        return;
    }
    try {
        const requireFunc = (window as any).require;
        const fs = requireFunc('fs');
        const path = requireFunc('path');
        const os = requireFunc('os');

        const customPath = getCustomSavePath();
        const saveDir = customPath || os.homedir();
        const savePath = path.join(saveDir, 'settings.json');

        fs.writeFileSync(savePath, JSON.stringify(settings, null, 2), 'utf-8');
        // console.log('Settings saved successfully to:', savePath);
    } catch (e) {
        console.error("Error saving settings via Electron FS:", e);
        saveDataToLocalStorage(settingsKey, settings);
    }
};

export const loadSettingsFromFile = (): any => {
    if (!isElectronApp()) {
        return loadDataFromLocalStorage(settingsKey) || null;
    }
    try {
        const requireFunc = (window as any).require;
        const fs = requireFunc('fs');
        const path = requireFunc('path');
        const os = requireFunc('os');

        const customPath = getCustomSavePath();
        const loadDir = customPath || os.homedir();
        const loadPath = path.join(loadDir, 'settings.json');

        if (fs.existsSync(loadPath)) {
            const data = fs.readFileSync(loadPath, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    } catch (e) {
        console.error("Error loading settings via Electron FS:", e);
        return loadDataFromLocalStorage(settingsKey) || null;
    }
};

// --- Main Data Storage ---

export const saveDataToFile = (data: any): void => {
    // Separate settings from data when saving main data file
    const { settings, ...dataToSave } = data;

    if (!isElectronApp()) {
        saveDataToLocalStorage(storageKey, dataToSave);
        return;
    }
    try {
        const requireFunc = (window as any).require;
        const fs = requireFunc('fs');
        const path = requireFunc('path');
        const os = requireFunc('os');

        const customPath = getCustomSavePath();
        const saveDir = customPath || os.homedir();
        const savePath = path.join(saveDir, 'DailyPlannerData.json');

        fs.writeFileSync(savePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
        // console.log('Data saved successfully to:', savePath);
    } catch (e) {
        console.error("Error saving file via Electron FS:", e);
        saveDataToLocalStorage(storageKey, dataToSave);
    }
};

export const loadDataFromFile = (): any => {
    let mainData: any = { tasks: {}, days: {} };
    let settingsData: any = null;

    // Load Settings
    settingsData = loadSettingsFromFile();

    // Load Main Data
    if (!isElectronApp()) {
        const localData = loadDataFromLocalStorage(storageKey);
        if (localData) mainData = localData;
    } else {
        try {
            const requireFunc = (window as any).require;
            const fs = requireFunc('fs');
            const path = requireFunc('path');
            const os = requireFunc('os');

            const customPath = getCustomSavePath();
            const loadDir = customPath || os.homedir();
            const loadPath = path.join(loadDir, 'DailyPlannerData.json');

            if (fs.existsSync(loadPath)) {
                const data = fs.readFileSync(loadPath, 'utf-8');
                const parsedData = JSON.parse(data);

                // MIGRATION CHECK: If parsedData has settings AND we didn't find specific settings file
                if (parsedData.settings && !settingsData) {
                    // Extract settings from main data
                    settingsData = parsedData.settings;
                    console.log("Migrating settings from main data...");
                    // We will save it separately next time a save triggers, 
                    // OR we could force save now? 
                    // Let's just return it and let the store initialization save it eventually if changed,
                    // or we can strictly return merged data.
                }

                // If we found settings in main data but ALSO have settings.json,
                // settings.json takes precedence, and we largely ignore the one in data.json.
                // We strip settings from mainData to ensure clean state internally if we want,
                // but for now just merging is fine.

                mainData = parsedData;
            }
        } catch (e) {
            console.error("Error loading file via Electron FS:", e);
            const localData = loadDataFromLocalStorage(storageKey);
            if (localData) mainData = localData;
        }
    }

    // fallback for settings
    if (!settingsData && mainData.settings) {
        settingsData = mainData.settings;
    }

    // Helper to merge
    return {
        ...mainData,
        settings: settingsData || undefined // If undefined, store will initialize defaults
    };
};

export const saveTheme = (isDark: boolean): void => {
    saveDataToLocalStorage(themeKey, isDark ? 'dark' : 'light');
};

export const loadTheme = (): boolean => {
    return loadDataFromLocalStorage(themeKey) === 'dark';
};
