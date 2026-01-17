const sessionStorage = chrome.storage.session || chrome.storage.local;
const settingsStorage = chrome.storage.local;
const defaultDurationMinutes = 120;
const defaultReminderMinutes = 30;
const DEFAULT_LANGUAGE = "hr";

const translations = {
  hr: {
    appName: "Podsjeti.Me",
    heroTitle: "Dodaj doga\u0111aj",
    heroSubtitle: "Od odabira do Google Kalendara u jednom koraku.",
    heroBadge: "Brzi planer",
    languageLabel: "Jezik",
    sectionSelection: "Odabir",
    selectionStatusWaiting: "\u010Ceka odabir",
    selectionStatusCaptured: "Snimljeno",
    selectionPlaceholder: "Ozna\u010Di datum/vrijeme na stranici i klikni desni klik.",
    eventDetailsTitle: "Detalji doga\u0111aja",
    eventDetailsHint: "Promijeni prije spremanja.",
    fieldTitle: "Naslov",
    fieldDate: "Datum",
    fieldStart: "Po\u010Detak",
    fieldEnd: "Kraj",
    fieldVenue: "Lokacija",
    fieldReminders: "Podsjetnici",
    reminderMinutes: "Minute prije",
    reminderHours: "Sati prije",
    reminderDays: "Dani prije",
    reminderNotification: "Obavijest",
    reminderEmail: "Email",
    reminderRemove: "Ukloni",
    reminderAdd: "+ Dodaj podsjetnik",
    reminderHint: "Dodaj jedan ili vi\u0161e podsjetnika. 0 koristi zadane postavke kalendara.",
    fieldNotes: "Bilje\u0161ke",
    fieldCalendar: "ID kalendara",
    calendarHint: "Ostavi \"primary\" ili zalijepi drugi ID kalendara.",
    actionsSubmit: "Dodaj u Google Kalendar",
    actionsClear: "O\u010Disti",
    statusPanelTitle: "Status",
    statusReadyTitle: "Spremno",
    statusNeedsAttentionTitle: "Treba provjeru",
    statusAllSetTitle: "Gotovo",
    statusMessageNoSelection: "Nema odabira.",
    statusMessageParserUnavailable: "Parser nije dostupan. Ponovno u\u010Ditaj ekstenziju.",
    statusMessageParseFailed: "Ne mogu pro\u010Ditati datum i vrijeme iz odabira.",
    statusMessageTimeMissing: "Datum prepoznat. Dodaj vrijeme.",
    statusMessageReady: "Spremno za sinkronizaciju.",
    statusMessageRangeOverMidnight: "Vrijeme zavr\u0161ava nakon pono\u0107i. Provjeri kraj.",
    statusMessageCleared: "O\u010Di\u0161\u0107eno.",
    statusMessageInvalidDateTime: "Unesi valjan datum i vrijeme.",
    statusMessageEndBeforeStart: "Kraj mora biti nakon po\u010Detka.",
    statusMessageConnecting: "Povezujem se s Google Kalendarom...",
    statusMessageAdded: "Dodan doga\u0111aj u Google Kalendar.",
    statusMessageFallbackOpened: "Otvorio sam Google Kalendar u novoj kartici. Provjeri podsjetnike i spremi.",
    statusMessageAuthExpired: "Google autorizacija je istekla. Poku\u0161aj ponovo.",
    statusMessageTokenError: "Nije mogu\u0107e dohvatiti token.",
    statusMessageApiError: "Gre\u0161ka Calendar API-ja.",
    sourceLabel: "Izvor",
    sourcePlaceholder: "Nema izvora.",
    openInCalendar: "Otvori u Google Kalendaru",
    descriptionSourceLabel: "Izvor",
    descriptionSelectedLabel: "Odabrano",
    defaultEventTitle: "Novi doga\u0111aj"
  },
  en: {
    appName: "Podsjeti.Me",
    heroTitle: "Add an event",
    heroSubtitle: "From selection to Google Calendar in one step.",
    heroBadge: "Quick planner",
    languageLabel: "Language",
    sectionSelection: "Selection",
    selectionStatusWaiting: "Waiting for selection",
    selectionStatusCaptured: "Captured",
    selectionPlaceholder: "Select a date/time on a page and right click.",
    eventDetailsTitle: "Event details",
    eventDetailsHint: "Edit anything before syncing.",
    fieldTitle: "Title",
    fieldDate: "Date",
    fieldStart: "Start",
    fieldEnd: "End",
    fieldVenue: "Venue",
    fieldReminders: "Reminders",
    reminderMinutes: "Minutes before",
    reminderHours: "Hours before",
    reminderDays: "Days before",
    reminderNotification: "Notification",
    reminderEmail: "Email",
    reminderRemove: "Remove",
    reminderAdd: "+ Add reminder",
    reminderHint: "Add one or more reminders. Leave empty or 0 to keep calendar defaults.",
    fieldNotes: "Notes",
    fieldCalendar: "Calendar ID",
    calendarHint: "Keep \"primary\" or paste another calendar ID.",
    actionsSubmit: "Add to Google Calendar",
    actionsClear: "Clear",
    statusPanelTitle: "Status",
    statusReadyTitle: "Ready",
    statusNeedsAttentionTitle: "Needs attention",
    statusAllSetTitle: "All set",
    statusMessageNoSelection: "No selection captured yet.",
    statusMessageParserUnavailable: "Parser unavailable. Reload the extension.",
    statusMessageParseFailed: "Could not parse a date and time from the selection.",
    statusMessageTimeMissing: "Date found. Add a time.",
    statusMessageReady: "Ready to sync.",
    statusMessageRangeOverMidnight: "Parsed a time range that ends after midnight. Review the end time if needed.",
    statusMessageCleared: "Cleared.",
    statusMessageInvalidDateTime: "Please provide a valid date and time.",
    statusMessageEndBeforeStart: "End time must be after the start time.",
    statusMessageConnecting: "Connecting to Google Calendar...",
    statusMessageAdded: "Event added to Google Calendar.",
    statusMessageFallbackOpened: "Opened Google Calendar in a new tab. Review reminders and save there.",
    statusMessageAuthExpired: "Google authorization expired. Please try again.",
    statusMessageTokenError: "Unable to get auth token.",
    statusMessageApiError: "Calendar API error.",
    sourceLabel: "Source",
    sourcePlaceholder: "No source captured yet.",
    openInCalendar: "Open in Google Calendar",
    descriptionSourceLabel: "Source",
    descriptionSelectedLabel: "Selected",
    defaultEventTitle: "New event"
  }
};

