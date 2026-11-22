import type { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
}
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
