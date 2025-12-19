const assert = require("assert");
const { parseCroatianDateTime } = require("../parser");

function expectParse(input, options, expected) {
  const result = parseCroatianDateTime(input, options);
  assert(result, `Expected to parse: ${input}`);
  assert.strictEqual(result.dateInput, expected.date, `${input} date`);
  assert.strictEqual(result.startTimeInput, expected.start, `${input} start`);
  assert.strictEqual(result.endTimeInput, expected.end, `${input} end`);
}

function expectNull(input, options) {
  const result = parseCroatianDateTime(input, options);
  assert.strictEqual(result, null, `Expected null for: ${input}`);
}

const referenceEarly = new Date(2025, 11, 10, 12, 0);
const referenceLate = new Date(2025, 11, 20, 12, 0);

const cases = [
  {
    input: "Nedjelja, 28.12.2025 21:00",
    options: null,
    expected: { date: "2025-12-28", start: "21:00", end: "23:00" }
  },
  {
    input: "28/12/2025 21:00",
    options: null,
    expected: { date: "2025-12-28", start: "21:00", end: "23:00" }
  },
  {
    input: "2025-12-28 21:00",
    options: null,
    expected: { date: "2025-12-28", start: "21:00", end: "23:00" }
  },
  {
    input: "19.12. u 16:00",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-19", start: "16:00", end: "18:00" }
  },
  {
    input: "19.12. u 16:00",
    options: { referenceDate: referenceLate },
    expected: { date: "2026-12-19", start: "16:00", end: "18:00" }
  },
  {
    input: "7.1.2026 u 9:05",
    options: null,
    expected: { date: "2026-01-07", start: "09:05", end: "11:05" }
  },
  {
    input: "Dec 28, 2025 7pm",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:00" }
  },
  {
    input: "28 Dec 2025 at 7:15pm",
    options: null,
    expected: { date: "2025-12-28", start: "19:15", end: "21:15" }
  },
  {
    input: "December 28th 2025 7:15 PM",
    options: null,
    expected: { date: "2025-12-28", start: "19:15", end: "21:15" }
  },
  {
    input: "12/28/2025 7:30pm",
    options: null,
    expected: { date: "2025-12-28", start: "19:30", end: "21:30" }
  },
  {
    input: "12:00am Dec 28, 2025",
    options: null,
    expected: { date: "2025-12-28", start: "00:00", end: "02:00" }
  },
  {
    input: "28.12.2025 19:00-21:15",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:15" }
  },
  {
    input: "Dec 28 7-9pm",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:00" }
  },
  {
    input: "28.12.2025 7pm to 9pm",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:00" }
  },
  {
    input: "28.12.2025 19-21h",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:00" }
  },
  {
    input: "28.12.2025 od 19 do 21",
    options: null,
    expected: { date: "2025-12-28", start: "19:00", end: "21:00" }
  },
  {
    input: "today 19:00",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-10", start: "19:00", end: "21:00" }
  },
  {
    input: "tomorrow 7pm",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-11", start: "19:00", end: "21:00" }
  },
  {
    input: "tonight 20:00",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-10", start: "20:00", end: "22:00" }
  },
  {
    input: "this Friday 7pm",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-12", start: "19:00", end: "21:00" }
  },
  {
    input: "next Friday 7pm",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-19", start: "19:00", end: "21:00" }
  },
  {
    input: "Friday 7pm",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-12", start: "19:00", end: "21:00" }
  },
  {
    input: "u petak u 19 sati",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-12", start: "19:00", end: "21:00" }
  },
  {
    input: "sljedeci ponedjeljak u 19:00",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-22", start: "19:00", end: "21:00" }
  },
  {
    input: "ponedjeljak u 19:00",
    options: { referenceDate: referenceEarly },
    expected: { date: "2025-12-15", start: "19:00", end: "21:00" }
  },
  {
    input: "28.12.2025, 21:00",
    options: { durationMinutes: 90 },
    expected: { date: "2025-12-28", start: "21:00", end: "22:30" }
  }
];

cases.forEach((testCase) => {
  expectParse(testCase.input, testCase.options, testCase.expected);
});

const crossMidnight = parseCroatianDateTime("Dec 28 11pm-1am", null);
assert(crossMidnight, "Expected to parse cross-midnight range");
assert.strictEqual(crossMidnight.endOffsetDays, 1, "Expected endOffsetDays for cross-midnight range");

expectNull("31.02.2025 20:00", null);
expectNull("32.12.2025 20:00", null);
expectNull("28.12.2025 24:00", null);
expectNull("Nedjelja bez vremena", null);
expectNull("19.12.", null);

console.log("dateParser.test.js: all tests passed");
