import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Task, { ITask } from "@/models/Task";
import { startOfWeek, endOfWeek, parseISO, startOfDay, endOfDay, isBefore } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log("API_STATS: CONNECTING_DB");
        await connectToDatabase();
        console.log("API_STATS: DB_CONNECTED");

        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        console.log("API_STATS: Date Param:", dateParam);

        // Default to current week if no date provided, or use provided date as anchor
        let anchorDate = new Date();
        if (dateParam) {
            const parsed = parseISO(dateParam);
            // Check if valid
            if (!isNaN(parsed.getTime())) {
                anchorDate = parsed;
            }
        }

        const start = startOfWeek(anchorDate, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(anchorDate, { weekStartsOn: 1 });

        console.log(`API_STATS: Range ${start.toISOString()} - ${end.toISOString()}`);

        const tasks = await Task.find({
            date: {
                $gte: start,
                $lte: end,
            },
        }).lean();

        console.log("API_STATS: Tasks found:", tasks.length);

        const now = new Date();

        let completed = 0;
        let missed = 0;
        let open = 0;

        tasks.forEach((task: ITask) => {
            if (task.isCompleted) {
                completed++;
            } else {
                // Check if missed (past end of task day)
                const taskEndOfDay = endOfDay(new Date(task.date));
                if (isBefore(taskEndOfDay, now)) {
                    missed++;
                } else {
                    open++;
                }
            }
        });

        const stats = {
            total: tasks.length,
            completed,
            missed,
            open,
            // tasks // omit detailed tasks to save bandwidth unless needed
        };

        return NextResponse.json(stats);

    } catch (error: unknown) {
        const err = error as any;
        console.error("API_STATS_ERROR:", err);
        return NextResponse.json({
            error: "Failed to fetch stats",
            details: err.message
        }, { status: 500 });
    }
}
