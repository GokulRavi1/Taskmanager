"use client"

import React, { useState } from 'react';
import { Check, Clock, Link as LinkIcon, FileText, ChevronDown, ChevronUp, Trash2, ExternalLink, Edit } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    links: ILink[];
}

interface TaskItemProps {
    task: ITask;
    onUpdate: (id: string, updates: Partial<ITask>) => void;
    onDelete: (id: string) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
    const [expanded, setExpanded] = useState(false);

    // Quick handlers
    const toggleComplete = () => {
        onUpdate(task._id, { isCompleted: !task.isCompleted });
    };

    return (
        <div className={cn(
            "group glass-card rounded-xl border border-border/50 transition-all duration-300 overflow-hidden",
            task.isCompleted ? "opacity-60 bg-muted/20" : "bg-card/40 hover:bg-card/60"
        )}>
            {/* Header / Summary Row */}
            <div className="p-4 flex items-center gap-4">
                <button
                    onClick={toggleComplete}
                    className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        task.isCompleted ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-primary"
                    )}
                >
                    {task.isCompleted && <Check className="w-4 h-4 text-white" />}
                </button>

                <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "font-medium truncate",
                            task.isCompleted && "line-through text-muted-foreground"
                        )}>
                            {task.title}
                        </span>
                        {task.startTime && (
                            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 mr-1" />
                                {task.startTime} {task.endTime && `- ${task.endTime}`}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                        href={`/edit-task/${task._id}`}
                        className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={() => onDelete(task._id)}
                        className="p-2 hover:bg-destructive/10 text-destructive/50 hover:text-destructive rounded-full transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 animate-fade-in border-t border-border/30 mt-2 bg-black/5 dark:bg-white/5 p-4">
                    {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}

                    {/* Notes Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Notes
                        </h4>
                        <div className="text-sm bg-background/50 p-3 rounded-md border border-border/30 whitespace-pre-wrap">
                            {task.notes || "No notes added."}
                        </div>
                    </div>

                    {/* Links Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <LinkIcon className="w-3 h-3" /> Resources
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {task.links && task.links.length > 0 ? (
                                task.links.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors border border-primary/20"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {link.label}
                                    </a>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground italic">No links attached</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
