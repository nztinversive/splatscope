"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, ScanSearch } from "lucide-react";
import { DEMO_SCENES } from "@/lib/scenes";

const HeroViewer = dynamic(
  () => import("@/components/viewer/SplatViewer").then((module) => module.SplatViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] w-full items-center justify-center rounded-3xl border border-slate-700/70 bg-slate-900/60 text-slate-400">
        Initializing demo scene...
      </div>
    ),
  }
);

const heroScene = DEMO_SCENES.find((scene) => scene.id === "garden") ?? DEMO_SCENES[0];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-12 md:pt-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[22rem] w-[44rem] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[90px]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-7"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-blue-200">
            <ScanSearch className="h-3.5 w-3.5" />
            Semantic 3D Intelligence
          </p>

          <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-100 md:text-6xl">
            Search your
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {" "}
              3D world
            </span>
          </h1>

          <p className="max-w-xl text-lg text-slate-300">
            Explore Gaussian splat scenes and query them in natural language.
            Find materials, anomalies, or objects across your digital twin in seconds.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110"
            >
              Try the Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-full border border-slate-600/80 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              <Search className="h-4 w-4" />
              Browse Scenes
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
          className="glass-panel accent-ring relative overflow-hidden rounded-3xl p-2"
        >
          <div className="pointer-events-none absolute inset-x-8 top-4 z-20 flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-slate-950/65 px-4 py-2 text-xs text-slate-300">
            <span>Live Demo Scene</span>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-300">
              auto-rotate
            </span>
          </div>

          <HeroViewer
            scene={heroScene}
            mode="normal"
            autoRotate
            interactive={false}
            showStatusOverlay={false}
            className="h-[360px] w-full overflow-hidden rounded-[1.3rem] md:h-[430px]"
          />
        </motion.div>
      </div>
    </section>
  );
}
