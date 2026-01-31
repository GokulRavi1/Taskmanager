import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Schedule from "@/models/Schedule";
import {
    smartScheduleTask,
    DEFAULT_SCHEDULE_SLOTS,
    findSlotByKeywords,
    getCategories
} from "@/lib/smartScheduler";

export const dynamic = 'force-dynamic';

interface SmartScheduleRequest {
    title: string;
    description?: string;
    useLLM?: boolean;
}

/**
 * POST /api/schedule/smart
 * Smart schedule a task - find the best time slot based on task content
 */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body: SmartScheduleRequest = await req.json();

        if (!body.title) {
            return NextResponse.json(
                { error: "Task title is required" },
                { status: 400 }
            );
        }

        // Get user's schedule or use default
        let schedule = await Schedule.findOne({ isDefault: true }).lean();
        const slots = schedule?.slots || DEFAULT_SCHEDULE_SLOTS;
        const useLLMFallback = schedule?.useLLMFallback ?? body.useLLM ?? true;

        // Step 1: Try keyword matching first (zero LLM cost)
        const keywordMatch = findSlotByKeywords(
            `${body.title} ${body.description || ''}`,
            slots
        );

        if (keywordMatch) {
            return NextResponse.json({
                success: true,
                category: keywordMatch.slot.category,
                startTime: keywordMatch.slot.startTime,
                endTime: keywordMatch.slot.endTime,
                matchMethod: 'keyword',
                confidence: keywordMatch.confidence,
                matchedKeyword: keywordMatch.matchedKeyword,
                description: keywordMatch.slot.description,
                color: keywordMatch.slot.color,
            });
        }

        // Step 2: LLM fallback if enabled
        if (useLLMFallback) {
            try {
                // Import LLM classifier dynamically to avoid circular deps
                const { executeGroqCall } = await import('@/lib/groq');

                const categories = getCategories(slots);
                const prompt = `Classify this task into ONE category.
Task: "${body.title}"
Categories: ${categories.join(', ')}
Reply with ONLY the category name, nothing else.`;

                const response = await executeGroqCall([
                    { role: 'system', content: 'You are a task classifier. Reply with only the category name.' },
                    { role: 'user', content: prompt }
                ]);

                // Find matching category
                const normalizedResponse = response.trim().toLowerCase();
                for (const cat of categories) {
                    if (normalizedResponse.includes(cat.toLowerCase())) {
                        const matchingSlot = slots.find(s =>
                            s.category.toLowerCase() === cat.toLowerCase()
                        );

                        if (matchingSlot) {
                            return NextResponse.json({
                                success: true,
                                category: matchingSlot.category,
                                startTime: matchingSlot.startTime,
                                endTime: matchingSlot.endTime,
                                matchMethod: 'llm',
                                confidence: 'medium',
                                description: matchingSlot.description,
                                color: matchingSlot.color,
                            });
                        }
                    }
                }
            } catch (llmError) {
                console.error('LLM classification failed:', llmError);
            }
        }

        // No match found - return categories for manual selection
        return NextResponse.json({
            success: false,
            message: 'Could not automatically classify task',
            availableCategories: getCategories(slots),
            slots: slots.map(s => ({
                category: s.category,
                startTime: s.startTime,
                endTime: s.endTime,
                description: s.description,
                color: s.color,
            })),
        });
    } catch (error: any) {
        console.error("Error in smart scheduling:", error);
        return NextResponse.json(
            { error: "Failed to schedule task", details: error.message },
            { status: 500 }
        );
    }
}
