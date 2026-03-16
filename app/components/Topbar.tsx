"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Notif = {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  href?: string | null;
  createdAt: string | Date;
  readAt?: string | Date | null;
};

function formatTime(v: unknown) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID");
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
  await fetch("/api/notification/read-all", { method: "POST" });
}

export default function Topbar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function loadNotif(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/notification", { cache: "no-store" });
      const ct = res.headers.get("Content-Type") || "";

      if (!res.ok || !ct.includes("application/json")) {
        setItems([]);
        setUnreadCount(0);
        return;
      }

      const json = await res.json();
      if (json?.ok) {
        setItems(json.data ?? []);
        setUnreadCount(Number(json.unreadCount ?? 0));
      } else {
        setItems([]);
        setUnreadCount(0);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadNotif({ silent: true });
    const t = setInterval(() => loadNotif({ silent: true }), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    loadNotif();
  }, [notifOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!notifOpen) return;
      if (!boxRef.current) return;
      if (boxRef.current.contains(e.target as Node)) return;
      setNotifOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [notifOpen]);

  const hasUnread = unreadCount > 0;

  return (
    <div className="w-full h-16 flex items-center justify-between px-4 border-b border-gray-300 relative">
      <button
        className="w-10 h-10 grid place-items-center rounded-md text-gray-600 text-2xl hover:cursor-pointer hover:bg-black/10 transition"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? "‹" : "☰"}
      </button>

      <div className="relative" ref={boxRef}>
        <button
          className="relative w-10 h-10 grid place-items-center rounded-md hover:cursor-pointer hover:bg-black/10 transition"
          aria-label="Notifications"
          onClick={() => setNotifOpen((v) => !v)}
        >
          <Image src="/bell.svg" alt="notification" width={20} height={20} />

          {hasUnread && (
            <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-600 text-white text-[11px] grid place-items-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-90 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">Notifikasi</div>
                <div className="text-[11px] text-gray-500">
                  {hasUnread
                    ? `${unreadCount} belum dibaca`
                    : "Semua sudah dibaca"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="text-sm text-gray-600 hover:underline"
                  onClick={() => loadNotif()}
                  disabled={loading}
                >
                  Refresh
                </button>

                <button
                  className="text-sm text-gray-600 hover:underline disabled:opacity-40"
                  onClick={async () => {
                    await markAllRead();
                    await loadNotif();
                  }}
                  disabled={!hasUnread || loading}
                >
                  Tandai semua
                </button>
              </div>
            </div>

            <div className="max-h-105 overflow-auto">
              {loading && (
                <div className="px-4 py-4 text-sm text-gray-600">Memuat…</div>
              )}
              {!loading && items.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-600">
                  Belum ada notifikasi.
                </div>
              )}
              {!loading &&
                items.map((n) => {
                  const unread = !n.readAt;

                  return (
                    <a
                      key={String(n.id)}
                      href={n.href ?? "#"}
                      className={`block px-4 py-3 border-b border-gray-100 hover:bg-black/5 ${
                        unread ? "bg-red-50/40" : ""
                      }`}
                      onClick={async (e) => {
                        e.preventDefault();

                        try {
                          if (unread) await markRead(Number(n.id));

                          // optimistic update biar merahnya ilang langsung
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === n.id
                                ? { ...x, readAt: new Date().toISOString() }
                                : x,
                            ),
                          );
                          setUnreadCount((c) =>
                            Math.max(0, c - (unread ? 1 : 0)),
                          );
                        } finally {
                          setNotifOpen(false);
                          loadNotif({ silent: true }); // sync ke server
                          if (n.href) router.push(n.href);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {n.message}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-500 mt-2">
                            {formatTime(n.createdAt)}
                          </div>
                        </div>
                        {unread && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-red-600 shrink-0" />
                        )}
                      </div>
                    </a>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
