import { Document, Types } from 'mongoose';
export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    passwordHash?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    provider: 'google' | 'github' | 'discord' | 'email';
    providerId?: string;
    plan: 'free' | 'pro' | 'enterprise';
    refreshToken?: string;
    settings: {
        theme: 'dark' | 'light' | 'system';
        model: string;
        reasoningMode: string;
        enterToSend: boolean;
        streamResponses: boolean;
        aiMemory: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
