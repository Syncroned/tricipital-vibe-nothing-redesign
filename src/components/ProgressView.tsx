import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'

export function ProgressView() {
  const { csrf, progress, loginTwitch } = useAppState()

  if (!csrf?.twitch_logged_in) {
    return (
      <section className="mod s12 tw-text-center tw-py-16">
        <DotIcon name="user" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Your Progress</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          Log in with Twitch to see your level weights and milestones.
        </p>
        <button className="btn btn-primary tw-mt-6" onClick={loginTwitch}>
          Login with Twitch
        </button>
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="mod s12 tw-text-center tw-py-16" style={{ color: 'var(--muted)' }}>
        Loading progress…
      </section>
    )
  }

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Your Level Weights</span>
        <span className="ex">{progress.weights?.length ?? 0} tracked</span>
      </div>

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
        {(progress.weights || []).map((w) => (
          <div key={w.level_id} className="card">
            <div className="tw-flex tw-justify-between tw-items-center">
              <div className="ttl">{w.level_id}</div>
              <div className="fdisplay">{w.weight}</div>
            </div>
            <div style={{ color: 'var(--secondary)', fontSize: 13 }}>@{w.twitch_username}</div>
            {w.history && w.history.length > 0 && (
              <div className="tw-mt-3 tw-space-y-1">
                {w.history.slice(0, 5).map((h, i) => (
                  <div key={i} className="tw-flex tw-justify-between" style={{ fontSize: 12, color: 'var(--muted)' }}>
                    <span>{h.reason}</span>
                    <span style={{ color: h.delta >= 0 ? 'var(--success)' : 'var(--error)' }}>
                      {h.delta > 0 ? '+' : ''}{h.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
