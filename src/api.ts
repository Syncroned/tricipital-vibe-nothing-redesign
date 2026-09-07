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
} from './types'

const API_BASE = '/api/index.php'

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
    const res = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}${bust}`, opts)
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
}

export const api = new TricipitalApi()
