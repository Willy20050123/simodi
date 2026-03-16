import Image from "next/image";

export default function DisplayInfo({path, value, value_color, desc, desc_color, border_color, inner_color}: 
                                    {path: string, value: number, value_color: string,  desc: string, desc_color: string, border_color: string, inner_color: string} ) {
return (
    <div
        className="w-56 rounded-xl border-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ borderColor: border_color, backgroundColor: inner_color }}
    >
        <div className="px-4 py-4">
            <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/5">
                    <Image
                      src={path}
                      alt={desc}
                      width={32}
                      height={32}
                      priority
                    />
                </div>

                <div
                    className="text-5xl font-bold leading-none tabular-nums"
                    style={{ color: value_color }}
                >
                    {value}
                </div>
            </div>

            <div className="mt-3 text-base font-semibold" style={{ color: desc_color }}>
                {desc}
            </div>
        </div>
    </div>
  );
}