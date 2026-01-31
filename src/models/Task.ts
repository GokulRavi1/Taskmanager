import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILink {
    label: string;
    url: string;
}

export interface ITask extends Document {
    title: string;
    description?: string;
    isCompleted: boolean;
    completedAt?: Date;       // When the task was marked complete
    date: Date;
    startTime?: string;
    endTime?: string;
    notes?: string;
    links: ILink[];
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

const LinkSchema = new Schema<ILink>({
    label: { type: String, required: true },
    url: { type: String, required: true },
});

const TaskSchema = new Schema<ITask>(
    {
        title: { type: String, required: [true, 'Please provide a title for this task.'] },
        description: { type: String },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },  // Timestamp when task was completed
        date: { type: Date, required: true, default: Date.now },
        startTime: { type: String },
        endTime: { type: String },
        notes: { type: String },
        category: { type: String, default: "General" },
        links: { type: [LinkSchema], default: [] },
    },
    { timestamps: true }
);

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;

