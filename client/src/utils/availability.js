// Client-side mirror of the server's canonical per-day availability structure.
// Single source of truth for availability — the profile page, availability page
// and booking page all rely on this shape:
//
//   availability: {
//     monday: {
//       enabled: true,
//       slots: [
//         { startTime: '09:00', endTime: '12:00' },
//         { startTime: '14:00', endTime: '18:00' },
//       ],
//     },
//     ...
//     sunday: { enabled: false, slots: [] },
//   }

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const DAY_SHORT = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const LEGACY_SHORT_TO_KEY = {
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
  Sun: 'sunday',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const emptyAvailability = () =>
  DAY_KEYS.reduce((acc, key) => {
    acc[key] = { enabled: false, slots: [] };
    return acc;
  }, {});

/** Sort, deduplicate and validate a raw slot list. Invalid slots are dropped. */
export const normalizeSlots = (slots = []) => {
  if (!Array.isArray(slots)) return [];

  const seen = new Set();
  const normalized = [];

  slots.forEach((slot) => {
    if (!slot || typeof slot !== 'object') return;
    const startTime = String(slot.startTime || '').trim();
    const endTime = String(slot.endTime || '').trim();
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return;
    if (endTime <= startTime) return;
    const dedupeKey = `${startTime}-${endTime}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    normalized.push({ startTime, endTime });
  });

  return normalized.sort((a, b) => {
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });
};

/**
 * Normalize any availability shape (legacy { days, startTime, endTime },
 * legacy per-day { enabled, startTime, endTime }, canonical per-day with
 * slots, or missing) into the canonical per-day structure.
 */
export const normalizeAvailability = (raw = null) => {
  const result = emptyAvailability();
  if (!raw || typeof raw !== 'object') return result;

  // Legacy single-range shape. MUST be checked first: legacy records that are
  // hydrated by the new nested schema also gain the per-day keys (as empty
  // defaults), so only the legacy fields carry the real working days.
  if (Array.isArray(raw.days)) {
    const startTime = raw.startTime || '';
    const endTime = raw.endTime || '';
    raw.days.forEach((short) => {
      const key = LEGACY_SHORT_TO_KEY[short];
      if (key) {
        result[key] = { enabled: true, slots: normalizeSlots([{ startTime, endTime }]) };
      }
    });
    return result;
  }

  const hasPerDayKeys = DAY_KEYS.some((key) => raw[key] !== undefined);
  if (hasPerDayKeys) {
    DAY_KEYS.forEach((key) => {
      const day = raw[key];
      if (!day || typeof day !== 'object') return;

      // Legacy per-day single range -> migrate into `slots`. Note: hydrated
      // legacy documents expose an EMPTY slots array (new schema default) with
      // the legacy startTime/endTime still populated, so an empty slots array
      // must not override the legacy range.
      const hasSlots = Array.isArray(day.slots) && day.slots.length > 0;
      const rawSlots = hasSlots
        ? day.slots
        : day.startTime || day.endTime
          ? [{ startTime: day.startTime, endTime: day.endTime }]
          : [];

      result[key] = {
        enabled: Boolean(day.enabled),
        slots: normalizeSlots(rawSlots),
      };
    });
    return result;
  }

  return result;
};

/** Canonical day keys where the provider is available. */
export const getEnabledDays = (availability = null) =>
  DAY_KEYS.filter((key) => Boolean(normalizeAvailability(availability)[key]?.enabled));

/** A day is "configured" once it has been added to the schedule (enabled or with stored slots). */
export const isDayConfigured = (day) =>
  Boolean(day?.enabled || (day?.slots && day.slots.length > 0));

/** "09:00" (24h) -> "09:00 AM" (12h). Returns '' for invalid/empty input. */
export const formatTime12h = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return '';
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(hour).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
};

/** "09:00 AM – 12:00 PM" for a slot. Returns '' for an empty slot. */
export const formatTimeRange = (slot) => {
  if (!slot || (!slot.startTime && !slot.endTime)) return '';
  return `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`.trim();
};

/**
 * Build a display-ready summary of an availability record:
 *   {
 *     normalized, enabledKeys, workingDays: ['Mon','Tue'],
 *     ranges: [{ startTime, endTime, days }],              // aggregated, backward compatible
 *     dayRanges: [{ key, label, short, enabled, ranges }], // per configured day, week order
 *   }
 */
export const summarizeAvailability = (availability = null) => {
  const normalized = normalizeAvailability(availability);
  const enabledKeys = getEnabledDays(normalized);
  const workingDays = enabledKeys.map((key) => DAY_SHORT[key]);

  // Per configured day (enabled OR with stored slots) with its own multi-slot
  // ranges — the shape used by the provider Profile page and customer pages.
  const dayRanges = DAY_KEYS.filter((key) => isDayConfigured(normalized[key])).map((key) => ({
    key,
    label: DAY_LABELS[key],
    short: DAY_SHORT[key],
    enabled: Boolean(normalized[key].enabled),
    ranges: normalized[key].slots,
  }));

  // Aggregated unique ranges across enabled days.
  const ranges = [];
  enabledKeys.forEach((key) => {
    normalized[key].slots.forEach((slot) => {
      const existing = ranges.find(
        (r) => r.startTime === slot.startTime && r.endTime === slot.endTime
      );
      if (existing) {
        existing.days.push(DAY_SHORT[key]);
      } else {
        ranges.push({ startTime: slot.startTime, endTime: slot.endTime, days: [DAY_SHORT[key]] });
      }
    });
  });

  return { normalized, enabledKeys, workingDays, ranges, dayRanges };
};