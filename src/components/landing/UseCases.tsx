"use client";

import { motion } from "framer-motion";

const USE_CASES = [
  {
    title: "Construction",
    description:
      "Track progress, verify concrete quality, and capture punch-list issues in context.",
  },
  {
    title: "Agriculture",
    description:
      "Inspect crop density, spot stress signatures, and compare seasonal variations in 3D.",
  },
  {
    title: "Infrastructure",
    description:
      "Search for cracks, corrosion, and asset-level anomalies across bridges and facilities.",
  },
  {
    title: "Conservation",
    description:
      "Document habitat change with high-fidelity spatial archives and searchable annotations.",
  },
];

export function UseCases() {
  return (
    <section className="px-6 pb-24 pt-12">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.45 }}
          className="glass-panel rounded-3xl p-8 md:p-10"
        >
          <div className="mb-8 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Use Cases</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-100 md:text-4xl">
              One platform for many real-world workflows
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {USE_CASES.map((useCase, index) => (
              <motion.article
                key={useCase.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -14 : 14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="rounded-2xl border border-slate-700/70 bg-slate-900/55 p-5"
              >
                <h3 className="text-lg font-medium text-slate-100">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {useCase.description}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
