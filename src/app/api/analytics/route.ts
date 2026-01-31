import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Task from "@/models/Task";
import {
    startOfMonth, endOfMonth, startOfYear, endOfYear,
    startOfWeek, endOfWeek, format, parseISO,
    eachDayOfInterval, eachMonthOfInterval, subDays,
    differenceInDays, isSameDay
} from "date-fns";

export const dynamic = 'force-dynamic';

interface DayStats {
    date: string;
    total: number;
    completed: number;
    categories: Record<string, { total: number; completed: number }>;
}

interface MonthStats {
    month: string;
    monthLabel: string;
    total: number;
    completed: number;
    completionRate: number;
    streak: number; // Days with at least one completion
}

interface CategoryStats {
    category: string;
    total: number;
    completed: number;
    completionRate: number;
    avgPerDay: number;
}

/**
 * GET /api/analytics
 * Comprehensive analytics endpoint
 * 
 * Query params:
 * - view: 'daily' | 'monthly' | 'yearly' | 'overview'
 * - month: 'YYYY-MM' (for daily view)
 * - year: 'YYYY' (for monthly view)
 */
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const view = searchParams.get("view") || "overview";
        const monthParam = searchParams.get("month");
        const yearParam = searchParams.get("year");

        const now = new Date();

        switch (view) {
            case "daily":
                return getDailyAnalytics(monthParam, now);
            case "monthly":
                return getMonthlyAnalytics(yearParam, now);
            case "yearly":
                return getYearlyAnalytics(now);
            case "overview":
            default:
                return getOverviewAnalytics(now);
        }
    } catch (error: any) {
        console.error("Analytics Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Daily analytics for a specific month
 */
async function getDailyAnalytics(monthParam: string | null, now: Date) {
    const targetDate = monthParam ? parseISO(monthParam + "-01") : now;
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);

    const tasks = await Task.find({
        date: { $gte: start, $lte: end }
    }).lean();

    const days = eachDayOfInterval({ start, end });
    const dailyStats: DayStats[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));

        const categories: Record<string, { total: number; completed: number }> = {};
        dayTasks.forEach(t => {
            const cat = t.category || 'General';
            if (!categories[cat]) categories[cat] = { total: 0, completed: 0 };
            categories[cat].total++;
            if (t.isCompleted) categories[cat].completed++;
        });

        return {
            date: dayStr,
            total: dayTasks.length,
            completed: dayTasks.filter(t => t.isCompleted).length,
            categories
        };
    });

    // Calculate streak (consecutive days with completions)
    let currentStreak = 0;
    let maxStreak = 0;
    for (let i = dailyStats.length - 1; i >= 0; i--) {
        if (dailyStats[i].completed > 0) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    // Summary stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeDays = dailyStats.filter(d => d.total > 0).length;
    const productiveDays = dailyStats.filter(d => d.completed > 0).length;

    return NextResponse.json({
        month: format(targetDate, 'yyyy-MM'),
        monthLabel: format(targetDate, 'MMMM yyyy'),
        summary: {
            totalTasks,
            completedTasks,
            completionRate,
            activeDays,
            productiveDays,
            currentStreak,
            maxStreak
        },
        days: dailyStats
    });
}

/**
 * Monthly analytics for a year
 */
