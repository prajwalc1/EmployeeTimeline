export const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'OPERATIONS'] as const;
export const PROJECTS = ['INTERNAL', 'CLIENT_A', 'CLIENT_B', 'DEVELOPMENT', 'MAINTENANCE'] as const;
export const LEAVE_TYPES = ['VACATION', 'SICK', 'PERSONAL', 'OTHER'] as const;
export const LEAVE_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const GERMAN_HOLIDAYS = [
  { date: '2024-01-01', name: 'Neujahr' },
  { date: '2024-04-01', name: 'Ostermontag' },
  { date: '2024-05-01', name: 'Tag der Arbeit' },
  { date: '2024-05-09', name: 'Christi Himmelfahrt' },
  { date: '2024-05-20', name: 'Pfingstmontag' },
  { date: '2024-10-03', name: 'Tag der Deutschen Einheit' },
  { date: '2024-12-25', name: 'Erster Weihnachtstag' },
  { date: '2024-12-26', name: 'Zweiter Weihnachtstag' },
];

export const WORK_RULES = {
  maxDailyHours: 8,
  maxWeeklyHours: 40,
  minBreakDuration: 30, // minutes
};
