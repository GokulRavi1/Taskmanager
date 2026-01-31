"use client"

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Clock, Tag, Sparkles, Loader2, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ScheduleSlot {
    category: string;
    startTime: string;
    endTime: string;
    keywords: string[];
    description?: string;
    priority: number;
    daysOfWeek: number[];
    color?: string;
}

interface Schedule {
    _id?: string;
    name: string;
    isDefault: boolean;
    useLLMFallback: boolean;
    slots: ScheduleSlot[];
    isTemporary?: boolean;
}

const COLORS = [
    '#6366f1', // Indigo
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
];

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingSlot, setEditingSlot] = useState<number | null>(null);
    const [newSlot, setNewSlot] = useState<Partial<ScheduleSlot>>({
        category: '',
        startTime: '',
        endTime: '',
        keywords: [],
        description: '',
        priority: 5,
        daysOfWeek: [],
        color: COLORS[0],
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const res = await fetch('/api/schedule');
            const data = await res.json();
            setSchedule(data);
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!schedule) return;
        setSaving(true);
        try {
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schedule),
            });
            if (res.ok) {
                const data = await res.json();
                setSchedule({ ...data, isTemporary: false });
            }
        } catch (error) {
            console.error('Failed to save schedule:', error);
        } finally {
            setSaving(false);
        }
    };

    const addKeyword = () => {
        if (keywordInput.trim() && newSlot.keywords) {
            setNewSlot({
                ...newSlot,
                keywords: [...newSlot.keywords, keywordInput.trim().toLowerCase()],
            });
            setKeywordInput('');
        }
    };

    const removeKeyword = (index: number) => {
        if (newSlot.keywords) {
            setNewSlot({
                ...newSlot,
                keywords: newSlot.keywords.filter((_, i) => i !== index),
            });
        }
    };

    const handleAddSlot = () => {
        if (!schedule || !newSlot.category || !newSlot.startTime || !newSlot.endTime) return;

        const slot: ScheduleSlot = {
            category: newSlot.category,
            startTime: newSlot.startTime,
            endTime: newSlot.endTime,
            keywords: newSlot.keywords || [],
            description: newSlot.description,
            priority: newSlot.priority || 5,
            daysOfWeek: newSlot.daysOfWeek || [],
            color: newSlot.color,
        };

        setSchedule({
            ...schedule,
            slots: [...schedule.slots, slot],
        });

        // Reset form
        setNewSlot({
            category: '',
            startTime: '',
            endTime: '',
            keywords: [],
            description: '',
            priority: 5,
            daysOfWeek: [],
            color: COLORS[schedule.slots.length % COLORS.length],
        });
        setShowAddForm(false);
    };

    const handleDeleteSlot = (index: number) => {
        if (!schedule) return;
        setSchedule({
            ...schedule,
            slots: schedule.slots.filter((_, i) => i !== index),
        });
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-muted rounded-full transition-colors group">
                            <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                <Settings2 className="w-8 h-8 text-primary" />
                                Schedule Manager
                            </h1>
                            <p className="text-muted-foreground">Configure your daily schedule for smart task assignment</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveSchedule}
                        disabled={saving}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Schedule
                    </button>
                </div>

                {/* Settings Card */}
                <div className="glass-card p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">Smart Scheduling Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure how tasks are automatically assigned to time slots
                            </p>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <span className="text-sm text-muted-foreground">Use LLM for unmatched tasks</span>
                            <div
                                className={cn(
                                    "w-12 h-6 rounded-full transition-colors relative",
                                    schedule?.useLLMFallback ? "bg-primary" : "bg-muted"
                                )}
                                onClick={() => schedule && setSchedule({ ...schedule, useLLMFallback: !schedule.useLLMFallback })}
                            >
                                <div
                                    className={cn(
                                        "absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow-sm",
                                        schedule?.useLLMFallback ? "translate-x-6" : "translate-x-0.5"
                                    )}
                                />
                            </div>
                        </label>
                    </div>
                    {schedule?.useLLMFallback && (
                        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            LLM will be used when no keyword matches (~50-100 tokens per task)
                        </p>
                    )}
                </div>

                {/* Schedule Timeline */}
                <div className="glass-card p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg">Your Daily Schedule</h3>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            Add Time Slot
                        </button>
                    </div>

                    {/* Add Slot Form */}
                    {showAddForm && (
                        <div className="mb-6 p-5 bg-muted/30 rounded-xl border border-border/50 space-y-4 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Marktiz"
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                                        value={newSlot.category}
                                        onChange={(e) => setNewSlot({ ...newSlot, category: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                                        value={newSlot.startTime}
                                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                                        value={newSlot.endTime}
                                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={cn(
                                                    "w-6 h-6 rounded-full border-2 transition-transform",
                                                    newSlot.color === color ? "border-white scale-110" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setNewSlot({ ...newSlot, color })}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Main startup work"
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                                    value={newSlot.description}
                                    onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Keywords (for auto-matching)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add keyword..."
                                        className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addKeyword}
                                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {newSlot.keywords?.map((kw, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1"
                                        >
                                            {kw}
                                            <button onClick={() => removeKeyword(i)} className="hover:text-destructive">
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddSlot}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg"
                                >
                                    Add Slot
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Slots List */}
                    <div className="space-y-3">
                        {schedule?.slots.map((slot, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border/30 group hover:border-border/50 transition-colors"
                            >
                                <div
                                    className="w-2 h-14 rounded-full"
                                    style={{ backgroundColor: slot.color || COLORS[index % COLORS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{slot.category}</span>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                            {slot.description}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {slot.keywords.slice(0, 5).map((kw, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-primary/5 text-primary text-xs rounded">
                                                {kw}
                                            </span>
                                        ))}
                                        {slot.keywords.length > 5 && (
                                            <span className="px-1.5 py-0.5 text-muted-foreground text-xs">
                                                +{slot.keywords.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteSlot(index)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {schedule?.slots.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="w-12 h-12 mx-auto opacity-20 mb-3" />
                                <p>No time slots configured yet.</p>
                                <p className="text-sm">Add your first time slot to enable smart scheduling.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <h4 className="font-medium text-primary flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        How Smart Scheduling Works
                    </h4>
                    <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Keyword Matching (Free):</strong> Tasks containing keywords are auto-assigned to matching slots</li>
                        <li>• <strong>LLM Fallback (Optional):</strong> Unmatched tasks use AI classification (~50-100 tokens)</li>
                        <li>• <strong>Manual Override:</strong> You can always manually set the time for any task</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
