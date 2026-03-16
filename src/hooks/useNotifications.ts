"use client";

import useSWR from "swr";
import { useEffect } from "react";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    const ct = r.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await r.json()
      : await r.text();
    if (!r.ok)
      throw new Error(
        typeof data === "string" ? data : (data?.error ?? "Error"),
      );
    return data;
  });

export type Notif = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function useNotifications() {
  const swr = useSWR<{ notifications: Notif[]; unreadCount: number }>(
    "/api/notification",
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    },
  );

  useEffect(() => {
    const handler = () => swr.mutate();
    window.addEventListener("notif-refresh", handler);
    return () => window.removeEventListener("notif-refresh", handler);
  }, [swr]);

  return swr;
}

export function triggerNotifRefresh() {
  window.dispatchEvent(new Event("notif-refresh"));
}
