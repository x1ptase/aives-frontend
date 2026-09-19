/**
 * Format a date string to a localized display format.
 */
export function formatDate(dateString: string, locale: string = 'vi-VN'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate total score from an array of criteria scores.
 */
export function calculateScore(
  scores: { score: number; maxScore: number }[],
): { total: number; max: number; percentage: number } {
  const total = scores.reduce((sum, s) => sum + s.score, 0)
  const max = scores.reduce((sum, s) => sum + s.maxScore, 0)
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0
  return { total, max, percentage }
}

/**
 * Truncate a string to a given length with ellipsis.
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate a random color class for avatars/tags.
 */
export function getRandomColor(): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
