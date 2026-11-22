import { Document, Types } from 'mongoose';
export interface IProject extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    emoji: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Project: import("mongoose").Model<IProject, {}, {}, {}, Document<unknown, {}, IProject, {}, {}> & IProject & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
