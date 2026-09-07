import { useState, useMemo } from 'react'
import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { cn, difficultyColor } from '../utils'
import type { CustomQuestion } from '../types'

export function RequestForm() {
  const { status, csrf, myRequest, highest, submit, submitLevelless, loginTwitch } = useAppState()

  const [level, setLevel] = useState('')
  const [creator, setCreator] = useState('')
  const [twitch, setTwitch] = useState('')
  const [video, setVideo] = useState('')
  const [notes, setNotes] = useState('')
  const [selDiff, setSelDiff] = useState('Hard')
  const [selType, setSelType] = useState('Classic')
  const [rules, setRules] = useState(false)
  const [answers, setAnswers] = useState(['', '', ''])
  const [busy, setBusy] = useState(false)

  const customQuestions = useMemo(() => {
    const out: (CustomQuestion & { index: number })[] = []
    status?.custom_questions?.forEach((q, i) => {
      if (q) out.push({ ...q, index: i })
    })
    return out
  }, [status])

  const videoRequired =
    status?.video_required_difficulties?.includes(selDiff) || status?.video_required_types?.includes(selType)

  const disabled =
    !status ||
    status.locked ||
    status.queue_full ||
    !rules ||
    !level ||
    !creator ||
    (!csrf?.twitch_logged_in && !twitch) ||
    !selType ||
    (videoRequired && !video)

  const onSubmit = async () => {
    if (disabled) return
    setBusy(true)
    await submit({
      level_id: level,
      difficulty: selDiff,
      level_type: selType,
      creator,
      twitch_username: csrf?.twitch_logged_in ? (csrf.twitch_username ?? '') : twitch,
      video_url: video || null,
      notes: notes || null,
      custom_answers: answers,
    })
    setBusy(false)
    setLevel('')
    setCreator('')
    setVideo('')
    setNotes('')
    setAnswers(['', '', ''])
  }

  return (
    <div className="poster">
      {/* Intro */}
      <section className="mod s12">
        <div className="mhead">
          <span className="t">Level Requests</span>
        </div>
        <p style={{ color: 'var(--secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
          Submit a Geometry Dash level to the weighted queue. Each resubmit after a period reset
          increases your weight — higher weight means a better chance of being picked.
        </p>
      </section>

      {/* Status tiles */}
      <section className="mod s4">
        <div className="mhead">
          <span className="t">Queue Status</span>
        </div>
        <div className="tw-flex tw-flex-col tw-gap-8">
          <div className="dot-leader">
            <span className="label">Submissions</span>
            <span className="dots" />
            <span className="value fdisplay" style={{ color: status?.locked ? 'var(--accent-text)' : 'var(--success)' }}>
              {status?.locked ? 'LOCKED' : status?.queue_full ? 'FULL' : 'OPEN'}
            </span>
          </div>
          <div className="dot-leader">
            <span className="label">Period Reward</span>
            <span className="dots" />
            <span className="value fdisplay">+{status?.period_weight_reward ?? 1}</span>
          </div>
          <div className="dot-leader">
            <span className="label">Highest Weight</span>
            <span className="dots" />
            <span className="value fdisplay">
              {highest?.level_id ? `${highest.level_id} · ${highest.weight}` : '—'}
            </span>
          </div>
        </div>
      </section>

      <section className="mod s8">
        <div className="mhead">
          <span className="t">How It Works</span>
        </div>
        <ul className="tw-list-none tw-space-y-2" style={{ color: 'var(--secondary)', fontSize: 14, lineHeight: 1.6 }}>
          <li className="rule"><span className="rule-no">1.</span>Be respectful to all levels being played.</li>
          <li className="rule"><span className="rule-no">2.</span>Don’t argue extensively about send decisions.</li>
          <li className="rule"><span className="rule-no">3.</span>Don’t come into chat only to ask about a specific level.</li>
          <li className="rule"><span className="rule-no">4.</span>Respect the streamer’s free will.</li>
          <li className="rule cbx" style={{ cursor: 'pointer' }}>
            <span className="rule-no">
              <span className={cn('box', rules && 'on')}>
                {rules && (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                )}
              </span>
            </span>
            <input
              type="checkbox"
              className="tw-sr-only"
              checked={rules}
              onChange={(e) => setRules(e.target.checked)}
            />
            <span className="rule-t" style={{ color: 'var(--primary)' }}>I have read and agree to the rules</span>
          </li>
        </ul>
      </section>

      {/* Submission form */}
      <section className="mod s8">
        <div className="mhead">
          <span className="no">01</span>
          <span className="t">Submit Level</span>
        </div>

        <div className="field">
          <label className="label">Level ID</label>
          <input
            className="inp"
            placeholder="e.g. 85027613"
            maxLength={15}
            value={level}
            onChange={(e) => setLevel(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="field">
          <label className="label">Difficulty</label>
          <div className="row">
            {['Auto', 'Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Easy Demon', 'Medium Demon', 'Hard Demon', 'Insane Demon', 'Extreme Demon'].map((d) => {
              const dis = status?.disabled_difficulties?.includes(d)
              const sel = selDiff === d
              return (
                <button
                  key={d}
                  disabled={dis}
                  onClick={() => setSelDiff(d)}
                  className={cn('chip', sel && 'on', dis && 'dis')}
                  style={{
                    justifyContent: 'center',
                    color: sel ? '#000' : undefined,
                    borderColor: sel ? undefined : difficultyColor(d),
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label className="label">Level Type</label>
          <div className="row">
            {['Classic', 'Platformer'].map((t) => {
              const dis = status?.disabled_types?.includes(t)
              const sel = selType === t
              return (
                <button
                  key={t}
                  disabled={dis}
                  onClick={() => setSelType(t)}
                  className={cn('chip', sel && 'on', dis && 'dis')}
                  style={{ justifyContent: 'center', color: sel ? '#000' : undefined }}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label className="label">Creator Name</label>
          <input
            className="inp"
            placeholder="e.g. RobTop"
            maxLength={50}
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label">Twitch Username</label>
          {csrf?.twitch_logged_in ? (
            <div className="inp dis">{csrf.twitch_username}</div>
          ) : (
            <input
              className="inp"
              placeholder="your_twitch_name"
              maxLength={50}
              value={twitch}
              onChange={(e) => setTwitch(e.target.value)}
            />
          )}
          {!csrf?.twitch_logged_in && (
            <div className="tw-mt-2">
              <button className="btn btn-outline" onClick={loginTwitch}>
                Login with Twitch for weight tracking
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label className="label">
            YouTube Video {videoRequired && <span style={{ color: 'var(--accent-text)' }}>*</span>}
          </label>
          <input
            className="inp"
            placeholder="https://youtube.com/watch?v=..."
            maxLength={100}
            value={video}
            onChange={(e) => setVideo(e.target.value)}
          />
          {videoRequired && (
            <p className="tw-mt-2" style={{ color: 'var(--accent-text)', fontSize: 13 }}>
              A video is required for this difficulty/type.
            </p>
          )}
        </div>

        {customQuestions.map((q) => (
          <div className="field" key={q.index}>
            <label className="label">
              {q.text} {q.optional ? '' : <span style={{ color: 'var(--accent-text)' }}>*</span>}
            </label>
            {q.type === 'mc' && q.choices ? (
              <select
                className="inp"
                value={answers[q.index]}
                onChange={(e) => {
                  const next = [...answers]
                  next[q.index] = e.target.value
                  setAnswers(next)
                }}
              >
                <option value="">Select…</option>
                {q.choices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="inp"
                value={answers[q.index]}
                onChange={(e) => {
                  const next = [...answers]
                  next[q.index] = e.target.value
                  setAnswers(next)
                }}
                maxLength={200}
              />
            )}
          </div>
        ))}

        <div className="field">
          <label className="label">Additional Notes</label>
          <textarea
            className="inp"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" disabled={disabled || busy} onClick={onSubmit}>
          {busy ? 'Submitting…' : status?.locked ? 'Submissions Locked' : status?.queue_full ? 'Queue Full' : 'Submit Request'}
        </button>

        {csrf?.twitch_logged_in && !status?.locked && !status?.queue_full && (
          <div className="tw-mt-8 tw-flex tw-gap-2">
            <button
              className="btn btn-outline"
              onClick={() => void submitLevelless()}
              disabled={busy}
            >
              Submit Levelless
            </button>
          </div>
        )}
      </section>

      {/* Your submission */}
      <section className="mod s4">
        <div className="mhead">
          <span className="no">02</span>
          <span className="t">Your Submission</span>
        </div>
        {myRequest?.requests && myRequest.requests.length > 0 ? (
          <div className="tw-space-y-3">
            {myRequest.requests.map((r) => (
              <div key={r.id} className="card">
                <div className="ttl">{r.level_id}</div>
                <div className="tw-flex tw-gap-2 tw-mt-2">
                  <span className="pill i">{r.difficulty}</span>
                  <span className="pill i">{r.level_type}</span>
                </div>
                <div className="tw-mt-2" style={{ color: 'var(--secondary)', fontSize: 13 }}>
                  by {r.creator} · weight {r.weight}
                </div>
                {r.notes && <div className="tw-mt-2" style={{ color: 'var(--muted)', fontSize: 12 }}>{r.notes}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="tw-text-center tw-py-8" style={{ color: 'var(--muted)' }}>
            <DotIcon name="mappin" size={48} className="tw-mx-auto tw-mb-3" />
            <p>You don’t have a level in the queue yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}
