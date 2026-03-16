"use client";

import { useNotifications } from "@/src/hooks/useNotifications";

export default function NotificationsPage() {
  const { data, isLoading, mutate } = useNotifications();
  const list = data?.notifications ?? [];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Notifikasi</h1>
      <div className="mt-4 space-y-2">
        {isLoading && <div className="text-sm text-neutral-500">Memuat...</div>}
        {!isLoading && !list.length && (
          <div className="text-sm text-neutral-500">Belum ada notifikasi.</div>
        )}
        {list.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-neutral-900">{n.title}</div>
                {n.message && (
                  <div className="mt-1 text-sm text-neutral-600">
                    {n.message}
                  </div>
                )}
              </div>
              {!n.readAt && (
                <span className="h-2 w-2 rounded-full bg-red-600" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
