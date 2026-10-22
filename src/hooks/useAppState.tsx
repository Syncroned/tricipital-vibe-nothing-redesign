import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api } from '../api'
import type {
  CsrfResponse,
  RequestsStatus,
  HistoryResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  QueueResponse,
  QueueEntry,
  MyRequestResponse,
  HighestWeightResponse,
  ProgressResponse,
  SubmitBody,
  SubmitResponse,
  SavedSlot,
  UserPrefs,
  ModAction,
  TransferRequest,
  Prediction,
  PredictionPreset,
} from '../types'

interface Alert {
  message: string
  type: 'success' | 'error'
}

export type QueueSort = 'newest' | 'oldest' | 'weight'

interface AppState {
  csrf: CsrfResponse | null
  status: RequestsStatus | null
  history: HistoryResponse | null
  leaderboard: LeaderboardResponse | null
  leaderboardPeriod: LeaderboardPeriod
  leaderboardOffset: number
  queue: QueueEntry[] | null
  queueSort: QueueSort
  myRequest: MyRequestResponse | null
  highest: HighestWeightResponse | null
  progress: ProgressResponse | null
  savedSlots: (SavedSlot | null)[]
  prefs: UserPrefs | null
  orbsBalance: number
  loading: boolean
  error: string | null
  alert: Alert | null
  activeTab: string
  adminSub: 'queue' | 'settings' | 'favorites'
  sendsShown: boolean
  queueUnlocked: boolean
  isExtensionMode: boolean
  canModerate: boolean
  isSub: boolean
  isMod: boolean
  isAdmin: boolean
  // mod data
  adminRequests: QueueEntry[]
  modActions: ModAction[]
  pendingTransfers: TransferRequest[]
  prediction: Prediction | null
  predPresets: PredictionPreset[]
  predictSlug: string | null
  setActiveTab: (tab: string) => void
  setAdminSub: (sub: 'queue' | 'settings' | 'favorites') => void
  setLeaderboardPeriod: (period: LeaderboardPeriod) => void
  shiftLeaderboardPeriod: (delta: number) => void
  setQueueSort: (sort: QueueSort) => void
  refresh: () => Promise<void>
  refreshQueue: () => Promise<void>
  refreshMyRequest: () => Promise<void>
  refreshProgress: () => Promise<void>
  refreshPrefs: () => Promise<void>
  loadModData: () => Promise<void>
  refreshPrediction: () => Promise<void>
  submit: (body: Omit<SubmitBody, 'csrf_token'>) => Promise<SubmitResponse>
  submitLevelless: () => Promise<SubmitResponse>
  loginTwitch: () => void
  logoutTwitch: () => Promise<void>
  setOrbsBalance: (n: number) => void
  setPrefs: (p: UserPrefs | null) => void
  dismissAlert: () => void
  showAlert: (message: string, type: 'success' | 'error') => void
}

const AppContext = createContext<AppState | null>(null)

