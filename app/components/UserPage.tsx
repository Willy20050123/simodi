"use client";

import UsersList from "@/app/components/UserList";
import AddUserButton from "@/app/components/AddUser";

export default function UsersPage({
  currentUser,
}: {
  currentUser: {
    id: number;
    role: string;
    name: string;
  };
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Akun</h1>

            <p className="mt-1 text-sm text-neutral-600">Data akun terdaftar</p>
          </div>

          <AddUserButton />
        </div>

        <UsersList />
      </div>
    </div>
  );
}
