import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function GET() {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user || user.is_admin !== 1) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const db = getDb();

    const users = db
      .prepare(
        `SELECT u.id, u.username, u.balance, u.is_admin, u.created_at,
                (SELECT COUNT(*) FROM bets WHERE user_id = u.id) as bet_count
         FROM users u
         ORDER BY u.created_at ASC`
      )
      .all() as Array<{
      id: number;
      username: string;
      balance: number;
      is_admin: number;
      created_at: string;
      bet_count: number;
    }>;

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
