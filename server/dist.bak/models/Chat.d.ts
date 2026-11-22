import { Document, Types } from 'mongoose';
export interface IChat extends Document {
    _id: Types.ObjectId;
    slug: string;
    userId: Types.ObjectId;
    title: string;
    modelId: string;
    reasoningMode: string;
    projectId?: Types.ObjectId;
    pinned: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Chat: import("mongoose").Model<IChat, {}, {}, {}, Document<unknown, {}, IChat, {}, {}> & IChat & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
