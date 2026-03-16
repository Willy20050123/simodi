"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Vehicle = {
  id: number;
  merk: string;
  tahun: number;
  warna: string;
  nomorPolisi: string;
  dalamPerbaikan: boolean;
};

type VehiclesState = {
  vehicles: Vehicle[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const VehiclesContext = createContext<VehiclesState | null>(null);

export function VehiclesProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const r = await fetch("/api/vehicles", { cache: "no-store" });
    if (!r.ok) {
      setLoading(false);
      throw new Error("Gagal ambil vehicles");
    }
    const payload = await r.json();
    const list = Array.isArray(payload?.vehicles)
      ? payload.vehicles
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    setVehicles(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  return (
    <VehiclesContext.Provider value={{ vehicles, loading, refresh }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error("useVehicles must be used inside VehiclesProvider");
  return ctx;
}
