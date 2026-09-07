import { useAppState } from '../hooks/useAppState'
import { timeAgo } from '../utils'

export function HistoryView() {
  const { history } = useAppState()

  return (
    <section className="mod s12">
      <div className="mhead">
        <span className="t">Recently Played</span>
        <span className="ex">{history?.count ?? 0} entries</span>
      </div>

      <div className="tw-overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Level ID</th>
              <th>Difficulty</th>
              <th>Type</th>
              <th>Creator</th>
              <th>Twitch</th>
              <th>Played</th>
            </tr>
          </thead>
          <tbody>
            {(history?.history || []).map((h) => (
              <tr key={`${h.level_id}-${h.played_unix}`}>
                <td>{h.level_id}</td>
                <td>{h.difficulty}</td>
                <td>{h.level_type}</td>
                <td>{h.creator}</td>
                <td>{h.twitch_username}</td>
                <td>{timeAgo(h.played_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
