import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { DayScheduleOverride } from '../store/types';

interface ScheduleOverrideModalProps {
    date: string;
    onClose: () => void;
}

export const ScheduleOverrideModal: React.FC<ScheduleOverrideModalProps> = ({ date, onClose }) => {
    const { days, settings, setDayScheduleOverride } = useStore();
    const currentOverride = days[date]?.scheduleOverride;

    const [startHour, setStartHour] = useState(settings.schedule.startHour);
    const [endHour, setEndHour] = useState(settings.schedule.endHour);
    const [skipHour, setSkipHour] = useState<number | null>(settings.schedule.skipHour);
    const [hasLunch, setHasLunch] = useState(settings.schedule.skipHour !== null);
    const [itemDurationMinutes, setItemDurationMinutes] = useState(settings.schedule.itemDurationMinutes);

    useEffect(() => {
        if (currentOverride) {
            setStartHour(currentOverride.startHour);
            setEndHour(currentOverride.endHour);
            setSkipHour(currentOverride.skipHour);
            setHasLunch(currentOverride.skipHour !== null);
            setItemDurationMinutes(currentOverride.itemDurationMinutes);
        } else {
            // Default to global settings if no override exists
            setStartHour(settings.schedule.startHour);
            setEndHour(settings.schedule.endHour);
            setSkipHour(settings.schedule.skipHour);
            setHasLunch(settings.schedule.skipHour !== null);
            setItemDurationMinutes(settings.schedule.itemDurationMinutes);
        }
    }, [currentOverride, settings.schedule]);


    const handleSave = () => {
        // Validation logic could go here (e.g., start < end)
        if (startHour >= endHour) {
            // Simple alert or toast, or just ignore
            return;
        }

        const newOverride: DayScheduleOverride = {
            startHour,
            endHour,
            skipHour: hasLunch ? (skipHour ?? 12) : null,
            itemDurationMinutes
        };
        setDayScheduleOverride(date, newOverride);
        onClose();
    };

    const handleReset = () => {
        setDayScheduleOverride(date, null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">Schedule Override for {date}</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Start Hour (24h)</label>
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={startHour}
                                onChange={(e) => setStartHour(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">End Hour (24h)</label>
                            <input
                                type="number"
                                min="0"
                                max="24"
                                value={endHour}
                                onChange={(e) => setEndHour(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            checked={hasLunch}
                            onChange={(e) => setHasLunch(e.target.checked)}
                            className="rounded border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                        />
                        <label className="text-sm text-neutral-700 dark:text-neutral-300">Enable Lunch Break</label>
                    </div>

                    {hasLunch && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Lunch Hour (24h)</label>
                            <input
                                type="number"
                                min={startHour}
                                max={endHour - 1}
                                value={skipHour ?? 12}
                                onChange={(e) => setSkipHour(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                            />
                        </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Hours per Block</label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            max="8"
                            value={itemDurationMinutes / 60}
                            onChange={(e) => setItemDurationMinutes(parseFloat(e.target.value) * 60)}
                            className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    {(currentOverride) && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-auto"
                        >
                            Reset to Default
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-black dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                        Save Override
                    </button>
                </div>
            </div>
        </div>
    );
};
