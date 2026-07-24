import {
  buildTaskerScheduleWindow,
  evaluateTaskerScheduleAvailability,
  TaskerScheduleWindow,
} from './tasker-schedule-availability.helper';

const request: TaskerScheduleWindow = {
  scheduledStartDate: '2026-07-24',
  scheduledStartTime: '10:00',
  scheduledEndDate: '2026-07-24',
  scheduledEndTime: '12:00',
};

function booking(start: string, end: string): TaskerScheduleWindow {
  return {
    scheduledStartDate: '2026-07-24',
    scheduledStartTime: start,
    scheduledEndDate: '2026-07-24',
    scheduledEndTime: end,
  };
}

describe('tasker schedule availability', () => {
  it('blocks a tasker whose active booking overlaps the requested window', () => {
    const result = evaluateTaskerScheduleAvailability(request, [
      booking('09:30', '10:30'),
    ]);

    expect(result.status).toBe('BUSY');
    expect(result.reason).toBe('OVERLAP');
    expect(result.isAvailable).toBe(false);
  });

  it('warns but allows selection when the previous booking is 60 minutes away', () => {
    const result = evaluateTaskerScheduleAvailability(request, [
      booking('07:00', '09:00'),
    ]);

    expect(result.status).toBe('TIGHT_SCHEDULE');
    expect(result.nearby).toMatchObject({
      relation: 'BEFORE',
      gapMinutes: 60,
    });
    expect(result.isAvailable).toBe(true);
  });

  it('does not warn when the nearest booking is more than 60 minutes away', () => {
    const result = evaluateTaskerScheduleAvailability(request, [
      booking('07:00', '08:59'),
    ]);

    expect(result.status).toBe('AVAILABLE');
    expect(result.nearby).toBeNull();
  });

  it('blocks a tasker who already has the maximum active bookings', () => {
    const result = evaluateTaskerScheduleAvailability(request, [
      booking('06:00', '07:00'),
      booking('14:00', '15:00'),
      booking('17:00', '18:00'),
    ]);

    expect(result.status).toBe('BUSY');
    expect(result.reason).toBe('MAX_CONCURRENT');
  });

  it('builds an end time correctly when a booking crosses midnight', () => {
    expect(buildTaskerScheduleWindow('2026-07-24', '23:30', 2)).toMatchObject({
      scheduledEndDate: '2026-07-25',
      scheduledEndTime: '01:30',
    });
  });
});
