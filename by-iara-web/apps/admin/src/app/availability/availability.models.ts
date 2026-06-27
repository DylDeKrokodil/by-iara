export interface AvailabilityRule {
  id: string;
  dayOfWeek: string;
  startTime: string; // "HH:MM:SS" or "HH:MM"
  endTime: string;   // "HH:MM:SS" or "HH:MM"
}

export interface AvailabilityBlock {
  id: string;
  startTime: string; // ISO 8601 with offset
  endTime: string;   // ISO 8601 with offset
  reason: string | null;
}

export interface CreateRuleInput {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface CreateBlockInput {
  startTime: string;
  endTime: string;
  reason?: string;
}
