import { useState, useMemo } from 'react'
import { useAppState } from '../hooks/useAppState'
import { api } from '../api'
import { cn, difficultyColor, timeAgo } from '../utils'
import type { CustomQuestion } from '../types'

const DIFFICULTIES = ['Auto', 'Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Easy Demon', 'Medium Demon', 'Hard Demon', 'Insane Demon', 'Extreme Demon']
const TYPES = ['Classic', 'Platformer']

function listText(list: string[], all: string[]): string {
  if (!list.length) return ''
  const allowed = all.filter((d) => !list.includes(d))
  if (allowed.length === 1) return `Only ${allowed[0]} is accepted`
  return `Currently not accepting: ${list.join(', ')}`
}

function videoReqText(list: string[]): string {
  if (!list.length) return ''
  if (list.length === 1) return `Video required for ${list[0]}`
  return `Video required for: ${list.join(', ')}`
}

export function RequestForm() {
  const {
    status,
    csrf,
    myRequest,
    highest,
    savedSlots,
    submit,
    submitLevelless,
    loginTwitch,
    refreshMyRequest,
    showAlert,
  } = useAppState()

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
  const [levelless, setLevelless] = useState(false)

  const customQuestions = useMemo(() => {
    const out: (CustomQuestion & { index: number })[] = []
    status?.custom_questions?.forEach((q, i) => {
      if (q) out.push({ ...q, index: i })
    })
    return out
  }, [status])

  const videoRequired =
    status?.video_required_difficulties?.includes(selDiff) || status?.video_required_types?.includes(selType)

  const disabledDiffText = listText(status?.disabled_difficulties || [], DIFFICULTIES)
  const disabledTypeText = listText(status?.disabled_types || [], TYPES)
  const videoDiffText = videoReqText(status?.video_required_difficulties || [])
  const videoTypeText = videoReqText(status?.video_required_types || [])

  const awardPoolOn = (status?.award_pool_limit ?? 0) > 0
  const banner = status?.queue_full
    ? { text: 'The queue is full. Please wait for it to be reset!', warn: true }
    : status?.award_pool_empty
      ? { text: "This period's weight rewards are all claimed. You can still submit, you just won't gain weight until the next reset.", warn: true }
      : awardPoolOn
        ? { text: `${status?.award_pool_remaining ?? 0} of ${status?.award_pool_limit} weight rewards left this period.`, warn: false }
        : null

  const autoClosedText = (() => {
    const ac = status?.auto_closed
    if (!ac || typeof ac !== 'object') return ''
    const o = ac as { at?: number; reason?: string }
    if (!o.at) return ''
    const when = new Date(o.at * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return o.reason === 'never_live'
      ? `Closed automatically at ${when}. It was open 2 hours and the stream never started.`
      : `Closed automatically at ${when}, 10 minutes after the stream ended.`
  })()

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
    if (levelless) {
      setBusy(true)
      await submitLevelless()
      setBusy(false)
      return
    }
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

  const onSaveSlot = async (slot: number) => {
    if (!csrf?.twitch_logged_in) return showAlert('You must be logged in with Twitch to save.', 'error')
    if (!level || !creator || !selType) return showAlert('Fill in Level ID, Level Type, and Creator before saving.', 'error')
    const res = await api.saveSubmission(slot, {
      level_id: level,
      difficulty: selDiff,
      level_type: selType,
      creator,
      twitch_username: csrf.twitch_username ?? '',
      video_url: video || null,
      notes: notes || null,
      custom_answers: answers,
    })
    if (res && !res.error) showAlert(`Slot ${slot} saved!`, 'success')
    else showAlert(res?.error || 'Failed to save.', 'error')
  }

  const onLoadSlot = (slot: number) => {
    const s = savedSlots[slot - 1]
    if (!csrf?.twitch_logged_in) return showAlert('You must be logged in with Twitch to load.', 'error')
    if (!s) return showAlert(`Slot ${slot} is empty.`, 'error')
    setLevel(s.level_id || '')
    setCreator(s.creator || '')
    setVideo(s.video_url || '')
    setNotes(s.notes || '')
    if (s.difficulty) setSelDiff(s.difficulty)
    if (s.level_type) setSelType(s.level_type)
    if (s.custom_answers) setAnswers([s.custom_answers[0] || '', s.custom_answers[1] || '', s.custom_answers[2] || ''])
    showAlert(`Slot ${slot} loaded!`, 'success')
  }

  return (
    <div className="tr-req-grid">
      {/* Hero panel — status line, title, two-column form, your submission */}
      <section className="mod">
        <div className="tr-status-row" style={{ marginBottom: 14 }}>
          <span className={cn('tr-status-pill', (status?.locked || status?.queue_full) && 'closed')}>
            <span className="dot" />
            {status?.locked ? 'Requests closed' : status?.queue_full ? 'Queue full' : 'Requests open'}
          </span>
          {highest?.level_id && (
            <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
              Highest weight right now:{' '}
              <span style={{ color: 'var(--primary)' }}>{highest.level_id} · {highest.weight}</span>
            </span>
          )}
        </div>
        {autoClosedText && (
          <p className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 10 }}>{autoClosedText}</p>
        )}
        <h1 className="tr-page-title" style={{ marginBottom: 24, fontSize: 'clamp(28px, 3.2vw, 38px)' }}>Submit a request</h1>

        {!levelless && (
          <div className="tr-req-cols">
            <div className="tr-col">
              <div className="tr-row2">
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
                  <label className="label">Level Type</label>
                  <div className="row">
                    {TYPES.map((t) => {
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
              </div>
              {(disabledTypeText || videoTypeText) && (
                <div>
                  {disabledTypeText && <p style={{ color: 'var(--accent-text)', fontSize: 13, marginBottom: 4 }}>{disabledTypeText}</p>}
                  {videoTypeText && <p style={{ color: 'var(--secondary)', fontSize: 13, marginBottom: 4 }}>{videoTypeText}</p>}
                </div>
              )}

              <div className="tr-row2">
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
                </div>
              </div>
              {!csrf?.twitch_logged_in && (
                <div>
                  <button className="btn btn-outline" onClick={loginTwitch}>
                    Login with Twitch for weight tracking
                  </button>
                </div>
              )}

              <div className="field">
                <label className="label">Difficulty</label>
                {disabledDiffText && <p style={{ color: 'var(--accent-text)', fontSize: 13, marginBottom: 8 }}>{disabledDiffText}</p>}
                {videoDiffText && <p style={{ color: 'var(--secondary)', fontSize: 13, marginBottom: 8 }}>{videoDiffText}</p>}
                <div className="row">
                  {DIFFICULTIES.map((d) => {
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
            </div>

            <div className="tr-col">
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

              {csrf?.twitch_logged_in && (
                <div className="field">
                  <label className="label">Saved Levels</label>
                  <div className="tw-flex tw-flex-col tw-gap-2">
                    {[1, 2, 3].map((slot) => {
                      const s = savedSlots[slot - 1]
                      return (
                        <div
                          key={slot}
                          className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap"
                          style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}
                        >
                          <span className="mono" style={{ fontSize: 13, minWidth: 80, color: 'var(--primary)' }}>
                            {slot}. {s ? s.level_id : 'Empty'}
                          </span>
                          {s && (
                            <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, flex: 1 }}>
                              {s.difficulty} · {s.level_type} · {s.creator}
                            </span>
                          )}
                          <span style={{ flex: s ? 'none' : 1 }} />
                          <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => void onSaveSlot(slot)}>
                            Save
                          </button>
                          <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => onLoadSlot(slot)}>
                            Load
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {banner && (
          <p className="tw-text-center" style={{ color: banner.warn ? 'var(--accent-text)' : 'var(--muted)', fontSize: 13, margin: '4px 0 12px' }}>
            {banner.text}
          </p>
        )}

        <div className="btn-bar" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" style={{ width: '100%', fontSize: 14, justifyContent: 'center' }} disabled={(!levelless && disabled) || busy} onClick={onSubmit}>
            {busy
              ? 'Submitting…'
              : levelless
                ? 'Earn Weight'
                : status?.locked
                  ? 'Submissions Locked'
                  : status?.queue_full
                    ? 'Queue Full'
                    : 'Submit Request'}
          </button>
        </div>

        {csrf?.twitch_logged_in && (
          <label className="tw-flex tw-items-center tw-gap-2 tw-mt-4" style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>
            <span className={cn('box', levelless && 'on')} style={{ width: 16, height: 16 }}>
              {levelless && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              )}
            </span>
            <input type="checkbox" className="tw-sr-only" checked={levelless} onChange={(e) => setLevelless(e.target.checked)} />
            I don't have a level to submit
          </label>
        )}

        {/* Your submission — inside the hero panel like the live site */}
        <div style={{ borderTop: '1px solid var(--glass-brd)', marginTop: 22, paddingTop: 16 }}>
          <div className="mhead" style={{ marginBottom: 14 }}>
            <span className="t">Your Submission</span>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => void refreshMyRequest()}>
              ↻ Refresh
            </button>
          </div>
          {myRequest?.requests && myRequest.requests.length > 0 ? (
            <div className="tw-space-y-3">
              {myRequest.requests.map((r) => (
                <div key={r.id} className="card">
                  <div className="ttl">{r.level_id.startsWith('wl_') ? 'No Level' : r.level_id}</div>
                  <div className="tw-flex tw-gap-2 tw-mt-2">
                    {r.difficulty && <span className="pill i">{r.difficulty}</span>}
                    {r.level_type && <span className="pill i">{r.level_type}</span>}
                  </div>
                  <div className="tw-mt-2" style={{ color: 'var(--secondary)', fontSize: 13 }}>
                    {r.creator ? `by ${r.creator} · ` : ''}weight {r.weight}
                    {r.submitted_at ? ` · ${timeAgo(r.submitted_at)}` : ''}
                  </div>
                  {r.notes && <div className="tw-mt-2" style={{ color: 'var(--muted)', fontSize: 12 }}>{r.notes}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>You don’t have a level in the queue yet.</p>
          )}
        </div>
      </section>

      {/* Side column — Chat rules + How it works */}
      <div className="tr-req-side">
        <section className="mod">
          <div className="mhead" style={{ marginBottom: 16 }}>
            <span className="t">Chat rules</span>
          </div>
          <ul className="tw-list-none tw-space-y-2" style={{ color: 'var(--secondary)', fontSize: 14, lineHeight: 1.6 }}>
            <li className="rule"><span className="rule-no">1.</span><span className="rule-t">Be respectful to all levels being played.</span></li>
            <li className="rule"><span className="rule-no">2.</span><span className="rule-t">Don’t argue extensively about send decisions.</span></li>
            <li className="rule"><span className="rule-no">3.</span><span className="rule-t">Don’t come into chat only to ask about a specific level.</span></li>
            <li className="rule"><span className="rule-no">4.</span><span className="rule-t">Respect the streamer’s free will.</span></li>
          </ul>
          <label className="rule cbx tw-mt-4" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className={cn('box', rules && 'on')}>
              {rules && (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              className="tw-sr-only"
              checked={rules}
              onChange={(e) => setRules(e.target.checked)}
            />
            <span className="rule-t" style={{ color: 'var(--primary)' }}>I have read and agree to the rules</span>
          </label>
        </section>

        <section className="mod">
          <div className="mhead" style={{ marginBottom: 16 }}>
            <span className="t">How it works</span>
          </div>
          <div style={{ color: 'var(--secondary)', fontSize: 14, lineHeight: 1.6 }}>
            <p>
              Each time the queue resets, resubmitting your level increases your weight by{' '}
              <strong style={{ color: 'var(--primary)' }}>+{status?.period_weight_reward ?? 1}</strong>.{' '}
              {awardPoolOn && (
                <>
                  Only the first {status?.award_pool_limit} people to resubmit each period earn that
                  weight, so get in early.{' '}
                </>
              )}
              If your level gets played, your weight resets back to 1.
            </p>
            <p className="tw-mt-2">Level weight carries over across streams and queue resets.</p>
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', color: 'var(--secondary)', fontSize: 13, lineHeight: 1.6 }}>
            There is also a <strong style={{ color: 'var(--primary)' }}>Bonus Level</strong> system:
            each time a level is randomly picked, there is a 1 in 10 chance that instead of using
            weighted random selection, the level with the highest weight in the queue is
            automatically chosen.
          </div>
        </section>
      </div>
    </div>
  )
}
