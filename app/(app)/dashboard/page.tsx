"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Signika } from "next/font/google";
import DisplayInfo from "@/app/components/DisplayInfo";
import { useCurrentUser } from "@/app/components/UserContext";

const signika = Signika({ subsets: ["latin"], weight: ["400", "500", "700"] });

type Stats = {
  tersedia: number;
  digunakan: number;
  diperbaiki: number;
  overdue: number;
  total: number;
};
type AuditItem = {
  id: number;
  createdAt: string;
  action: string;
  usageId: number | null;
  usageStatus: string | null;
  pemohon: { id: number; name: string; nip: string } | null;
  kendaraan: { id: number; merk: string; nomorPolisi: string } | null;
  tujuan: string | null;
  keperluan: string | null;
  maintenanceKind?: string | null;
  maintenanceReason?: string | null;
};
type AnalyticVehicle = {
  vehicleId: number;
  merk: string;
  nomorPolisi: string;
  count: number;
};
type AnalyticDetail = {
  id: number;
  status: string;
  startAt: string;
  endAt: string | null;
  tujuan: string | null;
  keperluan: string | null;
  user: { id: number; name: string; nip: string };
};
type AnalyticRes = {
  ok: boolean;
  month: string;
  topVehicleThisMonth: AnalyticVehicle | null;
  vehiclesThisMonth: AnalyticVehicle[];
  vehicleDetails: AnalyticDetail[];
};
type UserRequestDetail = {
  usageId: number;
  createdAt: string;
  vehicleLabel: string;
  purpose: string;
  status: string;
};
type ViewMode = "top" | "month" | "history" | "user";

function actionLabel(item: AuditItem) {
  if (item.maintenanceKind === "MAINTENANCE_START")
    return "Maintenance dimulai";
  if (item.maintenanceKind === "MAINTENANCE_END") return "Maintenance selesai";
  if (item.maintenanceKind === "VEHICLE_SOFT_DELETED")
    return "Kendaraan diarsipkan";

  switch (item.action) {
    case "REQUEST_CREATED":
      return "Request dibuat";
    case "REQUEST_APPROVED":
      return "Request disetujui";
    case "REQUEST_REJECTED":
      return "Request ditolak";
    case "USAGE_ACTIVATED":
      return "Peminjaman dimulai";
    case "USAGE_COMPLETED":
      return "Kendaraan dikembalikan";
    default:
      return item.action;
  }
}

const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthKey = (x: string) => {
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  if (!y || !m) return k;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};
const lastMonthKeys = (count: number) => {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
};

