import { MyScenesSection } from "@/components/gallery/MyScenesSection";
import { SceneCard } from "@/components/gallery/SceneCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { DEMO_SCENES } from "@/lib/scenes";

const CATEGORIES = ["Architecture", "Nature", "Industrial", "Urban"] as const;

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-6 py-14">
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Gallery</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-100 md:text-5xl">
            Demo Scene Library
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Explore curated Gaussian splat scenes across architecture, nature,
            industrial, and urban categories. Click any card to open it in the
            full semantic viewer.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <span
                key={category}
                className="rounded-full border border-slate-700/80 bg-slate-900/55 px-3 py-1 text-xs text-slate-300"
              >
                {category}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {DEMO_SCENES.map((scene, index) => (
            <SceneCard key={scene.id} scene={scene} index={index} />
          ))}
        </section>

        <MyScenesSection />
      </main>

      <Footer />
    </div>
  );
}
