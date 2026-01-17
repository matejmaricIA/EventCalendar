(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KalendarParser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const defaultDurationMinutes = 120;

  const monthAliases = {
    1: ["sijecanj", "sijecnja", "sij", "january", "jan"],
    2: ["veljaca", "veljace", "velj", "february", "feb"],
    3: ["ozujak", "ozujka", "ozuj", "ozu", "march", "mar"],
    4: ["travanj", "travnja", "tra", "april", "apr"],
    5: ["svibanj", "svibnja", "svi", "may", "maj"],
    6: ["lipanj", "lipnja", "lip", "june", "jun"],
    7: ["srpanj", "srpnja", "srp", "july", "jul"],
    8: ["kolovoz", "kolovoza", "kol", "august", "aug"],
    9: ["rujan", "rujna", "ruj", "september", "sep", "sept"],
    10: ["listopad", "listopada", "lis", "october", "oct", "okt"],
    11: ["studeni", "studenog", "studenoga", "stu", "november", "nov"],
    12: ["prosinac", "prosinca", "pro", "december", "dec"]
  };

  const monthMap = buildMonthMap(monthAliases);
  const monthPattern = Object.keys(monthMap)
    .sort((a, b) => b.length - a.length)
    .join("|");

  const weekdayAliases = {
    0: ["sunday", "sun", "nedjelja", "ned"],
    1: ["monday", "mon", "ponedjeljak", "pon", "poned"],
    2: ["tuesday", "tue", "tues", "utorak", "uto"],
    3: ["wednesday", "wed", "srijeda", "sri"],
    4: ["thursday", "thu", "thur", "thurs", "cetvrtak", "cet", "cetr"],
    5: ["friday", "fri", "petak", "pet"],
    6: ["saturday", "sat", "subota", "sub"]
  };

  const weekdayMap = buildWeekdayMap(weekdayAliases);
  const weekdayPattern = Object.keys(weekdayMap)
    .sort((a, b) => b.length - a.length)
    .join("|");

  const englishMonthTokens = [
    "january", "jan",
    "february", "feb",
    "march", "mar",
    "april", "apr",
    "may",
    "june", "jun",
    "july", "jul",
    "august", "aug",
    "september", "sep", "sept",
    "october", "oct",
    "november", "nov",
    "december", "dec"
  ];

  const englishWeekdayTokens = [
    "monday", "mon",
    "tuesday", "tue", "tues",
    "wednesday", "wed",
    "thursday", "thu", "thur", "thurs",
    "friday", "fri",
    "saturday", "sat",
    "sunday", "sun"
  ];

  const englishMonthRegex = new RegExp(`\\b(${englishMonthTokens.join("|")})\\b`);
  const englishWeekdayRegex = new RegExp(`\\b(${englishWeekdayTokens.join("|")})\\b`);
  const meridiemRegex = /\b(a\.?m\.?|p\.?m\.?)\b/i;

  function parseCroatianDateTime(text, options) {
    if (!text) {
      return null;
    }

    const settings = options || {};
    const durationMinutes = Number.isFinite(settings.durationMinutes)
      ? settings.durationMinutes
      : defaultDurationMinutes;
    const allowMissingTime = Boolean(settings.allowMissingTime);
    const referenceDate = settings.referenceDate instanceof Date
      ? settings.referenceDate
      : new Date();

    const prepared = prepareText(text);
    const cleaned = prepared.cleaned;
    const normalized = prepared.normalized;
    const englishHint = hasEnglishHint(normalized, cleaned);
    const dateParts = parseDateParts(cleaned, normalized, referenceDate, englishHint);
    if (!dateParts) {
      return null;
    }

    const day = dateParts.day;
    const month = dateParts.month;
    const yearFromText = dateParts.year;

    const timeParts = parseTimeParts(cleaned, dateParts.range || null);
    if (!timeParts) {
      if (!allowMissingTime || dateParts.isRelative) {
        return null;
      }
      if (!isValidDate(day, month)) {
        return null;
      }
      const year = yearFromText || referenceDate.getFullYear();
      const dateOnly = new Date(year, month - 1, day);
      if (!isValidDateTime(dateOnly, day, month)) {
        return null;
      }

      return {
        start: dateOnly,
        end: null,
        endOffsetDays: 0,
        dateInput: formatDateInput(dateOnly),
        startTimeInput: "",
        endTimeInput: "",
        timeMissing: true
      };
    }

    const hour = timeParts.startHour;
    const minute = timeParts.startMinute;

    if (!isValidTime(hour, minute) || !isValidDate(day, month)) {
      return null;
    }

    let year = yearFromText || referenceDate.getFullYear();
    if (dateParts.isRelative) {
      year = yearFromText;
    }

    let start = new Date(year, month - 1, day, hour, minute);

    if (dateParts.isRelative && dateParts.relativeKind === "weekday" && start < referenceDate && dateParts.qualifier !== "next") {
      start = addDays(start, 7);
    }

    if (!dateParts.isRelative && !isValidDateTime(start, day, month)) {
      return null;
    }

    let end;
    let endOffsetDays = 0;

    if (timeParts.hasRange && timeParts.endHour !== null) {
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), timeParts.endHour, timeParts.endMinute);
      if (end <= start) {
        endOffsetDays = 1;
        end = addDays(end, 1);
      }
    } else {
      end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    }

    return {
      start,
      end,
      endOffsetDays,
      dateInput: formatDateInput(start),
      startTimeInput: formatTimeInput(start),
      endTimeInput: formatTimeInput(end)
    };
  }

  function parseDateParts(cleaned, normalized, referenceDate, englishHint) {
    const isoMatch = execMatch(/(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/, cleaned);
    if (isoMatch) {
      return {
        year: toInt(isoMatch.match[1]),
        month: toInt(isoMatch.match[2]),
        day: toInt(isoMatch.match[3]),
        range: isoMatch.range,
        isRelative: false
      };
    }

    const numericWithYear = execMatch(/(\d{1,2})\s*([./-])\s*(\d{1,2})\s*[./-]\s*(\d{4})/, cleaned);
    if (numericWithYear) {
      const first = toInt(numericWithYear.match[1]);
      const separator = numericWithYear.match[2];
      const second = toInt(numericWithYear.match[3]);
      const year = toInt(numericWithYear.match[4]);
      const resolved = resolveNumericOrder(first, second, separator, englishHint);
      if (resolved) {
        return {
          year,
          month: resolved.month,
          day: resolved.day,
          range: numericWithYear.range,
          isRelative: false
        };
      }
    }

    const monthNameMatch = matchMonthName(normalized);
    if (monthNameMatch) {
      return monthNameMatch;
    }

    const numericNoYear = execMatch(/(\d{1,2})\s*([./-])\s*(\d{1,2})\s*\.?/, cleaned);
    if (numericNoYear) {
      const first = toInt(numericNoYear.match[1]);
      const separator = numericNoYear.match[2];
      const second = toInt(numericNoYear.match[3]);
      const resolved = resolveNumericOrder(first, second, separator, englishHint);
      if (resolved) {
        return {
          year: null,
          month: resolved.month,
          day: resolved.day,
          range: numericNoYear.range,
          isRelative: false
        };
      }
    }

    const relative = parseRelativeDate(normalized, referenceDate);
    if (relative) {
      return relative;
    }

    return null;
  }

  function inferDurationMinutes(text) {
    if (!text) {
      return null;
    }

    const prepared = prepareText(text);
    const normalized = prepared.normalized;
    const candidates = [];

    collectDurationMatches(
      /\b(\d{1,2})\s*(?:h|hour|hours|hrs|sat|sata|sati)\b(?:\s*(?:i|and))?\s*(\d{1,2})\s*(?:m|min|mins|minute|minutes|minuta)\b/gi,
      normalized,
      (match) => toInt(match[1]) * 60 + toInt(match[2]),
      candidates,
      3
    );

    collectDurationMatches(
      /\b(\d{1,2})\s*h\s*(\d{1,2})\s*(?:m|min|mins|minute|minutes|minuta)\b/gi,
      normalized,
      (match) => toInt(match[1]) * 60 + toInt(match[2]),
      candidates,
      3
    );

    collectDurationMatches(
      /\b(\d{1,3})\s*(?:min|mins|minute|minutes|minuta)\b/gi,
      normalized,
      (match) => toInt(match[1]),
      candidates,
      2
    );

    collectDurationMatches(
      /\b(\d{1,3})\s*(?:'|\u2032|\u2019|\u00b4)(?:\b|$)/g,
      text,
      (match) => toInt(match[1]),
      candidates,
      2
    );

    const best = pickDurationCandidate(candidates);
    return best ? best.minutes : null;
  }

  function matchMonthName(normalized) {
    if (!normalized || !monthPattern) {
      return null;
    }

    const forwardRegex = new RegExp(`\\b(\\d{1,2})(?:\\s*(?:st|nd|rd|th))?\\b\\s*(${monthPattern})\\b(?:\\s*(\\d{4}))?`);
    const forwardMatch = normalized.match(forwardRegex);
    if (forwardMatch) {
      return {
        year: forwardMatch[3] ? toInt(forwardMatch[3]) : null,
        month: monthMap[forwardMatch[2]],
        day: toInt(forwardMatch[1]),
        range: null,
        isRelative: false
      };
    }

    const reverseRegex = new RegExp(`\\b(${monthPattern})\\b\\s*(\\d{1,2})(?:\\s*(?:st|nd|rd|th))?\\b(?:\\s*(\\d{4}))?`);
    const reverseMatch = normalized.match(reverseRegex);
    if (reverseMatch) {
      return {
        year: reverseMatch[3] ? toInt(reverseMatch[3]) : null,
        month: monthMap[reverseMatch[1]],
        day: toInt(reverseMatch[2]),
        range: null,
        isRelative: false
      };
    }

    return null;
  }

  function collectDurationMatches(regex, text, toMinutes, candidates, weight) {
    let match;
    while ((match = regex.exec(text))) {
      const minutes = toMinutes(match);
      if (!isReasonableDuration(minutes)) {
        continue;
      }
      candidates.push({
        minutes,
        index: match.index,
        weight
      });
    }
  }

  function pickDurationCandidate(candidates) {
    if (!candidates.length) {
      return null;
    }

    const sorted = [...candidates].sort((a, b) => {
      if (a.weight !== b.weight) {
        return b.weight - a.weight;
      }
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return b.minutes - a.minutes;
    });

    return sorted[0];
  }

  function parseRelativeDate(normalized, referenceDate) {
    if (hasAnyWord(normalized, ["today", "tonight", "danas", "veceras"])) {
      return buildRelativeDate(referenceDate, "today", null);
    }

    if (hasAnyWord(normalized, ["tomorrow", "sutra"])) {
      return buildRelativeDate(addDays(referenceDate, 1), "tomorrow", null);
    }

    const weekdayMatch = findWeekdayMatch(normalized);
    if (!weekdayMatch) {
      return null;
    }

    const qualifier = detectWeekdayQualifier(normalized, weekdayMatch.index);
    const currentWeekday = referenceDate.getDay();
    let daysUntil = (weekdayMatch.weekday - currentWeekday + 7) % 7;

    if (qualifier === "next") {
      daysUntil = daysUntil === 0 ? 7 : daysUntil + 7;
    }

    const targetDate = addDays(referenceDate, daysUntil);
    return buildRelativeDate(targetDate, "weekday", qualifier);
  }

  function buildRelativeDate(date, relativeKind, qualifier) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      range: null,
      isRelative: true,
      relativeKind,
      qualifier: qualifier || null
    };
  }

  function findWeekdayMatch(normalized) {
    if (!normalized || !weekdayPattern) {
      return null;
    }

    const regex = new RegExp(`\\b(${weekdayPattern})\\b`, "g");
    let match;

    while ((match = regex.exec(normalized))) {
      const token = match[1];
      const index = match.index;
      if (isAmbiguousWeekdayToken(token) && isPrecededByDigit(normalized, index)) {
        continue;
      }
      return { weekday: weekdayMap[token], index, token };
    }

    return null;
  }

  function isAmbiguousWeekdayToken(token) {
    return token === "sat" || token === "sun";
  }

  function isPrecededByDigit(text, index) {
    for (let i = index - 1; i >= 0; i -= 1) {
      const char = text[i];
      if (char === " ") {
        continue;
      }
      return /\d/.test(char);
    }
    return false;
  }

  function detectWeekdayQualifier(normalized, index) {
    const start = Math.max(0, index - 30);
    const prefix = normalized.slice(start, index);

    if (/\b(next|sljedec\w*|iduc\w*)\b/.test(prefix)) {
      return "next";
    }

    if (/\b(this|ovaj|ova|ovo)\b/.test(prefix)) {
      return "this";
    }

    return null;
  }

  function resolveNumericOrder(first, second, separator, englishHint) {
    if (first > 12 && second <= 12) {
      return { day: first, month: second };
    }
    if (second > 12 && first <= 12) {
      return { day: second, month: first };
    }
    if (first > 12 && second > 12) {
      return null;
    }

    if (separator === ".") {
      return { day: first, month: second };
    }

    if ((separator === "/" || separator === "-") && englishHint) {
      return { day: second, month: first };
    }

    return { day: first, month: second };
  }

  function parseTimeParts(cleaned, dateRange) {
    const rangeCandidates = [];
    const rangeRegex = /\b(\d{1,2})(?:\s*(?::|\.|h)\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:h|sati|sat)?\s*(?:-|\u2013|\u2014|to|do)\s*(\d{1,2})(?:\s*(?::|\.|h)\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:h|sati|sat)?\b/gi;

    collectTimeRangeMatches(rangeRegex, cleaned, rangeCandidates);

    const rangeChoice = pickCandidate(rangeCandidates, dateRange);
    if (rangeChoice) {
      return {
        startHour: rangeChoice.startHour,
        startMinute: rangeChoice.startMinute,
        endHour: rangeChoice.endHour,
        endMinute: rangeChoice.endMinute,
        hasRange: true
      };
    }

    const candidates = [];
    const seen = new Set();

    collectTimeMatches(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\b/gi, cleaned,
      (match) => buildTimeCandidate(match, 1, 2, 3), candidates, seen);

    collectTimeMatches(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/gi, cleaned,
      (match) => buildTimeCandidate(match, 1, null, 2), candidates, seen);

    collectTimeMatches(/\b(\d{1,2})\s*h\s*(\d{2})\b/gi, cleaned,
      (match) => buildTimeCandidate(match, 1, 2, null), candidates, seen);

    collectTimeMatches(/\b(\d{1,2})\s*(?:h|sati|sat)\b/gi, cleaned,
      (match) => buildTimeCandidate(match, 1, null, null), candidates, seen);

    collectTimeMatches(/\b(?:u|od|oko|at)\s*(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi, cleaned,
      (match) => buildTimeCandidate(match, 1, 2, 3), candidates, seen);

    const keywordCandidate = findKeywordTime(cleaned);
    if (keywordCandidate) {
      candidates.push(keywordCandidate);
    }

    const choice = pickCandidate(candidates, dateRange);
    if (!choice) {
      return null;
    }

    return {
      startHour: choice.hour,
      startMinute: choice.minute,
      endHour: null,
      endMinute: null,
      hasRange: false
    };
  }

  function collectTimeRangeMatches(regex, cleaned, candidates) {
    let match;
    while ((match = regex.exec(cleaned))) {
      const startHour = toInt(match[1]);
      const startMinute = match[2] ? toInt(match[2]) : 0;
      const startMeridiem = normalizeMeridiem(match[3]);
      const endHour = toInt(match[4]);
      const endMinute = match[5] ? toInt(match[5]) : 0;
      const endMeridiem = normalizeMeridiem(match[6]);
      const resolved = resolveMeridiem(startMeridiem, endMeridiem);

      const startHour24 = to24Hour(startHour, resolved.startMeridiem);
      const endHour24 = to24Hour(endHour, resolved.endMeridiem);

      if (!isValidTime(startHour24, startMinute) || !isValidTime(endHour24, endMinute)) {
        continue;
      }

      const index = match.index + match[0].indexOf(match[1]);
      const precision = (match[2] || match[5]) ? 2 : 1;

      candidates.push({
        startHour: startHour24,
        startMinute,
        endHour: endHour24,
        endMinute,
        index,
        precision
      });
    }
  }

  function collectTimeMatches(regex, cleaned, toTime, candidates, seen) {
    let match;
    while ((match = regex.exec(cleaned))) {
      const time = toTime(match);
      if (!time) {
        continue;
      }

      if (!isValidTime(time.hour, time.minute)) {
        continue;
      }

      const index = match.index + match[0].indexOf(match[time.hourIndex]);
      const key = `${index}-${time.hour}-${time.minute}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      candidates.push({
        hour: time.hour,
        minute: time.minute,
        index,
        precision: time.precision
      });
    }
  }

  function buildTimeCandidate(match, hourIndex, minuteIndex, meridiemIndex) {
    const hour = toInt(match[hourIndex]);
    const minute = minuteIndex && match[minuteIndex] ? toInt(match[minuteIndex]) : 0;
    const meridiem = meridiemIndex ? normalizeMeridiem(match[meridiemIndex]) : null;
    const hour24 = to24Hour(hour, meridiem);

    return {
      hour: hour24,
      minute,
      precision: minuteIndex && match[minuteIndex] ? 2 : 1,
      hourIndex
    };
  }

  function findKeywordTime(cleaned) {
    const lower = cleaned.toLowerCase();
    const noonIndex = lower.indexOf("noon");
    if (noonIndex !== -1) {
      return { hour: 12, minute: 0, index: noonIndex, precision: 1 };
    }

    const midnightIndex = lower.indexOf("midnight");
    if (midnightIndex !== -1) {
      return { hour: 0, minute: 0, index: midnightIndex, precision: 1 };
    }

    const podneIndex = lower.indexOf("podne");
    if (podneIndex !== -1) {
      return { hour: 12, minute: 0, index: podneIndex, precision: 1 };
    }

    const ponocIndex = lower.indexOf("ponoc");
    if (ponocIndex !== -1) {
      return { hour: 0, minute: 0, index: ponocIndex, precision: 1 };
    }

    return null;
  }

  function pickCandidate(candidates, dateRange) {
    if (!candidates.length) {
      return null;
    }

    const sorted = [...candidates].sort((a, b) => {
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return (b.precision || 0) - (a.precision || 0);
    });

    if (!dateRange) {
      return sorted[0];
    }

    const after = sorted.find((candidate) => candidate.index >= dateRange.end);
    if (after) {
      return after;
    }

    const outside = sorted.find((candidate) => candidate.index < dateRange.start || candidate.index > dateRange.end);
    if (outside) {
      return outside;
    }

    return null;
  }

  function resolveMeridiem(startMeridiem, endMeridiem) {
    let resolvedStart = startMeridiem || null;
    let resolvedEnd = endMeridiem || null;

    if (!resolvedStart && resolvedEnd) {
      resolvedStart = resolvedEnd;
    }

    if (!resolvedEnd && resolvedStart) {
      resolvedEnd = resolvedStart;
    }

    return { startMeridiem: resolvedStart, endMeridiem: resolvedEnd };
  }

  function normalizeMeridiem(value) {
    if (!value) {
      return null;
    }
    const cleaned = value.toLowerCase().replace(/\./g, "");
    return cleaned.startsWith("a") ? "am" : "pm";
  }

  function to24Hour(hour, meridiem) {
    if (!meridiem) {
      return hour;
    }

    if (hour === 12) {
      return meridiem === "am" ? 0 : 12;
    }

    return meridiem === "pm" ? hour + 12 : hour;
  }

  function execMatch(regex, text) {
    const match = regex.exec(text);
    if (!match) {
      return null;
    }

    return {
      match,
      range: {
        start: match.index,
        end: match.index + match[0].length
      }
    };
  }

  function buildMonthMap(aliases) {
    const map = {};
    Object.keys(aliases).forEach((monthKey) => {
      const monthNumber = Number.parseInt(monthKey, 10);
      aliases[monthKey].forEach((name) => {
        map[name] = monthNumber;
      });
    });
    return map;
  }

  function buildWeekdayMap(aliases) {
    const map = {};
    Object.keys(aliases).forEach((weekdayKey) => {
      const weekdayNumber = Number.parseInt(weekdayKey, 10);
      aliases[weekdayKey].forEach((name) => {
        map[name] = weekdayNumber;
      });
    });
    return map;
  }

  function prepareText(text) {
    const spaced = insertLetterDigitBoundaries(text);
    return {
      cleaned: cleanText(spaced),
      normalized: normalizeText(spaced)
    };
  }

  function insertLetterDigitBoundaries(text) {
    return text
      .replace(/(\p{L})(\d)/gu, "$1 $2")
      .replace(/(\d)(\p{L})/gu, "$1 $2");
  }

  function normalizeText(text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function hasEnglishHint(normalized, cleaned) {
    if (meridiemRegex.test(cleaned)) {
      return true;
    }
    if (englishMonthRegex.test(normalized)) {
      return true;
    }
    if (englishWeekdayRegex.test(normalized)) {
      return true;
    }
    return false;
  }

  function hasAnyWord(normalized, words) {
    return words.some((word) => hasWord(normalized, word));
  }

  function hasWord(normalized, word) {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(normalized);
  }

  function addDays(date, days) {
    const copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function isReasonableDuration(minutes) {
    return Number.isFinite(minutes) && minutes >= 1 && minutes <= 600;
  }

  function isValidDate(day, month) {
    return day >= 1 && day <= 31 && month >= 1 && month <= 12;
  }

  function isValidTime(hour, minute) {
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  function isValidDateTime(date, day, month) {
    return date.getDate() === day && date.getMonth() === month - 1;
  }

  function formatDateInput(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function formatTimeInput(date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function toInt(value) {
    return Number.parseInt(value, 10);
  }

  return {
    parseCroatianDateTime,
    inferDurationMinutes
  };
});