export default function DashboardPage() {
  const me = useCurrentUser();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<AuditItem[]>([]);
  const [mode, setMode] = useState<ViewMode>("top");
  const [month, setMonth] = useState(monthNow());
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [analytic, setAnalytic] = useState<AnalyticRes | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const headerMoreRef = useRef<HTMLDivElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{
    vehicleId: number;
    x: number;
    y: number;
  } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [details, setDetails] = useState<AnalyticDetail[]>([]);
  const [userRowMenu, setUserRowMenu] = useState<{
    userId: number;
    x: number;
    y: number;
  } | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    nip: string;
  } | null>(null);
  const [userDetails, setUserDetails] = useState<UserRequestDetail[]>([]);

  useEffect(() => {
    fetch("/api/vehicles/dashboard")
      .then((r) => r.json())
      .then(setStats);
  }, []);
  useEffect(() => {
    if (me.role !== "ADMIN") return;
    fetch("/api/audit-logs?take=1000", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setHistory(Array.isArray(j?.data) ? j.data : []));
  }, [me.role]);
  useEffect(() => {
    if (me.role !== "ADMIN") return;
    fetch(
      `/api/dashboard/vehicle-analytics?month=${encodeURIComponent(month)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((j) => setAnalytic(j?.ok ? j : null));
  }, [me.role, month]);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (!moreOpen) return;
      const root = headerMoreRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [moreOpen]);

  const monthSummary = useMemo(() => {
    const m = new Map<
      string,
      { key: string; total: number; completed: number }
    >();
    for (const h of history) {
      const k = monthKey(h.createdAt);
      if (!k) continue;
      const row = m.get(k) ?? { key: k, total: 0, completed: 0 };
      row.total += 1;
      if (h.action === "USAGE_COMPLETED") row.completed += 1;
      m.set(k, row);
    }
    return Array.from(m.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [history]);

  const graphCards = useMemo(() => {
    const keys = lastMonthKeys(6);
    const usageSeenByMonth = new Map<string, Set<number>>();
    const completedSeenByMonth = new Map<string, Set<number>>();
    const vehicleCountByMonth = new Map<string, Map<string, { label: string; count: number }>>();

    for (const h of history) {
      const key = monthKey(h.createdAt);
      if (!key || !keys.includes(key) || !h.usageId) continue;

      const usageSet = usageSeenByMonth.get(key) ?? new Set<number>();
      usageSet.add(h.usageId);
      usageSeenByMonth.set(key, usageSet);

      if (h.action === "USAGE_COMPLETED") {
        const completedSet = completedSeenByMonth.get(key) ?? new Set<number>();
        completedSet.add(h.usageId);
        completedSeenByMonth.set(key, completedSet);
      }

      if (h.kendaraan) {
        const vehicleMap = vehicleCountByMonth.get(key) ?? new Map<string, { label: string; count: number }>();
        const vehicleKey = `${h.kendaraan.id ?? 0}`;
        const label = `${h.kendaraan.merk} (${h.kendaraan.nomorPolisi})`;
        const current = vehicleMap.get(vehicleKey) ?? { label, count: 0 };
        current.count += 1;
        vehicleMap.set(vehicleKey, current);
        vehicleCountByMonth.set(key, vehicleMap);
      }
    }

    return keys.map((key) => {
      const vehicles = Array.from(vehicleCountByMonth.get(key)?.values() ?? []).sort(
        (a, b) => b.count - a.count,
      );
      const topVehicle = vehicles[0] ?? null;
      return {
        key,
        label: monthLabel(key),
        totalUsage: usageSeenByMonth.get(key)?.size ?? 0,
        completedUsage: completedSeenByMonth.get(key)?.size ?? 0,
        topVehicleLabel: topVehicle?.label ?? "Belum ada data",
        topVehicleCount: topVehicle?.count ?? 0,
      };
    });
  }, [history]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>([monthNow()]);
    for (const h of history) {
      const k = monthKey(h.createdAt);
      if (k) set.add(k);
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [history]);

  const searchNorm = vehicleSearch.trim().toLowerCase();
  const userSearchNorm = userSearch.trim().toLowerCase();
  const filteredTopVehicles = useMemo(() => {
    const rows = analytic?.vehiclesThisMonth ?? [];
    if (!searchNorm) return rows;
    return rows.filter((v) =>
      `${v.merk} ${v.nomorPolisi}`.toLowerCase().includes(searchNorm),
    );
  }, [analytic?.vehiclesThisMonth, searchNorm]);

  const filteredHistory = useMemo(() => {
    const rows = history.slice(0, 20);
    if (!searchNorm && !userSearchNorm) return rows;
    return rows.filter((h) => {
      const vehicleName = h.kendaraan
        ? `${h.kendaraan.merk} ${h.kendaraan.nomorPolisi}`.toLowerCase()
        : "";
      const userName = h.pemohon
        ? `${h.pemohon.name} ${h.pemohon.nip}`.toLowerCase()
        : "";
      const vehicleOk = !searchNorm || vehicleName.includes(searchNorm);
      const userOk = !userSearchNorm || userName.includes(userSearchNorm);
      return vehicleOk && userOk;
    });
  }, [history, searchNorm, userSearchNorm]);

  const userSummary = useMemo(() => {
    const rows = history.filter((h) => h.pemohon);
    const map = new Map<
      string,
      {
        id: number;
        name: string;
        nip: string;
        total: number;
        completed: number;
        approved: number;
      }
    >();
    for (const h of rows) {
      const p = h.pemohon!;
      const key = `${p.id}`;
      const row = map.get(key) ?? {
        id: p.id,
        name: p.name,
        nip: p.nip,
        total: 0,
        completed: 0,
        approved: 0,
      };
      row.total += 1;
      if (h.action === "USAGE_COMPLETED") row.completed += 1;
      if (h.action === "REQUEST_APPROVED") row.approved += 1;
      map.set(key, row);
    }
    const result = Array.from(map.values()).sort((a, b) => b.total - a.total);
    if (!userSearchNorm) return result;
    return result.filter((u) =>
      `${u.name} ${u.nip}`.toLowerCase().includes(userSearchNorm),
    );
  }, [history, userSearchNorm]);

  const userRequestMap = useMemo(() => {
    const map = new Map<number, UserRequestDetail[]>();
    const seen = new Set<string>();
    for (const h of history) {
      if (!h.pemohon || !h.usageId) continue;
      const dedupeKey = `${h.pemohon.id}:${h.usageId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const row: UserRequestDetail = {
        usageId: h.usageId,
        createdAt: h.createdAt,
        vehicleLabel: h.kendaraan
          ? `${h.kendaraan.merk} (${h.kendaraan.nomorPolisi})`
          : "Kendaraan tidak diketahui",
        purpose: h.keperluan || h.tujuan || "-",
        status: h.usageStatus || actionLabel(h),
      };
      const list = map.get(h.pemohon.id) ?? [];
      list.push(row);
      map.set(h.pemohon.id, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        list.sort((a, b) =>
          new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime()
            ? 1
            : -1,
        ),
      );
    }
    return map;
  }, [history]);

  async function openDetail(vehicleId: number) {
    setRowMenu(null);
    const j = await fetch(
      `/api/dashboard/vehicle-analytics?month=${encodeURIComponent(month)}&vehicleId=${vehicleId}`,
      { cache: "no-store" },
    ).then((r) => r.json());
    setDetails(Array.isArray(j?.vehicleDetails) ? j.vehicleDetails : []);
    setDetailOpen(true);
  }

  function openUserDetail(user: { id: number; name: string; nip: string }) {
    setUserRowMenu(null);
    setSelectedUser(user);
    setUserDetails(userRequestMap.get(user.id) ?? []);
    setUserDetailOpen(true);
  }

  function exportExcel() {
    const rows = history
      .map(
        (h) =>
          `<tr><td>${new Date(h.createdAt).toLocaleString("id-ID")}</td><td>${h.action}</td><td>${h.kendaraan ? `${h.kendaraan.merk} (${h.kendaraan.nomorPolisi})` : "-"}</td><td>${h.keperluan || h.tujuan || "-"}</td></tr>`,
      )
      .join("");
    const html = `<html><body><h2>History Dashboard</h2><table border="1"><tr><th>Tanggal</th><th>Aksi</th><th>Kendaraan</th><th>Keperluan</th></tr>${rows}</table></body></html>`;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMoreOpen(false);
  }

  if (!stats) return null;

  return (
    <div
      className={`w-full min-h-full bg-gray-100 flex justify-center ${signika.className}`}
    >
      <div className="min-h-full pb-10 transition-all duration-300 ease-in-out items-center mx-34 flex flex-col gap-4">
        <div className="p-4 gap-6 flex flex-col items-center mt-10">
          <div className="w-fit flex flex-wrap gap-4 justify-center">
            <DisplayInfo
              path="/car-available.svg"
              value={stats.tersedia}
              value_color="#22aa00"
              desc="Mobil Tersedia"
              desc_color="#000000"
              border_color="#000000"
              inner_color="#ffffff"
            />
            <DisplayInfo
              path="/car-used.svg"
              value={stats.digunakan}
              value_color="#9a9a9a"
              desc="Mobil digunakan"
              desc_color="#000000"
              border_color="#000000"
              inner_color="#ffffff"
            />
            <DisplayInfo
              path="/car-maintanance.svg"
              value={stats.diperbaiki}
              value_color="#eaa301"
              desc="Mobil Diperbaiki"
              desc_color="#000000"
              border_color="#000000"
              inner_color="#ffffff"
            />
            <DisplayInfo
              path="/warning.svg"
              value={stats.overdue}
              value_color="#ee0000"
              desc="Peringatan"
              desc_color="#000000"
              border_color="#000000"
              inner_color="#ffffff"
            />
          </div>
        </div>

        {me.role === "ADMIN" && (
          <section className="flex flex-col gap-4 mx-6 w-full px-4 py-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap gap-3 items-end justify-between">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Tampilan
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ViewMode)}
                    className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="top">Top Kendaraan Bulan Ini</option>
                    <option value="month">Ringkasan Per Bulan</option>
                    <option value="user">History Per User</option>
                    <option value="history">History Detail</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Bulan
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-w-[180px]"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Cari Nama Mobil
                  </label>
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    placeholder="Contoh: Avanza atau BG 1738"
                    className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-w-[220px]"
                  />
                </div>
                {mode === "user" ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Cari User
                    </label>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Contoh: Fentanyl atau 123"
                      className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-w-[220px]"
                    />
                  </div>
                ) : null}
              </div>
              <div className="relative" ref={headerMoreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  More
                </button>
                {moreOpen && (
                  <div className="absolute right-0 z-[90] mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={exportExcel}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Export ke Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMonth(monthNow());
                        setVehicleSearch("");
                        setUserSearch("");
                        setMode("top");
                        setMoreOpen(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}
              </div>
            </div>

            {mode === "top" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Kendaraan Paling Sering Dipakai ({month})
                  </h3>
                  <p className="text-sm text-slate-600">
                    Gunakan tombol More per row untuk melihat detail penggunaan.
                  </p>
                </div>
                <div className="px-4 py-3 text-sm text-slate-700">
                  {analytic?.topVehicleThisMonth
                    ? `Teratas: ${analytic.topVehicleThisMonth.merk} (${analytic.topVehicleThisMonth.nomorPolisi}) - ${analytic.topVehicleThisMonth.count} penggunaan`
                    : "Belum ada penggunaan bulan ini."}
                </div>
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Kendaraan
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Total
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTopVehicles.map((v) => (
                      <tr key={v.vehicleId}>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {v.merk} ({v.nomorPolisi})
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {v.count}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = (
                                e.currentTarget as HTMLButtonElement
                              ).getBoundingClientRect();
                              setRowMenu((prev) =>
                                prev?.vehicleId === v.vehicleId
                                  ? null
                                  : {
                                      vehicleId: v.vehicleId,
                                      x: rect.right,
                                      y: rect.bottom,
                                    },
                              );
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            More
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTopVehicles.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-sm text-slate-600"
                        >
                          Tidak ada data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {mode === "month" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  Ringkasan Penggunaan Bulanan
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Setiap bulan diringkas dalam satu card, diurutkan dari yang terbaru.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {[...graphCards].reverse().map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {item.label}
                          </p>
                          <h4 className="mt-2 text-2xl font-bold text-slate-900">
                            {item.totalUsage} aktivitas
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-500">
                            Selesai
                          </p>
                          <p className="mt-1 text-xl font-bold text-[#004282]">
                            {item.completedUsage}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Mobil paling sering digunakan
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {item.topVehicleLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.topVehicleCount} catatan
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === "user" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        User
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        NIP
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Total Aktivitas
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Approved
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Selesai
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {userSummary.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {u.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {u.nip}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {u.total}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {u.approved}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {u.completed}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = (
                                e.currentTarget as HTMLButtonElement
                              ).getBoundingClientRect();
                              setUserRowMenu((prev) =>
                                prev?.userId === u.id
                                  ? null
                                  : { userId: u.id, x: rect.right, y: rect.bottom },
                              );
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            More
                          </button>
                        </td>
                      </tr>
                    ))}
                    {userSummary.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-4 text-sm text-slate-600"
                        >
                          Tidak ada data sesuai user.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {mode === "history" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Aksi
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-600">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredHistory.map((h) => (
                      <tr
                        key={h.id}
                        className="cursor-pointer hover:bg-slate-50/70"
                        onClick={() =>
                          h.usageId
                            ? router.push(`/requests/${h.usageId}`)
                            : h.kendaraan?.id
                              ? router.push(
                                  `/vehicles?vehicleId=${h.kendaraan.id}`,
                                )
                              : null
                        }
                      >
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {new Date(h.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {actionLabel(h)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {h.kendaraan
                            ? `${h.kendaraan.merk} (${h.kendaraan.nomorPolisi})`
                            : "-"}{" "}
                          |{" "}
                          {h.keperluan ||
                            h.tujuan ||
                            h.maintenanceReason ||
                            "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-sm text-slate-600"
                        >
                          Tidak ada data sesuai nama mobil.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailOpen(false)}
            aria-label="Close detail"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(94vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Detail Penggunaan Kendaraan ({month})
              </h3>
              <button
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                onClick={() => setDetailOpen(false)}
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Req
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Pemohon
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Mulai
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Selesai
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Keperluan
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {details.map((d) => (
                    <tr
                      key={d.id}
                      className="cursor-pointer hover:bg-slate-50/70"
                      onClick={() => router.push(`/requests/${d.id}`)}
                    >
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        #{d.id}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.user.name} ({d.user.nip})
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {new Date(d.startAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.endAt
                          ? new Date(d.endAt).toLocaleString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.keperluan || d.tujuan || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.status}
                      </td>
                    </tr>
                  ))}
                  {details.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-3 text-sm text-slate-600"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {userDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setUserDetailOpen(false)}
            aria-label="Close user detail"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(94vw,920px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Request Peminjaman User
                </h3>
                <p className="text-sm text-slate-600">
                  {selectedUser.name} ({selectedUser.nip})
                </p>
              </div>
              <button
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                onClick={() => setUserDetailOpen(false)}
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Req
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Tanggal
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Kendaraan
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Keperluan
                    </th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {userDetails.map((d) => (
                    <tr
                      key={d.usageId}
                      className="cursor-pointer hover:bg-slate-50/70"
                      onClick={() => router.push(`/requests/${d.usageId}`)}
                    >
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        #{d.usageId}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {new Date(d.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.vehicleLabel}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.purpose}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">
                        {d.status}
                      </td>
                    </tr>
                  ))}
                  {userDetails.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-3 text-sm text-slate-600"
                      >
                        Tidak ada request untuk user ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {rowMenu && (
        <>
          <button
            className="fixed inset-0 z-[190] cursor-default bg-transparent"
            onClick={() => setRowMenu(null)}
            aria-label="Close row menu"
          />
          <div
            className="fixed z-[200] w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            style={{
              left: `${Math.max(8, rowMenu.x - 176)}px`,
              top: `${rowMenu.y + 6}px`,
            }}
          >
            <button
              type="button"
              onClick={() => openDetail(rowMenu.vehicleId)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Lihat Detail
            </button>
            <button
              type="button"
              onClick={() => {
                const id = rowMenu.vehicleId;
                setRowMenu(null);
                router.push(`/vehicles?vehicleId=${id}`);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Buka Kendaraan
            </button>
          </div>
        </>
      )}

      {userRowMenu && (
        <>
          <button
            className="fixed inset-0 z-[190] cursor-default bg-transparent"
            onClick={() => setUserRowMenu(null)}
            aria-label="Close user row menu"
          />
          <div
            className="fixed z-[200] w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            style={{
              left: `${Math.max(8, userRowMenu.x - 192)}px`,
              top: `${userRowMenu.y + 4}px`,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const user = userSummary.find((u) => u.id === userRowMenu.userId);
                if (!user) return setUserRowMenu(null);
                openUserDetail(user);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Lihat Detail
            </button>
          </div>
        </>
      )}
    </div>
  );
}