const knownVenues = [
  {
    name: "Kino Tu\u0161kanac",
    aliases: ["tuskanac", "kino tuskanac", "tuskanac kino", "tuskanac zagreb"],
    location: "Kino Tu\u0161kanac, Tu\u0161kanac 1, Zagreb"
  },
  {
    name: "Kinoteka",
    aliases: ["kinoteka", "kino kinoteka"],
    location: "Kinoteka, Kordunska ul. 1, Zagreb"
  }
];

const form = document.getElementById("event-form");
const selectionTextEl = document.getElementById("selection-text");
const selectionStatusEl = document.getElementById("selection-status");
const statusEl = document.getElementById("status");
const statusTitleEl = document.getElementById("status-title");
const sourceLinkEl = document.getElementById("source-link");
const clearButton = document.getElementById("clear-form");
const languageSelect = document.getElementById("language");

const inputs = {
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  startTime: document.getElementById("start-time"),
  endTime: document.getElementById("end-time"),
  location: document.getElementById("location"),
  description: document.getElementById("description"),
  calendar: document.getElementById("calendar")
};

const remindersContainer = document.getElementById("reminders");
const addReminderButton = document.getElementById("add-reminder");
const reminderTemplateNode = remindersContainer ? remindersContainer.querySelector("[data-reminder-row]") : null;
const reminderTemplate = reminderTemplateNode ? reminderTemplateNode.cloneNode(true) : null;
if (reminderTemplateNode) {
  reminderTemplateNode.remove();
}

