export function formatStreak(streak: number): string {
  if (streak === 0) return '';
  if (streak === 1) return '1-day streak';
  return `${streak}-day streak`;
}
