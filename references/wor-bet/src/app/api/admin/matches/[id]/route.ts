import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user || user.is_admin !== 1) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const matchId = Number(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: '无效的比赛ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['upcoming', 'live', 'finished'].includes(status)) {
      return NextResponse.json(
        { error: '状态必须是 upcoming, live 或 finished' },
        { status: 400 }
      );
    }

    const db = getDb();

    const match = db
      .prepare('SELECT id, status FROM matches WHERE id = ?')
      .get(matchId) as { id: number; status: string } | null;

    if (!match) {
      return NextResponse.json({ error: '比赛不存在' }, { status: 404 });
    }

    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(
      status,
      matchId
    );

    return NextResponse.json({
      success: true,
      match: { id: matchId, status },
    });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      { error: '更新比赛状态失败' },
      { status: 500 }
    );
  }
}
