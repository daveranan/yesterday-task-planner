import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';

const ShortcutsToast: React.FC = () => {
    const hoveredTaskId = useStore(state => state.hoveredTaskId);
    const selectedTaskId = useStore(state => state.selectedTaskId);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track the last active task to keep toast alive during short gaps
    const activeTask = hoveredTaskId || selectedTaskId;

    useEffect(() => {
        if (activeTask) {
            // If dragging or hovering, show immediately and clear any hide timer
            setIsVisible(true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        } else {
            // If nothing active, wait a bit before hiding
            if (isVisible && !timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    setIsVisible(false);
                    timeoutRef.current = null;
                }, 3000); // 3 seconds delay
            }
        }
    }, [activeTask, isVisible]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Helper for shortcuts display
    // Updated to reflect actual implemented shortcuts in useKeyboardNavigation.ts
    const shortcuts = [
        { key: 'Space', label: 'Complete' },
        { key: 'Enter', label: 'Edit' },
        { key: 'x', label: 'Delete' },
        { key: 'd', label: 'Duplicate' },
        { key: 'g', label: 'Grab' },
        { key: 'c', label: 'Copy' },
        { key: 'Arrows', label: 'Nav' },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-6 left-1/2 z-50 pointer-events-none"
                >
                    <div className="bg-neutral-900/90 dark:bg-neutral-800/90 backdrop-blur-sm text-white px-6 py-2 rounded-full shadow-lg border border-neutral-700/50 flex items-center gap-6 text-xs font-medium justify-center">
                        {shortcuts.map(s => (
                            <div key={s.label} className="flex items-center gap-2">
                                <kbd className="bg-neutral-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-200 min-w-[20px] text-center">
                                    {s.key}
                                </kbd>
                                <span className="text-neutral-300 whitespace-nowrap">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShortcutsToast;
