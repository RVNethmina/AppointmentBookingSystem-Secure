import mongoose from "mongoose";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 60;

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value) && /^[0-9a-fA-F]{24}$/.test(value);

// Slot dates use the client's "D_M_YYYY" format. The value becomes part of
// a MongoDB field path, so only this exact shape is accepted (no ".", "$"
// or "__proto__"). It must be a real calendar date from yesterday (time
// zone tolerance) up to 60 days ahead.
const isValidSlotDate = (value) => {
  if (typeof value !== "string") return false;
  const match = /^(\d{1,2})_(\d{1,2})_(\d{4})$/.exec(value);
  if (!match) return false;

  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = today.getTime() - DAY_MS;
  const latest = today.getTime() + MAX_DAYS_AHEAD * DAY_MS;
  return date.getTime() >= earliest && date.getTime() <= latest;
};

// The client formats times with toLocaleTimeString: "10:30 AM", "10:30 am",
// "10:30 a.m." (12-hour locales) or "10:30" (24-hour locales).
const isValidSlotTime = (value) =>
  typeof value === "string" &&
  (/^(0?[1-9]|1[0-2]):[0-5]\d\s?[AaPp]\.?[Mm]\.?$/.test(value) || /^([01]?\d|2[0-3]):[0-5]\d$/.test(value));

const MAX_ADDRESS_LINE = 200;
const MAX_FEES = 1000000;
const GENDERS = ["Male", "Female", "Not Selected"];

const isShortString = (value, max) => typeof value === "string" && value.length <= max;

// Accepts an address object or its JSON text; returns exactly
// { line1, line2 } with two trimmed strings, or null.
const parseAddress = (value) => {
  let address = value;
  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch (error) {
      return null;
    }
  }
  if (!address || typeof address !== "object" || Array.isArray(address)) return null;

  const line1 = address.line1 === undefined ? "" : address.line1;
  const line2 = address.line2 === undefined ? "" : address.line2;
  if (!isShortString(line1, MAX_ADDRESS_LINE) || !isShortString(line2, MAX_ADDRESS_LINE)) return null;
  return { line1: line1.trim(), line2: line2.trim() };
};

// Fees arrive as numbers (JSON) or numeric strings (forms); returns a
// finite number between 0 and 1,000,000, or null.
const parseFees = (value) => {
  let fees = value;
  if (typeof fees === "string" && /^\s*\d+(\.\d{1,2})?\s*$/.test(fees)) {
    fees = Number(fees);
  }
  if (typeof fees !== "number" || !Number.isFinite(fees) || fees < 0 || fees > MAX_FEES) return null;
  return fees;
};

const isValidName = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 100;

const isValidPhone = (value) => typeof value === "string" && /^\+?[0-9][0-9 -]{6,18}[0-9]$/.test(value);

// "YYYY-MM-DD" (a real date, not in the future) or the default "Not Selected"
const isValidDob = (value) => {
  if (value === "Not Selected") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= 1900 &&
    date.getTime() <= Date.now()
  );
};

const isValidGender = (value) => GENDERS.includes(value);

export {
  isValidObjectId,
  isValidSlotDate,
  isValidSlotTime,
  parseAddress,
  parseFees,
  isValidName,
  isValidPhone,
  isValidDob,
  isValidGender,
};
