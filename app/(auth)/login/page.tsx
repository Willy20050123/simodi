"use client";

import Image from "next/image";
import { Signika } from "@next/font/google";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ParticlesBackground from "@/app/components/ParticlesBackground";

const signika = Signika({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function Home() {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const nip = String(formData.get("nip") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, password }),
      });

      if (!res.ok) {
        toast.error("Akses Ditolak", {
          description: "Hubungi administrasi untuk meminta akses.",
          duration: 5000,
        });
        return;
      }

      toast.success("Berhasil Login");

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    }
  }

  return (
    <div
      className={`${signika.className} relative flex min-h-screen items-center justify-center p-4 text-black sm:p-6`}
    >
      <ParticlesBackground />

      <div className="z-10 flex w-full max-w-md flex-col items-center rounded-2xl bg-gray-200 p-5 shadow-lg sm:p-8">
        <Image
          src="/logo.png"
          alt="logo"
          width={180}
          height={180}
          priority
          className="h-auto w-28 sm:w-36 md:w-40"
        />

        <div className="mt-6 w-full">
          <form
            action=""
            method="post"
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="nip" className="text-sm font-medium">
                NIP
              </label>
              <input
                id="nip"
                className="w-full rounded border border-black px-3 py-2 text-sm outline-none"
                type="text"
                placeholder="NIP"
                name="nip"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                className="w-full rounded border border-black px-3 py-2 text-sm outline-none"
                type="password"
                placeholder="Password"
                name="password"
                required
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              <button
                type="submit"
                className="w-full rounded bg-[#004282] p-2 text-white hover:cursor-pointer"
              >
                Login
              </button>

              <a
                href="/forgot-password"
                className="text-right text-sm text-blue-600"
              >
                lupa password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}