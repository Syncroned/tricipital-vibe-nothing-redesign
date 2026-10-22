import type {
  CsrfResponse,
  RequestsStatus,
  HistoryResponse,
  LeaderboardResponse,
  QueueResponse,
  MyRequestResponse,
  HighestWeightResponse,
  ProgressResponse,
  SubmitBody,
  SubmitResponse,
  ApiError,
  UserPrefs,
  ModActionsResponse,
  ModLookupResult,
  PendingTransfersResponse,
  PredictionsStateResponse,
  PresetsResponse,
  SitePredictionState,
  OutcomeWagersResponse,
  FavoritesResponse,
} from './types'

const API_BASE = 'api/index.php'

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    if (!res.ok) return { error: `Server error ${res.status}` } as ApiError
    return { error: 'Invalid server response' } as ApiError
  }
}

export class TricipitalApi {
  csrf = ''
  turnstileKey = ''

  async api(action: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>): Promise<unknown> {
    const bust = method === 'GET' ? `&_=${Date.now()}` : ''
    const opts: RequestInit = {
      method,
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' },
    }
    if (body) {
      opts.headers = { ...opts.headers, 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
    const res = await fetch(`${API_BASE}?action=${action}${bust}`, opts)
    const data = (await parseJson(res)) as Record<string, unknown>

    if (res.status === 403 && action !== 'csrf') {
      void this.fetchCsrf()
    }

    if (data && typeof data === 'object' && 'csrf_token' in data && typeof data.csrf_token === 'string') {
      this.csrf = data.csrf_token
    }

    return data
  }

  async fetchCsrf(): Promise<CsrfResponse> {
    const data = (await this.api('csrf')) as CsrfResponse
    this.csrf = data.csrf_token
    if (data.turnstile_site_key) this.turnstileKey = data.turnstile_site_key
    return data
  }

  async getRequestsStatus(): Promise<RequestsStatus> {
    return (await this.api('requests_status')) as RequestsStatus
  }

  async getHistory(): Promise<HistoryResponse> {
    return (await this.api('history')) as HistoryResponse
  }

  async getLeaderboard(period = 'all_time', offset = 0): Promise<LeaderboardResponse> {
    return (await this.api(`leaderboard&period=${period}&offset=${offset}`)) as LeaderboardResponse
  }

  async getQueue(sort = 'oldest'): Promise<QueueResponse | ApiError> {
    return (await this.api(`queue&sort=${sort}`)) as QueueResponse | ApiError
  }

  async getMyRequest(): Promise<MyRequestResponse | ApiError> {
    return (await this.api('my_request')) as MyRequestResponse | ApiError
  }

  async getHighestWeight(): Promise<HighestWeightResponse> {
    return (await this.api('get_highest_weight')) as HighestWeightResponse
  }

  async getProgress(): Promise<ProgressResponse | ApiError> {
    return (await this.api('progress')) as ProgressResponse | ApiError
  }

  async submit(body: Omit<SubmitBody, 'csrf_token'>): Promise<SubmitResponse> {
    const payload: SubmitBody = { ...body, csrf_token: this.csrf }
    return (await this.api('submit', 'POST', payload as unknown as Record<string, unknown>)) as SubmitResponse
  }

  async submitLevelless(): Promise<SubmitResponse> {
    return (await this.api('submit_levelless', 'POST', { csrf_token: this.csrf })) as SubmitResponse
  }

  twitchLoginUrl(): string {
    return `${API_BASE}?action=twitch_login&return_url=${encodeURIComponent(location.href)}`
  }

  twitchLogout(): Promise<unknown> {
    return this.api('twitch_logout')
  }

  adminLogin(password: string): Promise<unknown> {
    return this.api('login', 'POST', { csrf_token: this.csrf, password })
  }

  createTransferRequest(body: {
    recipient_username: string
    recipient_level_id: string
    sender_level_id: string
    amount: number | string
  }): Promise<SubmitResponse> {
    return this.api('create_transfer_request', 'POST', { csrf_token: this.csrf, ...body }) as Promise<SubmitResponse>
  }

  createWeightCode(body: {
    level_id: string
    amount: number | string
    public?: boolean
    custom_code?: string
  }): Promise<{ success?: boolean; error?: string; code?: string; weight_award?: number | string; new_weight?: number | string }> {
    return this.api('create_weight_code', 'POST', { csrf_token: this.csrf, ...body }) as Promise<{ success?: boolean; error?: string; code?: string; weight_award?: number | string; new_weight?: number | string }>
  }

  deleteMyWeight(levelId: string): Promise<SubmitResponse> {
    return this.api('delete_my_weight', 'POST', { csrf_token: this.csrf, level_id: levelId }) as Promise<SubmitResponse>
  }

  cancelTransferRequest(id: number): Promise<SubmitResponse> {
    return this.api('cancel_transfer_request', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  respondTransferRequest(id: number, accept: boolean): Promise<SubmitResponse> {
    return this.api('respond_transfer_request', 'POST', { csrf_token: this.csrf, id, accept }) as Promise<SubmitResponse>
  }

  saveSubmission(slot: number, body: Omit<SubmitBody, 'csrf_token'>): Promise<SubmitResponse> {
    return this.api('save_submission', 'POST', { csrf_token: this.csrf, slot, ...body }) as Promise<SubmitResponse>
  }

  redeemPromo(code: string, levelId?: string): Promise<SubmitResponse & { weight_added?: number; new_weight?: number }> {
    const body: Record<string, unknown> = { csrf_token: this.csrf, code }
    if (levelId) body.level_id = levelId
    return this.api('redeem_promo', 'POST', body) as Promise<SubmitResponse & { weight_added?: number; new_weight?: number }>
  }

  redeemPromoLevel(levelId: string, code: string): Promise<SubmitResponse & { weight_added?: number; new_weight?: number; level_id?: string }> {
    return this.api('redeem_promo_level', 'POST', { csrf_token: this.csrf, level_id: levelId, code }) as Promise<
      SubmitResponse & { weight_added?: number; new_weight?: number; level_id?: string }
    >
  }

  claimStreakBonus(): Promise<{ success?: boolean; error?: string; new_orbs?: number; orbs_awarded?: number; watch_streak?: unknown }> {
    return this.api('claim_streak_bonus', 'POST', { csrf_token: this.csrf }) as Promise<{
      success?: boolean
      error?: string
      new_orbs?: number
      orbs_awarded?: number
      watch_streak?: unknown
    }>
  }

  redeemOrbs(tierId: number, levelId: string): Promise<SubmitResponse & { new_orbs?: number; weight_added?: number; new_weight?: number }> {
    return this.api('redeem_orbs', 'POST', { csrf_token: this.csrf, tier_id: tierId, level_id: levelId }) as Promise<
      SubmitResponse & { new_orbs?: number; weight_added?: number; new_weight?: number }
    >
  }

  claimMilestoneWeight(milestoneId: number): Promise<
    SubmitResponse & { code?: string; weight_amount?: number; next_claim_at?: string; has_active_code?: boolean }
  > {
    return this.api('claim_milestone_weight', 'POST', { csrf_token: this.csrf, milestone_id: milestoneId }) as Promise<
      SubmitResponse & { code?: string; weight_amount?: number; next_claim_at?: string; has_active_code?: boolean }
    >
  }

  getUserPrefs(): Promise<UserPrefs> {
    return this.api('get_user_prefs') as Promise<UserPrefs>
  }

  setUserPrefs(body: { notify_level_played?: boolean; notify_level_active?: boolean }): Promise<SubmitResponse> {
    return this.api('set_user_prefs', 'POST', { csrf_token: this.csrf, ...body }) as Promise<SubmitResponse>
  }

  discordOauthUrl(): Promise<{ url?: string; error?: string }> {
    return this.api('discord_oauth_url') as Promise<{ url?: string; error?: string }>
  }

  discordUnlink(): Promise<SubmitResponse> {
    return this.api('discord_unlink', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  // ---- Mod / admin ----

  getAdminRequests(sort: string): Promise<QueueResponse | ApiError> {
    return this.api(`requests&sort=${sort}`) as Promise<QueueResponse | ApiError>
  }

  getModActions(): Promise<ModActionsResponse> {
    return this.api('get_mod_actions') as Promise<ModActionsResponse>
  }

  getPendingTransferRequests(): Promise<PendingTransfersResponse> {
    return this.api('get_pending_transfer_requests') as Promise<PendingTransfersResponse>
  }

  approveTransferRequest(id: number): Promise<SubmitResponse> {
    return this.api('approve_transfer_request', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  rejectTransferRequest(id: number): Promise<SubmitResponse> {
    return this.api('reject_transfer_request', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  modLookupUser(username: string): Promise<ModLookupResult> {
    return this.api(`mod_lookup_user&username=${encodeURIComponent(username)}`) as Promise<ModLookupResult>
  }

  markPlayed(id: number, sendType: string, favorite = false, rating = 0, note = ''): Promise<SubmitResponse> {
    return this.api('played', 'POST', {
      csrf_token: this.csrf,
      id,
      send_type: sendType,
      favorite,
      rating: favorite ? rating : 0,
      note: favorite ? note : '',
    }) as Promise<SubmitResponse>
  }

  deleteRequest(id: number): Promise<SubmitResponse> {
    return this.api('delete', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  setSpotlight(id: number): Promise<SubmitResponse> {
    return this.api('set_spotlight', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  notifyPlaying(id: number): Promise<SubmitResponse & { notified?: boolean }> {
    return this.api('notify_playing', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse & { notified?: boolean }>
  }

  clearQueue(): Promise<SubmitResponse> {
    return this.api('clear', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  resetPeriod(): Promise<SubmitResponse> {
    return this.api('reset_period', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  toggleRequests(locked: boolean): Promise<SubmitResponse> {
    return this.api('toggle_requests', 'POST', { csrf_token: this.csrf, locked }) as Promise<SubmitResponse>
  }

  // ---- Favorites ----

  getFavorites(): Promise<FavoritesResponse> {
    return this.api('get_favorites') as Promise<FavoritesResponse>
  }

  removeFavorite(id: number | string): Promise<SubmitResponse> {
    return this.api('remove_favorite', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  clearFavorites(): Promise<SubmitResponse> {
    return this.api('clear_favorites', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  // ---- Admin settings ----

  toggleBotcheck(enabled: boolean): Promise<SubmitResponse> {
    return this.api('toggle_botcheck', 'POST', { csrf_token: this.csrf, enabled }) as Promise<SubmitResponse>
  }

  toggleNonMod(enabled: boolean): Promise<SubmitResponse> {
    return this.api('toggle_non_mod', 'POST', { csrf_token: this.csrf, enabled }) as Promise<SubmitResponse>
  }

  setQueueLimit(limit: number): Promise<SubmitResponse> {
    return this.api('set_queue_limit', 'POST', { csrf_token: this.csrf, limit }) as Promise<SubmitResponse>
  }

  setMinWeight(weight: number): Promise<SubmitResponse> {
    return this.api('set_min_weight', 'POST', { csrf_token: this.csrf, min_weight: weight }) as Promise<SubmitResponse>
  }

  setPeriodAwardLimit(limit: number): Promise<SubmitResponse> {
    return this.api('set_period_award_limit', 'POST', { csrf_token: this.csrf, limit }) as Promise<SubmitResponse>
  }

  setPeriodWeightReward(amount: number): Promise<SubmitResponse> {
    return this.api('set_period_weight_reward', 'POST', { csrf_token: this.csrf, amount }) as Promise<SubmitResponse>
  }

  setPeriodResetAnnouncement(text: string): Promise<SubmitResponse> {
    return this.api('set_period_reset_announcement', 'POST', { csrf_token: this.csrf, announcement: text }) as Promise<SubmitResponse>
  }

  saveBanToken(token: string): Promise<SubmitResponse> {
    return this.api('save_ban_token', 'POST', { csrf_token: this.csrf, token }) as Promise<SubmitResponse>
  }

  syncBans(): Promise<SubmitResponse> {
    return this.api('sync_bans', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  saveModToken(token: string): Promise<SubmitResponse> {
    return this.api('save_mod_token', 'POST', { csrf_token: this.csrf, token }) as Promise<SubmitResponse>
  }

  syncMods(): Promise<SubmitResponse> {
    return this.api('sync_mods', 'POST', { csrf_token: this.csrf }) as Promise<SubmitResponse>
  }

  // ---- Predictions ----

  getPredictionsState(): Promise<PredictionsStateResponse> {
    return this.api('get_predictions_state') as Promise<PredictionsStateResponse>
  }

  createPrediction(title: string, outcomes: string[], durationMinutes: number): Promise<SubmitResponse> {
    return this.api('create_prediction', 'POST', {
      csrf_token: this.csrf,
      title,
      outcomes,
      duration_minutes: durationMinutes,
    }) as Promise<SubmitResponse>
  }

  lockPrediction(predictionId: number): Promise<SubmitResponse> {
    return this.api('lock_prediction', 'POST', { csrf_token: this.csrf, prediction_id: predictionId }) as Promise<SubmitResponse>
  }

  cancelPrediction(predictionId: number): Promise<SubmitResponse> {
    return this.api('cancel_prediction', 'POST', { csrf_token: this.csrf, prediction_id: predictionId }) as Promise<SubmitResponse>
  }

  resolvePrediction(predictionId: number, outcomeId: number): Promise<SubmitResponse> {
    return this.api('resolve_prediction', 'POST', {
      csrf_token: this.csrf,
      prediction_id: predictionId,
      outcome_id: outcomeId,
    }) as Promise<SubmitResponse>
  }

  getPredictionPresets(): Promise<PresetsResponse> {
    return this.api('get_prediction_presets') as Promise<PresetsResponse>
  }

  savePredictionPreset(title: string, outcomesText: string): Promise<SubmitResponse> {
    return this.api('save_prediction_preset', 'POST', { csrf_token: this.csrf, title, outcomes_text: outcomesText }) as Promise<SubmitResponse>
  }

  deletePredictionPreset(id: number): Promise<SubmitResponse> {
    return this.api('delete_prediction_preset', 'POST', { csrf_token: this.csrf, id }) as Promise<SubmitResponse>
  }

  // ---- Public prediction page ----

  sitePredictionState(slug: string): Promise<SitePredictionState> {
    return this.api(`site_prediction_state&slug=${encodeURIComponent(slug)}`) as Promise<SitePredictionState>
  }

  sitePredictionOutcomeWagers(outcomeId: number): Promise<OutcomeWagersResponse> {
    return this.api(`site_prediction_outcome_wagers&outcome_id=${encodeURIComponent(outcomeId)}`) as Promise<OutcomeWagersResponse>
  }

  sitePredictionWager(predictionId: number, outcomeId: number, stake: number): Promise<SubmitResponse & { new_orbs?: number }> {
    return this.api('site_prediction_wager', 'POST', {
      csrf_token: this.csrf,
      prediction_id: predictionId,
      outcome_id: outcomeId,
      stake,
    }) as Promise<SubmitResponse & { new_orbs?: number }>
  }
}

export const api = new TricipitalApi()
