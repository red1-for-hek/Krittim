import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const signAccess = (payload: TokenPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP } as jwt.SignOptions);

export const signRefresh = (payload: TokenPayload): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP } as jwt.SignOptions);

export const verifyAccess = (token: string): TokenPayload =>
  jwt.verify(token, ACCESS_SECRET) as TokenPayload;

export const verifyRefresh = (token: string): TokenPayload =>
  jwt.verify(token, REFRESH_SECRET) as TokenPayload;
