// Thin client for the FastAPI backend (backend/api/routes).
// Set VITE_API_BASE_URL in frontend/.env to point at a deployed backend;
// defaults to the local dev server.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

// ── Chat (supervisor agent: legal Q&A, contracts, follow-ups) ──

export interface ChatResponse {
  session_id: string
  response: string
  docx_path: string | null
}

export function sendChat(
  message: string,
  sessionId?: string | null,
  extractedText = '',
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId ?? null,
      extracted_text: extractedText,
    }),
  })
}

// ── Article lookup (verbatim law text, no LLM) ─────────────────

export interface ArticleResponse {
  law_name: string
  article_name: string
  article_number: number
  text: string
}

export function lookupArticle(
  lawName: string,
  articleNumber: number,
): Promise<ArticleResponse> {
  const params = new URLSearchParams({
    law_name: lawName,
    article_number: String(articleNumber),
  })
  return request<ArticleResponse>(`/api/articles?${params}`, { method: 'GET' })
}

// ── Documents (OCR extract → human review → final text) ───────

export interface DocumentFlowResponse {
  thread_id: string
  status: 'review' | 'done'
  extracted_text?: string
  extraction_method?: string
  final_text?: string
}

export function extractDocuments(
  files: File[],
  message = '',
): Promise<DocumentFlowResponse> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  form.append('message', message)
  return request<DocumentFlowResponse>('/api/documents/extract', {
    method: 'POST',
    body: form,
  })
}

export function reviewDocuments(
  threadId: string,
  action: 'approve' | 'edit' | 'retry',
  options: { text?: string; feedback?: string } = {},
): Promise<DocumentFlowResponse> {
  return request<DocumentFlowResponse>('/api/documents/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: threadId,
      action,
      text: options.text ?? null,
      feedback: options.feedback ?? '',
    }),
  })
}
