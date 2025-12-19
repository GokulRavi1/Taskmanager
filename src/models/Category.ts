import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    color: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true, unique: true },
        color: { type: String, default: '#3b82f6' },
        defaultStartTime: { type: String },
        defaultEndTime: { type: String },
    },
    { timestamps: true }
);

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
