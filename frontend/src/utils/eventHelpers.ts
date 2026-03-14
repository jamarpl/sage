export const isEventLive = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return now >= start && now <= end;
};

export const getEventStatus = (startTime: string, endTime: string): 'upcoming' | 'live' | 'ended' => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (now < start) return 'upcoming';
  if (now <= end) return 'live';
  return 'ended';
};

export const isEventEndingSoon = (endTime: string, minutesThreshold: number = 30): boolean => {
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes > 0 && diffMinutes <= minutesThreshold;
};

export const formatEventTimeRemaining = (endTime: string): string => {
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ended';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};
