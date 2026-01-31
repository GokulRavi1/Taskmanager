import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Schedule from "@/models/Schedule";
import { DEFAULT_SCHEDULE_SLOTS } from "@/lib/smartScheduler";

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule
 * Fetch user's schedule template
 * If no schedule exists, returns the default template
 */
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // For now, fetch the default schedule (can be extended for user-specific)
        let schedule = await Schedule.findOne({ isDefault: true }).lean();

        if (!schedule) {
            // Return default schedule template if none exists
            return NextResponse.json({
                name: 'Default Schedule',
                isDefault: true,
                useLLMFallback: true,
                slots: DEFAULT_SCHEDULE_SLOTS,
                isTemporary: true, // Indicates this is not saved yet
            });
        }

        return NextResponse.json(schedule);
    } catch (error: any) {
        console.error("Error fetching schedule:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedule", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/schedule
 * Create or update schedule template
 */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        const { name, slots, useLLMFallback, isDefault = true } = body;

        if (!slots || !Array.isArray(slots)) {
            return NextResponse.json(
                { error: "Slots array is required" },
                { status: 400 }
            );
        }

        // If setting as default, unset other defaults first
        if (isDefault) {
            await Schedule.updateMany(
                { isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        // Upsert the schedule
        const schedule = await Schedule.findOneAndUpdate(
            { name: name || 'Default Schedule' },
            {
                name: name || 'Default Schedule',
                slots,
                useLLMFallback: useLLMFallback ?? true,
                isDefault,
            },
            { upsert: true, new: true }
        );

        return NextResponse.json(schedule, { status: 201 });
    } catch (error: any) {
        console.error("Error saving schedule:", error);
        return NextResponse.json(
            { error: "Failed to save schedule", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/schedule
 * Add or update a single slot in the schedule
 */
export async function PUT(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        const { slotIndex, slot, action } = body;

        const schedule = await Schedule.findOne({ isDefault: true });

        if (!schedule) {
            return NextResponse.json(
                { error: "No default schedule found" },
                { status: 404 }
            );
        }

        if (action === 'add') {
            schedule.slots.push(slot);
        } else if (action === 'update' && slotIndex !== undefined) {
            if (slotIndex < 0 || slotIndex >= schedule.slots.length) {
                return NextResponse.json(
                    { error: "Invalid slot index" },
                    { status: 400 }
                );
            }
            schedule.slots[slotIndex] = { ...schedule.slots[slotIndex], ...slot };
        } else if (action === 'delete' && slotIndex !== undefined) {
            if (slotIndex < 0 || slotIndex >= schedule.slots.length) {
                return NextResponse.json(
                    { error: "Invalid slot index" },
                    { status: 400 }
                );
            }
            schedule.slots.splice(slotIndex, 1);
        } else {
            return NextResponse.json(
                { error: "Invalid action. Use 'add', 'update', or 'delete'" },
                { status: 400 }
            );
        }

        await schedule.save();
        return NextResponse.json(schedule);
    } catch (error: any) {
        console.error("Error updating schedule:", error);
        return NextResponse.json(
            { error: "Failed to update schedule", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/schedule
 * Delete the entire schedule (reset to default)
 */
export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();

        await Schedule.deleteMany({ isDefault: true });

        return NextResponse.json({
            message: "Schedule deleted. Default template will be used.",
            slots: DEFAULT_SCHEDULE_SLOTS
        });
    } catch (error: any) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json(
            { error: "Failed to delete schedule", details: error.message },
            { status: 500 }
        );
    }
}
