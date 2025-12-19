const storage = chrome.storage.session || chrome.storage.local;
const defaultDurationMinutes = 120;
const defaultReminderMinutes = 30;

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

const inputs = {
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  startTime: document.getElementById("start-time"),
  endTime: document.getElementById("end-time"),
  location: document.getElementById("location"),
  reminder: document.getElementById("reminder"),
  description: document.getElementById("description"),
  calendar: document.getElementById("calendar")
};

let lastContext = null;
let endOffsetDays = 0;

init();

function init() {
  getStoredContext().then((context) => {
    lastContext = context;
    if (!context || !context.selectionText) {
      setSelectionState("Waiting for selection", "Select a date/time on a page and right click.");
      updateStatus("No selection captured yet.", "neutral");
      return;
    }

    setSelectionState("Captured", context.selectionText);
    setSourceLink(context);
    hydrateForm(context);
  });

  form.addEventListener("submit", handleSubmit);
  clearButton.addEventListener("click", clearForm);

  [inputs.date, inputs.startTime, inputs.endTime].forEach((input) => {
    input.addEventListener("input", () => {
      endOffsetDays = 0;
    });
  });
}

function setSelectionState(statusText, selectionText) {
  selectionStatusEl.textContent = statusText;
  selectionTextEl.textContent = selectionText;
}

function setSourceLink(context) {
  if (!context.url) {
    sourceLinkEl.textContent = "No source captured yet.";
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

function hydrateForm(context) {
  inputs.title.value = guessTitle(context);
  inputs.location.value = guessVenue(context);
  inputs.description.value = buildDescription(context);
  inputs.reminder.value = String(defaultReminderMinutes);

  const parser = window.KalendarParser;
  if (!parser || typeof parser.parseCroatianDateTime !== "function") {
    updateStatus("Parser unavailable. Reload the extension.", "error");
    return;
  }

  const parsed = parser.parseCroatianDateTime(context.selectionText, {
    durationMinutes: defaultDurationMinutes
  });
  if (!parsed) {
    updateStatus("Could not parse a date and time from the selection.", "error");
    return;
  }

  inputs.date.value = parsed.dateInput;
  inputs.startTime.value = parsed.startTimeInput;
  inputs.endTime.value = parsed.endTimeInput;
  endOffsetDays = parsed.endOffsetDays || 0;

  if (endOffsetDays > 0) {
    updateStatus("Parsed a time range that ends after midnight. Review the end time if needed.", "neutral");
  } else {
    updateStatus("Ready to sync.", "neutral");
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

  return "Film night";
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
    lines.push(`Source: ${context.pageTitle}`);
  }
  if (context.url) {
    lines.push(context.url);
  }
  if (context.selectionText) {
    lines.push(`Selected: ${context.selectionText}`);
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
  updateStatus("Cleared.", "neutral");
}

function handleSubmit(event) {
  event.preventDefault();

  const start = parseDateTimeInput(inputs.date.value, inputs.startTime.value);
  const end = parseDateTimeInput(inputs.date.value, inputs.endTime.value);

  if (!start || !end) {
    updateStatus("Please provide a valid date and time.", "error");
    return;
  }

  const adjustedEnd = endOffsetDays > 0 ? addDays(end, endOffsetDays) : end;

  if (adjustedEnd <= start) {
    updateStatus("End time must be after the start time.", "error");
    return;
  }

  const reminderMinutes = Number.parseInt(inputs.reminder.value, 10);
  const reminders = Number.isFinite(reminderMinutes) && reminderMinutes > 0
    ? {
        useDefault: false,
        overrides: [{ method: "popup", minutes: reminderMinutes }]
      }
    : { useDefault: true };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarId = inputs.calendar.value.trim() || "primary";

  const eventPayload = {
    summary: inputs.title.value.trim() || "Film night",
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
      title: lastContext.pageTitle || "Source",
      url: lastContext.url
    } : undefined
  };

  updateStatus("Connecting to Google Calendar...", "neutral");
  createCalendarEvent(calendarId, eventPayload)
    .then((eventLink) => {
      updateStatus("Event added to Google Calendar.", "success", eventLink);
    })
    .catch((error) => {
      updateStatus(error.message || "Failed to add event.", "error");
    });
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

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toLocalISOString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function createCalendarEvent(calendarId, eventPayload) {
  return getAuthToken(true)
    .then((token) => postEvent(calendarId, eventPayload, token))
    .catch((error) => {
      if (error && error.code === 401) {
        return removeCachedToken(error.token).then(() => Promise.reject(error));
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
      const error = new Error("Google authorization expired. Please try again.");
      error.code = 401;
      error.token = token;
      throw error;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data && data.error && data.error.message ? data.error.message : "Calendar API error.";
      throw new Error(message);
    }

    const event = await response.json();
    return event && event.htmlLink ? event.htmlLink : null;
  });
}

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : "Unable to get auth token."));
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
    storage.get(["lastContext"], (result) => {
      resolve(result.lastContext || null);
    });
  });
}

function updateStatus(message, tone, eventLink) {
  statusEl.textContent = message;
  statusEl.classList.remove("error", "success");

  if (tone === "error") {
    statusEl.classList.add("error");
    statusTitleEl.textContent = "Needs attention";
  } else if (tone === "success") {
    statusEl.classList.add("success");
    statusTitleEl.textContent = "All set";
  } else {
    statusTitleEl.textContent = "Ready";
  }

  if (eventLink) {
    const link = document.createElement("a");
    link.href = eventLink;
    link.textContent = "Open in Google Calendar";
    link.target = "_blank";
    link.rel = "noreferrer";
    statusEl.appendChild(document.createTextNode(" "));
    statusEl.appendChild(link);
  }
}
