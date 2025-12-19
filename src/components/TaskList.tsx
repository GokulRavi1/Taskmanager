"use client"

import React, { useEffect, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, Trash2 } from 'lucide-react';
import { TaskItem } from './TaskItem';
import Link from 'next/link';
// Removed AddTaskModal import
import { cn } from '@/lib/utils';
import { useTaskContext } from '@/context/TaskContext';

export function TaskList() {
    const [date, setDate] = useState(new Date());
    interface ILink {
        _id?: string;
        label: string;
        url: string;
    }

    interface ITask {
        _id: string;
        title: string;
        description?: string;
        isCompleted: boolean;
        date: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
        category?: string;
        links: ILink[];
    }

    const [tasks, setTasks] = useState<ITask[]>([]);
    const [loading, setLoading] = useState(true);
    // Removed isAddModalOpen state

    const [error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            console.log(`Fetching tasks for ${formattedDate}...`);
            const res = await fetch(`/api/tasks?date=${formattedDate}`);

            console.log(`API Response Status: ${res.status} ${res.statusText}`);

            let data;
            try {
                data = await res.json();
            } catch (jsonError) {
                console.error("Failed to parse JSON response");
                const text = await res.text();
                console.error("Raw Response Text:", text);
                throw new Error("Invalid JSON response");
            }

            if (Array.isArray(data)) {
                setTasks(data);
            } else {
                console.error('API Error Response Data:', JSON.stringify(data, null, 2));
                setError(data.details || data.error || 'Failed to load tasks.');
                setTasks([]);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
            setError('Network or server error.');
        } finally {
            setLoading(false);
        }
    };

    const [definedCategories, setDefinedCategories] = useState<any[]>([]);
    const [isManageCatOpen, setIsManageCatOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setDefinedCategories(data);
            }
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    };

    const [newCatTimes, setNewCatTimes] = useState({ start: '', end: '' });

    const [editingCategory, setEditingCategory] = useState<any | null>(null);

    const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        try {
            const url = editingCategory ? `/api/categories?id=${editingCategory._id}` : '/api/categories';
            const method = editingCategory ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCatName,
                    // Only send color on create, or keep existing if updating? 
                    // For now, let's keep color same on update unless we add color picker. 
                    // Backend updates color if sent. Let's send existing color if editing to preserve it.
                    color: editingCategory ? editingCategory.color : '#' + Math.floor(Math.random() * 16777215).toString(16),
                    defaultStartTime: newCatTimes.start,
                    defaultEndTime: newCatTimes.end
                })
            });

            if (res.ok) {
                setNewCatName('');
                setNewCatTimes({ start: '', end: '' });
                setEditingCategory(null); // Exit edit mode
                fetchCategories();
                // Don't close immediately if editing, allows to see result? Or close? User preference.
                // Let's keep it open to verify changes in list.
            }
        } catch (err) {
            console.error("Failed to save category", err);
        }
    };

    const startEditing = (cat: any) => {
        setEditingCategory(cat);
        setNewCatName(cat.name);
        setNewCatTimes({
            start: cat.defaultStartTime || '',
            end: cat.defaultEndTime || ''
        });
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        setNewCatName('');
        setNewCatTimes({ start: '', end: '' });
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete this category?")) return;
        try {
            await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
            fetchCategories();
        } catch (err) {
            console.error("Failed to delete category", err);
        }
    }

    // Optimization: Fetch categories only once on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Fetch tasks whenever date changes
    useEffect(() => {
        fetchTasks();
    }, [date]);

    const { refreshTasks } = useTaskContext();

    const handleUpdateTask = async (id: string, updates: Partial<ITask>) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t._id === id ? { ...t, ...updates } : t));

        try {
            await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            fetchTasks(); // ensure sync
            refreshTasks(); // Refresh stats
        } catch (error) {
            console.error('Error updating task', error);
            fetchTasks(); // revert on error
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        setTasks(prev => prev.filter(t => t._id !== id));
        try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            fetchTasks(); // ensure sync
            refreshTasks(); // Refresh stats
        } catch (error) {
            console.error('Error deleting task', error);
            fetchTasks();
        }
    };

    return (
        <div className="space-y-6">
            {/* Headers ... */}
            <div className="flex items-center justify-between glass-panel p-4 rounded-xl">
                {/* ... Date Nav ... */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setDate(subDays(date, 1))} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                        {format(date, 'EEEE, MMMM do')}
                    </div>
                    <button onClick={() => setDate(addDays(date, 1))} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setDate(new Date())}
                        className="text-xs text-primary hover:underline ml-2"
                    >
                        Today
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setIsManageCatOpen(!isManageCatOpen);
                            if (isManageCatOpen) cancelEdit(); // Reset on close
                        }}
                        className="bg-muted text-foreground hover:bg-muted/80 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {isManageCatOpen ? "Close" : "Manage Sections"}
                    </button>
                    <Link
                        href="/add-task"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Add Task</span>
                    </Link>
                </div>
            </div>

            {/* Category Manager UI */}
            {isManageCatOpen && (
                <div className="bg-card/50 border border-border/50 rounded-xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">
                            {editingCategory ? "Edit Track Details" : "Add Monthly Track"}
                        </h3>
                        {editingCategory && (
                            <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:underline">
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleCreateOrUpdateCategory} className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="flex-1 w-full space-y-1">
                            <label className="text-xs text-muted-foreground">Name</label>
                            <input
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="e.g. Gym, Work"
                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                            <label className="text-xs text-muted-foreground">Default Start</label>
                            <input
                                type="time"
                                value={newCatTimes.start}
                                onChange={e => setNewCatTimes({ ...newCatTimes, start: e.target.value })}
                                className="w-full bg-background border border-input rounded-lg px-2 py-2 text-sm"
                            />
                        </div>
                        <div className="w-full sm:w-28 space-y-1">
                            <label className="text-xs text-muted-foreground">Default End</label>
                            <input
                                type="time"
                                value={newCatTimes.end}
                                onChange={e => setNewCatTimes({ ...newCatTimes, end: e.target.value })}
                                className="w-full bg-background border border-input rounded-lg px-2 py-2 text-sm"
                            />
                        </div>
                        <button type="submit" className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium mb-[1px]">
                            {editingCategory ? "Update" : "Create"}
                        </button>
                    </form>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {definedCategories.map(cat => (
                            <div
                                key={cat._id}
                                className={cn(
                                    "badge badge-secondary flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg text-xs border border-border/50 transition-all cursor-pointer hover:border-primary/50",
                                    editingCategory?._id === cat._id ? "border-primary ring-1 ring-primary/20 bg-primary/5" : ""
                                )}
                                onClick={() => startEditing(cat)}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }}></span>
                                <div className="flex flex-col">
                                    <span className="font-semibold">{cat.name}</span>
                                    {(cat.defaultStartTime || cat.defaultEndTime) && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {cat.defaultStartTime || '?'} - {cat.defaultEndTime || '?'}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat._id); }}
                                    className="ml-2 hover:text-destructive p-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ... Task List Rendering ... */}

            <div className="space-y-3">
                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-xl border border-destructive/20 flex items-center gap-3">
                        <span className="font-semibold">Error:</span> {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Loading tasks...</div>
                ) : (
                    <>
                        {/* Manage Categories Section (UI TBD: For now assume manually fed or "General" exists) */}
                        {/* In a real app we would map through ALL defined categories even if empty */}

                        {/* Group tasks by category */}
                        {(() => {
                            const groupedTasks = tasks.reduce((groups, task) => {
                                const cat = task.category || 'General';
                                if (!groups[cat]) groups[cat] = [];
                                groups[cat].push(task);
                                return groups;
                            }, {} as Record<string, ITask[]>);

                            // We need a list of categories to render. 
                            // 1. Fetched from API (definedCategories)
                            // 2. Plus any ad-hoc categories found in tasks (groupedTasks keys)
                            // 3. De-duplicate

                            const allCategoryNames = Array.from(new Set([
                                ...definedCategories.map(c => c.name),
                                ...Object.keys(groupedTasks)
                            ]));

                            // Always have "General" if tasks exist for it
                            if (groupedTasks['General'] && !allCategoryNames.includes('General')) {
                                allCategoryNames.push('General');
                            }

                            // If no categories defined and no tasks, show empty state
                            if (allCategoryNames.length === 0 && tasks.length === 0) {
                                return (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/5">
                                        <p>No tasks for this day.</p>
                                        <Link href="/add-task" className="text-primary hover:underline mt-2 inline-block">Create one?</Link>
                                    </div>
                                );
                            }

                            return allCategoryNames.map(categoryName => {
                                const categoryTasks = groupedTasks[categoryName] || [];
                                const categoryDef = definedCategories.find(c => c.name === categoryName);

                                return (
                                    <div key={categoryName} className="bg-card/30 border border-border/40 rounded-xl overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 hover:border-primary/20 transition-colors">
                                        <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/40 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                                                    style={{ backgroundColor: (categoryDef?.color || '#3b82f6') + '20', color: categoryDef?.color || '#3b82f6' }}
                                                >
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'currentColor' }}></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-foreground flex items-center gap-2">
                                                        {categoryName}
                                                        {categoryDef?.defaultStartTime && (
                                                            <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500/50"></span>
                                                                {categoryDef.defaultStartTime} - {categoryDef.defaultEndTime}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {categoryTasks.length} {categoryTasks.length === 1 ? 'task' : 'tasks'} for today
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Delete Category Button */}
                                                {categoryDef && categoryTasks.length === 0 && (
                                                    <button
                                                        onClick={() => handleDeleteCategory(categoryDef._id)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        title="Delete Category"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/add-task?date=${format(date, 'yyyy-MM-dd')}&category=${encodeURIComponent(categoryName)}${categoryDef?.defaultStartTime ? `&startTime=${categoryDef.defaultStartTime}` : ''}${categoryDef?.defaultEndTime ? `&endTime=${categoryDef.defaultEndTime}` : ''}`}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium pr-3"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Item
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="p-3">
                                            {categoryTasks.length === 0 ? (
                                                <div className="text-sm text-muted-foreground/50 italic py-4 text-center border-2 border-dashed border-border/40 rounded-lg flex flex-col items-center gap-2 hover:bg-muted/10 transition-colors cursor-pointer group"
                                                    onClick={() => window.location.href = `/add-task?date=${format(date, 'yyyy-MM-dd')}&category=${encodeURIComponent(categoryName)}${categoryDef?.defaultStartTime ? `&startTime=${categoryDef.defaultStartTime}` : ''}${categoryDef?.defaultEndTime ? `&endTime=${categoryDef.defaultEndTime}` : ''}`}
                                                >
                                                    <Plus className="w-5 h-5 opacity-50 group-hover:scale-110 transition-transform" />
                                                    <span>Add to your {categoryName} today</span>
                                                    {categoryDef?.defaultStartTime && (
                                                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                                            Scheduled: {categoryDef.defaultStartTime} - {categoryDef.defaultEndTime}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {categoryTasks.map(task => (
                                                        <TaskItem
                                                            key={task._id}
                                                            task={task}
                                                            onUpdate={handleUpdateTask}
                                                            onDelete={handleDeleteTask}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </>
                )}
            </div>

            {/* Removed AddTaskModal component */}
        </div>
    );
}
