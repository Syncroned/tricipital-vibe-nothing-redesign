export interface CsrfResponse {
  csrf_token: string
  turnstile_site_key?: string
  is_admin: boolean
  twitch_logged_in: boolean
  twitch_username?: string
  owner_avatar?: string
  twitch_is_subscriber?: boolean
  twitch_is_mod?: boolean
  /** @deprecated use twitch_is_subscriber */
  is_sub?: boolean
  /** @deprecated use twitch_is_mod */
  is_mod?: boolean
  orbs_enabled?: boolean
  orbs_balance?: number
  saved_slots?: (SavedSlot | null)[]
  watch_streak?: WatchStreak | null
  bot_health?: unknown
}

export interface SavedSlot {
  level_id: string
  difficulty: string
  level_type: string
  creator: string
  video_url?: string | null
  notes?: string | null
  custom_answers?: string[]
}

export interface RequestsStatus {
  locked: boolean
  queue_limit: number
  min_weight?: number
  botcheck_enabled: boolean
  period_weight_reward: number
  queue_full: boolean
  award_pool_limit: number
  award_pool_remaining: number | null
  award_pool_empty: boolean
  restriction_mode: 'strict' | 'silent'
  disabled_difficulties: string[]
  disabled_types: string[]
  video_required_difficulties: string[]
  video_required_types: string[]
  custom_questions: (CustomQuestion | null)[]
  auto_closed?: { at?: number; reason?: string } | null
  non_mod_mode?: boolean
}

export interface CustomQuestion {
  id?: number
  text: string
  type: 'mc' | 'sr'
  optional?: boolean
  choices?: string[]
}

export interface HistoryEntry {
  level_id: string
  difficulty: string
  level_type: string
  creator: string
  twitch_username: string
  played_at: string
  played_unix: number
  send_type?: string
  weight_at_played?: number
}

export interface HistoryResponse {
  history: HistoryEntry[]
  count: number
  limited: boolean
}

export interface LeaderboardEntry {
  twitch_username: string
  rate_sends: string
  feature_sends: string
  epic_sends: string
  legendary_sends: string
  mythic_sends: string
  total_score: string
  /** computed on the client */
  sends?: number
  /** computed on the client */
  rank?: number
}

export type LeaderboardPeriod = 'all_time' | 'monthly' | 'weekly'

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  period: LeaderboardPeriod
  period_offset: number
  period_label: string
  is_current_period: boolean
}

export interface QueueEntry {
  id: number
  level_id: string
  difficulty: string
  level_type: string
  creator: string
  twitch_username: string
  weight: number
  notes?: string
  submitted_at?: string
  submitted_unix?: number
  video_url?: string
  is_spotlighted?: boolean
}

export interface QueueResponse {
  /** `queue` on older responses, `requests` on the current API */
  queue?: QueueEntry[]
  requests?: QueueEntry[]
  count?: number
  weight_issued?: number | null
}

export interface MyRequestResponse {
  found: boolean
  requests: RequestEntry[]
  request?: RequestEntry
}

export interface RequestEntry {
  id: number
  level_id: string
  difficulty: string
  level_type: string
  creator: string
  twitch_username: string
  video_url?: string
  notes?: string
  weight: number
  submitted_at?: string
}

export interface HighestWeightResponse {
  level_id: string | null
  weight: number | null
}

export interface ProgressResponse {
  weights: ProgressWeight[]
  milestones?: ProgressMilestone[]
  milestone?: ProgressMilestone
  /** free-weight code items tied to a milestone */
  milestone_weights?: MilestoneWeightItem[]
  /** score totals, keyed by tier + total_score */
  scores?: ProgressScore
  /** outgoing weight transfer requests */
  transfer_requests_outgoing?: TransferRequest[]
  /** incoming weight transfer requests */
  transfer_requests_incoming?: TransferRequest[]
  /** orbs balance + redeemable tiers */
  orbs_balance?: number
  orbs_tiers?: OrbsTier[]
  /** watch streak data */
  watch_streak?: WatchStreak
}

export interface MilestoneWeightItem {
  id: number
  milestone_id: number
  label?: string
  amount: number | string
  cooldown_days?: number
  last_claimed_at?: string
  can_claim?: boolean
  next_claim_str?: string
  next_claim_at?: string
  has_active_code?: boolean
  active_code?: string
  code?: string
}

export type TransferStatus =
  | 'pending'
  | 'pending_mod'
  | 'pending_recipient'
  | 'accepted'
  | 'denied'
  | 'rejected'
  | 'cancelled'

export interface TransferAccount {
  account_created_at?: string
}

