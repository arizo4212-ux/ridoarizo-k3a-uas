import React, { useState } from 'react';
import { Clock, Edit2, Plus, Trash2, X } from 'lucide-react';
import { ALL_DAYS, DAY_LABELS } from '../../lib/formatters';
import { deleteWorkSchedule, saveWorkSchedule } from '../../services/hrmService';
import type { DayCode, WorkSchedule } from '../../types/hrm';

interface SchedulesViewProps {
  schedules: WorkSchedule[];
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({ schedules }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState({
    name: '',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as DayCode[],
    startTime: '08:00',
    endTime: '17:00',
    lateToleranceMinutes: 15,
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WorkSchedule | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '08:00',
      endTime: '17:00',
      lateToleranceMinutes: 15,
      isDefault: false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (sched: WorkSchedule) => {
    setEditing(sched);
    setForm({
      name: sched.name,
      workDays: [...sched.workDays],
      startTime: sched.startTime,
      endTime: sched.endTime,
      lateToleranceMinutes: sched.lateToleranceMinutes,
      isDefault: sched.isDefault,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleDay = (day: DayCode) => {
    setForm((prev) => {
      const exists = prev.workDays.includes(day);
      if (exists && prev.workDays.length === 1) return prev; // Keep at least 1 day
      const next = exists ? prev.workDays.filter((d) => d !== day) : [...prev.workDays, day];
      const ordered = ALL_DAYS.filter((d) => next.includes(d));
      return { ...prev, workDays: ordered };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.workDays.length === 0) {
      setFormError('Pilih minimal 1 hari kerja.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await saveWorkSchedule(editing?.id || null, form);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal kerja.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      await deleteWorkSchedule(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Pengaturan Hari &amp; Jam Kerja
          </h2>
          <p className="text-xs text-slate-500">
            Menentukan jadwal shift dan ambang batas keterlambatan saat karyawan melakukan Clock-In
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap min-h-[38px]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Jadwal Kerja</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {schedules.map((sched) => (
          <article
            key={sched.id}
            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">{sched.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sched.isDefault ? 'Jadwal Utama Perusahaan' : 'Jadwal Shift Khusus'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(sched)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title="Edit jadwal"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {sched.id !== 'default' && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(sched)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      title="Hapus jadwal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
                <Clock className="h-4 w-4 text-teal-700 shrink-0" />
                <span>
                  {sched.startTime} – {sched.endTime}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                Toleransi terlambat: {sched.lateToleranceMinutes} menit
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => {
                const active = sched.workDays.includes(day);
                return (
                  <span
                    key={day}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </span>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {/* Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editing ? 'Edit Hari & Jam Kerja' : 'Tambah Hari & Jam Kerja'}
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
                <label className="block font-medium text-slate-700 mb-1">Nama Jadwal</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Shift Operasional Pagi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-2">Hari Kerja Aktif</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const active = form.workDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-teal-700 text-white'
                            : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Toleransi Terlambat (Menit)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={240}
                  value={form.lateToleranceMinutes}
                  onChange={(e) =>
                    setForm({ ...form, lateToleranceMinutes: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
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
                {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">Hapus Jadwal Kerja</h3>
            <p className="mt-2 text-xs text-slate-600">
              Yakin ingin menghapus jadwal <strong>{confirmDelete.name}</strong>?
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
    </div>
  );
};
