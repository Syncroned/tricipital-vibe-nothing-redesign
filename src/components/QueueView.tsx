import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { difficultyColor, typeColor } from '../utils'

export function QueueView() {
  const { csrf, queue, loginTwitch } = useAppState()

  if (!csrf?.twitch_logged_in) {
    return (
      <section className="mod s12 tw-text-center tw-py-16">
        <DotIcon name="lock" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Subscriber Perk</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          The live queue is visible to Twitch subscribers. Login below.
        </p>
        <button className="btn btn-primary tw-mt-6" onClick={loginTwitch}>
          Login with Twitch
        </button>
      </section>
    )
  }

  if (!queue) {
    return (
      <section className="mod s12 tw-text-center tw-py-16" style={{ color: 'var(--muted)' }}>
        Loading queue…
      </section>
    )
  }

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Live Queue</span>
        <span className="ex">{queue.count} levels</span>
      </div>
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-8">
        {queue.queue?.map((q) => (
          <div key={q.id} className="card">
            <div className="tw-flex tw-justify-between tw-items-start">
              <div className="ttl">{q.level_id}</div>
              <span className="fdisplay">{q.weight}</span>
            </div>
            <div className="tw-flex tw-gap-2 tw-mt-2">
              <span
                className="pill i"
                style={{ borderColor: difficultyColor(q.difficulty), color: difficultyColor(q.difficulty) }}
              >
                {q.difficulty}
              </span>
              <span
                className="pill i"
                style={{ borderColor: typeColor(q.level_type), color: typeColor(q.level_type) }}
              >
                {q.level_type}
              </span>
            </div>
            <div className="tw-mt-3" style={{ color: 'var(--secondary)', fontSize: 13 }}>
              by {q.creator} · @{q.twitch_username}
            </div>
            {q.notes && <div className="tw-mt-2" style={{ color: 'var(--muted)', fontSize: 12 }}>{q.notes}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
