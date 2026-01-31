import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Task from "@/models/Task";
import { parseTaskFromNaturalLanguage } from "@/lib/groq";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Use AI to parse the natural language into structured task data
        const parsedTasks = await parseTaskFromNaturalLanguage(message);

        if (!parsedTasks || parsedTasks.length === 0) {
            return NextResponse.json({
                success: false,
                message: "I couldn't identify a task in your message. Try something like: 'Schedule a meeting tomorrow at 2pm'"
            });
        }

        // Connect to DB and create tasks
        await connectToDatabase();

        const createdTasks = [];
        for (const taskData of parsedTasks) {
            // Map AI output to our Task model
            const task = await Task.create({
                title: taskData.title,
                description: taskData.description || '',
                category: taskData.category || 'General',
                date: taskData.dueDate ? new Date(taskData.dueDate) : new Date(),
                startTime: taskData.startTime || '',
                endTime: taskData.endTime || '',
                notes: taskData.notes || '',
                isCompleted: false,
                links: []
            });
            createdTasks.push(task);
        }

        // Build confirmation message
        const confirmations = createdTasks.map(t => {
            let msg = `**${t.title}**`;
            if (t.category && t.category !== 'General') msg += ` (${t.category})`;
            if (t.date) msg += ` on ${new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
            if (t.startTime) msg += ` at ${t.startTime}`;
            if (t.endTime) msg += ` - ${t.endTime}`;
            return msg;
        });

        return NextResponse.json({
            success: true,
            tasks: createdTasks,
            message: `✅ Scheduled:\n${confirmations.join('\n')}`
        });

    } catch (error: any) {
        console.error("Error scheduling task:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to schedule task"
        }, { status: 500 });
    }
}
