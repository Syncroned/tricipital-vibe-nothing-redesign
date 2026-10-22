import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { cn } from '../utils'
import type { Prediction, OutcomeWagersResponse } from '../types'

const QUICK_STAKES = [10, 50, 100]

const STATUS_COLOR: Record<string, string> = {
  open: 'var(--success)',
  locked: 'var(--muted)',
  resolved: 'var(--primary)',
  cancelled: 'var(--accent-text)',
}

function fmtUntil(unix?: number | null): string {
  if (!unix) return ''
  const s = Math.floor(unix - Date.now() / 1000)
  if (s <= 0) return 'soon'
  const m = Math.floor(s / 60)
  if (m < 60) return `in ${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `in ${h}h ${m % 60}m`
  return `in ${Math.floor(h / 24)}d`
}

export function PredictView({ slug }: { slug: string }) {
  const { csrf, loginTwitch, showAlert } = useAppState()
  const [loaded, setLoaded] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [orbs, setOrbs] = useState(0)
  const [wagering, setWagering] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [wagers, setWagers] = useState<Record<number, { username: string; staked: number }[]>>({})
  const [wagersLoading, setWagersLoading] = useState<number | null>(null)
  const [customId, setCustomId] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const data = await api.sitePredictionState(slug)
    setLoaded(true)
    if (data && !data.error) {
      setPrediction(data.prediction || null)
      setOrbs(data.orbs_balance || 0)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const expand = async (outcomeId: number) => {
    const next = expanded === outcomeId ? null : outcomeId
    setExpanded(next)
    if (next != null && !wagers[next]) {
      setWagersLoading(next)
      const d: OutcomeWagersResponse = await api.sitePredictionOutcomeWagers(next)
      setWagersLoading(null)
      if (d && !d.error) setWagers((s) => ({ ...s, [next]: d.wagers || [] }))
    }
  }

  const vote = async (outcomeId: number, stake: number) => {
    if (!prediction || wagering) return
    setWagering(true)
    const res = await api.sitePredictionWager(prediction.id, outcomeId, stake)
    setWagering(false)
    if (res && res.success) {
      if (typeof res.new_orbs === 'number') setOrbs(res.new_orbs)
      void load()
    } else {
      showAlert(res?.error || 'Failed to vote.', 'error')
    }
  }

  const backUrl = window.location.pathname.replace(/[^/]*$/, '') || '/'

  if (!loaded) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center" style={{ color: 'var(--muted)' }}>
        <DotIcon name="clock" size={32} className="tw-mr-3" />
        Loading prediction…
      </div>
    )
  }

  if (!prediction) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center">
        <section className="mod s6 tw-text-center">
          <DotIcon name="search" size={48} className="tw-mx-auto tw-mb-4" />
          <div className="ds">Prediction</div>
          <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
            This link isn't valid or has expired.
          </p>
          <a className="btn btn-outline tw-mt-6" href={backUrl}>
            ← Back to form
          </a>
        </section>
      </div>
    )
  }

  const totalPool = prediction.outcomes.reduce((s, o) => s + (o.total_staked || 0), 0)
  const statusColor = STATUS_COLOR[prediction.status] || 'var(--muted)'
  const footer =
    prediction.status === 'open'
      ? 'Voting is open — pick an outcome and stake your orbs.'
      : prediction.status === 'locked'
        ? 'Voting is locked. Waiting for the streamer to resolve it.'
        : prediction.status === 'resolved'
          ? 'This prediction is resolved.'
          : 'This prediction was cancelled and wagers were refunded.'

  return (
    <div className="tr-main" style={{ maxWidth: 720 }}>
      <section className="mod s12">
        <div className="mhead">
          <span className="t">Prediction</span>
          <span className="ex tw-flex tw-items-center tw-gap-3">
            <span className="mono">{orbs} orbs</span>
            <button
              className="chip"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true)
                await load()
                setRefreshing(false)
              }}
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </span>
        </div>

        <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4 tw-flex-wrap">
          <span className="pill i" style={{ borderColor: statusColor, color: statusColor }}>
            {prediction.status}
          </span>
          <div className="fdisplay" style={{ fontSize: 18 }}>{prediction.title}</div>
          {prediction.locks_at && prediction.status === 'open' && (
            <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
              Locks {fmtUntil(prediction.locks_at)}
            </span>
          )}
        </div>

        <div className="tw-flex tw-flex-col tw-gap-3">
          {prediction.outcomes.map((o) => {
            const pct = totalPool > 0 ? Math.round((o.total_staked / totalPool) * 100) : 0
            const isMine = prediction.my_wager?.outcome_id === o.id
            const isWinner = prediction.status === 'resolved' && prediction.winning_outcome_id === o.id
            const voteDisabled = wagering || (!!prediction.my_wager && !isMine)
            const isExpanded = expanded === o.id
            return (
              <div key={o.id} className="card" style={{ padding: '14px 18px !important' }}>
                <button
                  className="tw-w-full tw-text-left"
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                  onClick={() => void expand(o.id)}
                >
                  <div className="tw-flex tw-justify-between tw-items-center tw-gap-2 tw-flex-wrap">
                    <span style={{ color: 'var(--primary)' }}>
                      {o.label}
                      {isWinner ? ' ✓' : ''}
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>
                        {o.total_staked} orbs · {o.total_staked > 0 ? (totalPool / o.total_staked).toFixed(2) + 'x' : '-'} return
                      </span>
                    </span>
                    <span className="fdisplay" style={{ fontSize: 14 }}>{pct}%</span>
                  </div>
                  <div className="tw-h-2 tw-rounded tw-mt-2" style={{ background: 'var(--line)' }}>
                    <div className="tw-h-2 tw-rounded" style={{ width: pct + '%', background: 'var(--primary)' }} />
                  </div>
                  {isMine && prediction.my_wager && (
                    <div className="mono" style={{ color: 'var(--secondary)', fontSize: 11, marginTop: 6 }}>
                      You: {prediction.my_wager.orbs_staked}
                      {prediction.my_wager.payout != null
                        ? prediction.my_wager.payout > 0
                          ? `, +${prediction.my_wager.payout}`
                          : ', lost'
                        : ''}
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="tw-mt-3 tw-p-2 tw-rounded" style={{ background: 'var(--surface)' }}>
                    {wagersLoading === o.id ? (
                      <div className="tw-text-center" style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
                    ) : (wagers[o.id] || []).length === 0 ? (
                      <div className="tw-text-center" style={{ color: 'var(--muted)', fontSize: 12 }}>No wagers yet.</div>
                    ) : (
                      <div className="tw-flex tw-flex-col tw-gap-1">
                        {(wagers[o.id] || []).map((w, i) => (
                          <div key={i} className="tw-flex tw-justify-between" style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--secondary)' }}>{w.username}</span>
                            <span className="mono" style={{ color: 'var(--primary)' }}>{w.staked}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {prediction.status === 'open' && csrf?.twitch_logged_in && (
                  <div className="tw-flex tw-gap-2 tw-mt-3 tw-flex-wrap">
                    {QUICK_STAKES.map((amt) => (
                      <button
                        key={amt}
                        className={cn('chip')}
                        disabled={voteDisabled || orbs < amt}
                        onClick={() => void vote(o.id, amt)}
                      >
                        {amt}
                      </button>
                    ))}
                    <button className="chip" disabled={voteDisabled} onClick={() => { setCustomId(customId === o.id ? null : o.id); setCustomValue('') }}>
                      Custom
                    </button>
                  </div>
                )}

                {customId === o.id && prediction.status === 'open' && (
                  <div className="tw-flex tw-gap-2 tw-mt-2">
                    <input
                      className="inp"
                      type="number"
                      min={1}
                      placeholder="Amount"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-primary"
                      disabled={wagering || !(parseInt(customValue, 10) > 0)}
                      onClick={() => {
                        const amt = parseInt(customValue, 10)
                        if (amt > 0) void vote(o.id, amt)
                      }}
                    >
                      Vote
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="tw-mt-6" style={{ color: 'var(--muted)', fontSize: 13 }}>
          {!csrf?.twitch_logged_in && prediction.status === 'open' ? (
            <button className="btn btn-primary" onClick={loginTwitch}>
              Login with Twitch to vote
            </button>
          ) : (
            footer
          )}
        </div>

        <div className="tw-mt-6">
          <a href={backUrl} className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
            ← Back to form
          </a>
        </div>
      </section>
    </div>
  )
}
