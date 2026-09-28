const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function validDate(value: Date | string | number | null | undefined) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | number | null | undefined) {
  const date = validDate(value);
  if (!date) return "—";
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateTime(value: Date | string | number | null | undefined) {
  const date = validDate(value);
  if (!date) return "—";
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(date)}, ${hours}:${minutes} UTC`;
}