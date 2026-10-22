import { useAppState } from '../hooks/useAppState'
import { timeAgo, difficultyColor, typeColor } from '../utils'

const SEND_TIERS: Record<string, { label: string; color: string }> = {
  none: { label: 'No Send', color: '#e0654a' },
  rate: { label: 'Rate', color: '#c8c8c8' },
  feature: { label: 'Feature', color: '#e8c84a' },
  epic: { label: 'Epic', color: '#ffb43c' },
  legendary: { label: 'Legendary', color: '#dc46c8' },
  mythic: { label: 'Mythic', color: '#5a96ff' },
}

export function HistoryView() {
  const { history, sendsShown } = useAppState()
  const entries = history?.history || []

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Recently Played</span>
        <span className="ex">{history?.count ?? entries.length} entries</span>
      </div>

      {entries.length > 0 && (
        <div className="mono tw-text-center" style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
          {history?.limited ? 'Showing up to 25 most recently played' : 'Showing up to 200 most recently played'}
        </div>
      )}

      <div className="tw-flex tw-flex-col tw-gap-2">
        {entries.map((h) => {
          const tier = h.send_type && sendsShown ? SEND_TIERS[h.send_type] : undefined
          const wap = h.weight_at_played
          return (
            <div
              key={`${h.level_id}-${h.played_unix}`}
              className="card"
              style={{ padding: '14px 18px !important' }}
            >
              <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                <span className="fdisplay" style={{ fontSize: 15 }}>
                  {h.level_id.startsWith('wl_') ? 'No Level' : h.level_id}
                </span>
                {h.difficulty && (
                  <span className="pill i" style={{ borderColor: difficultyColor(h.difficulty), color: difficultyColor(h.difficulty) }}>
                    {h.difficulty}
                  </span>
                )}
                {h.level_type && (
                  <span className="pill i" style={{ borderColor: typeColor(h.level_type), color: typeColor(h.level_type) }}>
                    {h.level_type}
                  </span>
                )}
                {tier && (
                  <span className="pill i" title={`Sent for: ${tier.label}`} style={{ borderColor: tier.color, color: tier.color }}>
                    {tier.label}
                  </span>
                )}
                {wap != null && (
                  <span className="pill i">Weight: {wap}</span>
                )}
              </div>
              <div style={{ color: 'var(--secondary)', fontSize: 13, marginTop: 6 }}>
                by <strong style={{ color: 'var(--primary)' }}>{h.creator}</strong>
                {h.twitch_username ? ` · @${h.twitch_username}` : ''}
              </div>
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                played {timeAgo(h.played_unix || h.played_at)}
              </div>
            </div>
          )
        })}

        {entries.length === 0 && (
          <div className="tw-text-center tw-py-12" style={{ color: 'var(--muted)' }}>
            Nothing has been played yet.
          </div>
        )}
      </div>
    </section>
  )
}
