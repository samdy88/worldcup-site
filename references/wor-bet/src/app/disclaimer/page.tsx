'use client';

import { useEffect } from 'react';

export default function DisclaimerPage() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pitch-pattern">
      <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            法律免责声明
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">免责声明 / Disclaimer</h1>
          <p className="text-white/30 text-sm">最后更新：2026年5月26日</p>
        </div>

        {/* Critical Notice */}
        <div className="glass-card p-5 mb-6 border-l-4 border-amber-400">
          <h2 className="text-amber-300 font-bold text-base mb-3 flex items-center gap-2">
            <span className="text-lg">⚠️</span> 重要提示
          </h2>
          <div className="space-y-2 text-white/70 text-sm leading-relaxed">
            <p>
              本平台（以下简称「本站」）是一个<strong className="text-amber-200">纯虚拟模拟器</strong>，
              所有「货币」「资金」「余额」「投注」等概念<strong className="text-amber-200">仅限于本站内部虚拟环境</strong>，
              不代表、不等于、不可兑换任何真实货币或价值。
            </p>
            <p>
              本站<strong className="text-amber-200">不涉及任何形式的真实金钱交易、赌博或金融活动</strong>。
              注册时赠送的 $100 虚拟货币仅供娱乐，无任何实际价值。
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <DisclaimerSection
            icon="🎮"
            title="一、平台性质"
            items={[
              '本站是一个基于体育赛事结果的虚拟预测游戏平台，仅供娱乐和学习目的。',
              '本站所有「投注」均使用虚拟货币（Virtual Currency），不具有任何法定货币价值。',
              '虚拟货币不可购买、出售、转让、提现或兑换任何实物、服务或真实货币。',
              '本站不收取任何费用，不开设任何充值渠道，不以任何方式获取用户财产。',
              '本站不与任何第三方赌博平台、博彩公司或金融机构存在关联。',
            ]}
          />

          <DisclaimerSection
            icon="⚖️"
            title="二、法律合规声明"
            items={[
              '依据《中华人民共和国刑法》第三百零三条，本站不构成「开设赌场罪」或「赌博罪」所述行为，原因如下：',
              '（一）本站不涉及真实金钱或财物作为赌注——所有「赌注」均为无价值的虚拟数值；',
              '（二）本站不存在「抽头渔利」行为——平台不从中获取任何经济利益；',
              '（三）本站不存在「以营利为目的」——平台完全免费，无任何收费机制；',
              '（四）本站不提供将虚拟货币兑换为真实货币的任何途径。',
              '依据《中华人民共和国治安管理处罚法》第七十条，本站活动不构成「以财物为赌注」的违法行为。',
              '依据《网络游戏管理暂行办法》及《关于规范网络游戏运营加强事中事后监管工作的通知》，本站虚拟货币不属于可交易、可兑换的网络游戏虚拟货币，不适用相关管制。',
              '本站遵守所有适用的中华人民共和国法律法规。如相关法律发生变化，本站将及时调整运营方式以确保合规。',
            ]}
          />

          <DisclaimerSection
            icon="🚫"
            title="三、禁止行为"
            items={[
              '严禁利用本站从事任何违法活动，包括但不限于利用虚拟投注结果进行真实金钱交易。',
              '严禁将本站虚拟货币以任何方式与现实货币、财物挂钩。',
              '严禁利用本站进行洗钱、诈骗等违法犯罪活动。',
              '严禁未满18周岁的未成年人注册使用本站。',
              '严禁利用本站平台组织、引诱他人进行真实金钱赌博。',
              '如有上述行为，本站有权立即终止相关账户，并保留向执法机关报告的权利。',
            ]}
          />

          <DisclaimerSection
            icon="📝"
            title="四、用户须知"
            items={[
              '用户注册即视为已阅读、理解并同意本免责声明的全部内容。',
              '用户应自行确保使用本站的行为在其所在司法管辖区内合法合规。',
              '本站不对因使用本站产生的任何直接或间接损失承担责任。',
              '本站提供的数据（包括赔率、比赛信息）仅供参考，不构成任何投资或投注建议。',
              '赔率数据来源于公开的 Polymarket API，仅供虚拟游戏参考之用。',
            ]}
          />

          <DisclaimerSection
            icon="📧"
            title="五、联系方式"
            items={[
              '如对本免责声明有任何疑问或建议，请通过 GitHub 仓库 Issues 联系管理员。',
              '本站将根据实际运营情况和法律法规变化，不定期更新本免责声明。',
            ]}
          />
        </div>

        {/* Summary Box */}
        <div className="glass-card p-5 mt-6 text-center border border-amber-500/20">
          <p className="text-amber-300 font-bold text-base mb-2">一句话总结</p>
          <p className="text-white/60 text-sm leading-relaxed">
            本站是一个<strong className="text-white">完全免费、纯虚拟、无真实金钱</strong>的体育预测游戏。
            <br />就像和朋友在微信群里猜球一样——<strong className="text-white">不牵扯任何真金白银</strong>。
          </p>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => window.history.back()}
            className="btn-gold px-8 py-2.5"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

function DisclaimerSection({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className="glass-card p-5">
      <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-white/60 text-sm leading-relaxed">
            <span className="text-white/30 shrink-0 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