let lastContext = null;
let endOffsetDays = 0;
let currentLanguage = DEFAULT_LANGUAGE;
let selectionState = { statusKey: null, text: "", textIsKey: false };
let statusState = { messageKey: null, messageText: "", tone: "neutral", eventLink: null };

init();

function init() {
  resetReminders();
  loadLanguage().then((language) => {
    setLanguage(language);
  });

  getStoredContext().then((context) => {
    lastContext = context;
    if (!context || !context.selectionText) {
      setSelectionState("selectionStatusWaiting", "selectionPlaceholder", true);
      updateStatus("statusMessageNoSelection", "neutral", null, true);
      return;
    }

    setSelectionState("selectionStatusCaptured", context.selectionText, false);
    setSourceLink(context);
    hydrateForm(context);
  });

  form.addEventListener("submit", handleSubmit);
  clearButton.addEventListener("click", clearForm);
  if (addReminderButton) {
    addReminderButton.addEventListener("click", () => {
      addReminderRow({ value: "", unit: "minutes", method: "popup" });
    });
  }

  [inputs.date, inputs.startTime, inputs.endTime].forEach((input) => {
    input.addEventListener("input", () => {
      endOffsetDays = 0;
    });
  });

  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      const nextLanguage = languageSelect.value;
      setLanguage(nextLanguage);
      settingsStorage.set({ language: nextLanguage });
    });
  }
}

function t(key) {
  const table = translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  return table[key] || key;
}

function applyTranslations(root = document) {
  const elements = root.querySelectorAll("[data-i18n]");
  elements.forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });
}

function loadLanguage() {
  return new Promise((resolve) => {
    settingsStorage.get(["language"], (result) => {
      resolve(result.language || DEFAULT_LANGUAGE);
    });
  });
}

function setLanguage(language) {
  currentLanguage = translations[language] ? language : DEFAULT_LANGUAGE;
  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
  document.documentElement.lang = currentLanguage;
  document.title = t("appName");
  applyTranslations();
  renderSelectionState();
  renderStatus();
  setSourceLink(lastContext || {});
  updateReminderRowTranslations();
}

function setSelectionState(statusKey, selectionText, textIsKey) {
  selectionState = {
    statusKey,
    text: selectionText,
    textIsKey: Boolean(textIsKey)
  };
  renderSelectionState();
}

function renderSelectionState() {
  if (!selectionState.statusKey) {
    return;
  }
  selectionStatusEl.textContent = t(selectionState.statusKey);
  selectionTextEl.textContent = selectionState.textIsKey
    ? t(selectionState.text)
    : selectionState.text;
}

function setSourceLink(context) {
  if (!context || !context.url) {
    sourceLinkEl.textContent = t("sourcePlaceholder");
    sourceLinkEl.href = "#";
    return;
  }

  sourceLinkEl.href = context.url;
  sourceLinkEl.textContent = context.pageTitle
    ? `${context.pageTitle} (${shortenUrl(context.url)})`
    : shortenUrl(context.url);
}

function shortenUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch (error) {
    return url;
  }
}

function resetReminders() {
  clearReminders();
  addReminderRow({ value: defaultReminderMinutes, unit: "minutes", method: "popup" });
}

function clearReminders() {
  if (!remindersContainer) {
    return;
  }
  remindersContainer.textContent = "";
}

function addReminderRow({ value, unit, method }) {
  if (!remindersContainer) {
    return;
  }

  const row = buildReminderRow({ value, unit, method });
  remindersContainer.appendChild(row);
  syncReminderRemoveButtons();
}

