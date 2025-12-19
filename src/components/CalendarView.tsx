"use client"

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface DailyStats {
    total: number;
    completed: number;
}

interface CalendarViewProps {
    onDateSelect?: (date: Date) => void;
}

export function CalendarView({ onDateSelect }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [stats, setStats] = useState<Record<string, DailyStats>>({});
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const fetchStats = async () => {
        setLoading(true);
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const res = await fetch(`/api/calendar-stats?month=${monthStr}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch calendar stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [currentMonth]);

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    // Padding for start of month
    const startDay = startOfMonth(currentMonth).getDay(); // 0 = Sun, 1 = Mon...
    // Adjust to Monday start (1-7)
    const padding = startDay === 0 ? 6 : startDay - 1;

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="text-xs font-medium px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {day}
                    </div>
                ))}

                {/* Padding */}
                {Array.from({ length: padding }).map((_, i) => (
                    <div key={`pad-${i}`} />
                ))}

                {/* Days */}
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayStats = stats[dateKey];

                    const isFullComplete = dayStats && dayStats.total > 0 && dayStats.total === dayStats.completed;
                    const hasTasks = dayStats && dayStats.total > 0;

                    // Style logic
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDateSelect?.(day)}
                            className={cn(
                                "aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative group",
                                isTodayDate ? "bg-primary/10 border-primary/50 border" : "hover:bg-muted/50 border border-transparent hover:border-border/50"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium",
                                isTodayDate && "text-primary font-bold"
                            )}>
                                {format(day, 'd')}
                            </span>

                            {/* Indicators */}
                            <div className="mt-1 h-4 flex items-center justify-center">
                                {isFullComplete ? (
                                    <div className="animate-in zoom-in duration-300">
                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                        </div>
                                    </div>
                                ) : hasTasks ? (
                                    <div className="flex -space-x-1">
                                        {/* Show simple dots for progress */}
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                        {dayStats.completed > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />}
                                    </div>
                                ) : null}
                            </div>

                            {/* Hover Tooltip (Basic) */}
                            {hasTasks && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                                    {dayStats.completed}/{dayStats.total} Completed
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
