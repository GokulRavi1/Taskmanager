
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Task from "@/models/Task";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log("API: CONNECTING_DB");
        await connectToDatabase();
        console.log("API: DB_CONNECTED");
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");

        console.log("API: Date Param:", dateParam);

        let query = {};
        if (dateParam) {
            const date = parseISO(dateParam);
            if (isValid(date)) {
                query = {
                    date: {
                        $gte: startOfDay(date),
                        $lte: endOfDay(date),
                    },
                };
            }
        } else if (startParam && endParam) {
            const start = parseISO(startParam);
            const end = parseISO(endParam);
            if (isValid(start) && isValid(end)) {
                query = {
                    date: {
                        $gte: startOfDay(start),
                        $lte: endOfDay(end),
                    },
                };
            }
        }

        console.log("API: Running Query:", JSON.stringify(query));
        const tasks = await Task.find(query).sort({ startTime: 1, createdAt: 1 }).lean();
        console.log("API: Tasks Found:", tasks ? tasks.length : "null");

        // Ensure we always return an array
        return NextResponse.json(tasks || []);
    } catch (error: unknown) {
        // Detailed error logging
        const err = error as any;
        console.error("FULL_API_ERROR_OBJ:", JSON.stringify(err, Object.getOwnPropertyNames(err)));

        return NextResponse.json({
            error: "Failed to fetch tasks",
            details: err.message || "Unknown error",
            type: err.name,
            code: err.code
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        // Ensure date is parsed correctly if passed as string
        if (body.date) {
            body.date = new Date(body.date);
        }

        const task = await Task.create(body);
        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}
