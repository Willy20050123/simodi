"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import VehicleModal, {
  type UseVehiclePayload,
  type Vehicle,
} from "@/app/components/VehicleModal";
import DisplayVehicle from "@/app/components/DisplayVehicles";
import AddVehicleButton from "@/app/components/AddVehicles";

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [loadedVehicles, setLoadedVehicles] = useState<Vehicle[]>([]);

  const requestedVehicleId = Number(searchParams.get("vehicleId") ?? "");

  function handleSelect(vehicle: Vehicle) {
    setSelected(vehicle);
    setOpenModal(true);
  }

  useEffect(() => {
    if (!Number.isInteger(requestedVehicleId) || requestedVehicleId <= 0)
      return;
    if (loadedVehicles.length === 0) return;

    const target = loadedVehicles.find((v) => v.id === requestedVehicleId);
    if (!target) return;

    setSelected(target);
    setOpenModal(true);
    router.replace("/vehicles");
  }, [requestedVehicleId, loadedVehicles, router]);

  async function handleUse(payload: UseVehiclePayload) {
    const { vehicle, keperluan, startAt, endAt } = payload;

    try {
      if (vehicle.dalamPerbaikan) {
        toast.error("Mobil sedang perbaikan");
        return;
      }

      if (vehicle.pendingRequest) {
        toast.error("Mobil sedang ada request pending", {
          description: `Menunggu keputusan untuk ${vehicle.pendingRequest.byName}`,
        });
        return;
      }

      if (!vehicle.tersedia) {
        const dipakaiOleh = vehicle.activeUsage?.byName;
        const reservasiOleh = (vehicle as any)?.reservedUsage?.byName;
        toast.error("Mobil tidak tersedia", {
          description: reservasiOleh
            ? `Sedang direservasi oleh ${reservasiOleh}`
            : dipakaiOleh
              ? `Sedang dipakai oleh ${dipakaiOleh}`
              : "Sedang dipakai atau direservasi user lain",
        });
        return;
      }

      const res = await fetch("/api/vehicles/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          tujuan: keperluan,
          keperluan,
          startAt,
          endAt,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg = typeof data === "string" ? data : data?.error || "Failed";
        throw new Error(msg);
      }

      toast.success("Request peminjaman terkirim", {
        description: `${vehicle.merk} (${vehicle.nomorPolisi})`,
      });

      setOpenModal(false);
      setSelected(null);

      window.location.reload();
    } catch (err: any) {
      toast.error("Gagal memakai mobil", {
        description: err?.message ?? "Error",
      });
    }
  }

  return (
    <div className="px-3 py-4 text-black sm:px-4 md:px-6 lg:px-8">
      <div className="flex w-full justify-end py-3 sm:py-4">
        <AddVehicleButton />
      </div>

      <DisplayVehicle onSelect={handleSelect} onLoaded={setLoadedVehicles} />

      {selected && (
        <VehicleModal
          open={openModal}
          vehicle={selected}
          onClose={() => setOpenModal(false)}
          onUse={handleUse}
        />
      )}
    </div>
  );
}
