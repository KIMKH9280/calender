/**
 * Returns today's date in YYYY-MM-DD format using local timezone.
 * Use this instead of new Date().toISOString().slice(0, 10) which uses UTC.
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
