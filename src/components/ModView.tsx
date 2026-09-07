import { useState } from 'react'
import { useAppState } from '../hooks/useAppState'
import { DotIcon } from './DotIcon'
import { api } from '../api'

export function ModView() {
  const { csrf } = useAppState()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [admin, setAdmin] = useState(csrf?.is_admin ?? false)

  if (!admin) {
    return (
      <section className="mod s12 tw-max-w-md tw-mx-auto tw-text-center">
        <DotIcon name="lock" size={48} className="tw-mx-auto tw-mb-4" />
        <div className="ds">Authorized Access Only</div>
        <div className="field tw-text-left tw-mt-6">
          <label className="label">Admin Password</label>
          <input
            type="password"
            className="inp"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('unlock')?.click()}
          />
        </div>
        <button
          id="unlock"
          className="btn btn-primary tw-mt-2"
          disabled={!password || busy}
          onClick={async () => {
            setBusy(true)
            const res = (await api.adminLogin(password)) as { error?: string; is_admin?: boolean }
            if (res.is_admin || !res.error) setAdmin(true)
            setBusy(false)
          }}
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </section>
    )
  }

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Mod / Admin</span>
      </div>
      <p style={{ color: 'var(--secondary)' }}>
        Admin panel unlocked. Extend this view with queue management, audit log, transfer
        approvals, and RPS/prediction controls by wiring the remaining <code>api/index.php</code>{' '}
        actions.
      </p>
    </section>
  )
}
