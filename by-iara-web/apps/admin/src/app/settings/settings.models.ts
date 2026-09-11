export interface OperationalSettings {
  appointmentBufferMinutes: number;
  maxDailyBookings: number | null;
  minimumBookingNoticeHours: number;
  bookingReminderEnabled: boolean;
  bookingReminderHoursBefore: number;
}

export interface UpdateOperationalSettingsInput {
  appointmentBufferMinutes: number;
  maxDailyBookings: number | null;
  minimumBookingNoticeHours: number;
  bookingReminderEnabled: boolean;
  bookingReminderHoursBefore: number;
}
