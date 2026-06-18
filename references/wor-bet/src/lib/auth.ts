import bcryptjs from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from './db';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'worldcup-bet-secret-2026'
);

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function signToken(payload: {
  userId: number;
  username: string;
}): Promise<string> {
  return new SignJWT({ userId: payload.userId, username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{
  userId: number;
  username: string;
  balance: number;
  is_admin: number;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const db = getDb();
    const user = db
      .prepare(
        'SELECT id, username, balance, is_admin FROM users WHERE id = ?'
      )
      .get(payload.userId) as {
      id: number;
      username: string;
      balance: number;
      is_admin: number;
    } | null;

    if (!user) return null;

    return {
      userId: user.id,
      username: user.username,
      balance: user.balance,
      is_admin: user.is_admin,
    };
  } catch {
    return null;
  }
}