function buildReminderRow({ value, unit, method }) {
  const row = reminderTemplate ? reminderTemplate.cloneNode(true) : document.createElement("div");
  if (!reminderTemplate) {
    row.className = "reminder-row";
    row.setAttribute("data-reminder-row", "");
    row.innerHTML = [
      '<input class="reminder-value" type="number" min="0" step="1" />',
      '<select class="reminder-unit">',
      '<option value="minutes" data-i18n="reminderMinutes">Minutes before</option>',
      '<option value="hours" data-i18n="reminderHours">Hours before</option>',
      '<option value="days" data-i18n="reminderDays">Days before</option>',
      '</select>',
      '<select class="reminder-method">',
      '<option value="popup" data-i18n="reminderNotification">Notification</option>',
      '<option value="email" data-i18n="reminderEmail">Email</option>',
      '</select>',
      '<button class="ghost reminder-remove" type="button" data-i18n="reminderRemove">Remove</button>'
    ].join("");
  }

  const valueInput = row.querySelector(".reminder-value");
  const unitSelect = row.querySelector(".reminder-unit");
  const methodSelect = row.querySelector(".reminder-method");
  const removeButton = row.querySelector(".reminder-remove");

  if (valueInput) {
    valueInput.value = value === 0 ? "0" : value ? String(value) : "";
  }
  if (unitSelect) {
    unitSelect.value = unit || "minutes";
  }
  if (methodSelect) {
    methodSelect.value = method || "popup";
  }

  if (removeButton) {
    removeButton.addEventListener("click", () => {
      row.remove();
      syncReminderRemoveButtons();
    });
  }

  applyTranslations(row);
  return row;
}

function updateReminderRowTranslations() {
  if (!remindersContainer) {
    return;
  }
  remindersContainer.querySelectorAll("[data-reminder-row]").forEach((row) => {
    applyTranslations(row);
  });
}

function syncReminderRemoveButtons() {
  const rows = getReminderRows();
  const disableRemove = rows.length <= 1;
  rows.forEach((row) => {
    const removeButton = row.querySelector(".reminder-remove");
    if (removeButton) {
      removeButton.disabled = disableRemove;
    }
  });
}

function getReminderRows() {
  if (!remindersContainer) {
    return [];
  }
  return Array.from(remindersContainer.querySelectorAll("[data-reminder-row]"));
}

function hydrateForm(context) {
  inputs.title.value = guessTitle(context);
  inputs.location.value = guessVenue(context);
  inputs.description.value = buildDescription(context);
  resetReminders();

  const parser = window.KalendarParser;
  if (!parser || typeof parser.parseCroatianDateTime !== "function") {
    updateStatus("statusMessageParserUnavailable", "error", null, true);
    return;
  }

  const durationSource = [context.selectionText, context.durationHint]
    .filter(Boolean)
    .join(" ");
  const inferredDuration = parser.inferDurationMinutes
    ? parser.inferDurationMinutes(durationSource)
    : null;
  const durationMinutes = Number.isFinite(inferredDuration) && inferredDuration > 0
    ? inferredDuration
    : defaultDurationMinutes;

  const parsed = parser.parseCroatianDateTime(context.selectionText, {
    durationMinutes,
    allowMissingTime: true
  });
  if (!parsed) {
    updateStatus("statusMessageParseFailed", "error", null, true);
    return;
  }

  inputs.date.value = parsed.dateInput;
  if (parsed.timeMissing) {
    inputs.startTime.value = "";
    inputs.endTime.value = "";
    endOffsetDays = 0;
    updateStatus("statusMessageTimeMissing", "error", null, true);
    return;
  }
  inputs.startTime.value = parsed.startTimeInput;
  inputs.endTime.value = parsed.endTimeInput;
  endOffsetDays = parsed.endOffsetDays || 0;

  if (endOffsetDays > 0) {
    updateStatus("statusMessageRangeOverMidnight", "neutral", null, true);
  } else {
    updateStatus("statusMessageReady", "neutral", null, true);
  }
}

function guessTitle(context) {
  const heading = cleanText(context.headingText || "");
  const pageTitle = cleanText(context.pageTitle || "");

  if (heading && heading.length <= 120) {
    return heading;
  }

  if (pageTitle) {
    return stripSiteName(pageTitle);
  }

  return t("defaultEventTitle");
}

function stripSiteName(title) {
  const separators = [" | ", " - ", " :: ", " \u2013 ", " \u2014 "];
  for (const sep of separators) {
    if (title.includes(sep)) {
      return title.split(sep)[0].trim();
    }
  }

  return title;
}

