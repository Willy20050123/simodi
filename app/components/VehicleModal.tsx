"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "./UserContext";
import { toast } from "sonner";
import TimeWheel from "./TimeWheel";

export type Vehicle = {
  id: number;
  merk: string;
  tahun: number;
  warna: string;
  nomorPolisi: string;
  dalamPerbaikan: boolean;
  maintenanceReason?: string | null;

  tersedia: boolean;
  dipakai?: boolean;

  activeUsage?: {
    id: number;
    userId: number;
    startAt: string | Date;
    byName?: string;
    byNip?: string;
  } | null;

  pendingRequest?: {
    usageId: number;
    byName: string;
    byNip: string;
  } | null;
  reservedUsage?: {
    id: number;
    userId: number;
    byName?: string;
    byNip?: string;
  } | null;
};

export type UseVehiclePayload = {
  vehicle: Vehicle;
  keperluan: string;
  startAt: string;
  endAt: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeHHcolonMM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function combineLocal(
  dateYYYYMMDD: string,
  timeHHcolonMM: string,
): Date | null {
  if (!dateYYYYMMDD || !timeHHcolonMM) return null;

  const m = /^(\d{2}):(\d{2})$/.exec(timeHHcolonMM);
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  const [yyyy, mo, dd] = dateYYYYMMDD.split("-").map(Number);
  if (!yyyy || !mo || !dd) return null;

  if (hh === 24 && mm === 0) {
    const d = new Date(yyyy, mo - 1, dd, 0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  const d = new Date(yyyy, mo - 1, dd, hh, mm, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatID24(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${formatTimeHHcolonMM(d)}`;
}

function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function VehicleModal({
  open,
  vehicle,
  onClose,
  onUse,
  onDeleted,
}: {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onUse: (payload: UseVehiclePayload) => void | Promise<void>;
  onDeleted?: (vehicleId: number) => void | Promise<void>;
}) {
  const user = useCurrentUser();

  const isAdmin =
    (user as any)?.role === "ADMIN" ||
    (user as any)?.role === "admin" ||
    (user as any)?.isAdmin === true;

  const [vehicleIdSnapshot, setVehicleIdSnapshot] = useState<number | null>(
    null,
  );

  const [pengguna, setPengguna] = useState((user as any)?.name || "");
  const [keperluan, setKeperluan] = useState("");

  const [tglPakai, setTglPakai] = useState("");
  const [jamPakai, setJamPakai] = useState("08:00");

  const [tglKembali, setTglKembali] = useState("");
  const [jamKembali, setJamKembali] = useState("09:00");

  const minDate = useMemo(() => formatDateYYYYMMDD(new Date()), []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceReasonInput, setMaintenanceReasonInput] = useState("");
  const [maintaining, setMaintaining] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;

    setVehicleIdSnapshot(vehicle.id);

    setPengguna((user as any)?.name || "");
    setKeperluan("");

    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      8,
      0,
      0,
      0,
    );
    const end = addMinutes(start, 60);

    setTglPakai(formatDateYYYYMMDD(start));
    setJamPakai("08:00");
    setTglKembali(formatDateYYYYMMDD(end));
    setJamKembali("09:00");

    setConfirmOpen(false);
    setDeleting(false);
    setMaintenanceOpen(false);
    setMaintenanceReasonInput("");
    setMaintaining(false);
  }, [open, vehicle?.id]);

  const startDate = useMemo(
    () => combineLocal(tglPakai, jamPakai),
    [tglPakai, jamPakai],
  );
  const endDate = useMemo(
    () => combineLocal(tglKembali, jamKembali),
    [tglKembali, jamKembali],
  );

  const hasTimes = Boolean(startDate && endDate);

  const isRangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return endDate.getTime() > startDate.getTime();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startDate) return;

    const endOk = endDate && endDate.getTime() > startDate.getTime();
    if (endOk) return;

    const suggested = addMinutes(startDate, 60);
    setTglKembali(formatDateYYYYMMDD(suggested));
    setJamKembali(formatTimeHHcolonMM(suggested));
  }, [startDate]);

  async function handleDeleteVehicle() {
    const id = vehicleIdSnapshot;

    if (!id) {
      toast.error("Vehicle ID kosong. Coba buka modal lagi.");
      return;
    }

    if (vehicle?.dipakai) {
      toast.error("Kendaraan sedang dipakai, tidak bisa dihapus.");
      return;
    }
    if (vehicle?.dalamPerbaikan) {
      toast.error("Kendaraan sedang perbaikan, tidak bisa dihapus.");
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(`/api/vehicles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Gagal menghapus kendaraan", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Kendaraan berhasil diarsipkan");
      setConfirmOpen(false);
      onClose();
      await onDeleted?.(id);
    } catch (e: any) {
      toast.error("Gagal menghapus kendaraan", {
        description: e?.message ?? "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleStartMaintenance() {
    const id = vehicleIdSnapshot;
    if (!id) return;

    const reason = maintenanceReasonInput.trim();
    if (reason.length < 3) {
      toast.error("Alasan maintenance minimal 3 karakter");
      return;
    }

    try {
      setMaintaining(true);
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "START", reason }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error("Gagal set maintenance", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Kendaraan masuk maintenance");
      setMaintenanceOpen(false);
      onClose();
      window.location.reload();
    } finally {
      setMaintaining(false);
    }
  }

  async function handleEndMaintenance() {
    const id = vehicleIdSnapshot;
    if (!id) return;

    try {
      setMaintaining(true);
      const res = await fetch(`/api/vehicles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "END" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error("Gagal menyelesaikan maintenance", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Kendaraan kembali tersedia");
      onClose();
      window.location.reload();
    } finally {
      setMaintaining(false);
    }
  }

  if (!open || !vehicle) return null;

  const canStartMaintenance =
    !vehicle.dalamPerbaikan &&
    !vehicle.dipakai &&
    !vehicle.pendingRequest &&
    !vehicle.reservedUsage;

  const blockedReason = vehicle.dalamPerbaikan
    ? `Kendaraan sedang perbaikan${vehicle.maintenanceReason ? `: ${vehicle.maintenanceReason}` : ""}`
    : vehicle.dipakai
      ? "Kendaraan sedang dipakai"
      : vehicle.reservedUsage
        ? `Kendaraan sudah direservasi oleh ${vehicle.reservedUsage.byName ?? "user lain"}`
        : vehicle.pendingRequest
          ? `Ada request pending oleh ${vehicle.pendingRequest.byName}`
          : !vehicle.tersedia
            ? "Kendaraan tidak tersedia"
            : null;

  const canSubmit =
    !blockedReason &&
    pengguna.trim().length > 0 &&
    keperluan.trim().length > 0 &&
    hasTimes &&
    isRangeValid;

  const statusText = vehicle.dalamPerbaikan
    ? "Dalam Perbaikan"
    : vehicle.reservedUsage
      ? `Direservasi (${vehicle.reservedUsage.byName ?? "user lain"})`
      : vehicle.pendingRequest
        ? `Pending Request (${vehicle.pendingRequest.byName})`
        : vehicle.dipakai
          ? "Sedang Dipakai"
          : "Tersedia";

  const activeSince = safeDate(vehicle.activeUsage?.startAt);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (deleting) return;
          onClose();
        }}
        aria-label="Close"
        disabled={deleting}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{vehicle.merk}</p>
            <p className="text-sm text-gray-500">{vehicle.nomorPolisi}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && (
              <>
                {!vehicle.dalamPerbaikan ? (
                  <button
                    onClick={() => setMaintenanceOpen(true)}
                    className="rounded px-3 py-1 text-sm disabled:opacity-100"
                    style={{
                      backgroundColor:
                        deleting || maintaining || !canStartMaintenance
                          ? "#d1d5db"
                          : "#d97706",
                      color:
                        deleting || maintaining || !canStartMaintenance
                          ? "#4b5563"
                          : "#ffffff",
                    }}
                    disabled={deleting || maintaining || !canStartMaintenance}
                  >
                    Maintenance
                  </button>
                ) : (
                  <button
                    onClick={handleEndMaintenance}
                    className="rounded bg-[#004282] px-3 py-1 text-sm text-white hover:bg-[#00356a] disabled:opacity-50"
                    disabled={deleting || maintaining}
                  >
                    Selesai Maintenance
                  </button>
                )}
              </>
            )}

            {isAdmin && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                disabled={deleting || maintaining}
              >
                Hapus
              </button>
            )}

            <button
              onClick={() => {
                if (deleting) return;
                onClose();
              }}
              className="rounded-lg px-3 py-1 text-sm border hover:bg-gray-100 disabled:opacity-50"
              disabled={deleting || maintaining}
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4 text-sm">
          <Row label="Merk" value={vehicle.merk} />
          <Row label="Nomor Polisi" value={vehicle.nomorPolisi} />
          <Row label="Tahun" value={vehicle.tahun} />
          <Row label="Warna" value={vehicle.warna} />
          <Row label="Status" value={statusText} />

          {blockedReason ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {blockedReason}
            </div>
          ) : null}

          {!vehicle.dipakai &&
          !vehicle.reservedUsage &&
          !vehicle.dalamPerbaikan &&
          !vehicle.pendingRequest ? (
            <>
              <Input label="Pengguna" value={pengguna} onChange={setPengguna} />
              <Input
                label="Keperluan"
                value={keperluan}
                onChange={setKeperluan}
              />

              <DateTimeWheelRow
                label="Waktu Penggunaan"
                date={tglPakai}
                onDateChange={setTglPakai}
                minDate={minDate}
                time={jamPakai}
                onTimeChange={setJamPakai}
              />

              <DateTimeWheelRow
                label="Waktu Pengembalian"
                date={tglKembali}
                onDateChange={setTglKembali}
                minDate={tglPakai || minDate}
                time={jamKembali}
                onTimeChange={setJamKembali}
              />

              {hasTimes && !isRangeValid ? (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                  Waktu pengembalian harus setelah waktu penggunaan.
                </div>
              ) : null}
            </>
          ) : null}

          {activeSince ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Dipakai sejak: {formatID24(activeSince)}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
          <button
            onClick={() => {
              if (deleting) return;
              onClose();
            }}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={deleting}
          >
            Batal
          </button>

          <button
            disabled={!canSubmit || deleting}
            onClick={async () => {
              if (deleting) return;

              if (!canSubmit) {
                if (blockedReason) {
                  toast.error(blockedReason);
                  return;
                }
                if (
                  !pengguna.trim() ||
                  !keperluan.trim() ||
                  !tglPakai ||
                  !tglKembali
                ) {
                  toast.error("Informasi tidak lengkap!");
                  return;
                }
                toast.error(
                  "Waktu pengembalian harus setelah waktu penggunaan!",
                );
                return;
              }

              if (!startDate || !endDate) return;

              await onUse({
                vehicle,
                keperluan: keperluan.trim(),
                startAt: startDate.toISOString(),
                endAt: endDate.toISOString(),
              });
            }}
            className="rounded-xl bg-[#004282] px-4 py-2 text-sm text-white disabled:bg-red-300 disabled:opacity-20"
          >
            Buat Pengajuan
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Arsipkan kendaraan?"
        description={`Kendaraan "${vehicle.merk}" (${vehicle.nomorPolisi}) akan diarsipkan (soft delete) dan tidak muncul di daftar aktif.`}
        confirmText={deleting ? "Menyimpan..." : "Ya, Arsipkan"}
        cancelText="Batal"
        loading={deleting}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
        onConfirm={handleDeleteVehicle}
      />

      {maintenanceOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close maintenance"
            onClick={() => (!maintaining ? setMaintenanceOpen(false) : null)}
            disabled={maintaining}
          />

          <div className="absolute left-1/2 top-1/2 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
            <div className="border-b p-4">
              <p className="text-base font-semibold text-gray-900">
                Set Kendaraan ke Maintenance
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Isi alasan maintenance untuk audit log.
              </p>
            </div>

            <div className="p-4">
              <textarea
                value={maintenanceReasonInput}
                onChange={(e) => setMaintenanceReasonInput(e.target.value)}
                className="w-full min-h-24 rounded-lg border p-3 outline-none"
                placeholder="Alasan maintenance..."
              />
            </div>

            <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setMaintenanceOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={maintaining}
              >
                Batal
              </button>
              <button
                onClick={handleStartMaintenance}
                className="rounded-xl px-4 py-2 text-sm disabled:opacity-100"
                style={{
                  backgroundColor: maintaining ? "#d1d5db" : "#d97706",
                  color: maintaining ? "#4b5563" : "#ffffff",
                }}
                disabled={maintaining}
              >
                {maintaining ? "Menyimpan..." : "Set Maintenance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Close confirm"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-60"
            disabled={loading}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-gray-600 sm:min-w-[110px]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border bg-white px-2 py-1 outline-0"
      />
    </div>
  );
}

function DateTimeWheelRow({
  label,
  date,
  onDateChange,
  minDate,
  time,
  onTimeChange,
}: {
  label: string;
  date: string;
  onDateChange: (v: string) => void;
  minDate?: string;
  time: string;
  onTimeChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-gray-600 sm:min-w-[150px]">{label}</span> 

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded border bg-white px-2 py-1 outline-0"
        />

        <div className="shrink-0">
          <TimeWheel value={time} onChange={onTimeChange} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value ?? "-"}</span>
    </div>
  );
}
