/**
 * Safely parse any date value into MySQL DATE format ('YYYY-MM-DD') or NULL.
 * Rejects invalid, empty, or zero dates.
 * Never returns '0000-00-00', '0000-00-00 00:00:00', or an Invalid Date object.
 */
function parseDateForMySQL(rawDate) {
  if (rawDate == null) return null;

  if (typeof rawDate === 'object') {
    if (rawDate instanceof Date) {
      if (isNaN(rawDate.getTime())) return null;
      return rawDate.toISOString().slice(0, 10);
    }
    rawDate = rawDate.value;
  }

  if (typeof rawDate !== 'string') return null;

  const str = rawDate.trim();
  if (!str) return null;

  // Explicitly reject zero-dates and invalid literal placeholders
  if (
    str === '0000-00-00' ||
    str.startsWith('0000-00-00') ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none' ||
    str.toLowerCase() === 'invalid date'
  ) {
    return null;
  }

  // Handle standard ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // Handle common Indian land record date format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // Fallback to Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    if (year >= 1000 && year <= 9999) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return null;
}

module.exports = {
  parseDateForMySQL,
};
