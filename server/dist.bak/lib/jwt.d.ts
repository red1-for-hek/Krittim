export interface TokenPayload {
    userId: string;
    email: string;
}
export declare const signAccess: (payload: TokenPayload) => string;
export declare const signRefresh: (payload: TokenPayload) => string;
export declare const verifyAccess: (token: string) => TokenPayload;
export declare const verifyRefresh: (token: string) => TokenPayload;
