// Canonical per-day availability structure used across LocalFix.
// This is the SINGLE SOURCE OF TRUTH for provider availability:
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
//
// The profile page, the availability page, the booking page and every API
// endpoint read/write this same structure. No duplicate availability state
// exists anywhere in the app. Legacy single-range data (either the old
// { days, startTime, endTime } record or the per-day { enabled, startTime,
// endTime } shape) is normalized into this structure on read AND on write.

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

// Map the legacy short day codes (Mon..Sun) to canonical keys.
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

/**
 * Sort, deduplicate and validate a raw slot list into the canonical
 * [{ startTime, endTime }] shape. Invalid/empty/overlapping entries are kept
 * out — validation is enforced by the API layer, this only sanitizes.
 */
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
 * Normalize any stored availability shape into the canonical per-day structure:
 *
 *   { enabled: Boolean, slots: [{ startTime, endTime }] }
 *
 * Supports:
 *  - legacy single-range records:   { days: ['Mon','Tue'], startTime, endTime }
 *  - legacy per-day records:        { monday: { enabled, startTime, endTime } }
 *  - canonical per-day records:     { monday: { enabled, slots: [...] }, ... }
 *  - empty / missing values
 */
export const normalizeAvailability = (raw = null) => {
  const result = emptyAvailability();

  if (!raw || typeof raw !== 'object') return result;

  // Mongoose subdocuments (e.g. provider.availability on a hydrated doc) only
  // expose schema paths via direct property access — legacy fields such as
  // `days` are hidden on the instance but present once serialized. Reading the
  // plain object keeps the legacy shape detectable.
  const source = typeof raw.toObject === 'function' ? raw.toObject() : raw;

  // Legacy single-range shape. MUST be checked first: legacy records that are
  // hydrated by the new nested schema also gain the per-day keys (as empty
  // defaults), so only the legacy fields carry the real working days.
  if (Array.isArray(source.days)) {
    const startTime = source.startTime || '';
    const endTime = source.endTime || '';
    source.days.forEach((short) => {
      const key = LEGACY_SHORT_TO_KEY[short];
      if (key) {
        result[key] = {
          enabled: true,
          slots: normalizeSlots([{ startTime, endTime }]),
        };
      }
    });
    return result;
  }

  const hasPerDayKeys = DAY_KEYS.some((key) => source[key] !== undefined);
  if (hasPerDayKeys) {
    DAY_KEYS.forEach((key) => {
      const day = source[key];
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

/** Enabled day keys for the given (raw or canonical) availability. */
export const getEnabledDays = (availability = null) => {
  const normalized = normalizeAvailability(availability);
  return DAY_KEYS.filter((key) => normalized[key]?.enabled);
};