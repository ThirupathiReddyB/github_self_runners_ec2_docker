export function formatDate(dateString: Date) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Pad with leading zero
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Function to format time in HH:MM (24-hour format)
export function formatTime(timeString: Date) {
  const hours = String(timeString.getUTCHours()).padStart(2, "0");
  const minutes = String(timeString.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateForDB(dateString: Date | string) {
  return `${dateString}T00:00:00Z`;
}

export function formatTimeForDB(timeString: Date | string) {
  return `1970-01-01T${timeString}Z`;
}

export function getFirstDayOfCurrentYear() {
  const currentYear = new Date().getFullYear(); // Get the current year
  const firstDayOfYear = new Date(currentYear, 0, 1); // Create a new date representing January 1st of the current year
  return firstDayOfYear;
}

export const formatDateTime = (datetime: string | undefined|Date) => {
  if (!datetime) return "-";
  const date = new Date(datetime);
  return date.toLocaleString("en-IN", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};