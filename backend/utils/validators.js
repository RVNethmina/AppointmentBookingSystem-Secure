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

export { isValidObjectId, isValidSlotDate, isValidSlotTime };
