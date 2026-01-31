"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Save, Calendar, Sparkles, Loader2, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface ILink {
    label: string;
    url: string;
}

export interface ITaskData {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    category: string;
    links: ILink[];
    autoSchedule?: boolean;
}

interface SchedulePreview {
    category: string;
    startTime: string;
    endTime: string;
    matchedKeyword?: string;
    confidence?: string;
    color?: string;
}

interface TaskFormProps {
    initialData?: ITaskData;
    onSubmit: (task: ITaskData) => Promise<void>;
    isSubmitting?: boolean;
    onCancel: () => void;
    mode?: 'create' | 'edit';
}

export function TaskForm({ initialData, onSubmit, isSubmitting = false, onCancel, mode = 'create' }: TaskFormProps) {
    const [formData, setFormData] = useState<ITaskData>(initialData || {
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        notes: '',
        category: 'General',
        links: []
    });

    const [newLink, setNewLink] = useState({ label: '', url: '' });
    const [extractLoading, setExtractLoading] = useState(false);
    const [smartInput, setSmartInput] = useState('');
    const [showSmartInput, setShowSmartInput] = useState(false);
    const [catOptions, setCatOptions] = useState<any[]>([]);
    const [autoSchedule, setAutoSchedule] = useState(mode === 'create');
    const [schedulePreview, setSchedulePreview] = useState<SchedulePreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Debounced smart schedule preview
    useEffect(() => {
        if (!autoSchedule || !formData.title.trim() || formData.startTime) {
            setSchedulePreview(null);
            return;
        }

        const timer = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/schedule/smart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: formData.title,
                        description: formData.notes,
                        useLLM: false, // Only keyword matching for preview
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setSchedulePreview(data);
                    // Auto-fill category if not set or is default
                    if (!formData.category || formData.category === 'General') {
                        setFormData(prev => ({ ...prev, category: data.category }));
                    }
                } else {
                    setSchedulePreview(null);
                }
            } catch (e) {
                console.error('Schedule preview failed:', e);
            } finally {
                setPreviewLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.title, formData.notes, autoSchedule, formData.startTime]);

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCatOptions(data);
                }
            } catch (e) {
                console.error("Failed to load categories", e);
            }
        };
        loadCategories();
    }, []);

    const handleSmartExtract = async () => {
        if (!smartInput.trim()) return;
        setExtractLoading(true);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'parse', payload: smartInput }),
            });
            const data = await res.json();

            if (data.result && Array.isArray(data.result) && data.result.length > 0) {
                const extracted = data.result[0];
                setFormData(prev => ({
                    ...prev,
                    title: extracted.title || prev.title,
                    // If date is "YYYY-MM-DD", use it, else keep default
                    date: extracted.dueDate || prev.date,
                    description: extracted.description || prev.description,
                    // Map priority/effort to notes if needed or just append
                    notes: (extracted.description || "") + (extracted.priority ? `\nPriority: ${extracted.priority}` : "") + (prev.notes ? `\n${prev.notes}` : "")
                }));
                setShowSmartInput(false);
                setSmartInput('');
            }
        } catch (error) {
            console.error("Extraction failed", error);
        } finally {
            setExtractLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Include autoSchedule flag in submission
        await onSubmit({ ...formData, autoSchedule });
    };

    const addLink = () => {
        if (newLink.label && newLink.url) {
            setFormData({ ...formData, links: [...formData.links, newLink] });
            setNewLink({ label: '', url: '' });
        }
    };

    const removeLink = (index: number) => {
        const updated = [...formData.links];
        updated.splice(index, 1);
        setFormData({ ...formData, links: updated });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowSmartInput(!showSmartInput)}
                        className="text-sm font-semibold text-primary flex items-center gap-2 hover:underline"
                    >
                        <Sparkles className="w-4 h-4" />
                        {showSmartInput ? "Hide AI Input" : "Use Magic Extract"}
                    </button>
                    {showSmartInput && (
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">
                            Type naturally like "Meeting with John tomorrow at 2pm"
                        </span>
                    )}
                </div>

                {showSmartInput && (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in">
                        <input
                            type="text"
                            value={smartInput}
                            onChange={(e) => setSmartInput(e.target.value)}
                            placeholder="e.g., 'Finish project report by Friday high priority'"
                            className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSmartExtract();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleSmartExtract}
                            disabled={extractLoading || !smartInput}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 min-w-[100px] flex justify-center"
                        >
                            {extractLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-foreground/80">Task Title</label>
                    <input
                        required
                        type="text"
                        className="w-full bg-background/50 border border-input rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-lg font-medium placeholder:font-normal"
                        placeholder="What needs to be done?"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Category</label>
                    <input
                        type="text"
                        list="categories"
                        className="w-full bg-background/50 border border-input rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-base"
                        placeholder="e.g. Work, Gym"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="categories">
                        {/* Dynamic Categories */}
                        {catOptions.map(cat => (
                            <option key={cat._id} value={cat.name} />
                        ))}
                        {/* Fallback Defaults */}
                        <option value="Work" />
                        <option value="Personal" />
                        <option value="Health" />
                        <option value="Learning" />
                        <option value="Freelancing" />
                    </datalist>
                </div>
            </div>

            {/* Auto-Schedule Toggle */}
            {mode === 'create' && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-amber-500" />
                            <div>
                                <span className="font-medium">Auto-Schedule</span>
                                <p className="text-xs text-muted-foreground">Automatically assign time based on your schedule</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAutoSchedule(!autoSchedule)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                autoSchedule ? "bg-amber-500" : "bg-muted"
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow-sm",
                                    autoSchedule ? "translate-x-6" : "translate-x-0.5"
                                )}
                            />
                        </button>
                    </div>

                    {/* Schedule Preview */}
                    {autoSchedule && schedulePreview && (
                        <div className="mt-3 p-3 bg-background/50 rounded-lg border border-border/50 animate-in fade-in">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="font-medium">Suggested Slot:</span>
                                <span
                                    className="px-2 py-0.5 rounded text-xs text-white"
                                    style={{ backgroundColor: schedulePreview.color || '#6366f1' }}
                                >
                                    {schedulePreview.category}
                                </span>
                                <span className="text-muted-foreground">
                                    {schedulePreview.startTime} - {schedulePreview.endTime}
                                </span>
                            </div>
                            {schedulePreview.matchedKeyword && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Matched keyword: <code className="bg-muted px-1 rounded">{schedulePreview.matchedKeyword}</code>
                                </p>
                            )}
                        </div>
                    )}

                    {autoSchedule && previewLoading && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Finding best slot...
                        </div>
                    )}

                    {autoSchedule && !schedulePreview && !previewLoading && formData.title && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            No keyword match found. Time will be assigned using AI or you can set manually below.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Date
                    </label>
                    <input
                        required
                        type="date"
                        className="w-full bg-background/50 border border-input rounded-xl p-3 outline-none dark:[color-scheme:dark]"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                            Start Time
                            {autoSchedule && !formData.startTime && <span className="text-xs text-amber-500">(Auto)</span>}
                        </label>
                        <input
                            type="time"
                            className={cn(
                                "w-full bg-background/50 border border-input rounded-xl p-3 outline-none dark:[color-scheme:dark]",
                                autoSchedule && !formData.startTime && "border-amber-500/30"
                            )}
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            placeholder={autoSchedule ? "Auto" : ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                            End Time
                            {autoSchedule && !formData.endTime && <span className="text-xs text-amber-500">(Auto)</span>}
                        </label>
                        <input
                            type="time"
                            className={cn(
                                "w-full bg-background/50 border border-input rounded-xl p-3 outline-none dark:[color-scheme:dark]",
                                autoSchedule && !formData.endTime && "border-amber-500/30"
                            )}
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        />
                    </div>
                </div>
            </div>


            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Description & Notes</label>
                <textarea
                    className="w-full bg-background/50 border border-input rounded-xl p-3 h-32 focus:ring-2 focus:ring-primary/50 outline-none resize-none leading-relaxed"
                    placeholder="Add detailed notes, context, or acceptance criteria..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>

            {/* Links Section */}
            <div className="space-y-3 p-5 bg-muted/20 rounded-xl border border-border/50">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                    <LinkIcon className="w-4 h-4" /> Resources / Links
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Label (e.g. Figma Design)"
                        className="flex-1 bg-background/50 border border-input rounded-lg p-2.5 text-sm outline-none"
                        value={newLink.label}
                        onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                    />
                    <input
                        type="url"
                        placeholder="URL (https://...)"
                        className="flex-[2] bg-background/50 border border-input rounded-lg p-2.5 text-sm outline-none"
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={addLink}
                        disabled={!newLink.label || !newLink.url}
                        className="p-2.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {formData.links.length > 0 && (
                    <div className="space-y-2 mt-3">
                        {formData.links.map((link, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-background/80 p-3 rounded-lg border border-border/50 group hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-3 truncate">
                                    <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">{link.label}</span>
                                    <span className="text-muted-foreground truncate hover:underline cursor-pointer" title={link.url}>{link.url}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeLink(idx)}
                                    className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-border/40">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    {isSubmitting ? (mode === 'create' ? "Creating..." : "Updating...") : <><Save className="w-4 h-4" /> {mode === 'create' ? "Create Task" : "Update Task"}</>}
                </button>
            </div>
        </form>
    );
}
