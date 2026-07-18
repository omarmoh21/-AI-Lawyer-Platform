const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/api`

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export interface ArticleResponse {
  law_name: string
  article_name: string | null
  article_number: number
  text: string
  history_id: number
}

export async function lookupArticle(
  lawName: string,
  articleNumber: number,
): Promise<ArticleResponse> {
  const params = new URLSearchParams({
    law_name: lawName,
    article_number: String(articleNumber),
  })
  const response = await fetch(`${API_BASE_URL}/articles?${params.toString()}`, {
    credentials: 'include',
  })
  return handleResponse<ArticleResponse>(response)
}

export interface SearchHistoryItem {
  id: number
  law_name: string
  article_number: number
  article_name: string | null
  text: string | null
  found: boolean
  created_at: string
}

export async function listSearchHistory(): Promise<SearchHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/articles/history`, {
    credentials: 'include',
  })
  return handleResponse<SearchHistoryItem[]>(response)
}

export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string
  city: string
}

export async function signup(
  name: string,
  email: string,
  phone: string,
  city: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, phone, city, password }),
  })
  return handleResponse<AuthUser>(response)
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<AuthUser>(response)
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export async function getMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
  })
  if (response.status === 401) return null
  return handleResponse<AuthUser>(response)
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${response.status} ${response.statusText}`)
  }
}

export interface ChatResponse {
  session_id: string
  response: string
  docx_path: string | null
}

export async function sendChat(
  message: string,
  sessionId: string | null,
  extractedText = '',
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message,
      session_id: sessionId,
      extracted_text: extractedText,
    }),
  })
  return handleResponse<ChatResponse>(response)
}

export interface ChatSessionSummary {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    credentials: 'include',
  })
  return handleResponse<ChatSessionSummary[]>(response)
}

export interface ChatMessageOut {
  role: string
  content: string
  created_at: string
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessageOut[]> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
    credentials: 'include',
  })
  return handleResponse<ChatMessageOut[]>(response)
}

export interface DocumentReviewPayload {
  thread_id: string
  status: 'review' | 'done'
  extracted_text?: string
  extraction_method?: string
  final_text?: string
}

export async function extractDocuments(
  files: File[],
  message = '',
): Promise<DocumentReviewPayload> {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  formData.append('message', message)

  const response = await fetch(`${API_BASE_URL}/documents/extract`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse<DocumentReviewPayload>(response)
}

export async function downloadContract(
  contractType: string,
  title: string,
  text: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/contracts/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ contract_type: contractType, title, text }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${contractType}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function reviewDocuments(
  threadId: string,
  action: 'approve' | 'edit' | 'retry',
  options: { text?: string; feedback?: string } = {},
): Promise<DocumentReviewPayload> {
  const response = await fetch(`${API_BASE_URL}/documents/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: threadId,
      action,
      text: options.text,
      feedback: options.feedback ?? '',
    }),
  })
  return handleResponse<DocumentReviewPayload>(response)
}
