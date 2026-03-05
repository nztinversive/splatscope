"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SceneDefinition } from "@/types";

interface SceneCardProps {
  scene: SceneDefinition;
  index: number;
}

export function SceneCard({ scene, index }: SceneCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="glass-panel group overflow-hidden rounded-2xl"
    >
      <div className="relative">
        <Image
          src={scene.previewImage}
          alt={`${scene.name} preview`}
          width={1200}
          height={800}
          className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-transparent" />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">{scene.category}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-100">{scene.name}</h3>
          </div>
          <Link
            href={`/explore?scene=${scene.id}`}
            className="rounded-full border border-cyan-400/40 p-2 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/10"
            aria-label={`Open ${scene.name}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">{scene.description}</p>

        <div className="flex flex-wrap gap-2">
          {scene.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-600/70 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}
