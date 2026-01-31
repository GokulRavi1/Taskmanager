import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScheduleSlot {
    category: string;           // "Marktiz", "Bug Bounty", etc.
    startTime: string;          // "10:00" (24h format)
    endTime: string;            // "14:00"
    keywords: string[];         // ["marktiz", "startup", "product"]
    description?: string;       // Optional description of the slot
    priority: number;           // Higher = more priority when matching
    daysOfWeek: number[];       // [0-6] for specific days, empty = all days
    color?: string;             // Optional color for UI display
}

export interface ISchedule extends Document {
    userId?: string;            // Optional: for user-specific schedules
    name: string;               // "Default Schedule", "Weekend Schedule"
    isDefault: boolean;         // Is this the default schedule?
    useLLMFallback: boolean;    // Use LLM when no keyword match
    slots: IScheduleSlot[];
    createdAt: Date;
    updatedAt: Date;
}

const ScheduleSlotSchema = new Schema<IScheduleSlot>({
    category: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    keywords: { type: [String], default: [] },
    description: { type: String },
    priority: { type: Number, default: 0 },
    daysOfWeek: { type: [Number], default: [] }, // Empty = all days
    color: { type: String },
});

const ScheduleSchema = new Schema<ISchedule>(
    {
        userId: { type: String },
        name: { type: String, required: true, default: 'Default Schedule' },
        isDefault: { type: Boolean, default: true },
        useLLMFallback: { type: Boolean, default: true },
        slots: { type: [ScheduleSlotSchema], default: [] },
    },
    { timestamps: true }
);

// Ensure only one default schedule per user
ScheduleSchema.index({ userId: 1, isDefault: 1 });

const Schedule: Model<ISchedule> = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', ScheduleSchema);

export default Schedule;