function guessVenue(context) {
  const haystack = normalizeText([
    context.selectionText,
    context.headingText,
    context.pageTitle,
    context.hostname,
    context.url
  ].filter(Boolean).join(" "));

  for (const venue of knownVenues) {
    for (const alias of venue.aliases) {
      if (haystack.includes(alias)) {
        return venue.location;
      }
    }
  }

  return "";
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

function buildDescription(context) {
  const lines = [];
  if (context.pageTitle) {
    lines.push(`${t("descriptionSourceLabel")}: ${context.pageTitle}`);
  }
  if (context.url) {
    lines.push(context.url);
  }
  if (context.selectionText) {
    lines.push(`${t("descriptionSelectedLabel")}: ${context.selectionText}`);
  }
  return lines.join("\n");
}

function isValidTime(hour, minute) {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isValidDateTime(date, day, month) {
  return date.getDate() === day && date.getMonth() === month - 1;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clearForm() {
  form.reset();
  endOffsetDays = 0;
  resetReminders();
  updateStatus("statusMessageCleared", "neutral", null, true);
}

function handleSubmit(event) {
  event.preventDefault();

  const start = parseDateTimeInput(inputs.date.value, inputs.startTime.value);
  const end = parseDateTimeInput(inputs.date.value, inputs.endTime.value);

  if (!start || !end) {
    updateStatus("statusMessageInvalidDateTime", "error", null, true);
    return;
  }

  const adjustedEnd = endOffsetDays > 0 ? addDays(end, endOffsetDays) : end;

  if (adjustedEnd <= start) {
    updateStatus("statusMessageEndBeforeStart", "error", null, true);
    return;
  }

  const reminders = buildReminders();

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarId = inputs.calendar.value.trim() || "primary";

  const eventPayload = {
    summary: inputs.title.value.trim() || t("defaultEventTitle"),
    location: inputs.location.value.trim() || undefined,
    description: inputs.description.value.trim() || undefined,
    start: {
      dateTime: toLocalISOString(start),
      timeZone
    },
    end: {
      dateTime: toLocalISOString(adjustedEnd),
      timeZone
    },
    reminders,
    source: lastContext && lastContext.url ? {
      title: lastContext.pageTitle || t("sourceLabel"),
      url: lastContext.url
    } : undefined
  };

  updateStatus("statusMessageConnecting", "neutral", null, true);
  createCalendarEvent(calendarId, eventPayload, { start, end: adjustedEnd })
    .then((result) => {
      if (result && result.mode === "fallback") {
        updateStatus("statusMessageFallbackOpened", "neutral", result.link, true);
        return;
      }
      updateStatus("statusMessageAdded", "success", result ? result.link : null, true);
      try {
        sessionStorage.remove(["lastContext"], () => {});
        lastContext = null;
      } catch (error) {}
      setTimeout(() => {
        try {
          window.close();
        } catch (error) {}
      }, 250);
    })
    .catch((error) => {
      updateStatus(error.message || t("statusMessageApiError"), "error");
    });
}

function buildReminders() {
  const overrides = [];
  const rows = getReminderRows();

  rows.forEach((row) => {
    const valueInput = row.querySelector(".reminder-value");
    const unitSelect = row.querySelector(".reminder-unit");
    const methodSelect = row.querySelector(".reminder-method");

    const value = valueInput ? Number.parseInt(valueInput.value, 10) : Number.NaN;
    const unit = unitSelect ? unitSelect.value : "minutes";
    const method = methodSelect ? methodSelect.value : "popup";
    const minutes = toReminderMinutes(value, unit);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return;
    }

    overrides.push({ method, minutes });
  });

  if (!overrides.length) {
    return { useDefault: true };
  }

  return { useDefault: false, overrides };
}

function parseDateTimeInput(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (!isValidTime(hour, minute)) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute);
  if (!isValidDateTime(date, day, month)) {
    return null;
  }

  return date;
}

function toReminderMinutes(value, unit) {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  if (value <= 0) {
    return 0;
  }

  const multiplier = unit === "days" ? 1440 : unit === "hours" ? 60 : 1;
  return value * multiplier;
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toLocalISOString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function createCalendarEvent(calendarId, eventPayload, timeRange) {
  if (!canUseIdentity()) {
    const link = openCalendarFallback(calendarId, eventPayload, timeRange);
    return Promise.resolve({ mode: "fallback", link });
  }

  return getAuthToken(true)
    .then((token) => postEvent(calendarId, eventPayload, token))
    .catch((error) => {
      if (error && error.code === 401) {
        return removeCachedToken(error.token).then(() => Promise.reject(error));
      }
      return Promise.reject(error);
    })
    .then((eventLink) => ({ mode: "api", link: eventLink }))
    .catch((error) => {
      if (isIdentityUnsupportedError(error)) {
        const link = openCalendarFallback(calendarId, eventPayload, timeRange);
        return { mode: "fallback", link };
      }
      return Promise.reject(error);
    });
}

function postEvent(calendarId, eventPayload, token) {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventPayload)
  }).then(async (response) => {
    if (response.status === 401) {
      const error = new Error(t("statusMessageAuthExpired"));
      error.code = 401;
      error.token = token;
      throw error;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data && data.error && data.error.message ? data.error.message : t("statusMessageApiError");
      throw new Error(message);
    }

    const event = await response.json();
    return event && event.htmlLink ? event.htmlLink : null;
  });
}

