const TODAY_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
});

const STALE_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
});

const OLD_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatLiveSyncTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  const now = new Date();
  if (isSameLocalDay(date, now)) {
    return `Today, ${TODAY_TIME_FORMATTER.format(date)}`;
  }

  if (date.getFullYear() !== now.getFullYear()) {
    return `${OLD_DATE_FORMATTER.format(date)}, ${TODAY_TIME_FORMATTER.format(date)}`;
  }

  return `${STALE_DATE_FORMATTER.format(date)}, ${TODAY_TIME_FORMATTER.format(date)}`;
}
