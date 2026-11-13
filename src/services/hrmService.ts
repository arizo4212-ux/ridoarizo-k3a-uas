import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  computeMinutesBetween,
  getLocalDateString,
  isClockInLate,
  sanitizeId,
  truncate,
} from '../lib/formatters';
import type {
  Attendance,
  AttendanceStatus,
  Employee,
  PayrollRecord,
  PayrollStatus,
  Position,
  WorkSchedule,
} from '../types/hrm';

export async function checkIsUserAdmin(user: User): Promise<boolean> {
  const email = (user.email || '').trim().toLowerCase();
  if (email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified) {
    return true;
  }
  const adminPath = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    // Non-admin reading own /admins/{uid} might fail only if unverified, otherwise returns exists=false
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      return false;
    }
    handleFirestoreError(error, OperationType.GET, adminPath);
  }
}

export async function ensureBootstrapDataForAdmin(user: User): Promise<void> {
  try {
    const defaultScheduleRef = doc(db, 'workSchedules', 'default');
    const defaultScheduleSnap = await getDoc(defaultScheduleRef);
    if (!defaultScheduleSnap.exists()) {
      await setDoc(defaultScheduleRef, {
        name: 'Jam Kerja Reguler',
        workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '08:00',
        endTime: '17:00',
        lateToleranceMinutes: 15,
        isDefault: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const posSnap = await getDocs(collection(db, 'positions'));
    if (posSnap.empty) {
      const defaults = [
        {
          id: 'pos_staff_ops',
          title: 'Staff Operasional',
          department: 'Operasional',
          defaultDailyRate: 175000,
          description: 'Pelaksana operasional harian dan pelayanan lapangan',
        },
        {
          id: 'pos_admin_hr',
          title: 'HR & Administrasi',
          department: 'Manajemen SDM',
          defaultDailyRate: 225000,
          description: 'Pengelolaan administrasi personalia, presensi, dan payroll',
        },
        {
          id: 'pos_supervisor',
          title: 'Supervisor Lapangan',
          department: 'Operasional',
          defaultDailyRate: 275000,
          description: 'Koordinator tim shift dan pengawasan kinerja harian',
        },
      ];
      for (const item of defaults) {
        await setDoc(doc(db, 'positions', item.id), {
          title: item.title,
          department: item.department,
          defaultDailyRate: item.defaultDailyRate,
          description: item.description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Ensure admin record doc exists for bootstrapped admin if helpful
    const adminRef = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: user.uid,
        email: (user.email || '').trim().toLowerCase(),
        displayName: truncate(user.displayName || 'Administrator HR', 120),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
  }
}

export async function ensureEmployeeLinked(user: User, isAdminUser: boolean): Promise<Employee> {
  const emailLower = (user.email || '').trim().toLowerCase();

  try {
    // 1. Check by authUid
    const byUidSnap = await getDocs(
      query(collection(db, 'employees'), where('authUid', '==', user.uid))
    );
    if (!byUidSnap.empty) {
      const d = byUidSnap.docs[0];
      return { id: d.id, ...(d.data() as Omit<Employee, 'id'>) };
    }

    // 2. Check by pre-registered email to claim account
    if (emailLower) {
      const byEmailSnap = await getDocs(
        query(collection(db, 'employees'), where('email', '==', emailLower))
      );
      if (!byEmailSnap.empty) {
        const d = byEmailSnap.docs[0];
        const existingData = d.data() as Omit<Employee, 'id'>;
        if (!existingData.authUid) {
          await updateDoc(doc(db, 'employees', d.id), {
            authUid: user.uid,
            photoUrl: truncate(existingData.photoUrl || user.photoURL || '', 500),
            updatedAt: serverTimestamp(),
          });
          return {
            id: d.id,
            ...existingData,
            authUid: user.uid,
            photoUrl: existingData.photoUrl || user.photoURL || '',
          };
        }
        return { id: d.id, ...existingData };
      }
    }

    // 3. Create initial employee record keyed by user.uid
    const today = getLocalDateString();
    const empCode = `EMP-${user.uid.slice(0, 5).toUpperCase()}`;
    const newEmployee: Omit<Employee, 'id'> = {
      employeeCode: empCode,
      fullName: truncate(user.displayName || emailLower.split('@')[0] || 'Karyawan', 120),
      email: truncate(emailLower, 160),
      authUid: user.uid,
      role: isAdminUser ? 'admin' : 'employee',
      positionId: isAdminUser ? 'pos_admin_hr' : '',
      positionTitle: isAdminUser ? 'HR & Administrasi' : 'Menunggu Penempatan',
      department: isAdminUser ? 'Manajemen SDM' : 'Umum',
      scheduleId: 'default',
      dailyRate: isAdminUser ? 225000 : 0,
      phone: '',
      address: '',
      bankName: '',
      bankAccount: '',
      joinDate: today,
      status: 'active',
      photoUrl: truncate(user.photoURL || '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'employees', user.uid), newEmployee);
    return { id: user.uid, ...newEmployee };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `employees/${user.uid}`);
  }
}

// Realtime Subscriptions
export function subscribeAdminCollections(callbacks: {
  onEmployees: (items: Employee[]) => void;
  onPositions: (items: Position[]) => void;
  onSchedules: (items: WorkSchedule[]) => void;
  onAttendances: (items: Attendance[]) => void;
  onPayrolls: (items: PayrollRecord[]) => void;
  onError: (err: Error) => void;
}): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'employees'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Employee, 'id'>) }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        callbacks.onEmployees(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'employees');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'positions'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Position, 'id'>) }))
          .sort((a, b) => a.title.localeCompare(b.title));
        callbacks.onPositions(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'positions');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'workSchedules'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<WorkSchedule, 'id'>) }))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
        callbacks.onSchedules(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'workSchedules');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'attendances'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Attendance, 'id'>) }))
          .sort((a, b) => (b.date + b.clockInAt).localeCompare(a.date + a.clockInAt));
        callbacks.onAttendances(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'attendances');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'payrollRecords'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PayrollRecord, 'id'>) }))
          .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
        callbacks.onPayrolls(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'payrollRecords');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  return () => unsubs.forEach((u) => u());
}

