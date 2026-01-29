
export interface DaySchedule {
  start: string;
  end: string;
  active: boolean;
}

export interface HolidayRange {
  id: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  label: string;
}

export interface UserAvailability {
  days: Record<string, DaySchedule>;
  holidayDays: Record<string, DaySchedule>;
  holidayRanges: HolidayRange[];
  holidayMode: boolean;
  dinnerTime: string; // Bijv. "18:00"
  dinnerDuration: number; // In uren, bijv. 1
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Grade {
  id: string;
  subjectId: string;
  title: string;
  score: number;
  maxScore: number;
  date: string;
}

export type BlockType = 'study' | 'repetition' | 'task' | 'sport' | 'leisure' | 'test' | 'break' | 'event';

export interface CalendarBlock {
  id: string;
  type: BlockType;
  title: string;
  subjectId?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  description?: string;
  travelTimeMinutes?: number;
  completed?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
