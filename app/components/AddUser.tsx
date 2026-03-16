"use client";

import { useState } from "react";

type Role = "USER" | "ADMIN";

export default function AddUserButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<{
    nip: string;
    name: string;
    fungsi: string;
    posisi: string;
    password: string;
    role: Role;
  }>({
    nip: "",
    name: "",
    fungsi: "",
    posisi: "",
    password: "",
    role: "USER",
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

    const r = await fetch("/api/accounts", {
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
      nip: "",
      name: "",
      fungsi: "",
      posisi: "",
      password: "",
      role: "USER",
    });

    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 hover:cursor-pointer"
      >
        + Tambah Akun
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
                  Tambah User Baru
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Isi data pengguna untuk ditambahkan ke database.
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
                    NIP
                  </label>
                  <input
                    value={form.nip}
                    onChange={onChange("nip")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="1985..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Nama
                  </label>
                  <input
                    value={form.name}
                    onChange={onChange("name")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Nama lengkap"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Fungsi
                  </label>
                  <input
                    value={form.fungsi}
                    onChange={onChange("fungsi")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Operasional"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Posisi
                  </label>
                  <input
                    value={form.posisi}
                    onChange={onChange("posisi")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Staff / Driver"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-neutral-700">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={onChange("role")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Admin bisa akses halaman /accounts dan approve/reject
                    request.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-neutral-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={onChange("password")}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                    placeholder="Minimal 8 karakter"
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
