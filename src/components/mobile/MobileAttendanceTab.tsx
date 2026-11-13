import React, { useState } from 'react';
import { Camera, Clock, LogOut, MapPin, X } from 'lucide-react';
import {
  formatDateIndo,
  formatDuration,
  formatRupiah,
  formatTimeShort,
  getLocalDateString,
} from '../../lib/formatters';
import type { Attendance, Employee } from '../../types/hrm';

interface MobileAttendanceTabProps {
  employee: Employee;
  attendances: Attendance[];
  onOpenSelfieModal: (mode: 'clock-in' | 'clock-out') => void;
}

export const MobileAttendanceTab: React.FC<MobileAttendanceTabProps> = ({
  employee,
  attendances,
  onOpenSelfieModal,
}) => {
  const todayStr = getLocalDateString();
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));
  const [selectedDetail, setSelectedDetail] = useState<Attendance | null>(null);

  const todayAttendance = attendances.find((a) => a.date === todayStr) || null;
  const filtered = attendances.filter((a) => a.date.startsWith(selectedMonth));

  return (
    <div className="space-y-6">
      {/* Clock-In / Clock-Out Action Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Presensi Selfie Harian
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateIndo(todayStr)} · Tarif Harian {formatRupiah(employee.dailyRate)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!todayAttendance?.clockInAt ? (
              <button
                type="button"
                disabled={employee.status !== 'active'}
                onClick={() => onOpenSelfieModal('clock-in')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 min-h-[46px] whitespace-nowrap"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>Clock-In Selfie</span>
              </button>
            ) : !todayAttendance?.clockOutAt ? (
              <button
                type="button"
                onClick={() => onOpenSelfieModal('clock-out')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 min-h-[46px] whitespace-nowrap"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Clock-Out Selfie</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700">
                Clock-In &amp; Clock-Out Hari Ini Selesai
              </span>
            )}
          </div>
        </div>

        {todayAttendance && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              {todayAttendance.clockInSelfie ? (
                <img
                  src={todayAttendance.clockInSelfie}
                  alt="Selfie Masuk"
                  className="h-14 w-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Clock-In</p>
                <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {formatTimeShort(todayAttendance.clockInAt)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {todayAttendance.clockInLocation || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {todayAttendance.clockOutSelfie ? (
                <img
                  src={todayAttendance.clockOutSelfie}
                  alt="Selfie Pulang"
                  className="h-14 w-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Clock-Out</p>
                <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  {formatTimeShort(todayAttendance.clockOutAt)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {todayAttendance.clockOutAt
                    ? `Durasi ${formatDuration(todayAttendance.workDurationMinutes)}`
                    : 'Menunggu clock-out'}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Attendance History List */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Riwayat Kehadiran ({filtered.length})
          </h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none min-h-[38px]"
            aria-label="Filter bulan kehadiran"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Tidak ada data presensi untuk bulan yang dipilih.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDetail(item)}
                className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors min-h-[64px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.clockInSelfie ? (
                    <img
                      src={item.clockInSelfie}
                      alt={`Selfie ${item.date}`}
                      className="h-11 w-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateIndo(item.date)}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatTimeShort(item.clockInAt)} – {formatTimeShort(item.clockOutAt)} ·{' '}
                      {formatDuration(item.workDurationMinutes)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-semibold capitalize ${
                      item.status === 'hadir'
                        ? 'text-emerald-700'
                        : item.status === 'terlambat'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                    }`}
                  >
                    {item.status}
                  </p>
                  <p className="font-mono text-xs text-slate-600 tabular-nums">
                    {formatRupiah(item.earnedWage)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-display text-base font-bold text-slate-900">
                  Detail Presensi · {formatDateIndo(selectedDetail.date)}
                </h4>
                <p className="text-xs text-slate-500 capitalize">
                  Status: {selectedDetail.status} · Upah: {formatRupiah(selectedDetail.earnedWage)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Tutup detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">
                  Selfie Masuk ({formatTimeShort(selectedDetail.clockInAt)})
                </p>
                {selectedDetail.clockInSelfie ? (
                  <img
                    src={selectedDetail.clockInSelfie}
                    alt="Selfie Masuk"
                    className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Tidak ada foto
                  </div>
                )}
                <p className="flex items-start gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{selectedDetail.clockInLocation || '—'}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">
                  Selfie Pulang ({formatTimeShort(selectedDetail.clockOutAt)})
                </p>
                {selectedDetail.clockOutSelfie ? (
                  <img
                    src={selectedDetail.clockOutSelfie}
                    alt="Selfie Pulang"
                    className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Belum clock-out
                  </div>
                )}
                <p className="flex items-start gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{selectedDetail.clockOutLocation || '—'}</span>
                </p>
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                <span className="font-medium text-slate-900">Catatan: </span>
                {selectedDetail.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
