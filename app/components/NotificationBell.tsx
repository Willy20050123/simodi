"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useNotifications,
  triggerNotifRefresh,
  type Notif,
} from "@/src/hooks/useNotifications";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} detik lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

async function markRead(id: number) {
  await fetch("/api/notification/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
}

async function markAllRead() {
  await fetch("/api/notification/read-all", {
    method: "POST",
    credentials: "include",
  });
}

export default function NotificationBell() {
  const router = useRouter();
  const { data, isLoading, mutate } = useNotifications();
  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (boxRef.current && !boxRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const hasUnread = unread > 0;

  const grouped = useMemo(() => {
    const unreadList = notifications.filter((n) => !n.readAt);
    const readList = notifications.filter((n) => !!n.readAt);
    return { unreadList, readList };
  }, [notifications]);

  async function onClickNotif(n: Notif) {
    try {
      if (!n.readAt) {
        await markRead(n.id);
      }
      setOpen(false);
      triggerNotifRefresh();

      if (n.href) router.push(n.href);
      else router.refresh();
    } catch {
      if (n.href) router.push(n.href);
    }
  }

  async function onMarkAll() {
    await markAllRead();
    await mutate();
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-neutral-100"
        aria-label="Notifikasi"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={hasUnread ? "text-neutral-900" : "text-neutral-700"}
        >
          <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
        </svg>

        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 text-[11px] flex items-center justify-center rounded-full bg-red-600 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-90 max-w-[90vw] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-neutral-900">
                Notifikasi
              </div>
              <div className="text-xs text-neutral-500">
                {isLoading
                  ? "Memuat..."
                  : hasUnread
                    ? `${unread} belum dibaca`
                    : "Semua sudah dibaca"}
              </div>
            </div>

            <button
              onClick={onMarkAll}
              disabled={!hasUnread}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 disabled:opacity-40"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div className="max-h-105 overflow-auto">
            {!notifications.length && !isLoading && (
              <div className="px-4 py-10 text-center text-sm text-neutral-500">
                Belum ada notifikasi.
              </div>
            )}

            {!!grouped.unreadList.length && (
              <div className="px-2 pb-2">
                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500">
                  BELUM DIBACA
                </div>
                <div className="space-y-1">
                  {grouped.unreadList.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onClickNotif(n)}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 line-clamp-1">
                            {n.title}
                          </div>
                          {n.message && (
                            <div className="mt-0.5 text-xs text-neutral-600 line-clamp-2">
                              {n.message}
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!!grouped.readList.length && (
              <div className="px-2 pb-2">
                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500">
                  SUDAH DIBACA
                </div>
                <div className="space-y-1">
                  {grouped.readList.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onClickNotif(n)}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-neutral-800 line-clamp-1">
                          {n.title}
                        </div>
                        {n.message && (
                          <div className="mt-0.5 text-xs text-neutral-600 line-clamp-2">
                            {n.message}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-neutral-500">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 px-4 py-2 text-right">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/notifications");
              }}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
            >
              Lihat semua
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
