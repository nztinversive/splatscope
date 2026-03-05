"use client";

import { motion } from "framer-motion";
import { Bolt, BrainCircuit, Share2, Sparkles } from "lucide-react";

const FEATURES = [
  {
    title: "Semantic Search",
    text: "Query any object in 3D with natural language prompts and ranked confidence scores.",
    icon: Sparkles,
  },
  {
    title: "Zero-Shot Understanding",
    text: "Works on new scenes without retraining. Upload and start searching immediately.",
    icon: BrainCircuit,
  },
  {
    title: "Instant 3D",
    text: "Turn drone footage and scans into a searchable digital twin for operations teams.",
    icon: Bolt,
  },
  {
    title: "Share & Collaborate",
    text: "Share links to scenes, queries, and viewpoints with project stakeholders.",
    icon: Share2,
  },
];

export function Features() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold text-slate-100 md:text-4xl">
            Built for spatial teams shipping fast
          </h2>
          <p className="mt-3 text-slate-300">
            SplatScope blends photoreal Gaussian splats with semantic retrieval workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="glass-panel rounded-2xl p-5"
              >
                <div className="mb-4 inline-flex rounded-xl bg-blue-500/15 p-2.5 text-blue-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.text}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
