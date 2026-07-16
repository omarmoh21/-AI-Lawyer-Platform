export interface LegalSource {
  id: string
  title: string
  article: string
  snippet: string
}

export interface ConsultationTurn {
  id: string
  question: string
  answer: string
  sources: LegalSource[]
}

export interface SearchResult {
  id: string
  title: string
  category: string
  snippet: string
  article: string
  date: string
}

export interface UserProfile {
  name: string
  email: string
  phone: string
  city: string
  joinedAt: string
  avatarUrl: string | null
}
