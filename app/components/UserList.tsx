"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrentUser } from "./UserContext";

type UserRow = {
  id: number;
  nip: string;
  name: string;
  fungsi: string;
  posisi: string;
  createdAt?: string;
};

export default function UsersList() {
  const router = useRouter();
  const me = useCurrentUser();
  const isAdmin = (me as any)?.role === "ADMIN";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [savingReset, setSavingReset] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
          ? data
          : [];
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const rows = useMemo(() => users, [users]);

  async function doDelete() {
    if (!selected) return;

    if (selected.id === (me as any)?.id) {
      toast.error("Tidak boleh menghapus akun sendiri.");
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(`/api/users/${selected.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Gagal menghapus user", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success("User berhasil dinonaktifkan");

      setUsers((prev) => prev.filter((u) => u.id !== selected.id));

      setConfirmOpen(false);
      setSelected(null);

      router.refresh();
    } catch (e: any) {
      toast.error("Gagal menghapus user", {
        description: e?.message ?? "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function doResetPassword() {
    if (!resetTarget) return;

    if (!adminPassword || !newPassword || !confirmPassword) {
      toast.error("Semua field wajib diisi");
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

    try {
      setSavingReset(true);

      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error("Gagal reset password", {
          description: data?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      toast.success(`Password user ${resetTarget.name} berhasil direset`);
      setResetOpen(false);
      setResetTarget(null);
      setAdminPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error("Gagal reset password", {
        description: e?.message ?? "Unknown error",
      });
    } finally {
      setSavingReset(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
        Memuat...
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="grid grid-cols-11 border-b bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-700">
          <div className="col-span-3">Nama</div>
          <div className="col-span-2">NIP</div>
          <div className="col-span-3">Fungsi</div>
          <div className="col-span-2">Posisi</div>
          <div className="col-span-1 text-right">Aksi</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-neutral-600">
            Belum ada user.
          </div>
        ) : (
          rows.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-11 items-center border-b px-4 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-3 font-medium text-neutral-900">
                {u.name}
              </div>

              <div className="col-span-2 text-neutral-700">{u.nip}</div>

              <div className="col-span-3 text-neutral-700">{u.fungsi}</div>

              <div className="col-span-2 text-neutral-700">{u.posisi}</div>

              <div className="col-span-1 flex justify-end">
                {isAdmin ? (
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg bg-[#004282] px-3 py-1 text-xs font-semibold text-white hover:bg-[#00356a] disabled:opacity-50"
                      disabled={savingReset}
                      onClick={() => {
                        setResetTarget(u);
                        setAdminPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setResetOpen(true);
                      }}
                    >
                      Reset Password
                    </button>

                    <button
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                      disabled={deleting}
                      onClick={() => {
                        setSelected(u);
                        setConfirmOpen(true);
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">-</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Nonaktifkan user?"
        description={
          selected
            ? `User "${selected.name}" (${selected.nip}) akan dinonaktifkan (soft delete) dan tidak muncul di daftar aktif.`
            : ""
        }
        confirmText={deleting ? "Menyimpan..." : "Ya, Nonaktifkan"}
        cancelText="Batal"
        loading={deleting}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
        onConfirm={doDelete}
      />

      <ResetPasswordDialog
        open={resetOpen}
        target={resetTarget}
        adminPassword={adminPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        loading={savingReset}
        onChangeAdminPassword={setAdminPassword}
        onChangeNewPassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onCancel={() => {
          if (savingReset) return;
          setResetOpen(false);
        }}
        onConfirm={doResetPassword}
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
    <div className="fixed inset-0 z-60">
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Close confirm"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4">
          <p className="text-base font-semibold text-neutral-900">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-neutral-600">{description}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 p-4">
          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
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

function ResetPasswordDialog({
  open,
  target,
  adminPassword,
  newPassword,
  confirmPassword,
  loading,
  onChangeAdminPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  target: UserRow | null;
  adminPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  onChangeAdminPassword: (v: string) => void;
  onChangeNewPassword: (v: string) => void;
  onChangeConfirmPassword: (v: string) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-60">
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Close reset password"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="absolute left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4">
          <p className="text-base font-semibold text-neutral-900">
            Reset Password User
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {target.name} ({target.nip})
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Konfirmasi Password Admin
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => onChangeAdminPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Password Baru User
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => onChangeNewPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => onChangeConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#004282]/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-4">
          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            disabled={loading}
          >
            Batal
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-[#004282] px-4 py-2 text-sm text-white hover:bg-[#00356a] disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
