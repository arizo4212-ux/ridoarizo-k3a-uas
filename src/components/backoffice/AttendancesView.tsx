import React, { useState } from 'react';
import { Check, Download, Edit2, Eye, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import {
  exportToCsv,
  formatDateIndo,
  formatDuration,
  formatRupiah,
  formatTimeShort,
  getLocalDateString,
  getMonthBounds,
} from '../../lib/formatters';
import { adminSaveAttendance, deleteAttendance } from '../../services/hrmService';
import type { Attendance, AttendanceStatus, Employee } from '../../types/hrm';

interface AttendancesViewProps {
  employees: Employee[];
  attendances: Attendance[];
}

export const AttendancesView: React.FC<AttendancesViewProps> = ({ employees, attendances }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalDateString().slice(0, 7));
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [inspectItem, setInspectItem] = useState<Attendance | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Attendance | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'month' | 'filtered'>('month');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Manual Entry / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    date: getLocalDateString(),
    clockInTime: '08:00',
    clockOutTime: '17:00',
    status: 'hadir' as AttendanceStatus,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openNew = () => {
    const firstEmp = employees[0];
    setEditing(null);
    setForm({
      employeeId: firstEmp?.id || '',
      date: getLocalDateString(),
      clockInTime: '08:00',
      clockOutTime: '17:00',
      status: 'hadir',
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (att: Attendance) => {
    setEditing(att);
    const toHHMM = (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    setForm({
      employeeId: att.employeeId,
      date: att.date,
      clockInTime: toHHMM(att.clockInAt) || '08:00',
      clockOutTime: toHHMM(att.clockOutAt),
      status: att.status,
      notes: att.notes,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((item) => item.id === form.employeeId);
    if (!emp) {
      setFormError('Pilih karyawan terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const buildIso = (dateStr: string, timeStr: string) => {
      if (!timeStr) return '';
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm, 0).toISOString();
    };

    try {
      const isPresent = form.status === 'hadir' || form.status === 'terlambat';
      await adminSaveAttendance({
        id: editing?.id,
        employee: emp,
        date: form.date,
        clockInAt: isPresent ? buildIso(form.date, form.clockInTime) : '',
        clockOutAt: isPresent && form.clockOutTime ? buildIso(form.date, form.clockOutTime) : '',
        status: form.status,
        notes: form.notes,
      });
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan kehadiran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      await deleteAttendance(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setSubmitting(false);
    }
  };

  const monthlyAttendances = selectedMonth
    ? attendances.filter((a) => a.date.startsWith(selectedMonth))
    : attendances;

  const filtered = attendances.filter((a) => {
    if (dateFilter) {
      if (a.date !== dateFilter) return false;
    } else if (selectedMonth && !a.date.startsWith(selectedMonth)) {
      return false;
    }
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      a.employeeName.toLowerCase().includes(q) ||
      a.employeeCode.toLowerCase().includes(q) ||
      a.positionTitle.toLowerCase().includes(q)
    );
  });

  const exportTargetRows = exportScope === 'month' ? monthlyAttendances : filtered;
  const exportTotalWage = exportTargetRows.reduce((sum, a) => sum + (a.earnedWage || 0), 0);

  const handleConfirmExportCsv = () => {
    const rowsToExport = exportTargetRows;
    if (rowsToExport.length === 0) return;

    const totalMinutes = rowsToExport.reduce((sum, a) => sum + (a.workDurationMinutes || 0), 0);
    const totalWage = rowsToExport.reduce((sum, a) => sum + (a.earnedWage || 0), 0);
    const hadirCount = rowsToExport.filter((a) => a.status === 'hadir').length;
    const terlambatCount = rowsToExport.filter((a) => a.status === 'terlambat').length;
    const izinCount = rowsToExport.filter((a) => a.status === 'izin').length;
    const alphaCount = rowsToExport.filter((a) => a.status === 'alpha').length;

    const monthLabel = selectedMonth ? getMonthBounds(selectedMonth).label : 'Semua Bulan';
    const scopeLabel =
      exportScope === 'month'
        ? `Arsip Bulanan (${monthLabel})`
        : `Filter Aktif (${dateFilter || monthLabel} · Status: ${statusFilter === 'all' ? 'Semua' : statusFilter})`;

    const exportedAt = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    const filename =
      exportScope === 'month'
        ? `arsip-kehadiran-${selectedMonth || 'semua'}.csv`
        : `arsip-kehadiran-filter-${dateFilter || selectedMonth || 'semua'}.csv`;

    exportToCsv(
      filename,
      [
        'Tanggal',
        'Kode Karyawan',
        'Nama Karyawan',
        'Jabatan',
        'Jam Masuk',
        'Jam Pulang',
        'Durasi (Menit)',
        'Status',
        'Lokasi Masuk',
        'Lokasi Pulang',
        'Upah Harian (Rp)',
        'Catatan',
      ],
      rowsToExport.map((a) => [
        a.date,
        a.employeeCode,
        a.employeeName,
        a.positionTitle,
        formatTimeShort(a.clockInAt),
        formatTimeShort(a.clockOutAt),
        a.workDurationMinutes,
        a.status,
        a.clockInLocation || '-',
        a.clockOutLocation || '-',
        a.earnedWage,
        a.notes,
      ]),
      {
        delimiter: ';',
        metadataRows: [
          ['Laporan', 'Arsip Data Kehadiran Karyawan — KaryaSync HRM'],
          ['Periode', dateFilter && exportScope === 'filtered' ? dateFilter : monthLabel],
          ['Cakupan Data', scopeLabel],
          ['Tanggal Ekspor', exportedAt],
          [
            'Ringkasan Status',
            `Hadir: ${hadirCount} | Terlambat: ${terlambatCount} | Izin: ${izinCount} | Alpha: ${alphaCount}`,
          ],
          ['Total Baris Data', rowsToExport.length],
        ],
        summaryRow: [
          'TOTAL',
          '',
          `${rowsToExport.length} Catatan`,
          '',
          '',
          '',
          totalMinutes,
          '',
          '',
          '',
          totalWage,
          '',
        ],
      }
    );

    setExportModalOpen(false);
    setExportNotice(`Arsip ${filename} berhasil diunduh (${rowsToExport.length} baris).`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-5">
      {exportNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900"
        >
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{exportNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Tutup notifikasi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau NIP..."
              className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none min-w-[200px]"
            />
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setDateFilter('');
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            aria-label="Filter bulan kehadiran"
          />

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            aria-label="Filter tanggal spesifik"
          />

          {(dateFilter || selectedMonth) && (
            <button
              type="button"
              onClick={() => {
                if (dateFilter) {
                  setDateFilter('');
                } else {
                  setSelectedMonth('');
                }
              }}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 px-2 whitespace-nowrap"
            >
              {dateFilter ? 'Reset Tanggal' : 'Semua Bulan'}
            </button>
          )}

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
            {(['all', 'hadir', 'terlambat', 'izin', 'alpha'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setExportScope(selectedMonth ? 'month' : 'filtered');
              setExportModalOpen(true);
            }}
            disabled={attendances.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Kehadiran</span>
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Tidak ada data kehadiran yang sesuai filter saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Karyawan</th>
                  <th className="px-4 py-3 font-semibold">Foto Selfie</th>
                  <th className="px-4 py-3 font-semibold">Masuk</th>
                  <th className="px-4 py-3 font-semibold">Pulang</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Upah Tercatat</th>
                  <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {formatDateIndo(att.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{att.employeeName}</p>
                      <p className="text-[11px] text-slate-500">
                        {att.employeeCode} · {att.positionTitle}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setInspectItem(att)}
                        className="inline-flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-800"
                      >
                        {att.clockInSelfie ? (
                          <img
                            src={att.clockInSelfie}
                            alt="Selfie masuk"
                            className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                        <span>Detail</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 tabular-nums">
                      {formatTimeShort(att.clockInAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 tabular-nums">
                      {formatTimeShort(att.clockOutAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                      {formatDuration(att.workDurationMinutes)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold capitalize ${
                        att.status === 'hadir'
                          ? 'text-emerald-700'
                          : att.status === 'terlambat'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {att.status}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(att.earnedWage)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(att)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Koreksi kehadiran"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(att)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Hapus catatan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selfie & GPS Inspection Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Verifikasi Selfie · {inspectItem.employeeName}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateIndo(inspectItem.date)} · Status{' '}
                  <span className="capitalize font-semibold">{inspectItem.status}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Clock-In ({formatTimeShort(inspectItem.clockInAt)})
                </p>
                {inspectItem.clockInSelfie ? (
                  <img
                    src={inspectItem.clockInSelfie}
                    alt="Selfie Clock-In"
                    className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Tidak ada foto
                  </div>
                )}
                <p className="flex items-start gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{inspectItem.clockInLocation || '—'}</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Clock-Out ({formatTimeShort(inspectItem.clockOutAt)})
                </p>
                {inspectItem.clockOutSelfie ? (
                  <img
                    src={inspectItem.clockOutSelfie}
                    alt="Selfie Clock-Out"
                    className="aspect-square w-full rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Belum clock-out
                  </div>
                )}
                <p className="flex items-start gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{inspectItem.clockOutLocation || '—'}</span>
                </p>
              </div>
            </div>

            {inspectItem.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Catatan: </span>
                {inspectItem.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveManual}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editing ? 'Koreksi Kehadiran' : 'Catat Kehadiran Manual'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Karyawan</label>
                <select
                  disabled={Boolean(editing)}
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    disabled={Boolean(editing)}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as AttendanceStatus })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="hadir">Hadir (Dibayar Harian)</option>
                    <option value="terlambat">Terlambat (Dibayar Harian)</option>
                    <option value="izin">Izin (Rp 0)</option>
                    <option value="alpha">Alpha (Rp 0)</option>
                  </select>
                </div>
              </div>

              {(form.status === 'hadir' || form.status === 'terlambat') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Jam Masuk</label>
                    <input
                      type="time"
                      required
                      value={form.clockInTime}
                      onChange={(e) => setForm({ ...form, clockInTime: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Jam Pulang (Opsional)
                    </label>
                    <input
                      type="time"
                      value={form.clockOutTime}
                      onChange={(e) => setForm({ ...form, clockOutTime: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan HR</label>
                <input
                  type="text"
                  maxLength={300}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Kehadiran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">Hapus Catatan Presensi</h3>
            <p className="mt-2 text-xs text-slate-600">
              Hapus catatan kehadiran <strong>{confirmDelete.employeeName}</strong> tanggal{' '}
              <strong>{confirmDelete.date}</strong>?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {submitting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Archive Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Ekspor Arsip Kehadiran CSV
                </h3>
                <p className="text-xs text-slate-500">
                  Format pemisah titik koma (;) siap buka di Excel Indonesia
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-2.5">
                <p className="font-semibold text-slate-800">Pilih Cakupan Data</p>

                <button
                  type="button"
                  onClick={() => setExportScope('month')}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    exportScope === 'month'
                      ? 'border-teal-700 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      Arsip Bulan Terpilih (
                      {selectedMonth ? getMonthBounds(selectedMonth).label : 'Semua Bulan'})
                    </span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {monthlyAttendances.length} baris
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Mengunduh seluruh catatan kehadiran bulan terpilih tanpa terpotong filter pencarian/status.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    exportScope === 'filtered'
                      ? 'border-teal-700 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">Sesuai Filter Tabel Aktif</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {filtered.length} baris
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Mengunduh hanya baris yang sedang tampil di tabel saat ini.
                  </p>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Jumlah Catatan Diunduh</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {exportTargetRows.length} baris
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Akumulasi Upah Harian</span>
                  <span className="font-mono font-bold text-teal-800 tabular-nums">
                    {formatRupiah(exportTotalWage)}
                  </span>
                </div>
                <p className="pt-1 text-[11px] text-slate-500 border-t border-slate-200/80">
                  Berkas dilengkapi blok header metadata periode dan baris TOTAL otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={exportTargetRows.length === 0}
                onClick={handleConfirmExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Arsip CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