function detectPredictSlug(): string | null {
  try {
    const w = window as unknown as { __PREDICT_SLUG?: string }
    if (w.__PREDICT_SLUG) return w.__PREDICT_SLUG
    const m = window.location.pathname.match(/^\/([a-z0-9]{6,10})\/?$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [csrf, setCsrf] = useState<CsrfResponse | null>(null)
  const [status, setStatus] = useState<RequestsStatus | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [leaderboardPeriod, setLeaderboardPeriodState] = useState<LeaderboardPeriod>('all_time')
  const [leaderboardOffset, setLeaderboardOffsetState] = useState(0)
  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [queueSort, setQueueSortState] = useState<QueueSort>('oldest')
  const [myRequest, setMyRequest] = useState<MyRequestResponse | null>(null)
  const [highest, setHighest] = useState<HighestWeightResponse | null>(null)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [savedSlots, setSavedSlots] = useState<(SavedSlot | null)[]>([null, null, null])
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)
  const [orbsBalance, setOrbsBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [activeTab, setActiveTab] = useState('request')
  const [adminSub, setAdminSub] = useState<'queue' | 'settings' | 'favorites'>('queue')
  const [adminRequests, setAdminRequests] = useState<QueueEntry[]>([])
  const [modActions, setModActions] = useState<ModAction[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<TransferRequest[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [predPresets, setPredPresets] = useState<PredictionPreset[]>([])
  const [predictSlug] = useState<string | null>(detectPredictSlug)

  const showAlert = useCallback((message: string, type: 'success' | 'error') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
  }, [])

  const isSub = !!(csrf?.twitch_is_subscriber ?? csrf?.is_sub)
  const isMod = !!(csrf?.twitch_is_mod ?? csrf?.is_mod)
  const isAdmin = !!csrf?.is_admin
  const canModerate = isMod || isAdmin
  const sendsShown = !status?.non_mod_mode
  const queueUnlocked = isSub || isMod || isAdmin
  const isExtensionMode = (() => {
    try {
      return (window as { __SITE?: { kind?: string } }).__SITE?.kind === 'extension'
    } catch {
      return false
    }
  })()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const csrfData = await api.fetchCsrf()
      setCsrf(csrfData)
      setSavedSlots(csrfData.saved_slots || [null, null, null])
      setOrbsBalance(csrfData.orbs_balance || 0)

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
        if (q && !('error' in q)) setQueue((q as QueueResponse).requests || (q as QueueResponse).queue || [])
        const p = await api.getProgress().catch(() => null)
        if (p && !('error' in p)) {
          const pr = p as ProgressResponse
          setProgress(pr)
          if (typeof pr.orbs_balance === 'number') setOrbsBalance(pr.orbs_balance)
        }
        const up = await api.getUserPrefs().catch(() => null)
        if (up && !up.error) setPrefs(up)
      } else {
        setQueue(null)
        setProgress(null)
        setPrefs(null)
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

  const refreshQueue = useCallback(async () => {
    const q = await api.getQueue(queueSort).catch(() => null)
    if (q && !('error' in q)) setQueue((q as QueueResponse).requests || (q as QueueResponse).queue || [])
  }, [queueSort])

  const refreshMyRequest = useCallback(async () => {
    const d = await api.getMyRequest().catch(() => null)
    if (d && !('error' in d)) setMyRequest(d as MyRequestResponse)
  }, [])

  const refreshProgress = useCallback(async () => {
    const p = await api.getProgress().catch(() => null)
    if (p && !('error' in p)) {
      const pr = p as ProgressResponse
      setProgress(pr)
      if (typeof pr.orbs_balance === 'number') setOrbsBalance(pr.orbs_balance)
    }
  }, [])

  const refreshPrefs = useCallback(async () => {
    const up = await api.getUserPrefs().catch(() => null)
    if (up && !up.error) setPrefs(up)
  }, [])

  const refreshPrediction = useCallback(async () => {
    const d = await api.getPredictionsState().catch(() => null)
    if (d && !('error' in d)) setPrediction(d.prediction || null)
    const pr = await api.getPredictionPresets().catch(() => null)
    if (pr && !('error' in pr)) setPredPresets(pr.presets || [])
  }, [])

  const loadModData = useCallback(async () => {
    const [req, acts, pend, pred, presets] = await Promise.all([
      api.getAdminRequests('oldest').catch(() => null),
      api.getModActions().catch(() => null),
      api.getPendingTransferRequests().catch(() => null),
      api.getPredictionsState().catch(() => null),
      api.getPredictionPresets().catch(() => null),
    ])
    if (req && !('error' in req)) setAdminRequests((req as QueueResponse).requests || (req as QueueResponse).queue || [])
    if (acts && !('error' in acts)) setModActions(acts.actions || [])
    if (pend && !('error' in pend)) setPendingTransfers(pend.requests || [])
    if (pred && !('error' in pred)) setPrediction(pred.prediction || null)
    if (presets && !('error' in presets)) setPredPresets(presets.presets || [])
  }, [])

  const submit = useCallback(
    async (body: Omit<SubmitBody, 'csrf_token'>) => {
      const res = await api.submit(body)
      if (res.error) showAlert(res.error, 'error')
      else {
        const base = res.replaced ? 'Your previous request has been replaced' : 'Level request submitted'
        showAlert(
          res.award_pool_empty
            ? `${base}, but this period's weight rewards are all claimed. No weight this time, you're still at ${res.weight ?? 1}.`
            : `${base}. Your level weight is ${res.weight ?? 1}.`,
          'success',
        )
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
      const w = res.weight ?? 1
      showAlert(
        w === 1 ? 'Levelless slot created! You start at weight 1.' : `Weight gained! Your levelless weight is now ${w}.`,
        'success',
      )
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
    setPrefs(null)
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

  const setLeaderboardPeriod = useCallback(
    (period: LeaderboardPeriod) => {
      void loadLeaderboard(period, 0)
    },
    [loadLeaderboard],
  )

  const shiftLeaderboardPeriod = useCallback(
    (delta: number) => {
      const next = Math.min(0, leaderboardOffset + delta)
      if (next === leaderboardOffset) return
      void loadLeaderboard(leaderboardPeriod, next)
    },
    [leaderboardOffset, leaderboardPeriod, loadLeaderboard],
  )

  const setQueueSort = useCallback(
    (sort: QueueSort) => {
      setQueueSortState(sort)
      void api.getQueue(sort).then((q) => {
        if (q && !('error' in q)) setQueue((q as QueueResponse).requests || (q as QueueResponse).queue || [])
      })
    },
    [],
  )

  const value: AppState = {
    csrf,
    status,
    history,
    leaderboard,
    leaderboardPeriod,
    leaderboardOffset,
    queue,
    queueSort,
    myRequest,
    highest,
    progress,
    savedSlots,
    prefs,
    orbsBalance,
    loading,
    error,
    alert,
    activeTab,
    adminSub,
    sendsShown,
    queueUnlocked,
    isExtensionMode,
    canModerate,
    isSub,
    isMod,
    isAdmin,
    adminRequests,
    modActions,
    pendingTransfers,
    prediction,
    predPresets,
    predictSlug,
    setActiveTab,
    setAdminSub,
    setLeaderboardPeriod,
    shiftLeaderboardPeriod,
    setQueueSort,
    refresh,
    refreshQueue,
    refreshMyRequest,
    refreshProgress,
    refreshPrefs,
    loadModData,
    refreshPrediction,
    submit,
    submitLevelless,
    loginTwitch,
    logoutTwitch,
    setOrbsBalance,
    setPrefs,
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
