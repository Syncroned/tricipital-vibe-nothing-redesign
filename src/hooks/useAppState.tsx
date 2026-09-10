import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api } from '../api'
import type {
  CsrfResponse,
  RequestsStatus,
  HistoryResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  QueueResponse,
  MyRequestResponse,
  HighestWeightResponse,
  ProgressResponse,
  SubmitBody,
  SubmitResponse,
} from '../types'

interface Alert {
  message: string
  type: 'success' | 'error'
}

interface AppState {
  csrf: CsrfResponse | null
  status: RequestsStatus | null
  history: HistoryResponse | null
  leaderboard: LeaderboardResponse | null
  leaderboardPeriod: LeaderboardPeriod
  leaderboardOffset: number
  queue: QueueResponse | null
  myRequest: MyRequestResponse | null
  highest: HighestWeightResponse | null
  progress: ProgressResponse | null
  loading: boolean
  error: string | null
  alert: Alert | null
  activeTab: string
  setActiveTab: (tab: string) => void
  setLeaderboardPeriod: (period: LeaderboardPeriod) => void
  shiftLeaderboardPeriod: (delta: number) => void
  refresh: () => Promise<void>
  submit: (body: Omit<SubmitBody, 'csrf_token'>) => Promise<SubmitResponse>
  submitLevelless: () => Promise<SubmitResponse>
  loginTwitch: () => void
  logoutTwitch: () => Promise<void>
  dismissAlert: () => void
  showAlert: (message: string, type: 'success' | 'error') => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [csrf, setCsrf] = useState<CsrfResponse | null>(null)
  const [status, setStatus] = useState<RequestsStatus | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [leaderboardPeriod, setLeaderboardPeriodState] = useState<LeaderboardPeriod>('all_time')
  const [leaderboardOffset, setLeaderboardOffsetState] = useState(0)
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [myRequest, setMyRequest] = useState<MyRequestResponse | null>(null)
  const [highest, setHighest] = useState<HighestWeightResponse | null>(null)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [activeTab, setActiveTab] = useState('request')

  const showAlert = useCallback((message: string, type: 'success' | 'error') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const csrfData = await api.fetchCsrf()
      setCsrf(csrfData)

      const [statusData, historyData, leaderboardData, highestData, myReqData] = await Promise.all([
        api.getRequestsStatus(),
        api.getHistory(),
        api.getLeaderboard(leaderboardPeriod, leaderboardOffset),
        api.getHighestWeight(),
        api.getMyRequest().catch(() => null),
      ])
      setStatus(statusData)
      setHistory(historyData)
      if ('leaderboard' in (leaderboardData as LeaderboardResponse)) {
        setLeaderboard(leaderboardData as LeaderboardResponse)
      } else {
        setLeaderboard(null)
      }
      setHighest(highestData)
      if (myReqData && !('error' in myReqData)) setMyRequest(myReqData)

      if (csrfData.twitch_logged_in) {
        const q = await api.getQueue().catch(() => null)
        if (q && !('error' in q)) setQueue(q as QueueResponse)
        const p = await api.getProgress().catch(() => null)
        if (p && !('error' in p)) setProgress(p as ProgressResponse)
      } else {
        setQueue(null)
        setProgress(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const submit = useCallback(
    async (body: Omit<SubmitBody, 'csrf_token'>) => {
      const res = await api.submit(body)
      if (res.error) showAlert(res.error, 'error')
      else {
        showAlert(`Submitted! Weight: ${res.weight ?? 1}`, 'success')
        void refresh()
      }
      return res
    },
    [refresh, showAlert],
  )

  const submitLevelless = useCallback(async () => {
    const res = await api.submitLevelless()
    if (res.error) showAlert(res.error, 'error')
    else {
      showAlert(`Levelless slot updated. Weight: ${res.weight ?? 1}`, 'success')
      void refresh()
    }
    return res
  }, [refresh, showAlert])

  const loginTwitch = useCallback(() => {
    location.href = api.twitchLoginUrl()
  }, [])

  const logoutTwitch = useCallback(async () => {
    await api.twitchLogout()
    setQueue(null)
    setProgress(null)
    void refresh()
  }, [refresh])

  const loadLeaderboard = useCallback(async (period: LeaderboardPeriod, offset: number) => {
    const data = (await api.getLeaderboard(period, offset)) as LeaderboardResponse
    if ('leaderboard' in data) {
      setLeaderboard(data)
      setLeaderboardPeriodState(data.period)
      setLeaderboardOffsetState(data.period_offset)
    }
  }, [])

  const setLeaderboardPeriod = useCallback((period: LeaderboardPeriod) => {
    void loadLeaderboard(period, 0)
  }, [loadLeaderboard])

  const shiftLeaderboardPeriod = useCallback((delta: number) => {
    const next = Math.min(0, leaderboardOffset + delta)
    if (next === leaderboardOffset) return
    void loadLeaderboard(leaderboardPeriod, next)
  }, [leaderboardOffset, leaderboardPeriod, loadLeaderboard])

  const value: AppState = {
    csrf,
    status,
    history,
    leaderboard,
    leaderboardPeriod,
    leaderboardOffset,
    queue,
    myRequest,
    highest,
    progress,
    loading,
    error,
    alert,
    activeTab,
    setActiveTab,
    setLeaderboardPeriod,
    shiftLeaderboardPeriod,
    refresh,
    submit,
    submitLevelless,
    loginTwitch,
    logoutTwitch,
    dismissAlert: () => setAlert(null),
    showAlert,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be inside AppProvider')
  return ctx
}
