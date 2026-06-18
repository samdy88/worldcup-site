import { NextResponse } from 'next/server';
import { verifyPassword, signToken } from '@/lib/auth';
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

    const db = getDb();
    const user = db
      .prepare(
        'SELECT id, username, password_hash, balance, is_admin FROM users WHERE username = ?'
      )
      .get(username) as {
      id: number;
      username: string;
      password_hash: string;
      balance: number;
      is_admin: number;
    } | null;

    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        is_admin: user.is_admin,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后再试' },
      { status: 500 }
    );
  }
}
