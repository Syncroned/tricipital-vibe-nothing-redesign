import { useAppState } from '../hooks/useAppState'
import { api } from '../api'
import { DotIcon } from './DotIcon'
import { difficultyColor, typeColor, timeAgo, cn } from '../utils'
import type { QueueSort } from '../hooks/useAppState'

const SORTS: { key: QueueSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'weight', label: 'Weight' },
]

function avgOf(list: { weight: number }[]): string {
  const w = list.map((r) => Number(r.weight) || 1).filter((x) => x <= 1000)
  if (!w.length) return '0'
  return (w.reduce((a, b) => a + b, 0) / w.length).toFixed(2).replace(/\.?0+$/, '')
}

function medianOf(list: { weight: number }[]): string {
  const w = list.map((r) => Number(r.weight) || 1).sort((a, b) => a - b)
  if (!w.length) return '0'
  const mid = Math.floor(w.length / 2)
  return (w.length % 2 ? w[mid] : (w[mid - 1] + w[mid]) / 2).toFixed(2).replace(/\.?0+$/, '')
}

export function QueueView() {
  const { csrf, queue, queueSort, setQueueSort, refreshQueue, loginTwitch, myRequest, canModerate } = useAppState()

  const modDelete = async (id: number) => {
    if (!window.confirm('Delete this request from the queue? This cannot be undone.')) return
    await api.deleteRequest(id)
    void refreshQueue()
  }

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
        <span className="t">Request Queue</span>
        <span className="tw-flex tw-gap-2">
          {SORTS.map((s) => (
            <button key={s.key} className={cn('chip', queueSort === s.key && 'on')} onClick={() => setQueueSort(s.key)}>
              {s.label}
            </button>
          ))}
          <button className="chip" onClick={() => void refreshQueue()} title="Refresh">
            ↻
          </button>
        </span>
      </div>

      <div className="mono tw-text-center" style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
        {queue.length} request{queue.length !== 1 ? 's' : ''} in queue · Avg weight {avgOf(queue)} · Median {medianOf(queue)}
      </div>

      {myRequest?.found && (myRequest.requests || []).length > 0 && (
        <div className="card tw-mb-6" style={{ borderColor: 'var(--primary)' }}>
          <div className="t" style={{ marginBottom: 10 }}>Your Request</div>
          <div className="tw-flex tw-flex-col tw-gap-2">
            {(myRequest.requests || []).map((r) => {
              const idx = queue.findIndex((q) => q.id === r.id)
              return (
                <div key={r.id} className="tw-flex tw-items-center tw-gap-3 tw-flex-wrap">
                  <span className="fdisplay" style={{ fontSize: 15 }}>
                    {r.level_id.startsWith('wl_') ? 'No Level' : r.level_id}
                  </span>
                  {r.difficulty && (
                    <span className="pill i" style={{ borderColor: difficultyColor(r.difficulty), color: difficultyColor(r.difficulty) }}>
                      {r.difficulty}
                    </span>
                  )}
                  {r.level_type && (
                    <span className="pill i" style={{ borderColor: typeColor(r.level_type), color: typeColor(r.level_type) }}>
                      {r.level_type}
                    </span>
                  )}
                  <span className="pill i">Weight: {r.weight}</span>
                  <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {idx >= 0 ? `Position ${idx + 1} of ${queue.length}` : 'In queue'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="tw-flex tw-flex-col tw-gap-3">
        {queue.map((q) => (
          <div key={q.id} className="card" style={{ padding: '12px 16px !important' }}>
            <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
              <span className="fdisplay" style={{ fontSize: 15 }}>{q.level_id.startsWith('wl_') ? 'No Level' : q.level_id}</span>
              {q.difficulty && (
                <span
                  className="pill i"
                  style={{ borderColor: difficultyColor(q.difficulty), color: difficultyColor(q.difficulty) }}
                >
                  {q.difficulty}
                </span>
              )}
              {q.level_type && (
                <span
                  className="pill i"
                  style={{ borderColor: typeColor(q.level_type), color: typeColor(q.level_type) }}
                >
                  {q.level_type}
                </span>
              )}
              <span className="pill i">Weight: {q.weight}</span>
              {canModerate && (
                <button
                  className="chip"
                  title="Delete this request"
                  style={{ marginLeft: 'auto', color: 'var(--accent-text)' }}
                  onClick={() => void modDelete(q.id)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="tw-mt-2" style={{ color: 'var(--secondary)', fontSize: 13 }}>
              {q.creator ? `by ${q.creator} · ` : ''}@{q.twitch_username}
            </div>
            {q.notes && <div className="tw-mt-2" style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>{q.notes}</div>}
            {q.submitted_at && (
              <div className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
                {timeAgo(q.submitted_at)}
              </div>
            )}
          </div>
        ))}
      </div>

      {queue.length === 0 && (
        <div className="tw-text-center tw-py-12" style={{ color: 'var(--muted)' }}>
          The queue is empty.
        </div>
      )}
    </section>
  )
}
