"use client"

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import {
    Calendar, TrendingUp, Target, Flame, CheckCircle2,
    ChevronLeft, ChevronRight, Loader2, Award, Zap
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';

interface DayStats {
    date: string;
    total: number;
    completed: number;
    categories: Record<string, { total: number; completed: number }>;
}

interface OverviewData {
    today: { total: number; completed: number };
    thisWeek: { total: number; completed: number; rate: number };
    thisMonth: { total: number; completed: number; rate: number; label: string };
    streak: number;
    dailyData: Array<{ date: string; fullDate: string; total: number; completed: number }>;
    categories: Array<{ name: string; total: number; completed: number; rate: number }>;
}

interface MonthData {
    month: string;
    monthLabel: string;
    summary: {
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
        activeDays: number;
        productiveDays: number;
        currentStreak: number;
        maxStreak: number;
    };
    days: DayStats[];
}

const CATEGORY_COLORS: Record<string, string> = {
    'Marktiz': '#6366f1',
    'Bug Bounty': '#ef4444',
    'Gymlingoo': '#22c55e',
    'Break': '#f59e0b',
    'Sleep': '#64748b',
    'General': '#8b5cf6',
    'Work': '#3b82f6',
    'Personal': '#ec4899',
    'Health': '#10b981',
    'Learning': '#f97316',
};

export function WorkCompletionAnalytics() {
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'overview' | 'calendar'>('overview');

    // Fetch overview data
    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const res = await fetch('/api/analytics?view=overview');
                const data = await res.json();
                setOverview(data);
            } catch (e) {
                console.error('Failed to fetch overview:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, []);

    // Fetch month data when calendar view or month changes
    useEffect(() => {
        const fetchMonthData = async () => {
            setLoading(true);
            try {
                const monthStr = format(currentMonth, 'yyyy-MM');
                const res = await fetch(`/api/analytics?view=daily&month=${monthStr}`);
                const data = await res.json();
                setMonthData(data);
            } catch (e) {
                console.error('Failed to fetch month data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchMonthData();
    }, [currentMonth]);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    if (loading && !overview) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Target className="w-8 h-8 text-primary" />
                        Work Completion Analytics
                    </h1>
                    <p className="text-muted-foreground">Track your daily and monthly progress</p>
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                    <button
                        onClick={() => setActiveView('overview')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            activeView === 'overview' ? "bg-background shadow" : "hover:bg-background/50"
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveView('calendar')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            activeView === 'calendar' ? "bg-background shadow" : "hover:bg-background/50"
                        )}
                    >
                        Calendar
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {overview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Today"
                        value={`${overview.today.completed}/${overview.today.total}`}
                        subtitle="tasks completed"
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        color="green"
                    />
                    <StatCard
                        title="This Week"
                        value={`${overview.thisWeek.rate}%`}
                        subtitle={`${overview.thisWeek.completed} of ${overview.thisWeek.total}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        color="blue"
                    />
                    <StatCard
                        title={overview.thisMonth.label}
                        value={`${overview.thisMonth.rate}%`}
                        subtitle={`${overview.thisMonth.completed} of ${overview.thisMonth.total}`}
                        icon={<Calendar className="w-5 h-5" />}
                        color="purple"
                    />
                    <StatCard
                        title="Current Streak"
                        value={`${overview.streak}`}
                        subtitle="days in a row"
                        icon={<Flame className="w-5 h-5" />}
                        color="orange"
                        highlight={overview.streak >= 7}
                    />
                </div>
            )}

            {activeView === 'overview' ? (
                <>
                    {/* Velocity Chart */}
                    <div className="glass-card rounded-xl border border-border/50 p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            30-Day Progress
                        </h3>
                        {overview && (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={overview.dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)'
                                        }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} name="Scheduled" />
                                    <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} name="Completed" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Category Completion */}
                    <div className="glass-card rounded-xl border border-border/50 p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            Category Completion This Month
                        </h3>
                        {overview && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {overview.categories.map((cat) => (
                                    <div key={cat.name} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                                        <div
                                            className="w-3 h-12 rounded-full"
                                            style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280' }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium">{cat.name}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {cat.completed}/{cat.total}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${cat.rate}%`,
                                                        backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1">{cat.rate}% complete</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Calendar View */
                <div className="glass-card rounded-xl border border-border/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            {monthData?.monthLabel || format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-lg">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-lg">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Month Summary */}
                    {monthData && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                            <MiniStat label="Total Tasks" value={monthData.summary.totalTasks} />
                            <MiniStat label="Completed" value={monthData.summary.completedTasks} />
                            <MiniStat label="Completion Rate" value={`${monthData.summary.completionRate}%`} />
                            <MiniStat label="Active Days" value={monthData.summary.activeDays} />
                            <MiniStat label="Productive Days" value={monthData.summary.productiveDays} />
                        </div>
                    )}

                    {/* Calendar Grid */}
                    <CalendarHeatmap
                        month={currentMonth}
                        days={monthData?.days || []}
                        loading={loading}
                    />

                    {/* Streak Info */}
                    {monthData && (
                        <div className="flex items-center justify-center gap-8 mt-6 pt-4 border-t border-border/50">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">{monthData.summary.currentStreak}</div>
                                <div className="text-xs text-muted-foreground">Current Streak</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-500">{monthData.summary.maxStreak}</div>
                                <div className="text-xs text-muted-foreground">Best Streak</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper Components

function StatCard({ title, value, subtitle, icon, color, highlight }: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'purple' | 'orange';
    highlight?: boolean;
}) {
    const colors = {
        green: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-600 dark:text-green-400',
        blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
        purple: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
        orange: 'from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
    };

    return (
        <div className={cn(
            "p-4 rounded-xl border bg-gradient-to-br",
            colors[color],
            highlight && "ring-2 ring-orange-500/50 animate-pulse"
        )}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                {icon}
            </div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

function CalendarHeatmap({ month, days, loading }: { month: Date; days: DayStats[]; loading: boolean }) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad to start on Sunday
    const startPadding = getDay(monthStart);

    const getIntensity = (completed: number, total: number): string => {
        if (total === 0) return 'bg-muted/30';
        const rate = completed / total;
        if (rate === 0) return 'bg-red-500/30';
        if (rate < 0.5) return 'bg-amber-500/50';
        if (rate < 1) return 'bg-green-500/50';
        return 'bg-green-500';
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {dayNames.map(day => (
                    <div key={day} className="text-xs text-muted-foreground font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Start padding */}
                {Array.from({ length: startPadding }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" />
                ))}

                {/* Days */}
                {allDays.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayData = days.find(d => d.date === dayStr);
                    const total = dayData?.total || 0;
                    const completed = dayData?.completed || 0;

                    return (
                        <div
                            key={dayStr}
                            className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer",
                                getIntensity(completed, total)
                            )}
                            title={`${format(day, 'MMM d')}: ${completed}/${total} completed`}
                        >
                            <span className="text-xs font-medium">{format(day, 'd')}</span>
                            {total > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                    {completed}/{total}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-muted/30" /> No tasks
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500/30" /> 0%
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-500/50" /> &lt;50%
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500/50" /> &lt;100%
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" /> 100%
                </div>
            </div>
        </div>
    );
}
