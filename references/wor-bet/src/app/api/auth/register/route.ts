import { NextResponse } from 'next/server';
import { hashPassword, signToken, verifyPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: '用户名至少3个字符，密码至少6个字符' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user already exists
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);
    if (existing) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const result = db
      .prepare(
        'INSERT INTO users (username, password_hash, balance, is_admin) VALUES (?, ?, ?, ?)'
      )
      .run(username, passwordHash, 100.0, 0);

    const token = await signToken({
      userId: result.lastInsertRowid as number,
      username,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: result.lastInsertRowid, username, balance: 100.0 },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后再试' },
      { status: 500 }
    );
  }
}
