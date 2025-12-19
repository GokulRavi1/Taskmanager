import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: [true, 'Please provide a name.'] },
        email: {
            type: String,
            required: [true, 'Please provide an email.'],
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: { type: String, required: true },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