function canUseIdentity() {
  return Boolean(chrome.identity && typeof chrome.identity.getAuthToken === "function");
}

function isIdentityUnsupportedError(error) {
  if (!error || typeof error.message !== "string") {
    return false;
  }
  return error.message.toLowerCase().includes("not supported on microsoft edge");
}

function openCalendarFallback(calendarId, eventPayload, timeRange) {
  const url = buildCalendarFallbackUrl(calendarId, eventPayload, timeRange);
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    window.location.assign(url);
  }
  return url;
}

function buildCalendarFallbackUrl(calendarId, eventPayload, timeRange) {
  const base = "https://calendar.google.com/calendar/u/0/r/eventedit";
  const params = new URLSearchParams();
  const summary = eventPayload.summary || t("defaultEventTitle");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (summary) {
    params.set("text", summary);
  }

  const start = timeRange && timeRange.start instanceof Date ? timeRange.start : null;
  const end = timeRange && timeRange.end instanceof Date ? timeRange.end : null;
  if (start && end) {
    params.set("dates", `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`);
  }

  if (eventPayload.location) {
    params.set("location", eventPayload.location);
  }

  if (eventPayload.description) {
    params.set("details", eventPayload.description);
  }

  if (timeZone) {
    params.set("ctz", timeZone);
  }

  if (calendarId && calendarId !== "primary") {
    params.set("src", calendarId);
  }

  return `${base}?${params.toString()}`;
}

function formatCalendarDateTime(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
}

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : t("statusMessageTokenError")));
        return;
      }
      resolve(token);
    });
  });
}

function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

function getStoredContext() {
  return new Promise((resolve) => {
    sessionStorage.get(["lastContext"], (result) => {
      resolve(result.lastContext || null);
    });
  });
}

function updateStatus(message, tone, eventLink, isKey) {
  statusState = {
    messageKey: isKey ? message : null,
    messageText: isKey ? "" : message,
    tone: tone || "neutral",
    eventLink: eventLink || null
  };
  renderStatus();
}

function renderStatus() {
  statusEl.textContent = statusState.messageKey
    ? t(statusState.messageKey)
    : statusState.messageText || "";
  statusEl.classList.remove("error", "success");

  if (statusState.tone === "error") {
    statusEl.classList.add("error");
    statusTitleEl.textContent = t("statusNeedsAttentionTitle");
  } else if (statusState.tone === "success") {
    statusEl.classList.add("success");
    statusTitleEl.textContent = t("statusAllSetTitle");
  } else {
    statusTitleEl.textContent = t("statusReadyTitle");
  }

  if (statusState.eventLink) {
    const link = document.createElement("a");
    link.href = statusState.eventLink;
    link.textContent = t("openInCalendar");
    link.target = "_blank";
    link.rel = "noreferrer";
    statusEl.appendChild(document.createTextNode(" "));
    statusEl.appendChild(link);
  }
}
