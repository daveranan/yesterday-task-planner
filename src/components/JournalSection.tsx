import React from 'react';
import { Textarea } from './ui/textarea';

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
        <div className="flex-[2] flex gap-2 min-h-0">
            {showGratefulness && (
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col">
                    <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Gratefulness</h3>
                    <Textarea
                        className="flex-1 w-full resize-none border-neutral-200 dark:border-neutral-800 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                        placeholder="I am grateful for..."
                        value={gratefulness}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ gratefulness: e.target.value })}
                    />
                </div>
            )}
            {showReflection && (
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col">
                    <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Reflections</h3>
                    <Textarea
                        className="flex-1 w-full resize-none border-neutral-200 dark:border-neutral-800 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                        placeholder="Today I learned..."
                        value={reflections}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ reflections: e.target.value })}
                    />
                </div>
            )}
        </div>
    );
};

export default JournalSection;
