export interface OperationalSettings {
  appointmentBufferMinutes: number;
  maxDailyBookings: number | null;
}

export interface UpdateOperationalSettingsInput {
  appointmentBufferMinutes: number;
  maxDailyBookings: number | null;
}
