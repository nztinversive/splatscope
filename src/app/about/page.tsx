import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

const HOW_IT_WORKS = [
  {
    title: "1. Capture",
    text: "Collect drone, handheld, or rig imagery and reconstruct high-fidelity Gaussian splats.",
  },
  {
    title: "2. Process",
    text: "Generate scene embeddings and metadata indices that pair geometry with semantic context.",
  },
  {
    title: "3. Search",
    text: "Use natural language to retrieve relevant regions and navigate directly to matched areas.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    summary: "For demo scenes and product evaluation.",
    bullets: ["Public demo library", "Basic semantic search UX", "Community support"],
  },
  {
    name: "Pro",
    price: "$99/mo",
    summary: "For teams shipping production digital twins.",
    bullets: ["Private scene uploads", "Advanced semantic indexing", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    summary: "For multi-site deployments and integrations.",
    bullets: ["Custom inference stack", "SSO + audit trails", "Dedicated onboarding"],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />

      <main className="mx-auto w-full max-w-7xl space-y-14 px-6 py-14">
        <section className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">About SplatScope</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-100 md:text-5xl">
            Spatial search for Gaussian splatting workflows
          </h1>
          <p className="mt-4 text-slate-300">
            SplatScope combines 3D Gaussian Splatting with semantic retrieval patterns to make
            real-world scenes queryable, navigable, and shareable.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <article
              key={step.title}
              className="glass-panel rounded-2xl border border-slate-700/70 p-5"
            >
              <h2 className="text-xl font-semibold text-slate-100">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="glass-panel rounded-3xl border border-slate-700/70 p-7 md:p-9">
          <h2 className="text-3xl font-semibold text-slate-100">Tech stack overview</h2>
          <p className="mt-4 max-w-3xl text-slate-300">
            Rendering uses gsplat for WebGL-native Gaussian splat visualization. Semantic retrieval
            is modeled as an embedding workflow inspired by CLIP and DINOv2 pipelines, where text
            prompts and scene regions share a vector space. This demo ships a mocked inference layer
            with realistic UX timing, confidence scoring, and camera navigation.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/55 p-4">
              <h3 className="text-sm font-medium text-slate-100">API Docs</h3>
              <p className="mt-2 text-sm text-slate-300">
                Placeholder for upload endpoints, scene metadata schema, query APIs, and auth models.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/55 p-4">
              <h3 className="text-sm font-medium text-slate-100">Roadmap</h3>
              <p className="mt-2 text-sm text-slate-300">
                Real-time semantic inference, collaborative annotations, and export-ready reports.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-semibold text-slate-100">Pricing</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PRICING.map((tier) => (
              <article
                key={tier.name}
                className="glass-panel rounded-2xl border border-slate-700/70 p-5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{tier.name}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-100">{tier.price}</p>
                <p className="mt-2 text-sm text-slate-300">{tier.summary}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {tier.bullets.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