async function getMonthlyAnalytics(yearParam: string | null, now: Date) {
    const year = yearParam ? parseInt(yearParam) : now.getFullYear();
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));

    const tasks = await Task.find({
        date: { $gte: start, $lte: end }
    }).lean();

    const months = eachMonthOfInterval({ start, end });
    const monthlyStats: MonthStats[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthTasks = tasks.filter(t => {
            const taskDate = new Date(t.date);
            return taskDate >= monthStart && taskDate <= monthEnd;
        });

        const total = monthTasks.length;
        const completed = monthTasks.filter(t => t.isCompleted).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate streak for this month
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        let streak = 0;
        daysInMonth.forEach(day => {
            const dayHasCompletion = monthTasks.some(t =>
                t.isCompleted && isSameDay(new Date(t.date), day)
            );
            if (dayHasCompletion) streak++;
        });

        return {
            month: format(month, 'yyyy-MM'),
            monthLabel: format(month, 'MMM'),
            total,
            completed,
            completionRate,
            streak
        };
    });

    // Category breakdown for the year
    const categoryStats: Record<string, CategoryStats> = {};
    tasks.forEach(t => {
        const cat = t.category || 'General';
        if (!categoryStats[cat]) {
            categoryStats[cat] = { category: cat, total: 0, completed: 0, completionRate: 0, avgPerDay: 0 };
        }
        categoryStats[cat].total++;
        if (t.isCompleted) categoryStats[cat].completed++;
    });

    const daysInYear = differenceInDays(end, start) + 1;
    Object.values(categoryStats).forEach(cat => {
        cat.completionRate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
        cat.avgPerDay = parseFloat((cat.total / daysInYear).toFixed(2));
    });

    return NextResponse.json({
        year,
        summary: {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.isCompleted).length,
            completionRate: tasks.length > 0
                ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)
                : 0
        },
        months: monthlyStats,
        categories: Object.values(categoryStats).sort((a, b) => b.total - a.total)
    });
}

/**
 * Yearly comparison analytics
 */
async function getYearlyAnalytics(now: Date) {
    const currentYear = now.getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    const results = await Promise.all(years.map(async (year) => {
        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));

        const tasks = await Task.find({
            date: { $gte: start, $lte: end }
        }).lean();

        return {
            year,
            total: tasks.length,
            completed: tasks.filter(t => t.isCompleted).length,
            completionRate: tasks.length > 0
                ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100)
                : 0
        };
    }));

    return NextResponse.json({ years: results });
}

/**
 * Overview analytics (last 30 days + current month/week)
 */
async function getOverviewAnalytics(now: Date) {
    const thirtyDaysAgo = subDays(now, 29);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Fetch all relevant tasks
    const tasks = await Task.find({
        date: { $gte: thirtyDaysAgo, $lte: now }
    }).lean();

    const monthTasks = await Task.find({
        date: { $gte: monthStart, $lte: monthEnd }
    }).lean();

    const weekTasks = tasks.filter(t => {
        const taskDate = new Date(t.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
    });

    // Daily breakdown for last 30 days (for chart)
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
    const dailyData = days.map(day => {
        const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));
        return {
            date: format(day, 'MMM dd'),
            fullDate: format(day, 'yyyy-MM-dd'),
            total: dayTasks.length,
            completed: dayTasks.filter(t => t.isCompleted).length
        };
    });

    // Calculate current streak
    let currentStreak = 0;
    for (let i = dailyData.length - 1; i >= 0; i--) {
        if (dailyData[i].completed > 0) {
            currentStreak++;
        } else {
            break;
        }
    }

    // Category breakdown
    const categoryMap: Record<string, { total: number; completed: number }> = {};
    monthTasks.forEach(t => {
        const cat = t.category || 'General';
        if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0 };
        categoryMap[cat].total++;
        if (t.isCompleted) categoryMap[cat].completed++;
    });

    const categories = Object.entries(categoryMap).map(([name, stats]) => ({
        name,
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
        today: {
            total: dailyData[dailyData.length - 1]?.total || 0,
            completed: dailyData[dailyData.length - 1]?.completed || 0
        },
        thisWeek: {
            total: weekTasks.length,
            completed: weekTasks.filter(t => t.isCompleted).length,
            rate: weekTasks.length > 0
                ? Math.round((weekTasks.filter(t => t.isCompleted).length / weekTasks.length) * 100)
                : 0
        },
        thisMonth: {
            total: monthTasks.length,
            completed: monthTasks.filter(t => t.isCompleted).length,
            rate: monthTasks.length > 0
                ? Math.round((monthTasks.filter(t => t.isCompleted).length / monthTasks.length) * 100)
                : 0,
            label: format(now, 'MMMM yyyy')
        },
        streak: currentStreak,
        dailyData,
        categories
    });
}
