"use client"

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { CheckCircle2, Circle, AlertCircle, Calendar as CalendarIcon, LayoutList, Kanban, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarView } from "@/components/CalendarView";
import { WeeklyBoard } from "@/components/WeeklyBoard";
import { TaskList } from "@/components/TaskList";
import { useTaskContext } from "@/context/TaskContext";
import { useRouter } from "next/navigation";

interface DashboardProps { }

export function Dashboard() {
    const { tasks, refreshTasks } = useTaskContext();
    const router = useRouter();
    const [stats, setStats] = useState({ total: 0, completed: 0, open: 0, missed: 0 });
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'calendar'>('daily');
    const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month'>('day');

    useEffect(() => {
        calculateStats();
    }, [tasks, chartTimeframe]);

    const calculateStats = () => {
        const today = new Date();
        let filteredTasks = tasks;

        if (chartTimeframe === 'day') {
            const dateStr = format(today, 'yyyy-MM-dd');
            filteredTasks = tasks.filter((t: any) => t.date && t.date.startsWith(dateStr));
        } else if (chartTimeframe === 'week') {
            const start = startOfWeek(today, { weekStartsOn: 1 });
            const end = endOfWeek(today, { weekStartsOn: 1 });
            filteredTasks = tasks.filter((t: any) => {
                const d = new Date(t.date);
                return d >= start && d <= end;
            });
        } else {
            const start = startOfMonth(today);
            const end = endOfMonth(today);
            filteredTasks = tasks.filter((t: any) => {
                const d = new Date(t.date);
                return d >= start && d <= end;
            });
        }

        setStats({
            total: filteredTasks.length,
            completed: filteredTasks.filter((t: any) => t.isCompleted).length,
            open: filteredTasks.filter((t: any) => !t.isCompleted).length,
            missed: 0
        });
    };

    const handleAddTask = (date: string) => {
        router.push(`/add-task?date=${date}`);
    };

    const data = [
        { name: "Completed", value: stats.completed, color: "#22c55e" },
        { name: "Pending", value: stats.open, color: "#3b82f6" },
        { name: "Missed", value: stats.missed, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* View Toggles */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {viewMode === 'daily' ? 'Daily Overview' : viewMode === 'weekly' ? 'Weekly Board' : 'Calendar'}
                </h1>

                <div className="flex bg-muted/30 p-1 rounded-lg border border-border/40 backdrop-blur-sm">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'daily' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/50 text-muted-foreground'
                        )}
                    >
                        <LayoutList className="w-4 h-4" />
                        Daily
                    </button>
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'weekly' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/50 text-muted-foreground'
                        )}
                    >
                        <Kanban className="w-4 h-4" />
                        Weekly
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            viewMode === 'calendar' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/50 text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Calendar
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {viewMode === 'daily' && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Completed */}
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm hover:bg-card/80 transition-all group">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                            <div className="p-1.5 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {stats.completed}
                            <span className="text-xs font-normal text-green-500 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded-full">
                                <ArrowUp className="w-3 h-3 mr-0.5" /> +10%
                            </span>
                        </div>
                    </div>

                    {/* Pending */}
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm hover:bg-card/80 transition-all group">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
                            <div className="p-1.5 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                                <Circle className="h-4 w-4 text-blue-500" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {stats.open}
                            <span className="text-xs font-normal text-blue-500 flex items-center bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                                <TrendingUp className="w-3 h-3 mr-0.5" /> Active
                            </span>
                        </div>
                    </div>

                    {/* Missed */}
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm hover:bg-card/80 transition-all group">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Missed</h3>
                            <div className="p-1.5 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {stats.missed}
                            {stats.missed > 0 && (
                                <span className="text-xs font-normal text-red-500 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                    <ArrowUp className="w-3 h-3 mr-0.5" /> Alert
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm hover:bg-card/80 transition-all col-span-1 md:row-span-1 relative">
                        <div className="pb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground">Activity</h3>
                            <div className="flex bg-muted/50 rounded-lg p-0.5">
                                <button
                                    onClick={() => setChartTimeframe('day')}
                                    className={cn("text-[10px] px-2 py-0.5 rounded-md transition-all", chartTimeframe === 'day' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >D</button>
                                <button
                                    onClick={() => setChartTimeframe('week')}
                                    className={cn("text-[10px] px-2 py-0.5 rounded-md transition-all", chartTimeframe === 'week' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >W</button>
                                <button
                                    onClick={() => setChartTimeframe('month')}
                                    className={cn("text-[10px] px-2 py-0.5 rounded-md transition-all", chartTimeframe === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >M</button>
                            </div>
                        </div>
                        <div className="h-[120px]">
                            {data.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                                    No data
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Category Chart */}
                    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-sm hover:bg-card/80 transition-all col-span-1 md:row-span-1 relative">
                        <div className="pb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground">Focus Areas</h3>
                        </div>
                        <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Work', value: stats.total > 0 ? 50 : 0, color: '#8b5cf6' },
                                            { name: 'Gym', value: stats.total > 0 ? 30 : 0, color: '#ec4899' },
                                            { name: 'Other', value: stats.total > 0 ? 20 : 0, color: '#f59e0b' },
                                        ].filter(d => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {[
                                            { name: 'Work', value: 50, color: '#8b5cf6' },
                                            { name: 'Gym', value: 30, color: '#ec4899' },
                                            { name: 'Other', value: 20, color: '#f59e0b' },
                                        ].filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-cat-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="min-h-[500px] animate-in fade-in duration-500">
                {viewMode === 'daily' && <TaskList />}
                {viewMode === 'weekly' && <WeeklyBoard onAddTask={handleAddTask} />}
                {viewMode === 'calendar' && <CalendarView />}
            </div>
        </div>
    );
}
