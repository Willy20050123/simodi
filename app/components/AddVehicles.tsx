"use client";

import { useState } from "react";

// type Role = "USER" | "ADMIN";

export default function AddVehicleButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<{
    merk: string;
    tahun: string | number;
    warna: string;
    nomorPolisi: string | number;

    // nip: string;
    // name: string;
    // fungsi: string;
    // posisi: string;
    // password: string;
    // role: Role;
  }>({
    merk: "",
    tahun: "",
    warna: "",
    nomorPolisi: "",
  });

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prevForm) => ({
        ...prevForm,
        [k]: e.target.value as string,
      }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const r = await fetch("/api/vehicles/addvehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErr(data?.message ?? data?.error ?? "Gagal");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setForm({
      merk: "",
      tahun: "",
      warna: "",
      nomorPolisi: "",
    });

    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 hover:cursor-pointer"
      >
        + Tambah Kendaraan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Tambah Kendaraan Baru
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Isi data kendaraan untuk ditambahkan ke database.
                </p>
              </div>

              <button
                onClick={() => !loading && setOpen(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Merk
                  </label>
                  <input
                    value={form.merk}
                    onChange={onChange("merk")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Toyota, Honda, ..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Tahun
                  </label>
                  <input
                    value={form.tahun}
                    onChange={onChange("tahun")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Tahun Keluaran"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Warna
                  </label>
                  <input
                    value={form.warna}
                    onChange={onChange("warna")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Hitam, Putih, ..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Nomor Polisi
                  </label>
                  <input
                    value={form.nomorPolisi}
                    onChange={onChange("nomorPolisi")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="BG 1234 XY"
                  />
                </div>
              </div>

              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:cursor-pointer"
                >
                  Batal
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 hover:cursor-pointer"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
