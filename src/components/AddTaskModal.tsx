"use client"

import React, { useState } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, Save } from 'lucide-react';
import { cn } from '@/lib/utils';


interface ILink {
    label: string;
    url: string;
}

interface ITaskData {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    links: ILink[];
}

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (task: ITaskData) => Promise<void>;
}

export function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        notes: '',
        links: [] as { label: string, url: string }[]
    });

    const [newLink, setNewLink] = useState({ label: '', url: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd(formData);
            onClose();
            // Reset form
            setFormData({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '',
                endTime: '',
                notes: '',
                links: []
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="glass-panel w-full max-w-lg rounded-xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <h2 className="text-xl font-bold">Add New Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-background/50 border border-input rounded-md p-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            placeholder="e.g. Project Review"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full bg-background/50 border border-input rounded-md p-2 outline-none dark:[color-scheme:dark]"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start</label>
                                <input
                                    type="time"
                                    className="w-full bg-background/50 border border-input rounded-md p-2 outline-none dark:[color-scheme:dark]"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">End</label>
                                <input
                                    type="time"
                                    className="w-full bg-background/50 border border-input rounded-md p-2 outline-none dark:[color-scheme:dark]"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <textarea
                            className="w-full bg-background/50 border border-input rounded-md p-2 h-24 focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                            placeholder="Add detailed notes here..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Links Section */}
                    <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/50">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" /> Resources / Links
                        </label>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Label (e.g. Figma)"
                                className="flex-1 bg-background/50 border border-input rounded-md p-2 text-sm outline-none"
                                value={newLink.label}
                                onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                            />
                            <input
                                type="url"
                                placeholder="URL (https://...)"
                                className="flex-[2] bg-background/50 border border-input rounded-md p-2 text-sm outline-none"
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={addLink}
                                disabled={!newLink.label || !newLink.url}
                                className="p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {formData.links.length > 0 && (
                            <div className="space-y-2 mt-2">
                                {formData.links.map((link, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-background p-2 rounded border border-border/50">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="font-medium">{link.label}:</span>
                                            <span className="text-muted-foreground truncate">{link.url}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeLink(idx)}
                                            className="text-destructive hover:scale-110 transition-transform"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            {loading ? "Saving..." : <><Save className="w-4 h-4" /> Save Task</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
