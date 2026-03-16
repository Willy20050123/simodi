"use client";

import Image from "next/image";
import { Signika } from "next/font/google";
import { useCurrentUser } from "../../components/UserContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

const signika = Signika({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function Account() {
  const user = useCurrentUser();
  const router = useRouter();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST",
    });
    router.refresh();
    toast.info("Log Out Berhasil!");
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Semua field password wajib diisi");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        toast.error("Gagal ganti password", {
          description: json?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("Password berhasil diganti");
      setPwdOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className={`min-h-screen w-full bg-slate-50 ${signika.className}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-linear-to-br from-[#004282] via-[#005bb5] to-[#0066cc] px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/40 bg-white/10 shadow-md ring-1 ring-white/25 backdrop-blur sm:h-24 sm:w-24">
                    <div className="absolute inset-0 bg-white/10" />
                    <Image
                      src="/profile-circle.svg"
                      alt="Profile picture"
                      fill
                      className="relative object-contain p-2"
                      priority
                      sizes="96px"
                    />
                  </div>

                  <div className="text-white">
                    <h1 className="text-xl font-bold leading-tight sm:text-2xl">
                      {user.name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white/85">
                        {user.nip}
                      </span>
                      <span className="hidden text-white/60 sm:inline">•</span>
                      <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white ring-1 ring-white/20">
                        {user.fungsi}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPwdOpen(true)}
                    className="hover:cursor-pointer inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/15 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-white/70"
                  >
                    Ganti Password
                  </button>

                  <button
                    onClick={handleLogout}
                    className="hover:cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-white/30 transition hover:bg-white/95 hover:text-black hover:shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-white/70"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Jabatan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user.posisi}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fungsi
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user.fungsi}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {pwdOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => (!savingPwd ? setPwdOpen(false) : null)}
            aria-label="Close"
          />

          <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
            <div className="border-b p-4">
              <div className="font-semibold">Ganti Password</div>
              <div className="text-sm text-slate-600 mt-1">
                Isi password lama dan password baru.
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
                />
              </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2">
              <button
                disabled={savingPwd}
                onClick={() => setPwdOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                disabled={savingPwd}
                onClick={handleChangePassword}
                className="rounded-lg bg-[#004282] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {savingPwd ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

