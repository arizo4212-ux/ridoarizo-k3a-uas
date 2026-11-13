export type DayCode = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type UserRole = 'admin' | 'employee';

export type EmployeeStatus = 'active' | 'inactive';

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'alpha';

export type PayrollStatus = 'draft' | 'approved' | 'paid';

export type AppWorkspaceMode = 'backoffice' | 'mobile';

export interface Position {
  id: string;
  title: string;
  department: string;
  defaultDailyRate: number;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkSchedule {
  id: string;
  name: string;
  workDays: DayCode[];
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  lateToleranceMinutes: number;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  authUid: string;
  role: UserRole;
  positionId: string;
  positionTitle: string;
  department: string;
  scheduleId: string;
  dailyRate: number;
  phone: string;
  address: string;
  bankName: string;
  bankAccount: string;
  joinDate: string; // YYYY-MM-DD
  status: EmployeeStatus;
  photoUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Attendance {
  id: string;
  employeeId: string;
  authUid: string;
  employeeCode: string;
  employeeName: string;
  positionTitle: string;
  date: string; // YYYY-MM-DD
  clockInAt: string; // ISO string or empty
  clockOutAt: string; // ISO string or empty
  clockInSelfie: string; // data URL or empty
  clockOutSelfie: string; // data URL or empty
  clockInLocation: string;
  clockOutLocation: string;
  workDurationMinutes: number;
  status: AttendanceStatus;
  dailyRateSnapshot: number;
  earnedWage: number;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  authUid: string;
  employeeCode: string;
  employeeName: string;
  positionTitle: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  periodLabel: string;
  daysPresent: number;
  daysLate: number;
  dailyRate: number;
  basePay: number;
  bonus: number;
  deduction: number;
  netPay: number;
  status: PayrollStatus;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
