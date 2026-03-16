"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrentUser } from "@/app/components/UserContext";

type UsageDetail = {
  id: number;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELED";
  tujuan: string | null;
  keperluan: string | null;
  startAt: string;
  endAt: string | null;

  user: { id: number; name: string; nip: string };
  vehicle: { id: number; merk: string; nomorPolisi: string };

  approvedById: number | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
};

function fmt(v: any) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID");
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const me = useCurrentUser();

  const rawId = params?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const usageId = useMemo(() => Number(idStr), [idStr]);

  const isAdmin =
    (me as any)?.role === "ADMIN" ||
    (me as any)?.role === "admin" ||
    (me as any)?.isAdmin === true;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<UsageDetail | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const idValid = Boolean(idStr) && Number.isFinite(usageId) && usageId > 0;

  async function load() {
    if (!idValid) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/usages/${usageId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        toast.error("Gagal memuat request", {
          description: json?.error ?? `HTTP ${res.status}`,
        });
        setData(null);
        return;
      }

      setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idStr]);

  async function decide(decision: "APPROVE" | "REJECT") {
    if (!idValid) {
      toast.error("Invalid usage id");
      return;
    }

    const rejectReason = reason.trim();

    if (decision === "REJECT" && rejectReason.length < 3) {
      toast.error("Alasan penolakan minimal 3 karakter");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/usages/${usageId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejectReason: decision === "REJECT" ? rejectReason : "",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        toast.error("Gagal memproses", {
          description: json?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success(
        decision === "APPROVE" ? "Request disetujui" : "Request ditolak",
      );
      setRejectOpen(false);
      setReason("");

      await load();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function returnVehicle() {
    if (!idValid) {
      toast.error("Invalid usage id");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/usages/${usageId}/return`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        toast.error("Gagal mengembalikan kendaraan", {
          description: json?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Kendaraan berhasil dikembalikan");
      await load();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!idValid) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border bg-white p-4">
            <div className="font-semibold text-red-600">
              Invalid usage id (must be numeric)
            </div>
            <div className="text-sm text-neutral-600 mt-1">
              got: {JSON.stringify(rawId ?? "")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-col px-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border bg-[#004282] text-white px-3 py-2 text-sm"
          >
            Kembali
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Detail Request
            </h1>
            <p className="mt-1 text-sm text-neutral-600">ID: {usageId}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          {loading && <div className="text-sm text-neutral-600">Memuat…</div>}

          {!loading && !data && (
            <div className="text-sm text-neutral-600">
              Data tidak ditemukan.
            </div>
          )}

          {!loading && data && (
            <div className="space-y-3 text-sm">
              <Row label="Status" value={data.status} />
              <Row
                label="Pemohon"
                value={`${data.user.name} (${data.user.nip})`}
              />
              <Row
                label="Kendaraan"
                value={`${data.vehicle.merk} (${data.vehicle.nomorPolisi})`}
              />
              <Row label="Mulai" value={fmt(data.startAt)} />
              <Row label="Selesai" value={data.endAt ? fmt(data.endAt) : "-"} />
              <Row
                label="Tujuan/Keperluan"
                value={
                  data.keperluan?.trim() ||
                  data.tujuan?.trim() ||
                  "Tidak ada data keperluan"
                }
              />

              {data.status === "REJECTED" && (
                <div className="rounded-lg bg-red-50 p-3 text-red-700">
                  Ditolak: {data.rejectReason ?? "-"}
                </div>
              )}

              {isAdmin && data.status === "PENDING" && (
                <div className="pt-2 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() => decide("APPROVE")}
                    className="rounded-lg bg-[#004282] px-4 py-2 text-white hover:bg-[#004282] disabled:opacity-50"
                  >
                    Setujui
                  </button>

                  <button
                    disabled={saving}
                    onClick={() => setRejectOpen(true)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                </div>
              )}

              {(data.status === "APPROVED" || data.status === "ACTIVE") && (
                <div className="pt-2 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={returnVehicle}
                    className="rounded-lg bg-[#004282] px-4 py-2 text-white disabled:opacity-50"
                  >
                    {saving ? "Memproses..." : "Kembalikan Kendaraan"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {rejectOpen && (
          <div className="fixed inset-0 z-50">
            <button
              className="absolute inset-0 bg-black/50"
              onClick={() => (!saving ? setRejectOpen(false) : null)}
              aria-label="Close"
            />

            <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
              <div className="border-b p-4">
                <div className="font-semibold">Tolak request</div>
                <div className="text-sm text-neutral-600 mt-1">
                  Isi alasan penolakan.
                </div>
              </div>

              <div className="p-4">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full min-h-28 rounded-lg border p-3 outline-none"
                  placeholder="Alasan penolakan…"
                />
              </div>

              <div className="border-t p-4 flex justify-end gap-2">
                <button
                  disabled={saving}
                  onClick={() => setRejectOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  disabled={saving}
                  onClick={() => decide("REJECT")}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {saving ? "Memproses…" : "Tolak"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
      <div className="text-neutral-600">{label}</div>
      <div className="font-medium text-neutral-900">{value ?? "-"}</div>
    </div>
  );
}