export interface TransferCounts {
  requests_sent?: number
  requests_received?: number
  codes_created?: number
}

export interface TransferRequest {
  id: number
  sender_username: string
  recipient_username: string
  sender_level_id: string
  recipient_level_id: string
  amount: number | string
  status: TransferStatus
  sender_account?: TransferAccount | null
  recipient_account?: TransferAccount | null
  sender_counts?: TransferCounts | null
  recipient_counts?: TransferCounts | null
}

export interface OrbsTier {
  id: number
  orb_cost: number | string
  weight_award: number | string
  label?: string
}

export interface StreakCurve {
  day2?: number
  day3?: number
  day4?: number
  plateau?: number
  milestones?: { every: number; orbs: number }[]
}

export interface WatchStreak {
  current: number
  last_claimed?: number
  claimable_orbs?: number
  at_risk?: boolean
  curve?: StreakCurve
  /** legacy fields */
  streak?: number
  last_stream_at?: string
  missed?: boolean
  claimable?: boolean
  claim_amount?: number
}

export interface ProgressScore {
  total_score: number | string
  rate_sends?: number | string
  feature_sends?: number | string
  epic_sends?: number | string
  legendary_sends?: number | string
  mythic_sends?: number | string
}

export interface ProgressWeight {
  level_id: string
  twitch_username: string
  weight: number
  history?: WeightHistoryEntry[]
}

export interface WeightHistoryEntry {
  delta: number
  /** legacy / friendly reason text */
  reason?: string
  /** original event type from the API */
  event_type?: string
  /** extra detail (code, orb tier, etc) */
  detail?: string
  created_at: string
}

export interface ProgressMilestone {
  id: number
  label?: string
  points_required: number
  request_limit?: number
  starting_weight_multiplier?: number
  resubmit_multiplier?: number
  bypass_queue_limit?: boolean
  free_weight_amount?: number
  free_weight_cooldown_days?: number
}

export interface SubmitBody {
  csrf_token: string
  level_id: string
  difficulty: string
  level_type: string
  creator: string
  twitch_username: string
  video_url: string | null
  notes: string | null
  custom_answers: string[]
  turnstile_token?: string
}

export interface SubmitResponse {
  success?: boolean
  error?: string
  weight?: number
  replaced?: boolean
  award_pool_empty?: boolean
  csrf_token?: string
}

export interface ApiError {
  error: string
}

export interface UserPrefs {
  discord_linked: boolean
  discord_username?: string
  notify_level_played?: boolean
  notify_level_active?: boolean
  error?: string
}

export interface ModAction {
  id: number
  twitch_username: string
  action: string
  detail?: string
  created_unix?: number
  created_at?: string
}

export interface ModLookupCode {
  code?: string
  weight_award?: number | string
  origin_level_id?: string
  redeemed?: boolean
  redeemed_at?: string
}

export interface ModLookupResult {
  username: string
  account?: TransferAccount | null
  transfer_requests?: TransferRequest[]
  codes_created?: ModLookupCode[]
  error?: string
}

export interface PredictionOutcome {
  id: number
  label: string
  total_staked: number
}

export interface PredictionWager {
  outcome_id: number
  orbs_staked: number
  payout?: number | null
}

export interface Prediction {
  id: number
  title: string
  status: 'open' | 'locked' | 'resolved' | 'cancelled'
  outcomes: PredictionOutcome[]
  winning_outcome_id?: number | null
  my_wager?: PredictionWager | null
  locks_at?: number | null
  share_slug?: string
}

export interface PredictionPreset {
  id: number
  title: string
  outcomes_text?: string
  outcomes?: string[]
}

export interface SitePredictionState {
  prediction?: Prediction | null
  orbs_balance?: number
  error?: string
}

export interface PendingTransfersResponse {
  requests?: TransferRequest[]
  error?: string
}

export interface ModActionsResponse {
  actions?: ModAction[]
  error?: string
}

export interface OutcomeWagersResponse {
  wagers?: { username: string; staked: number }[]
  error?: string
}

export interface PredictionsStateResponse {
  prediction?: Prediction | null
  error?: string
}

export interface PresetsResponse {
  presets?: PredictionPreset[]
  error?: string
}

export interface FavoriteEntry {
  id: number | string
  level_id: string
  difficulty?: string
  level_type?: string
  creator?: string
  twitch_username?: string
  video_url?: string
  note?: string
  rating?: number | string
  stream_session_id?: number | string | null
  created_at?: string
}

export interface FavoritesResponse {
  favorites?: FavoriteEntry[]
  count?: number
  streams_ever?: boolean
  bot_ready?: boolean
  error?: string
}
