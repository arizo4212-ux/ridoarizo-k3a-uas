import React, { useEffect, useState } from 'react';
import { Check, FileText, Save, User, Wallet } from 'lucide-react';
import { formatDateIndo, formatRupiah, getLocalDateString } from '../../lib/formatters';
import { updateOwnBiodata } from '../../services/hrmService';
import type { Attendance, Employee, PayrollRecord } from '../../types/hrm';

interface MobileProfileTabProps {
  employee: Employee;
  attendances: Attendance[];
  payrolls: PayrollRecord[];
}

export const MobileProfileTab: React.FC<MobileProfileTabProps> = ({
  employee,
  attendances,
  payrolls,
}) => {
  const [subTab, setSubTab] = useState<'biodata' | 'gaji'>('biodata');
  const [fullName, setFullName] = useState(employee.fullName);
  const [phone, setPhone] = useState(employee.phone);
  const [address, setAddress] = useState(employee.address);
  const [bankName, setBankName] = useState(employee.bankName);
  const [bankAccount, setBankAccount] = useState(employee.bankAccount);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(employee.fullName);
    setPhone(employee.phone);
    setAddress(employee.address);
    setBankName(employee.bankName);
    setBankAccount(employee.bankAccount);
  }, [employee]);

  const handleSaveBiodata = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    setSaveError(null);
    try {
      await updateOwnBiodata(employee.id, {
        fullName,
        phone,
        address,
        bankName,
        bankAccount,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal memperbarui biodata.');
    } finally {
      setSaving(false);
    }
  };

  const currentMonth = getLocalDateString().slice(0, 7);
  const monthPresent = attendances.filter(
    (a) => a.date.startsWith(currentMonth) && (a.status === 'hadir' || a.status === 'terlambat')
  );
  const runningBasePay = monthPresent.reduce((s, a) => s + (a.earnedWage || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {employee.photoUrl ? (
            <img
              src={employee.photoUrl}
              alt={employee.fullName}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-display text-lg font-bold shrink-0">
              {employee.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{employee.fullName}</h2>
            <p className="text-xs text-slate-500">
              {employee.employeeCode} · {employee.positionTitle} · {employee.department}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{employee.email}</p>
          </div>
        </div>

        {/* Sub-Tab Switcher: Biodata vs Gaji */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('biodata')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              subTab === 'biodata'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Biodata</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('gaji')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
              subTab === 'gaji'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Gaji</span>
          </button>
        </div>
      </section>

      {subTab === 'biodata' ? (
        <form
          onSubmit={handleSaveBiodata}
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Informasi Kepegawaian &amp; Biodata
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perubahan kontak dan rekening bank langsung tersinkron ke Backoffice HR.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <span className="text-slate-500">Tanggal Bergabung</span>
              <p className="mt-1 font-semibold text-slate-900">{formatDateIndo(employee.joinDate)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <span className="text-slate-500">Status Karyawan</span>
              <p className="mt-1 font-semibold capitalize text-emerald-700">
                {employee.status === 'active' ? 'Aktif' : 'Non-Aktif'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nomor Telepon / WA</label>
              <input
                type="tel"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Bank</label>
              <input
                type="text"
                maxLength={80}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Contoh: BCA / Mandiri / BRI"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nomor Rekening</label>
              <input
                type="text"
                maxLength={60}
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Nomor rekening penerima gaji"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Alamat Domisili</label>
            <textarea
              rows={2}
              maxLength={300}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat tempat tinggal saat ini"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-1">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-4 w-4" />
                Biodata tersimpan
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[44px]"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Biodata'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Daily Rate & Running Month Estimate */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Skema Gajian Harian</p>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatRupiah(employee.dailyRate)}
                <span className="text-xs font-sans font-normal text-slate-500"> / hari masuk</span>
              </p>
              {employee.dailyRate === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Tarif upah harian belum ditetapkan. Hubungi Admin HR Backoffice untuk penetapan jabatan &amp; tarif.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Estimasi Berjalan Bulan Ini</p>
              <p className="mt-2 font-mono text-2xl font-bold text-teal-800 tabular-nums">
                {formatRupiah(runningBasePay)}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {monthPresent.length} hari tercatat masuk × {formatRupiah(employee.dailyRate)}
              </p>
            </div>
          </section>

          {/* Official Payroll Slips */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Riwayat Slip Gaji Resmi
              </h3>
            </div>

            {payrolls.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada slip gaji resmi yang diterbitkan oleh tim HR untuk periode sebelumnya.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payrolls.map((slip) => (
                  <div key={slip.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-sm font-bold text-slate-900">
                          {slip.periodLabel}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {slip.periodStart} s/d {slip.periodEnd} · {slip.daysPresent} hari masuk
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
                          {formatRupiah(slip.netPay)}
                        </p>
                        <p
                          className={`text-xs font-semibold capitalize ${
                            slip.status === 'paid'
                              ? 'text-emerald-700'
                              : slip.status === 'approved'
                                ? 'text-teal-700'
                                : 'text-amber-700'
                          }`}
                        >
                          {slip.status === 'paid'
                            ? 'Sudah Dibayar'
                            : slip.status === 'approved'
                              ? 'Disetujui'
                              : 'Draft'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs tabular-nums">
                      <div>
                        <span className="text-slate-500 block">Gaji Pokok</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatRupiah(slip.basePay)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bonus</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          +{formatRupiah(slip.bonus)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Potongan</span>
                        <span className="font-mono font-semibold text-rose-700">
                          -{formatRupiah(slip.deduction)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