export function subscribeEmployeeCollections(
  authUid: string,
  scheduleId: string,
  callbacks: {
    onEmployee: (emp: Employee | null) => void;
    onSchedule: (sched: WorkSchedule | null) => void;
    onAttendances: (items: Attendance[]) => void;
    onPayrolls: (items: PayrollRecord[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'employees'), where('authUid', '==', authUid)),
      (snap) => {
        if (snap.empty) {
          callbacks.onEmployee(null);
        } else {
          const d = snap.docs[0];
          callbacks.onEmployee({ id: d.id, ...(d.data() as Omit<Employee, 'id'>) });
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'employees');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'workSchedules', scheduleId || 'default'),
      (snap) => {
        if (snap.exists()) {
          callbacks.onSchedule({ id: snap.id, ...(snap.data() as Omit<WorkSchedule, 'id'>) });
        } else {
          callbacks.onSchedule(null);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `workSchedules/${scheduleId || 'default'}`);
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'attendances'), where('authUid', '==', authUid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Attendance, 'id'>) }))
          .sort((a, b) => (b.date + b.clockInAt).localeCompare(a.date + a.clockInAt));
        callbacks.onAttendances(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'attendances');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'payrollRecords'), where('authUid', '==', authUid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PayrollRecord, 'id'>) }))
          .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
        callbacks.onPayrolls(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'payrollRecords');
        } catch (wrapped) {
          callbacks.onError(wrapped as Error);
        }
      }
    )
  );

  return () => unsubs.forEach((u) => u());
}

// Employee Clock-In & Clock-Out
export async function clockInWithSelfie(params: {
  employee: Employee;
  schedule: WorkSchedule | null;
  selfieDataUrl: string;
  locationText: string;
  notes?: string;
}): Promise<void> {
  const { employee, schedule, selfieDataUrl, locationText, notes = '' } = params;
  const now = new Date();
  const today = getLocalDateString(now);
  const docId = sanitizeId(`${employee.id}_${today}`);
  const late = isClockInLate(
    now,
    schedule?.startTime || '08:00',
    schedule?.lateToleranceMinutes ?? 15
  );
  const status: AttendanceStatus = late ? 'terlambat' : 'hadir';

  const payload = {
    employeeId: employee.id,
    authUid: employee.authUid,
    employeeCode: truncate(employee.employeeCode, 32),
    employeeName: truncate(employee.fullName, 120),
    positionTitle: truncate(employee.positionTitle, 100),
    date: today,
    clockInAt: now.toISOString(),
    clockOutAt: '',
    clockInSelfie: selfieDataUrl.slice(0, 120000),
    clockOutSelfie: '',
    clockInLocation: truncate(locationText, 160),
    clockOutLocation: '',
    workDurationMinutes: 0,
    status,
    dailyRateSnapshot: employee.dailyRate,
    earnedWage: employee.dailyRate,
    notes: truncate(notes, 300),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'attendances', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `attendances/${docId}`);
  }
}

