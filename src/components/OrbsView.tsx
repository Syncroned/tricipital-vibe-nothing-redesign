import { useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { api } from '../api'
import { DotIcon } from './DotIcon'

function parseVal(v: number | string | undefined): number {
  const n = parseFloat(String(v ?? 0))
  return Number.isFinite(n) ? n : 0
}

export function OrbsView() {
  const { csrf, progress, orbsBalance, setOrbsBalance, refreshProgress, setActiveTab, loginTwitch, showAlert } = useAppState()
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [redeemOrbsLevel, setRedeemOrbsLevel] = useState('')
  const [streakExpanded, setStreakExpanded] = useState(12)

  if (!csrf?.twitch_logged_in) {
    return (
      <section className="mod s12 tw-text-center tw-py-16">
        <DotIcon name="lock" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Login Required</div>
        <p className="tw-mt-2" style={{ color: 'var(--secondary)' }}>
          Login with Twitch to see your orbs.
        </p>
        <button className="btn btn-primary tw-mt-6" onClick={loginTwitch}>
          Login with Twitch
        </button>
      </section>
    )
  }

  const ws = progress?.watch_streak || csrf?.watch_streak || null
  const orbsTiers = progress?.orbs_tiers || []
  const weightLevelOptions = (progress?.weights || []).map((w) => w.level_id)

  const streakRows = (() => {
    if (!ws?.curve) return [] as { day: number; orbs: number; milestone: boolean; status: string }[]
    const rows: { day: number; orbs: number; milestone: boolean; status: string }[] = []
    const total = Math.max(14, (ws.last_claimed || 0) + 8, (ws.current || 0) + 8)
    for (let day = 1; day <= total; day++) {
      let orbs = 0
      if (day >= 2) {
        if (day === 2) orbs = ws.curve.day2 || 0
        else if (day === 3) orbs = ws.curve.day3 || 0
        else if (day === 4) orbs = ws.curve.day4 || 0
        else orbs = ws.curve.plateau || 0
      }
      let milestone = false
      for (const ms of ws.curve.milestones || []) {
        if (day > 0 && ms.every > 0 && day % ms.every === 0) {
          orbs = ms.orbs
          milestone = true
        }
      }
      const status = day <= (ws.last_claimed || 0) ? 'claimed' : day <= (ws.current || 0) ? 'ready' : ''
      rows.push({ day, orbs, milestone, status })
    }
    return rows.slice(0, streakExpanded)
  })()

  const onClaimStreak = async () => {
    setSubmitting('streak')
    const res = await api.claimStreakBonus()
    setSubmitting(null)
    if (res && res.success) {
      showAlert(`+${res.orbs_awarded ?? 0} orbs claimed.`, 'success')
      if (typeof res.new_orbs === 'number') setOrbsBalance(res.new_orbs)
      void refreshProgress()
    } else {
      showAlert(res?.error || 'Failed to claim streak bonus.', 'error')
    }
  }

  const onRedeemOrbs = async (tierId: number) => {
    if (!redeemOrbsLevel) return showAlert('Choose which level gets the weight first.', 'error')
    setSubmitting('orbs-' + tierId)
    const res = await api.redeemOrbs(tierId, redeemOrbsLevel)
    setSubmitting(null)
    if (res && res.success) {
      showAlert(`+${res.weight_added ?? 0} weight applied (new weight ${res.new_weight ?? '?'})`, 'success')
      if (typeof res.new_orbs === 'number') setOrbsBalance(res.new_orbs)
      void refreshProgress()
    } else {
      showAlert(res?.error || 'Failed to redeem orbs.', 'error')
    }
  }

  return (
    <div className="tr-orbs-grid">
      {/* Spend orbs */}
      <section className="mod s12">
        <div className="mhead">
          <span className="t">Spend orbs</span>
          <span className="ex">{orbsBalance} orbs</span>
        </div>
        {orbsTiers.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Nothing to spend orbs on yet.</p>
        ) : (
          <>
            <select
              className="inp tw-mb-3"
              value={redeemOrbsLevel}
              onChange={(e) => setRedeemOrbsLevel(e.target.value)}
            >
              <option value="">Apply to which level?</option>
              {weightLevelOptions.map((id) => (
                <option key={id} value={id}>
                  {id.startsWith('wl_') ? `No Level (${id})` : `Level ${id}`}
                </option>
              ))}
            </select>
            <div className="tw-flex tw-flex-wrap tw-gap-3">
              {orbsTiers.map((t) => {
                const blockedForNoLevel = redeemOrbsLevel.startsWith('wl_') && parseVal(t.weight_award) > 200
                const cantAfford = parseVal(t.orb_cost) > orbsBalance
                return (
                  <button
                    key={t.id}
                    className="card tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2"
                    disabled={blockedForNoLevel || cantAfford || !redeemOrbsLevel || submitting === 'orbs-' + t.id}
                    title={
                      blockedForNoLevel
                        ? 'Tiers worth more than 200 weight cannot be applied to the No Level slot.'
                        : cantAfford
                          ? 'Not enough orbs.'
                          : ''
                    }
                    onClick={() => void onRedeemOrbs(t.id)}
                    style={{
                      flex: '1 1 160px',
                      maxWidth: 240,
                      padding: '20px !important',
                      cursor: 'pointer',
                      opacity: blockedForNoLevel || cantAfford ? 0.4 : 1,
                    }}
                  >
                    <span className="fdisplay" style={{ fontSize: 20 }}>+{t.weight_award}</span>
                    <span className="mono" style={{ color: 'var(--secondary)', fontSize: 12 }}>weight</span>
                    {t.label && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{t.label}</span>}
                    <span className="pill i">{t.orb_cost} orbs</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Watch Streak */}
      {ws && (
        <section className="mod s12">
          <div className="mhead">
            <span className="t">Watch Streak</span>
          </div>
          <div className="fdisplay" style={{ fontSize: 16, margin: '6px 0' }}>
            🔥{' '}
            {ws.current > 0
              ? `${ws.current} stream day${ws.current === 1 ? '' : 's'} in a row`
              : 'No streak yet'}
          </div>
          {ws.at_risk && (
            <p style={{ color: 'var(--accent-text)', fontSize: 13, marginBottom: 8 }}>
              You missed the last stream. Catch the next one or your streak resets.
            </p>
          )}
          {(ws.claimable_orbs ?? 0) > 0 && (
            <button className="btn btn-primary tw-mb-3" disabled={submitting === 'streak'} onClick={() => void onClaimStreak()}>
              {submitting === 'streak' ? 'Claiming…' : `Claim +${ws.claimable_orbs} orbs`}
            </button>
          )}
          {streakRows.length > 0 && (
            <div
              className="tw-flex tw-flex-col tw-gap-1 tw-mt-2"
              style={{ maxHeight: 232, overflowY: 'auto' }}
              onScroll={(e) => {
                const el = e.currentTarget
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
                  setStreakExpanded((n) => n + 12)
                }
              }}
            >
              {streakRows.map((r) => (
                <div
                  key={r.day}
                  className="tw-flex tw-items-center tw-justify-between tw-px-3 tw-py-1 tw-rounded"
                  style={{
                    border: `1px solid ${r.status === 'ready' ? 'var(--primary)' : 'var(--glass-brd)'}`,
                    background: r.status === 'ready' ? 'var(--raised)' : r.milestone ? 'var(--surface)' : 'transparent',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--secondary)', fontSize: 12 }}>
                    Day {r.day}
                    {r.milestone ? ' ★' : ''}
                  </span>
                  <span className="mono" style={{ color: 'var(--secondary)', fontSize: 12 }}>
                    {r.orbs} orbs
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: r.status === 'claimed' ? 'var(--success)' : r.status === 'ready' ? 'var(--primary)' : 'var(--muted)',
                    }}
                  >
                    {r.status === 'claimed' ? 'claimed' : r.status === 'ready' ? 'ready' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div>
        <button className="btn btn-outline" onClick={() => setActiveTab('request')}>
          ← Back to form
        </button>
      </div>
    </div>
  )
}
