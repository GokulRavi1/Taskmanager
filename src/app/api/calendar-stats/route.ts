import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Task from "@/models/Task";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const monthParam = searchParams.get("month"); // "2024-12"

        if (!monthParam) {
            return NextResponse.json({ error: "Month parameter required (YYYY-MM)" }, { status: 400 });
        }

        const date = parseISO(monthParam + "-01");
        if (isNaN(date.getTime())) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }

        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const tasks = await Task.find({
            date: {
                $gte: start,
                $lte: end,
            },
        }).lean();

        // Group by day
        // Map<"YYYY-MM-DD", { total, completed }>
        const dailyStats: Record<string, { total: number; completed: number }> = {};

        tasks.forEach((task: any) => {
            // Task date is stored as Date object. Convert to YYYY-MM-DD string.
            const dayKey = format(new Date(task.date), 'yyyy-MM-dd');

            if (!dailyStats[dayKey]) {
                dailyStats[dayKey] = { total: 0, completed: 0 };
            }

            dailyStats[dayKey].total++;
            if (task.isCompleted) {
                dailyStats[dayKey].completed++;
            }
        });

        return NextResponse.json(dailyStats);

    } catch (error: unknown) {
        console.error("Calendar Stats Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
