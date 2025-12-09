import React from 'react';

interface JournalSectionProps {
    gratefulness: string;
    reflections: string;
    onUpdate: (updates: { gratefulness?: string; reflections?: string }) => void;
    showGratefulness: boolean;
    showReflection: boolean;
}

const JournalSection: React.FC<JournalSectionProps> = ({
    gratefulness,
    reflections,
    onUpdate,
    showGratefulness,
    showReflection
}) => {
    if (!showGratefulness && !showReflection) return null;

    return (
        <div className="flex-[2] flex gap-6 min-h-0">
            {showGratefulness && (
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Gratefulness</h3>
                    <textarea
                        className="flex-1 w-full resize-none text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:shadow-md focus:outline-none"
                        placeholder="I am grateful for..."
                        value={gratefulness}
                        onChange={(e) => onUpdate({ gratefulness: e.target.value })}
                    />
                </div>
            )}
            {showReflection && (
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Reflections</h3>
                    <textarea
                        className="flex-1 w-full resize-none text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:shadow-md focus:outline-none"
                        placeholder="Today I learned..."
                        value={reflections}
                        onChange={(e) => onUpdate({ reflections: e.target.value })}
                    />
                </div>
            )}
        </div>
    );
};

export default JournalSection;
