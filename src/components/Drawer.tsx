import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { Button } from '@/components/ui/button';
import { DrawerFolder, DrawerTaskEntry } from '../store/types';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const Drawer: React.FC = () => {
    const {
        settings,
        drawer,
        toggleDrawer,
        addDrawerFolder,
        deleteDrawerFolder,
        toggleDrawerFolder,
        updateDrawerFolder,
        addDrawerTask,
        toggleDrawerTask,
        deleteDrawerTask,
        updateDrawerTaskTitle
    } = useStore();

    const [newFolderInput, setNewFolderInput] = useState('');
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Separate tasks by folder
    const inboxTasks = drawer.tasks.filter(t => t.folderId === null);

    const handleAddFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderInput.trim()) {
            addDrawerFolder(newFolderInput.trim());
            setNewFolderInput('');
            setIsCreatingFolder(false);
        }
    };

    const handleAddTask = (e: React.FormEvent, folderId: string | null) => {
        e.preventDefault();
        if (newTaskInput.trim()) {
            addDrawerTask(newTaskInput.trim(), folderId);
            setNewTaskInput('');
        }
    };

    return (
        <AnimatePresence>
            {settings.isDrawerOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="border-r border-border bg-card h-full flex flex-col shadow-xl z-30 overflow-hidden"
                >
                    <div className="w-80 flex flex-col h-full">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <Icon name="Inbox" className="w-5 h-5" />
                                Drawer
                            </h2>
                            <Button variant="ghost" size="icon" onClick={toggleDrawer}>
                                <Icon name="X" className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">

                            {/* Inbox Input */}
                            <div className="space-y-2">
                                <form onSubmit={(e) => handleAddTask(e, null)}>
                                    <input
                                        type="text"
                                        placeholder="Add a thought..."
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        className="w-full bg-muted/50 border-none rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                                        id="drawer-new-task-input"
                                        autoFocus
                                    />
                                </form>
                            </div>

                            {/* Inbox Tasks */}
                            <DroppableInbox tasks={inboxTasks} />

                            {/* Folders */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCreatingFolder(true)}>
                                        <Icon name="Plus" className="w-3 h-3" />
                                    </Button>
                                </div>

                                {isCreatingFolder && (
                                    <form onSubmit={handleAddFolder} className="mb-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Folder name"
                                            value={newFolderInput}
                                            onChange={(e) => setNewFolderInput(e.target.value)}
                                            className="w-full bg-muted/50 border-none rounded-md px-3 py-1 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                                            onBlur={() => !newFolderInput && setIsCreatingFolder(false)}
                                        />
                                    </form>
                                )}

                                <div className="space-y-1">
                                    {drawer.folders.map(folder => (
                                        <DrawerFolderItem
                                            key={folder.id}
                                            folder={folder}
                                            tasks={drawer.tasks.filter(t => t.folderId === folder.id)}
                                            onToggleExpand={() => toggleDrawerFolder(folder.id)}
                                            onDelete={() => deleteDrawerFolder(folder.id)}
                                            onRename={(name) => updateDrawerFolder(folder.id, name)}
                                            onAddTask={(title) => addDrawerTask(title, folder.id)}
                                            onToggleTask={toggleDrawerTask}
                                            onDeleteTask={deleteDrawerTask}
                                            onUpdateTaskTitle={updateDrawerTaskTitle}
                                        />
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Sub-components for cleaner render

const DroppableInbox: React.FC<{ tasks: DrawerTaskEntry[] }> = ({ tasks }) => {
    const { toggleDrawerTask, deleteDrawerTask, updateDrawerTaskTitle } = useStore();
    const { setNodeRef, isOver } = useDroppable({
        id: 'drawer-inbox',
        data: { type: 'DRAWER_INBOX' }
    });

    return (
        <div ref={setNodeRef} className={`space-y-1 rounded-md p-1 min-h-[50px] transition-colors ${isOver ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inbox</h3>
            {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground italic pl-2">No unassigned tasks</p>
            )}
            <SortableContext items={tasks.map(t => t.taskId)} strategy={verticalListSortingStrategy}>
                {tasks.map(task => (
                    <DrawerTaskItem
                        key={task.taskId}
                        taskEntry={task}
                        onToggle={() => toggleDrawerTask(task.taskId)}
                        onDelete={() => deleteDrawerTask(task.taskId)}
                        onUpdateTitle={(title) => updateDrawerTaskTitle(task.taskId, title)}
                    />
                ))}
            </SortableContext>
        </div>
    );
};

const DrawerTaskItem: React.FC<{
    taskEntry: DrawerTaskEntry;
    onToggle: () => void;
    onDelete: () => void;
    onUpdateTitle: (title: string) => void;
}> = ({ taskEntry, onToggle, onDelete, onUpdateTitle }) => {
    // Look up global task data
    const task = useStore(state => state.tasks[taskEntry.taskId]);

    // Sortable Hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: taskEntry.taskId,
        data: {
            type: 'DRAWER_TASK',
            taskId: taskEntry.taskId,
            folderId: taskEntry.folderId
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    // If task missing (deleted globally?), don't render or handle gracefully
    if (!task) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(task.title);

    const handleSave = () => {
        if (editValue.trim()) {
            onUpdateTitle(editValue.trim());
        }
        setIsEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 text-sm touch-none"
        >
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                {task.completed && <Icon name="Check" className="w-2.5 h-2.5 text-primary-foreground" />}
            </button>

            {isEditing ? (
                <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        e.stopPropagation(); // Prevent drag interaction on input
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input
                    className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm"
                />
            ) : (
                <span
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className={`flex-1 truncate cursor-text ${task.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                    {task.title}
                </span>
            )}

            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity">
                <Icon name="Trash2" className="w-3 h-3" />
            </button>
        </div>
    );
};

const DrawerFolderItem: React.FC<{
    folder: DrawerFolder;
    tasks: DrawerTaskEntry[];
    onToggleExpand: () => void;
    onDelete: () => void;
    onRename: (name: string) => void;
    onAddTask: (title: string) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onUpdateTaskTitle: (id: string, title: string) => void;
}> = ({ folder, tasks, onToggleExpand, onDelete, onRename, onAddTask, onToggleTask, onDeleteTask, onUpdateTaskTitle }) => {

    const { setNodeRef, isOver } = useDroppable({
        id: `drawer-folder-${folder.id}`,
        data: { type: 'DRAWER_FOLDER', folderId: folder.id }
    });

    const [newTaskInput, setNewTaskInput] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(folder.name);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (renameValue.trim()) {
            onRename(renameValue.trim());
        }
        setIsRenaming(false);
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskInput.trim()) {
            onAddTask(newTaskInput.trim());
            setNewTaskInput('');
        }
    };

    return (
        <div ref={setNodeRef} className={`space-y-1 rounded-md transition-colors ${isOver ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
            <div className="flex items-center justify-between group rounded-md p-1 hover:bg-muted">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <button onClick={onToggleExpand} className="p-0.5 hover:bg-muted-foreground/10 rounded">
                        <Icon name={folder.isExpanded ? "ChevronDown" : "ChevronRight"} className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <Icon name="Folder" className="w-3.5 h-3.5 text-blue-500" />

                    {isRenaming ? (
                        <form onSubmit={handleRenameSubmit} className="flex-1">
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => setIsRenaming(false)}
                                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
                            />
                        </form>
                    ) : (
                        <span className="text-sm font-medium truncate flex-1" onDoubleClick={() => setIsRenaming(true)}>{folder.name}</span>
                    )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center">
                    <button onClick={() => setIsRenaming(true)} className="p-1 hover:text-blue-500">
                        <Icon name="Edit2" className="w-3 h-3" />
                    </button>
                    <button onClick={onDelete} className="p-1 hover:text-red-500">
                        <Icon name="Trash2" className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {folder.isExpanded && (
                <div className="ml-4 pl-2 border-l border-border space-y-1">
                    <SortableContext items={tasks.map(t => t.taskId)} strategy={verticalListSortingStrategy}>
                        {tasks.map(task => (
                            <DrawerTaskItem
                                key={task.taskId}
                                taskEntry={task}
                                onToggle={() => onToggleTask(task.taskId)}
                                onDelete={() => onDeleteTask(task.taskId)}
                                onUpdateTitle={(title) => onUpdateTaskTitle(task.taskId, title)}
                            />
                        ))}
                    </SortableContext>
                    <form onSubmit={handleAddTask} className="pt-1">
                        <input
                            type="text"
                            placeholder="Add task..."
                            value={newTaskInput}
                            onChange={(e) => setNewTaskInput(e.target.value)}
                            className="w-full bg-transparent border-none text-xs placeholder:text-muted-foreground/50 focus:ring-0 p-1"
                        />
                    </form>
                </div>
            )}
        </div>
    );
};

export default Drawer;
