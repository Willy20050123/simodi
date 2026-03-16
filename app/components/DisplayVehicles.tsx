"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Vehicle } from "@/app/components/VehicleModal";
import { useCurrentUser } from "./UserContext";

export default function DisplayVehicle({
  onSelect,
  onLoaded,
}: {
  onSelect: (v: Vehicle) => void;
  onLoaded?: (vehicles: Vehicle[]) => void;
}) {
  const me = useCurrentUser();
  const isAdmin =
    (me as any)?.role === "ADMIN" ||
    (me as any)?.role === "admin" ||
    (me as any)?.isAdmin === true;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetDelete, setTargetDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadVehicles() {
      setLoading(true);
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";

        if (!ct.includes("application/json")) {
          throw new Error(await res.text());
        }

        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.detail || data?.error || "Fetch failed");

        const list = Array.isArray(data?.vehicles)
          ? data.vehicles
          : Array.isArray(data?.data)
            ? data.data
            : [];

        if (alive) {
          setVehicles(list);
          onLoaded?.(list);
        }
      } catch (err: any) {
        toast.error("Gagal load kendaraan", { description: err?.message });
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadVehicles();
    return () => {
      alive = false;
    };
  }, [onLoaded]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading vehicles...</div>;
  }

  if (vehicles.length === 0) {
    return <div className="text-sm text-gray-500">Tidak ada kendaraan.</div>;
  }

  async function doDeleteVehicle() {
    if (!targetDelete) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/vehicles/${targetDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error("Gagal menghapus kendaraan", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Kendaraan berhasil diarsipkan");
      setVehicles((prev) => prev.filter((x) => x.id !== targetDelete.id));
      setConfirmOpen(false);
      setTargetDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((v) => {
          const tersedia = Boolean(v.tersedia);
          const reserved =
            !tersedia && !v.dalamPerbaikan && !v.dipakai && !v.pendingRequest;

          const status = v.dalamPerbaikan
            ? { label: "Perbaikan", cls: "bg-red-100 text-red-700" }
            : v.pendingRequest
              ? {
                  label: `Pending (${v.pendingRequest.byName})`,
                  cls: "bg-blue-100 text-blue-700",
                }
              : v.dipakai
                ? { label: "Dipakai", cls: "bg-amber-100 text-amber-800" }
                : reserved
                  ? {
                      label: "Direservasi",
                      cls: "bg-indigo-100 text-indigo-700",
                    }
                  : { label: "Tersedia", cls: "bg-green-100 text-green-700" };

          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect({ ...v, tersedia })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect({ ...v, tersedia });
                }
              }}
              className="text-left rounded-2xl border bg-white p-4 hover:shadow-sm transition hover:cursor-pointer"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.merk}</p>
                  <p className="text-sm text-gray-500">{v.nomorPolisi}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${status.cls}`}>
                    {status.label}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetDelete(v);
                        setConfirmOpen(true);
                      }}
                      className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                      disabled={deleting}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                Tahun: {v.tahun}
                <br />
                Warna: {v.warna}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Arsipkan kendaraan?"
        description={
          targetDelete
            ? `Kendaraan "${targetDelete.merk}" (${targetDelete.nomorPolisi}) akan diarsipkan (soft delete) dan tidak muncul di daftar aktif.`
            : ""
        }
        confirmText={deleting ? "Menyimpan..." : "Ya, Arsipkan"}
        cancelText="Batal"
        loading={deleting}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
        onConfirm={doDeleteVehicle}
      />
    </>
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
            className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-60 sm:w-auto"
            disabled={loading}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
