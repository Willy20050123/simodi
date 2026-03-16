"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Signika } from "next/font/google";

const signika = Signika({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function SidebarClient({
  open,
  user,
}: {
  open: boolean;
  user: any;
}) {
  const router = useRouter();
  const pathName = usePathname();

  const items = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Vehicles", href: "/vehicles" },
  ];

  if (user.role === "ADMIN") {
    items.push({ label: "Account", href: "/accounts" });
  }

  return (
    <div
      className={`${signika.className} h-full bg-[#004282] overflow-hidden border-r border-black/20 transition-[width] duration-300 ease-in-out justify-between ${
        open ? "w-[185px] sm:w-64" : "w-0"
      }`}
    >
      <div className="h-full w-[185px] sm:w-64 flex flex-col">
        <div
          onClick={() => router.push("/dashboard")}
          className={`hover:cursor-pointer w-full h-20 flex items-center justify-center pt-2 transition-all duration-200 ${
            open
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          <Image
            src="/logo2.png"
            alt="logo"
            width={110}
            height={36}
            priority
          />
        </div>

        <div
          className={`flex flex-col gap-2 p-3 mt-2 border-y border-white/20 h-full transition-all duration-200 ${
            open
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          {items.map((x) => {
            const isActive = pathName === x.href || pathName.startsWith(x.href, 0);

            return (
              <Link
                key={x.href}
                href={x.href}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm transition hover:cursor-pointer ${
                  isActive
                    ? "bg-white text-[#004282] font-semibold shadow-sm"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`mr-2 inline-block h-5 w-1 rounded ${
                    isActive ? "bg-[#22c55e]" : "bg-transparent"
                  }`}
                />
                {x.label}
              </Link>
            );
          })}
        </div>

        <div
          className={`w-full border-t border-white/20 p-2 transition-all duration-200 ${
            open
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          <div
            onClick={() => router.push("/profile")}
            className="hover:cursor-pointer flex items-center gap-2 rounded-xl bg-white/10 px-2 py-2 ring-1 ring-white/10"
          >
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src="/profile-circle.svg"
                alt="Profile photo"
                fill
                sizes="40px"
                className="rounded-full object-cover ring-2 ring-white/20"
                priority
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="truncate max-w-[8ch] text-[10px] text-white/70">
                  {user.nip}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}