import React from 'react';

const JournalSection = ({ gratefulness, reflections, onUpdate }) => {
    return (
        <div className="flex-[2] flex gap-6 min-h-0">
            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 p-4 flex flex-col">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Gratefulness</h3>
                <textarea
                    className="flex-1 w-full resize-none text-sm border border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-800 text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 focus:shadow-md focus:outline-none"
                    placeholder="I am grateful for..."
                    value={gratefulness}
                    onChange={(e) => onUpdate({ gratefulness: e.target.value })}
                />
            </div>
            <div className="flex-1 bg-neutral-900 rounded-xl shadow-lg border border-neutral-800 p-4 flex flex-col">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Reflections</h3>
                <textarea
                    className="flex-1 w-full resize-none text-sm border border-neutral-700 rounded-lg shadow-sm p-3 bg-neutral-800 text-neutral-100 transition-all duration-200 focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 focus:shadow-md focus:outline-none"
                    placeholder="Today I learned..."
                    value={reflections}
                    onChange={(e) => onUpdate({ reflections: e.target.value })}
                />
            </div>
        </div>
    );
};

export default JournalSection;
