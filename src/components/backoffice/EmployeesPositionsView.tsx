import React, { useState } from 'react';
import { Briefcase, Edit2, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { formatRupiah, getLocalDateString } from '../../lib/formatters';
import { deleteEmployee, deletePosition, saveEmployee, savePosition } from '../../services/hrmService';
import type { Employee, EmployeeStatus, Position, UserRole, WorkSchedule } from '../../types/hrm';

interface EmployeesPositionsViewProps {
  employees: Employee[];
  positions: Position[];
  schedules: WorkSchedule[];
}

export const EmployeesPositionsView: React.FC<EmployeesPositionsViewProps> = ({
  employees,
  positions,
  schedules,
}) => {
  const [subTab, setSubTab] = useState<'employees' | 'positions'>('employees');
  const [searchQuery, setSearchQuery] = useState('');

  // Employee Modal State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    role: 'employee' as UserRole,
    positionId: '',
    scheduleId: 'default',
    dailyRate: 175000,
    phone: '',
    address: '',
    bankName: '',
    bankAccount: '',
    joinDate: getLocalDateString(),
    status: 'active' as EmployeeStatus,
  });

  // Position Modal State
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState({
    title: '',
    department: '',
    defaultDailyRate: 175000,
    description: '',
  });

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'employee' | 'position';
    id: string;
    label: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openNewEmployee = () => {
    const defaultPos = positions[0];
    setEditingEmp(null);
    setEmpForm({
      employeeCode: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: '',
      email: '',
      role: 'employee',
      positionId: defaultPos?.id || '',
      scheduleId: schedules.find((s) => s.isDefault)?.id || schedules[0]?.id || 'default',
      dailyRate: defaultPos?.defaultDailyRate ?? 175000,
      phone: '',
      address: '',
      bankName: '',
      bankAccount: '',
      joinDate: getLocalDateString(),
      status: 'active',
    });
    setFormError(null);
    setEmpModalOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      role: emp.role,
      positionId: emp.positionId,
      scheduleId: emp.scheduleId || 'default',
      dailyRate: emp.dailyRate,
      phone: emp.phone,
      address: emp.address,
      bankName: emp.bankName,
      bankAccount: emp.bankAccount,
      joinDate: emp.joinDate,
      status: emp.status,
    });
    setFormError(null);
    setEmpModalOpen(true);
  };

  const handlePositionSelectInEmp = (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    setEmpForm((prev) => ({
      ...prev,
      positionId: posId,
      dailyRate: pos ? pos.defaultDailyRate : prev.dailyRate,
    }));
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const pos = positions.find((p) => p.id === empForm.positionId);
    try {
      await saveEmployee(editingEmp?.id || null, {
        employeeCode: empForm.employeeCode,
        fullName: empForm.fullName,
        email: empForm.email,
        authUid: editingEmp?.authUid || '',
        role: empForm.role,
        positionId: empForm.positionId,
        positionTitle: pos?.title || editingEmp?.positionTitle || 'Staff',
        department: pos?.department || editingEmp?.department || 'Operasional',
        scheduleId: empForm.scheduleId || 'default',
        dailyRate: Number(empForm.dailyRate) || 0,
        phone: empForm.phone,
        address: empForm.address,
        bankName: empForm.bankName,
        bankAccount: empForm.bankAccount,
        joinDate: empForm.joinDate,
        status: empForm.status,
        photoUrl: editingEmp?.photoUrl || '',
      });
      setEmpModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data karyawan.');
    } finally {
      setSubmitting(false);
    }
  };

  const openNewPosition = () => {
    setEditingPos(null);
    setPosForm({ title: '', department: '', defaultDailyRate: 175000, description: '' });
    setFormError(null);
    setPosModalOpen(true);
  };

  const openEditPosition = (pos: Position) => {
    setEditingPos(pos);
    setPosForm({
      title: pos.title,
      department: pos.department,
      defaultDailyRate: pos.defaultDailyRate,
      description: pos.description,
    });
    setFormError(null);
    setPosModalOpen(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await savePosition(editingPos?.id || null, posForm);
      setPosModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan jabatan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      if (confirmDelete.type === 'employee') {
        await deleteEmployee(confirmDelete.id);
      } else {
        await deletePosition(confirmDelete.id);
      }
      setConfirmDelete(null);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.positionTitle.toLowerCase().includes(q)
    );
  });

  const filteredPositions = positions.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.department.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setSubTab('employees')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'employees'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Data Karyawan ({employees.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('positions')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'positions'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Data Jabatan ({positions.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={subTab === 'employees' ? 'Cari karyawan / NIP...' : 'Cari jabatan / divisi...'}
              className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none min-w-[220px]"
            />
          </div>

          <button
            type="button"
            onClick={subTab === 'employees' ? openNewEmployee : openNewPosition}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap min-h-[38px]"
          >
            <Plus className="h-4 w-4" />
            <span>{subTab === 'employees' ? 'Tambah Karyawan' : 'Tambah Jabatan'}</span>
          </button>
        </div>
      </div>

      {/* Table Area */}
      {subTab === 'employees' ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filteredEmployees.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada data karyawan yang sesuai. Klik &ldquo;Tambah Karyawan&rdquo; untuk mendaftarkan
              karyawan dan menetapkan upah harian mereka.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Kode &amp; Nama</th>
                    <th className="px-4 py-3 font-semibold">Email Akun</th>
                    <th className="px-4 py-3 font-semibold">Jabatan &amp; Divisi</th>
                    <th className="px-4 py-3 font-semibold">Jadwal Kerja</th>
                    <th className="px-4 py-3 font-semibold text-right">Upah Harian</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const sched = schedules.find((s) => s.id === emp.scheduleId);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{emp.fullName}</p>
                          <p className="font-mono text-[11px] text-slate-500">{emp.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-slate-700">{emp.email}</p>
                          <p className="text-[11px] text-slate-400">
                            {emp.authUid ? 'Terhubung ke perangkat' : 'Menunggu login pertama'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">{emp.positionTitle}</p>
                          <p className="text-[11px] text-slate-500">{emp.department}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {sched ? `${sched.name} (${sched.startTime}–${sched.endTime})` : 'Reguler'}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(emp.dailyRate)}/hr
                        </td>
                        <td
                          className={`px-4 py-3.5 font-semibold capitalize ${
                            emp.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {emp.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditEmployee(emp)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit karyawan"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'employee',
                                  id: emp.id,
                                  label: emp.fullName,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Hapus karyawan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filteredPositions.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada data jabatan. Klik &ldquo;Tambah Jabatan&rdquo; untuk membuat master jabatan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nama Jabatan</th>
                    <th className="px-4 py-3 font-semibold">Divisi</th>
                    <th className="px-4 py-3 font-semibold">Deskripsi</th>
                    <th className="px-4 py-3 font-semibold text-right">Standar Upah Harian</th>
                    <th className="px-4 py-3 font-semibold text-right">Jml Karyawan</th>
                    <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPositions.map((pos) => {
                    const count = employees.filter((e) => e.positionId === pos.id).length;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{pos.title}</td>
                        <td className="px-4 py-3.5 text-slate-700">{pos.department}</td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                          {pos.description || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-900 text-right tabular-nums">
                          {formatRupiah(pos.defaultDailyRate)}/hr
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 text-right tabular-nums">
                          {count}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditPosition(pos)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit jabatan"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'position',
                                  id: pos.id,
                                  label: pos.title,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Hapus jabatan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Employee Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEmployee}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Karyawan / NIP</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={32}
                    value={empForm.employeeCode}
                    onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={empForm.fullName}
                    onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Email Google (untuk sinkronisasi Mobile PWA karyawan)
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={160}
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    placeholder="nama.karyawan@gmail.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jabatan</label>
                  <select
                    value={empForm.positionId}
                    onChange={(e) => handlePositionSelectInEmp(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="">— Pilih Jabatan —</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Tarif Upah Harian (Rp / Hari Masuk)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100000000}
                    value={empForm.dailyRate}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, dailyRate: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jadwal Kerja</label>
                  <select
                    value={empForm.scheduleId}
                    onChange={(e) => setEmpForm({ ...empForm, scheduleId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime}–{s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Bergabung</label>
                  <input
                    type="date"
                    required
                    value={empForm.joinDate}
                    onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">No. Telepon</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={empForm.status}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, status: e.target.value as EmployeeStatus })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={empForm.bankName}
                    onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={empForm.bankAccount}
                    onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
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
                onClick={() => setEmpModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Position Modal */}
      {posModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSavePosition}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingPos ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Jabatan</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                  placeholder="Contoh: Teknisi Lapangan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Divisi / Departemen</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={posForm.department}
                  onChange={(e) => setPosForm({ ...posForm, department: e.target.value })}
                  placeholder="Contoh: Operasional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Standar Upah Harian (Rp / Hari)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100000000}
                  value={posForm.defaultDailyRate}
                  onChange={(e) =>
                    setPosForm({ ...posForm, defaultDailyRate: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={posForm.description}
                  onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
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
                onClick={() => setPosModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Jabatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="mt-2 text-xs text-slate-600">
              Anda yakin ingin menghapus <strong>{confirmDelete.label}</strong>? Tindakan ini tidak
              dapat dibatalkan.
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
                onClick={handleExecuteDelete}
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
