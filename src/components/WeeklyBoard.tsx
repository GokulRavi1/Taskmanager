"use client"

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exists

interface Task {
    _id: string;
    title: string;
    isCompleted: boolean;
    date: string; // ISO string
    priority?: 'High' | 'Medium' | 'Low';
}

interface WeeklyBoardProps {
    onAddTask: (date: string) => void;
}

export function WeeklyBoard({ onAddTask }: WeeklyBoardProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWeeklyTasks = async () => {
        setLoading(true);
        try {
            const startStr = format(currentWeekStart, 'yyyy-MM-dd');
            const endStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch weekly tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeeklyTasks();
    }, [currentWeekStart]);

    const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });

    const getTasksForDay = (date: Date) => {
        return tasks.filter(task => isSameDay(new Date(task.date), date));
    };

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[800px]">
                {weekDays.map(day => {
                    const dayTasks = getTasksForDay(day);
                    const isCurrentDay = isToday(day);

                    return (
                        <div key={day.toString()} className="flex-1 min-w-[140px] flex flex-col gap-3">
                            {/* Column Header */}
                            <div
                                onClick={() => onAddTask(format(day, 'yyyy-MM-dd'))}
                                className={cn(
                                    "flex flex-col items-center p-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10 cursor-pointer hover:bg-primary/5 transition-colors group/header",
                                    isCurrentDay && "bg-primary/10 border-primary/30"
                                )}>
                                <span className="text-xs font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</span>
                                <span className={cn(
                                    "text-lg font-bold",
                                    isCurrentDay && "text-primary"
                                )}>{format(day, 'd')}</span>
                                <span className="absolute top-2 right-2 opacity-0 group-hover/header:opacity-100 text-primary text-xs font-bold">+</span>
                            </div>

                            {/* Tasks Container */}
                            <div className="flex flex-col gap-2 min-h-[200px]">
                                {dayTasks.length === 0 ? (
                                    <div
                                        onClick={() => onAddTask(format(day, 'yyyy-MM-dd'))}
                                        className="text-center py-4 text-xs text-muted-foreground/40 border-2 border-dashed border-border/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                                    >
                                        Empty <br /> <span className="text-[10px] opacity-70">Click to add</span>
                                    </div>
                                ) : (
                                    dayTasks.map(task => (
                                        <div
                                            key={task._id}
                                            className={cn(
                                                "p-3 rounded-lg border border-border/50 bg-card shadow-sm hover:shadow-md transition-all text-sm group relative",
                                                task.isCompleted && "opacity-60 bg-muted/50"
                                            )}
                                        >
                                            {/* Priority Indicator */}
                                            {task.priority === 'High' && (
                                                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
                                            )}

                                            <div className="font-medium line-clamp-2 mb-1">
                                                {task.title}
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                {task.isCompleted ? (
                                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                ) : (
                                                    <Circle className="w-3 h-3" />
                                                )}
                                                {task.isCompleted ? "Done" : "Pending"}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
