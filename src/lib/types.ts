// Типы ответов API. Зеркало DTO из server/ (см. openapi.json).

export type Role = 'organizer' | 'moderator';
export type EventStatus = 'draft' | 'published' | 'hidden' | 'archived';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  price: number | null;
  ageLimit: number | null;
  city: string;
  status: EventStatus;
  venue: Venue | null;
  categories: Category[];
  owner: { id: string; name: string };
  publishedAt: string | null;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type MyEventCounts = Record<EventStatus | 'all', number>;

export type ModerationCounts = Record<'published' | 'hidden', number>;

export interface ErrorDetail {
  field?: string;
  issue: string;
}

export const DEFAULT_CITY = 'moscow';

export const CITIES: Record<string, string> = {
  moscow: 'Москва',
};

export const cityName = (code: string) => CITIES[code] ?? code;

export const AGE_LIMITS = [0, 6, 12, 16, 18] as const;
