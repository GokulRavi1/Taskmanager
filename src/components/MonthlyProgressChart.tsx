"use client"

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { CalendarDays, TrendingUp, ChevronLeft, ChevronRight, Loader2, Target, Flame } from 'lucide-react';
import { format, subYears, addYears } from 'date-fns';

interface MonthStats {
    month: string;
    monthLabel: string;
    total: number;
    completed: number;
    completionRate: number;
    streak: number;
}

interface YearData {
    year: number;
    summary: {
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
    };
    months: MonthStats[];
    categories: Array<{
        category: string;
        total: number;
        completed: number;
        completionRate: number;
        avgPerDay: number;
    }>;
}

export function MonthlyProgressChart() {
    const [yearData, setYearData] = useState<YearData | null>(null);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchYearData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/analytics?view=monthly&year=${currentYear}`);
                const data = await res.json();
                setYearData(data);
            } catch (e) {
                console.error('Failed to fetch year data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchYearData();
    }, [currentYear]);

    const prevYear = () => setCurrentYear(currentYear - 1);
    const nextYear = () => setCurrentYear(currentYear + 1);

    if (loading && !yearData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        Monthly Progress - {currentYear}
                    </h2>
                    <p className="text-muted-foreground text-sm">Your year at a glance</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevYear} className="p-2 hover:bg-muted rounded-lg">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium px-3">{currentYear}</span>
                    <button
                        onClick={nextYear}
                        disabled={currentYear >= new Date().getFullYear()}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Year Summary */}
            {yearData && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/20">
                        <div className="text-sm text-muted-foreground">Total Tasks</div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {yearData.summary.totalTasks}
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
                        <div className="text-sm text-muted-foreground">Completed</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {yearData.summary.completedTasks}
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-500/20">
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {yearData.summary.completionRate}%
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Bar Chart */}
            <div className="glass-card rounded-xl border border-border/50 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Monthly Completion Rate
                </h3>
                {yearData && (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yearData.months}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--background)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)'
                                }}
                                formatter={(value, name) => {
                                    if (name === 'completionRate') return [`${value}%`, 'Completion Rate'];
                                    return [value, name];
                                }}
                            />
                            <Bar dataKey="completionRate" name="Completion Rate" radius={[4, 4, 0, 0]}>
                                {yearData.months.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.completionRate >= 80 ? '#22c55e' :
                                            entry.completionRate >= 50 ? '#f59e0b' : '#ef4444'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Month Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {yearData?.months.map((month) => (
                    <div
                        key={month.month}
                        className={cn(
                            "p-4 rounded-xl border transition-all hover:scale-105",
                            month.completionRate >= 80 ? "bg-green-500/10 border-green-500/30" :
                                month.completionRate >= 50 ? "bg-amber-500/10 border-amber-500/30" :
                                    month.total === 0 ? "bg-muted/30 border-border/50" :
                                        "bg-red-500/10 border-red-500/30"
                        )}
                    >
                        <div className="font-medium">{month.monthLabel}</div>
                        <div className="text-2xl font-bold">
                            {month.completionRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {month.completed}/{month.total} tasks
                        </div>
                        {month.streak > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                                <Flame className="w-3 h-3" />
                                {month.streak} days
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Category Breakdown for Year */}
            {yearData && yearData.categories.length > 0 && (
                <div className="glass-card rounded-xl border border-border/50 p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        Category Performance - {currentYear}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-3 font-medium">Category</th>
                                    <th className="text-center py-2 px-3 font-medium">Total</th>
                                    <th className="text-center py-2 px-3 font-medium">Completed</th>
                                    <th className="text-center py-2 px-3 font-medium">Rate</th>
                                    <th className="text-center py-2 px-3 font-medium">Avg/Day</th>
                                </tr>
                            </thead>
                            <tbody>
                                {yearData.categories.map((cat) => (
                                    <tr key={cat.category} className="border-b border-border/50 hover:bg-muted/30">
                                        <td className="py-2 px-3 font-medium">{cat.category}</td>
                                        <td className="text-center py-2 px-3">{cat.total}</td>
                                        <td className="text-center py-2 px-3 text-green-600">{cat.completed}</td>
                                        <td className="text-center py-2 px-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                cat.completionRate >= 80 ? "bg-green-500/20 text-green-600" :
                                                    cat.completionRate >= 50 ? "bg-amber-500/20 text-amber-600" :
                                                        "bg-red-500/20 text-red-600"
                                            )}>
                                                {cat.completionRate}%
                                            </span>
                                        </td>
                                        <td className="text-center py-2 px-3 text-muted-foreground">
                                            {cat.avgPerDay}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
