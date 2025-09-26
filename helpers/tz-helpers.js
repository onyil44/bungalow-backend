import { isBefore, isAfter, isEqual, addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TZ = process.env.TZ || "Europe/Istanbul";

function ymdTR(dateLike = new Date()) {
  return formatInTimeZone(new Date(dateLike), TZ, "yyyy-MM-dd");
}

export function trAtHourIso(dateLike, hour) {
  const ymd = ymdTR(dateLike);
  const hh = String(hour).padStart(2, "0");
  const wall = `${ymd}T${hh}:00:00`;
  return fromZonedTime(wall, TZ).toISOString();
}

export function fromTodayTR(numDays, { withTime = false, hour = 0 } = {}) {
  if (withTime) {
    return new Date().toISOString();
  }

  const base = addDays(new Date(), numDays);
  return trAtHourIso(base, hour);
}

export function toUtcMidnight(dateLike) {
  const d = new Date(dateLike);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function localDayStringToUtcMidnight(ymd, tz) {
  return fromZonedTime(`${ymd}T00:00:00`, tz);
}

export function userPickToHotelUtcMidnight(userPickDate, userTz, hotelTz) {
  const hotelYmd = formatInTimeZone(userPickDate, hotelTz, "yyyy-MM-dd");
  return localDayStringToUtcMidnight(hotelYmd, hotelTz);
}

export function isPastUtc(date) {
  const today = toUtcMidnight(new Date());
  return isBefore(toUtcMidnight(date), today);
}

export function isFutureUtc(date) {
  const today = toUtcMidnight(new Date());
  return isAfter(toUtcMidnight(date), today);
}

export function isTodayUtc(date) {
  const now = new Date();
  const today = fromZonedTime(now.setHours(0, 0, 0, 0), process.env.TZ);
  return isEqual(date, today);
}
