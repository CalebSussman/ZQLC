// Date utility functions for consistent local date handling across ATOL system
// Fixes timezone issues between task creation and calendar display

/**
 * Get local date string in YYYY-MM-DD format
 * Uses local timezone instead of UTC to prevent date shifting
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current local time string in HH:MM format
 */
export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Create a Date object from YYYY-MM-DD date string in local timezone
 */
export function createLocalDate(dateString: string): Date {
  // Parse the date string and create a Date object in local timezone
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Format date for display purposes
 */
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}