"use client"

import { useState, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTaskContext } from '@/context/TaskContext';
import {
    startOfWeek, endOfWeek, eachDayOfInterval, format,
    subDays, startOfMonth, isSameDay, parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles, TrendingUp, Target, PieChart as PieIcon, Activity } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AnalyticsDashboard() {
    const { tasks } = useTaskContext();
    const [aiInsight, setAiInsight] = useState<{ chartId: string, text: string } | null>(null);
    const [analyzing, setAnalyzing] = useState<string | null>(null);

    // --- DATA PREPARATION ---

    // 1. Velocity (Last 14 days)
    const velocityData = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 13);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            // Created: Tasks created on this specific day (Incoming Work)
            const createdCount = tasks.filter(t => {
                if (!t.createdAt) return false;
                return isSameDay(parseISO(t.createdAt as unknown as string), day);
            }).length;

            // Completed: Tasks completed on this day (Output)
            // Note: Since we don't have completedAt, we use a proxy:
            // Tasks due on this day that are completed. 
            // Ideally we need a completedAt field. For now, we'll use "Scheduled Completed"
            const scheduledCompletedCount = tasks.filter(t => {
                if (!t.date || !t.isCompleted) return false;
                // Handle both ISO strings and potentially pre-formatted strings
                const taskDate = typeof t.date === 'string' ? parseISO(t.date) : new Date(t.date);
                return isSameDay(taskDate, day);
            }).length;

            return {
                date: format(day, 'MMM dd'),
                fullDate: dateStr,
                created: createdCount,
                completed: scheduledCompletedCount
            };
        });
    }, [tasks]);

    // 2. Categories
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const cat = t.category || "General";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    // 3. Completion Rate by Weekday (Productivity Pattern)
    const weekdayData = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const counts = days.map(d => ({ day: d, completed: 0, total: 0 }));

        tasks.forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            const dayIndex = d.getDay();
            counts[dayIndex].total++;
            if (t.isCompleted) counts[dayIndex].completed++;
        });

        return counts.map(d => ({
            ...d,
            rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
        }));
    }, [tasks]);


    // --- AI ANALYSIS HANDLER ---
    const analyzeChart = async (chartId: string, contextData: any) => {
        setAnalyzing(chartId);
        setAiInsight(null);

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: `ANALYZE THIS CHART DATA AND PROVIDE 1 CONCISE INSIGHT (Max 2 sentences).
                    CHART ID: ${chartId}
                    DATA: ${JSON.stringify(contextData)}
                    
                    Focus on trends, anomalies, or actionable advice.`
                }),
            });
            const data = await res.json();
            setAiInsight({ chartId, text: data.result });
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
                    <p className="text-muted-foreground">Deep dive into your productivity patterns.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* VELOCITY CHART */}
                <ChartCard
                    title="Work Velocity"
                    icon={<Activity className="w-5 h-5 text-blue-500" />}
                    description="Tasks Scheduled vs. Completed (Last 14 Days)"
                    onAnalyze={() => analyzeChart('velocity', velocityData)}
                    analyzing={analyzing === 'velocity'}
                    insight={aiInsight?.chartId === 'velocity' ? aiInsight.text : null}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={velocityData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="created" stroke="#8884d8" name="Scheduled" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* CATEGORY DISTRIBUTION */}
                <ChartCard
                    title="Category Focus"
                    icon={<PieIcon className="w-5 h-5 text-purple-500" />}
                    description="Where you are spending your time"
                    onAnalyze={() => analyzeChart('categories', categoryData)}
                    analyzing={analyzing === 'categories'}
                    insight={aiInsight?.chartId === 'categories' ? aiInsight.text : null}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* WEEKDAY PRODUCTIVITY */}
                <ChartCard
                    title="Weekday Performance"
                    icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                    description="Completion Rate by Day of Week"
                    onAnalyze={() => analyzeChart('weekday', weekdayData)}
                    analyzing={analyzing === 'weekday'}
                    insight={aiInsight?.chartId === 'weekday' ? aiInsight.text : null}
                    className="md:col-span-2"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weekdayData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Bar dataKey="rate" name="Completion Rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

function ChartCard({
    title, icon, description, children,
    onAnalyze, analyzing, insight, className
}: any) {
    return (
        <div className={cn("glass-card rounded-xl border border-border/50 p-6 flex flex-col", className)}>
            <div className="flex items-start justify-between mb-6">
                <div className="flex gap-3">
                    <div className="p-2 bg-muted rounded-lg">{icon}</div>
                    <div>
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                </div>
                <button
                    onClick={onAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                    {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI Insight
                </button>
            </div>

            {insight && (
                <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-sm text-indigo-900 dark:text-indigo-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{insight}</p>
                    </div>
                </div>
            )}

            <div className="flex-1 w-full min-h-[300px]">
                {children}
            </div>
        </div>
    )
}
