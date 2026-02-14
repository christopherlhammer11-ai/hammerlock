export function formatClockLabel(date: string | number | Date): string {
  const value = new Date(date);
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