export async function clockOutWithSelfie(params: {
  attendance: Attendance;
  selfieDataUrl: string;
  locationText: string;
  notes?: string;
}): Promise<void> {
  const { attendance, selfieDataUrl, locationText, notes } = params;
  const now = new Date();
  const nowIso = now.toISOString();
  const durationMinutes = computeMinutesBetween(attendance.clockInAt, nowIso);

  try {
    await updateDoc(doc(db, 'attendances', attendance.id), {
      clockOutAt: nowIso,
      clockOutSelfie: selfieDataUrl.slice(0, 120000),
      clockOutLocation: truncate(locationText, 160),
      workDurationMinutes: durationMinutes,
      notes: truncate(notes ?? attendance.notes, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendances/${attendance.id}`);
  }
}

export async function updateOwnBiodata(
  employeeId: string,
  updates: {
    fullName: string;
    phone: string;
    address: string;
    bankName: string;
    bankAccount: string;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'employees', employeeId), {
      fullName: truncate(updates.fullName, 120),
      phone: truncate(updates.phone, 30),
      address: truncate(updates.address, 300),
      bankName: truncate(updates.bankName, 80),
      bankAccount: truncate(updates.bankAccount, 60),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
  }
}

// Admin CRUD: Positions
export async function savePosition(
  id: string | null,
  data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docId = id ? sanitizeId(id) : sanitizeId(`pos_${Date.now()}`);
  try {
    if (id) {
      await updateDoc(doc(db, 'positions', docId), {
        title: truncate(data.title, 100),
        department: truncate(data.department, 100),
        defaultDailyRate: Math.max(0, Number(data.defaultDailyRate) || 0),
        description: truncate(data.description, 300),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'positions', docId), {
        title: truncate(data.title, 100),
        department: truncate(data.department, 100),
        defaultDailyRate: Math.max(0, Number(data.defaultDailyRate) || 0),
        description: truncate(data.description, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `positions/${docId}`);
  }
}

export async function deletePosition(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'positions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `positions/${id}`);
  }
}

// Admin CRUD: Work Schedules
export async function saveWorkSchedule(
  id: string | null,
  data: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docId = id ? sanitizeId(id) : sanitizeId(`sched_${Date.now()}`);
  try {
    if (id) {
      await updateDoc(doc(db, 'workSchedules', docId), {
        name: truncate(data.name, 100),
        workDays: data.workDays.slice(0, 7),
        startTime: data.startTime,
        endTime: data.endTime,
        lateToleranceMinutes: Math.max(0, Math.min(240, Number(data.lateToleranceMinutes) || 0)),
        isDefault: Boolean(data.isDefault),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'workSchedules', docId), {
        name: truncate(data.name, 100),
        workDays: data.workDays.slice(0, 7),
        startTime: data.startTime,
        endTime: data.endTime,
        lateToleranceMinutes: Math.max(0, Math.min(240, Number(data.lateToleranceMinutes) || 0)),
        isDefault: Boolean(data.isDefault),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `workSchedules/${docId}`);
  }
}

export async function deleteWorkSchedule(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'workSchedules', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workSchedules/${id}`);
  }
}

// Admin CRUD: Employees
export async function saveEmployee(
  id: string | null,
  data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docId = id ? sanitizeId(id) : sanitizeId(`emp_${Date.now()}`);
  const cleanEmail = truncate(data.email.toLowerCase(), 160);
  try {
    if (id) {
      await updateDoc(doc(db, 'employees', docId), {
        employeeCode: truncate(data.employeeCode, 32),
        fullName: truncate(data.fullName, 120),
        email: cleanEmail,
        authUid: data.authUid,
        role: data.role,
        positionId: data.positionId,
        positionTitle: truncate(data.positionTitle, 100),
        department: truncate(data.department, 100),
        scheduleId: data.scheduleId || 'default',
        dailyRate: Math.max(0, Number(data.dailyRate) || 0),
        phone: truncate(data.phone, 30),
        address: truncate(data.address, 300),
        bankName: truncate(data.bankName, 80),
        bankAccount: truncate(data.bankAccount, 60),
        joinDate: data.joinDate,
        status: data.status,
        photoUrl: truncate(data.photoUrl, 500),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'employees', docId), {
        employeeCode: truncate(data.employeeCode, 32),
        fullName: truncate(data.fullName, 120),
        email: cleanEmail,
        authUid: '',
        role: data.role,
        positionId: data.positionId,
        positionTitle: truncate(data.positionTitle, 100),
        department: truncate(data.department, 100),
        scheduleId: data.scheduleId || 'default',
        dailyRate: Math.max(0, Number(data.dailyRate) || 0),
        phone: truncate(data.phone, 30),
        address: truncate(data.address, 300),
        bankName: truncate(data.bankName, 80),
        bankAccount: truncate(data.bankAccount, 60),
        joinDate: data.joinDate,
        status: data.status,
        photoUrl: truncate(data.photoUrl, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `employees/${docId}`);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
  }
}

// Admin Attendance Management
export async function adminSaveAttendance(params: {
  id?: string;
  employee: Employee;
  date: string;
  clockInAt: string;
  clockOutAt: string;
  status: AttendanceStatus;
  notes: string;
}): Promise<void> {
  const { id, employee, date, clockInAt, clockOutAt, status, notes } = params;
  const docId = id ? sanitizeId(id) : sanitizeId(`${employee.id}_${date}`);
  const isPresent = status === 'hadir' || status === 'terlambat';
  const earnedWage = isPresent ? employee.dailyRate : 0;
  const durationMinutes = clockInAt && clockOutAt ? computeMinutesBetween(clockInAt, clockOutAt) : 0;

  try {
    if (id) {
      await updateDoc(doc(db, 'attendances', docId), {
        employeeCode: truncate(employee.employeeCode, 32),
        employeeName: truncate(employee.fullName, 120),
        positionTitle: truncate(employee.positionTitle, 100),
        clockInAt,
        clockOutAt,
        workDurationMinutes: durationMinutes,
        status,
        dailyRateSnapshot: employee.dailyRate,
        earnedWage,
        notes: truncate(notes, 300),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'attendances', docId), {
        employeeId: employee.id,
        authUid: employee.authUid || employee.id,
        employeeCode: truncate(employee.employeeCode, 32),
        employeeName: truncate(employee.fullName, 120),
        positionTitle: truncate(employee.positionTitle, 100),
        date,
        clockInAt,
        clockOutAt,
        clockInSelfie: '',
        clockOutSelfie: '',
        clockInLocation: 'Dicatat oleh Admin HR',
        clockOutLocation: clockOutAt ? 'Dicatat oleh Admin HR' : '',
        workDurationMinutes: durationMinutes,
        status,
        dailyRateSnapshot: employee.dailyRate,
        earnedWage,
        notes: truncate(notes, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, `attendances/${docId}`);
  }
}

export async function deleteAttendance(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'attendances', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendances/${id}`);
  }
}

// Admin Payroll CRUD
export async function savePayrollRecord(
  id: string | null,
  data: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docId = id
    ? sanitizeId(id)
    : sanitizeId(`pay_${data.employeeId}_${data.periodStart}_${data.periodEnd}`);
  try {
    const existing = await getDoc(doc(db, 'payrollRecords', docId));
    if (existing.exists()) {
      await updateDoc(doc(db, 'payrollRecords', docId), {
        authUid: data.authUid,
        employeeCode: truncate(data.employeeCode, 32),
        employeeName: truncate(data.employeeName, 120),
        positionTitle: truncate(data.positionTitle, 100),
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        periodLabel: truncate(data.periodLabel, 60),
        daysPresent: data.daysPresent,
        daysLate: data.daysLate,
        dailyRate: data.dailyRate,
        basePay: data.basePay,
        bonus: data.bonus,
        deduction: data.deduction,
        netPay: data.netPay,
        status: data.status,
        notes: truncate(data.notes, 300),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'payrollRecords', docId), {
        employeeId: data.employeeId,
        authUid: data.authUid,
        employeeCode: truncate(data.employeeCode, 32),
        employeeName: truncate(data.employeeName, 120),
        positionTitle: truncate(data.positionTitle, 100),
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        periodLabel: truncate(data.periodLabel, 60),
        daysPresent: data.daysPresent,
        daysLate: data.daysLate,
        dailyRate: data.dailyRate,
        basePay: data.basePay,
        bonus: data.bonus,
        deduction: data.deduction,
        netPay: data.netPay,
        status: data.status,
        notes: truncate(data.notes, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `payrollRecords/${docId}`);
  }
}

export async function updatePayrollStatus(id: string, status: PayrollStatus): Promise<void> {
  try {
    await updateDoc(doc(db, 'payrollRecords', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payrollRecords/${id}`);
  }
}

export async function deletePayrollRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'payrollRecords', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `payrollRecords/${id}`);
  }
}
