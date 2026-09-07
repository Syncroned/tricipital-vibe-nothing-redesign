export interface CsrfResponse {
  csrf_token: string
  turnstile_site_key?: string
  is_admin: boolean
  twitch_logged_in: boolean
  twitch_username?: string
  is_sub?: boolean
  is_mod?: boolean
  orbs_enabled?: boolean
  orbs_balance?: number
}

export interface RequestsStatus {
  locked: boolean
  queue_limit: number
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
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  period: string
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
}

export interface QueueResponse {
  queue: QueueEntry[]
  count: number
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
  score?: number
}

export interface ProgressWeight {
  level_id: string
  twitch_username: string
  weight: number
  history?: WeightHistoryEntry[]
}

export interface WeightHistoryEntry {
  delta: number
  reason: string
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
