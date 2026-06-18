import { NextResponse } from 'next/server';
import { runAllAutomation } from '@/lib/automation';
import { ensureInitialized } from '@/lib/init-app';

/**
 * GET /api/cron/run
 *
 * 通过 Polymarket Gamma API 运行自动化：发现赛事 → 更新赔率 → 自动结算。
 * 可选 CRON_SECRET 查询参数保护。
 */
export async function GET(request: Request) {
  ensureInitialized();

  // 检查 CRON_SECRET（如果配置了）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const { searchParams } = new URL(request.url);
    const provided = searchParams.get('secret');
    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing secret' },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runAllAutomation();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/run] 自动化错误:', error);
    return NextResponse.json(
      { error: 'Automation run failed', detail: String(error) },
      { status: 500 }
    );
  }
}
