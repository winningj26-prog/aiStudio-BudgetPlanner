import type { SettingsState } from '../types/budget';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function getCurrentCalendarPeriod(date = new Date()): Pick<SettingsState, 'month' | 'year'> {
  return {
    month: MONTHS[date.getMonth()],
    year: date.getFullYear(),
  };
}

/**
 * Advances settings to the current calendar period only while automatic
 * period tracking is enabled. Legacy workbooks without the flag opt in.
 */
export function syncSettingsToCurrentPeriod(settings: SettingsState, date = new Date()): SettingsState {
  if (settings.followCurrentPeriod === false) return settings;

  const current = getCurrentCalendarPeriod(date);
  if (settings.month === current.month && settings.year === current.year && settings.followCurrentPeriod === true) {
    return settings;
  }

  return { ...settings, ...current, followCurrentPeriod: true };
}
