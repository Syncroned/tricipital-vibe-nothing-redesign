import { useAppState } from '../hooks/useAppState'

export function LeaderboardView() {
  const { leaderboard } = useAppState()

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">{leaderboard?.period_label || 'Leaderboard'}</span>
        <span className="ex">Score by send tier</span>
      </div>

      <div className="tw-overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Rate</th>
              <th>Feature</th>
              <th>Epic</th>
              <th>Legendary</th>
              <th>Mythic</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboard?.leaderboard || []).map((u, i) => (
              <tr key={u.twitch_username}>
                <td className="fdisplay">{i + 1}</td>
                <td>{u.twitch_username}</td>
                <td>{u.rate_sends}</td>
                <td>{u.feature_sends}</td>
                <td>{u.epic_sends}</td>
                <td>{u.legendary_sends}</td>
                <td>{u.mythic_sends}</td>
                <td className="fdisplay" style={{ color: 'var(--display)' }}>
                  {u.total_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
