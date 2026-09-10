import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'

const PERIODS = [
  { key: 'all_time', label: 'All-Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
] as const

const TIERS = [
  { key: 'rate', label: 'Rate' },
  { key: 'feature', label: 'Feature' },
  { key: 'epic', label: 'Epic' },
  { key: 'legendary', label: 'Legendary' },
  { key: 'mythic', label: 'Mythic' },
]

function totalSends(u: { rate_sends?: string; feature_sends?: string; epic_sends?: string; legendary_sends?: string; mythic_sends?: string }) {
  return TIERS.reduce((sum, t) => sum + (parseInt((u as any)[t.key + '_sends']) || 0), 0)
}

export function LeaderboardView() {
  const { leaderboard, leaderboardPeriod, setLeaderboardPeriod, shiftLeaderboardPeriod, csrf } = useAppState()

  if (!leaderboard) {
    return (
      <section className="mod s12 tw-text-center tw-py-16" style={{ color: 'var(--muted)' }}>
        <DotIcon name="clock" size={32} className="tw-mx-auto tw-mb-3" />
        Loading leaderboard…
      </section>
    )
  }

  const isMe = (u: string) => csrf?.twitch_username === u

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">{leaderboard.period_label || 'Send Leaderboard'}</span>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-3 tw-mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setLeaderboardPeriod(p.key as 'all_time' | 'monthly' | 'weekly')}
            className={`chip ${leaderboardPeriod === p.key ? 'on' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {leaderboardPeriod !== 'all_time' && (
        <div className="tw-flex tw-items-center tw-justify-center tw-gap-4 tw-mb-6">
          <button onClick={() => shiftLeaderboardPeriod(-1)} className="btn btn-outline">
            Prev
          </button>
          <span className="mono" style={{ color: 'var(--secondary)', minWidth: 120, textAlign: 'center' }}>
            {leaderboard.period_label}
          </span>
          <button
            onClick={() => shiftLeaderboardPeriod(1)}
            disabled={leaderboard.is_current_period}
            className="btn btn-outline"
          >
            Next
          </button>
        </div>
      )}

      <div className="tw-space-y-2">
        {leaderboard.leaderboard.length === 0 && (
          <div className="tw-text-center tw-py-12" style={{ color: 'var(--muted)' }}>
            No sends yet this period.
          </div>
        )}

        {leaderboard.leaderboard.map((u, i) => {
          const rank = i + 1
          const sends = totalSends(u as any)
          const score = parseInt(u.total_score) || 0

          return (
            <div
              key={u.twitch_username + i}
              className={`leaderboard-row tw-flex tw-items-center tw-gap-4 ${isMe(u.twitch_username) ? 'is-me' : ''}`}
            >
              <div className="fdisplay" style={{ width: 32, textAlign: 'center', fontSize: 20, color: 'var(--primary)', flexShrink: 0 }}>
                {rank}
              </div>
              <div className="tw-flex-1 tw-min-w-0">
                <a
                  href={`https://www.twitch.tv/${encodeURIComponent(u.twitch_username)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tw-truncate tw-block"
                  style={{ color: 'var(--primary)', fontFamily: 'var(--f-ui)', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}
                >
                  {u.twitch_username}
                </a>
                <div className="mono" style={{ color: 'var(--secondary)', fontSize: 11, marginTop: 2 }}>
                  {sends} sends
                </div>
              </div>
              <div className="fdisplay" style={{ color: 'var(--display)', fontSize: 22, minWidth: 70, textAlign: 'right' }}>
                {score}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
