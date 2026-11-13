import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Download, Edit2, FileCheck2, RefreshCw, X } from 'lucide-react';
import {
  exportToCsv,
  formatRupiah,
  getLocalDateString,
  getMonthBounds,
} from '../../lib/formatters';
import { savePayrollRecord, updatePayrollStatus } from '../../services/hrmService';
import type { Attendance, Employee, PayrollRecord, PayrollStatus } from '../../types/hrm';

interface PayrollViewProps {
  employees: Employee[];
  attendances: Attendance[];
  payrolls: PayrollRecord[];
}

interface ComputedRow {
  employee: Employee;
  daysPresent: number;
  daysLate: number;
  basePay: number;
  savedRecord: PayrollRecord | null;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  employees,
  attendances,
  payrolls,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalDateString().slice(0, 7));
  const { start, end, label } = getMonthBounds(selectedMonth);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [editingRow, setEditingRow] = useState<ComputedRow | null>(null);
  const [bonusInput, setBonusInput] = useState<number>(0);
  const [deductionInput, setDeductionInput] = useState<number>(0);
  const [statusInput, setStatusInput] = useState<PayrollStatus>('draft');
  const [notesInput, setNotesInput] = useState<string>('');
  const [savingRow, setSavingRow] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'paid'>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const computedRows: ComputedRow[] = useMemo(() => {
    return employees.map((emp) => {
      const empAttendances = attendances.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.date >= start &&
          a.date <= end &&
          (a.status === 'hadir' || a.status === 'terlambat')
      );
      const daysPresent = empAttendances.length;
      const daysLate = empAttendances.filter((a) => a.status === 'terlambat').length;
      const basePay = daysPresent * emp.dailyRate;
      const savedRecord =
        payrolls.find(
          (p) => p.employeeId === emp.id && p.periodStart === start && p.periodEnd === end
        ) || null;

      return {
        employee: emp,
        daysPresent,
        daysLate,
        basePay,
        savedRecord,
      };
    });
  }, [employees, attendances, payrolls, start, end]);

  const totalPayrollPeriod = computedRows.reduce((sum, row) => {
    if (row.savedRecord) return sum + row.savedRecord.netPay;
    return sum + row.basePay;
  }, 0);

  const totalPaidCount = computedRows.filter((r) => r.savedRecord?.status === 'paid').length;

  const handleSyncAllSlips = async () => {
    setGeneratingAll(true);
    try {
      for (const row of computedRows) {
        if (row.employee.status !== 'active' && row.daysPresent === 0) continue;
        const existing = row.savedRecord;
        const bonus = existing?.bonus ?? 0;
        const deduction = existing?.deduction ?? 0;
        const netPay = Math.max(0, row.basePay + bonus - deduction);
        await savePayrollRecord(existing?.id || null, {
          employeeId: row.employee.id,
          authUid: row.employee.authUid,
          employeeCode: row.employee.employeeCode,
          employeeName: row.employee.fullName,
          positionTitle: row.employee.positionTitle,
          periodStart: start,
          periodEnd: end,
          periodLabel: label,
          daysPresent: row.daysPresent,
          daysLate: row.daysLate,
          dailyRate: row.employee.dailyRate,
          basePay: row.basePay,
          bonus,
          deduction,
          netPay,
          status: existing?.status || 'draft',
          notes: existing?.notes || `Perhitungan otomatis ${row.daysPresent} hari masuk`,
        });
      }
    } finally {
      setGeneratingAll(false);
    }
  };

  const openAdjustModal = (row: ComputedRow) => {
    setEditingRow(row);
    setBonusInput(row.savedRecord?.bonus ?? 0);
    setDeductionInput(row.savedRecord?.deduction ?? 0);
    setStatusInput(row.savedRecord?.status ?? 'draft');
    setNotesInput(row.savedRecord?.notes ?? '');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setSavingRow(true);
    try {
      const netPay = Math.max(
        0,
        editingRow.basePay + (Number(bonusInput) || 0) - (Number(deductionInput) || 0)
      );
      await savePayrollRecord(editingRow.savedRecord?.id || null, {
        employeeId: editingRow.employee.id,
        authUid: editingRow.employee.authUid,
        employeeCode: editingRow.employee.employeeCode,
        employeeName: editingRow.employee.fullName,
        positionTitle: editingRow.employee.positionTitle,
        periodStart: start,
        periodEnd: end,
        periodLabel: label,
        daysPresent: editingRow.daysPresent,
        daysLate: editingRow.daysLate,
        dailyRate: editingRow.employee.dailyRate,
        basePay: editingRow.basePay,
        bonus: Math.max(0, Number(bonusInput) || 0),
        deduction: Math.max(0, Number(deductionInput) || 0),
        netPay,
        status: statusInput,
        notes: notesInput,
      });
      setEditingRow(null);
    } finally {
      setSavingRow(false);
    }
  };

  const handleMarkPaid = async (record: PayrollRecord) => {
    await updatePayrollStatus(record.id, 'paid');
  };

  const paidRows = computedRows.filter((r) => r.savedRecord?.status === 'paid');
  const exportTargetRows = exportScope === 'paid' ? paidRows : computedRows;
  const exportTotalNetPay = exportTargetRows.reduce((sum, row) => {
    const bonus = row.savedRecord?.bonus ?? 0;
    const deduction = row.savedRecord?.deduction ?? 0;
    const net = Math.max(0, row.basePay + bonus - deduction);
    return sum + net;
  }, 0);

  const handleConfirmExportCsv = () => {
    if (exportTargetRows.length === 0) return;

    let totalDaysPresent = 0;
    let totalDaysLate = 0;
    let totalBasePay = 0;
    let totalBonus = 0;
    let totalDeduction = 0;
    let totalNetPay = 0;

    const dataRows = exportTargetRows.map((row) => {
      const bonus = row.savedRecord?.bonus ?? 0;
      const deduction = row.savedRecord?.deduction ?? 0;
      const net = Math.max(0, row.basePay + bonus - deduction);
      const statusLabel =
        row.savedRecord?.status === 'paid'
          ? 'Sudah Dibayar'
          : row.savedRecord?.status === 'approved'
            ? 'Disetujui'
            : row.savedRecord?.status === 'draft'
              ? 'Draft'
              : 'Belum Terbit';

      totalDaysPresent += row.daysPresent;
      totalDaysLate += row.daysLate;
      totalBasePay += row.basePay;
      totalBonus += bonus;
      totalDeduction += deduction;
      totalNetPay += net;

      return [
        row.employee.employeeCode,
        row.employee.fullName,
        row.employee.positionTitle,
        row.daysPresent,
        row.daysLate,
        row.employee.dailyRate,
        row.basePay,
        bonus,
        deduction,
        net,
        statusLabel,
        row.savedRecord?.notes || '-',
      ];
    });

    const exportedAt = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    const filename =
      exportScope === 'paid'
        ? `arsip-payroll-dibayar-${selectedMonth}.csv`
        : `arsip-payroll-${selectedMonth}.csv`;

    exportToCsv(
      filename,
      [
        'Kode Karyawan',
        'Nama Karyawan',
        'Jabatan',
        'Hari Masuk',
        'Hari Terlambat',
        'Tarif Harian (Rp)',
        'Gaji Pokok (Rp)',
        'Bonus (Rp)',
        'Potongan (Rp)',
        'Total Gaji Bersih (Rp)',
        'Status Slip',
        'Catatan',
      ],
      dataRows,
      {
        delimiter: ';',
        metadataRows: [
          ['Laporan', 'Arsip Payroll Harian Karyawan — KaryaSync HRM'],
          ['Periode', label],
          ['Rentang Tanggal', `${start} s/d ${end}`],
          [
            'Cakupan Data',
            exportScope === 'paid'
              ? 'Hanya Slip Sudah Dibayar (Paid)'
              : 'Seluruh Karyawan Periode Terpilih',
          ],
          ['Tanggal Ekspor', exportedAt],
          ['Jumlah Karyawan', exportTargetRows.length],
        ],
        summaryRow: [
          'TOTAL',
          `${exportTargetRows.length} Karyawan`,
          '',
          totalDaysPresent,
          totalDaysLate,
          '',
          totalBasePay,
          totalBonus,
          totalDeduction,
          totalNetPay,
          '',
          '',
        ],
      }
    );

    setExportModalOpen(false);
    setExportNotice(`Arsip ${filename} berhasil diunduh (${exportTargetRows.length} karyawan).`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
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

      {/* Header & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Payroll Model Gajian Harian — {label}
          </h2>
          <p className="text-xs text-slate-500">
            Rumus otomatis: Hari Tercatat Masuk × Tarif Upah Harian (Rp / hari) + Bonus - Potongan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            aria-label="Pilih periode payroll"
          />
          <button
            type="button"
            onClick={() => {
              setExportScope('all');
              setExportModalOpen(true);
            }}
            disabled={computedRows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            disabled={generatingAll || computedRows.length === 0}
            onClick={handleSyncAllSlips}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generatingAll ? 'animate-spin' : ''}`} />
            <span>{generatingAll ? 'Menyinkronkan...' : 'Terbitkan & Sinkronkan Slip'}</span>
          </button>
        </div>
      </div>

      {/* Period Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Total Beban Payroll Periode</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalPayrollPeriod)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Periode {start} s/d {end}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Total Hari Masuk Seluruh Staf</p>
          <p className="mt-1.5 font-display text-xl font-bold text-slate-900 tabular-nums">
            {computedRows.reduce((s, r) => s + r.daysPresent, 0)} hari
          </p>
          <p className="mt-1 text-xs text-slate-500">Tercatat dari presensi harian</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Status Pembayaran Slip</p>
          <p className="mt-1.5 font-display text-xl font-bold text-slate-900 tabular-nums">
            {totalPaidCount} / {computedRows.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Karyawan sudah dibayar</p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {computedRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Belum ada data karyawan untuk dihitung payroll-nya.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Karyawan</th>
                  <th className="px-4 py-3 font-semibold text-right">Masuk (Hari)</th>
                  <th className="px-4 py-3 font-semibold text-right">Upah / Hari</th>
                  <th className="px-4 py-3 font-semibold text-right">Gaji Pokok</th>
                  <th className="px-4 py-3 font-semibold text-right">Bonus / Potongan</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Bersih</th>
                  <th className="px-4 py-3 font-semibold">Status Slip</th>
                  <th className="px-5 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computedRows.map((row) => {
                  const slip = row.savedRecord;
                  const netPay = slip
                    ? row.basePay + slip.bonus - slip.deduction
                    : row.basePay;
                  return (
                    <tr key={row.employee.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{row.employee.fullName}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.employee.employeeCode} · {row.employee.positionTitle}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-900 text-right tabular-nums">
                        {row.daysPresent} hr
                        {row.daysLate > 0 && (
                          <span className="block text-[11px] text-amber-700">
                            ({row.daysLate} telat)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(row.employee.dailyRate)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-900 text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(row.basePay)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-right tabular-nums whitespace-nowrap">
                        {slip ? (
                          <div>
                            <span className="text-emerald-700">+{formatRupiah(slip.bonus)}</span>
                            <span className="block text-rose-700">
                              -{formatRupiah(slip.deduction)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Rp 0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(Math.max(0, netPay))}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {!slip ? (
                          <span className="text-slate-400">Belum Terbit</span>
                        ) : slip.status === 'paid' ? (
                          <span className="font-semibold text-emerald-700">Sudah Dibayar</span>
                        ) : slip.status === 'approved' ? (
                          <span className="font-semibold text-teal-700">Disetujui</span>
                        ) : (
                          <span className="font-semibold text-amber-700">Draft</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAdjustModal(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Atur</span>
                          </button>
                          {slip && slip.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(slip)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                              title="Tandai Sudah Dibayar"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Bayar</span>
                            </button>
                          )}
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

      {/* Adjust Bonus/Deduction/Status Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveAdjustment}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Slip Gaji · {editingRow.employee.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {label} · {editingRow.daysPresent} hari × {formatRupiah(editingRow.employee.dailyRate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Gaji Pokok ({editingRow.daysPresent} hari)</span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatRupiah(editingRow.basePay)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bonus / Tunjangan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000000}
                    value={bonusInput}
                    onChange={(e) => setBonusInput(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Potongan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000000}
                    value={deductionInput}
                    onChange={(e) => setDeductionInput(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status Slip Gaji</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as PayrollStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="draft">Draft (Menunggu Persetujuan)</option>
                  <option value="approved">Disetujui</option>
                  <option value="paid">Sudah Dibayar</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Slip</label>
                <input
                  type="text"
                  maxLength={300}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Contoh: Termasuk uang makan / lembur"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex items-center justify-between">
                <span className="font-semibold text-teal-950">Total Gaji Diterima</span>
                <span className="font-mono text-base font-bold text-teal-900 tabular-nums">
                  {formatRupiah(Math.max(0, editingRow.basePay + bonusInput - deductionInput))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>{savingRow ? 'Menyimpan...' : 'Simpan Slip Gaji'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Archive Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Ekspor Arsip Payroll CSV
                </h3>
                <p className="text-xs text-slate-500">
                  Periode {label} · Pemisah titik koma (;) Excel Indonesia
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
                <p className="font-semibold text-slate-800">Pilih Cakupan Slip Gaji</p>

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    exportScope === 'all'
                      ? 'border-teal-700 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">Seluruh Karyawan Periode Ini</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {computedRows.length} staf
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Mencakup semua karyawan dengan status Draft, Disetujui, Sudah Dibayar, maupun Belum Terbit.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('paid')}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    exportScope === 'paid'
                      ? 'border-teal-700 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">Hanya Slip Sudah Dibayar</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {paidRows.length} staf
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Khusus arsip pencairan dana untuk slip yang berstatus Sudah Dibayar.
                  </p>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Jumlah Karyawan Diunduh</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {exportTargetRows.length} baris
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Gaji Bersih Periode</span>
                  <span className="font-mono font-bold text-teal-800 tabular-nums">
                    {formatRupiah(exportTotalNetPay)}
                  </span>
                </div>
                <p className="pt-1 text-[11px] text-slate-500 border-t border-slate-200/80">
                  Berkas menyertakan header informasi periode dan baris TOTAL kalkulasi gaji.
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
