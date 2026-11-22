import { Document, Types } from 'mongoose';
export interface IMessage extends Document {
    _id: Types.ObjectId;
    chatId: Types.ObjectId;
    role: 'user' | 'assistant';
    content: string;
    modelId?: string;
    reasoningMode?: string;
    attachments: {
        name: string;
        size: number;
        type: string;
        url?: string;
    }[];
    sources?: {
        index: number;
        title: string;
        url: string;
        snippet?: string;
    }[];
    createdAt: Date;
}
export declare const Message: import("mongoose").Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
