import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskSignal } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseSafeDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getSignalDisplayDate(signal: Pick<RiskSignal, 'timestamp' | 'collectedAt'>): Date | null {
  const publishedAt = parseSafeDate(signal.timestamp);
  const collectedAt = parseSafeDate(signal.collectedAt);
  const now = Date.now();

  if (!publishedAt) return collectedAt;

  const publishedMs = publishedAt.getTime();

  // If the source sends a future or clearly broken timestamp, fall back to collection time.
  if (publishedMs > now + 5 * 60 * 1000) {
    return collectedAt || new Date(now);
  }

  return publishedAt;
}

export function formatSignalRelativeTime(signal: Pick<RiskSignal, 'timestamp' | 'collectedAt'>): string {
  const date = getSignalDisplayDate(signal);
  if (!date) return 'غير معروف';

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'قبل قليل';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  return date.toLocaleDateString('ar-EG');
}

export function formatSignalExactTime(signal: Pick<RiskSignal, 'timestamp' | 'collectedAt'>): string {
  const date = getSignalDisplayDate(signal);
  if (!date) return 'وقت غير معروف';

  return date.toLocaleString('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
