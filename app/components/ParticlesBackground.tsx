// app/components/ParticlesBackground.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: "#004282" } },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
          // onClick: { enable: true, mode: "push" },
        },
        modes: {
          repulse: { distance: 120, duration: 0.2 },
          push: { quantity: 3 },
        },
      },
      particles: {
        number: { value: 80, density: { enable: true, area: 900 } },
        color: { value: "#ffffff" },
        links: { enable: true, color: "#ffffff", distance: 160, opacity: 0.25, width: 1.5 },
        move: { enable: true, speed: 1.2, outModes: { default: "out" } },
        opacity: { value: 0.35 },
        size: { value: { min: 2, max: 4 } },
      },
      detectRetina: true,
    }),
    []
  );

  if (!ready) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="absolute inset-0 -z-10"
    />
  );
}
