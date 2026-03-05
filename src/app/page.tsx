import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { UseCases } from "@/components/landing/UseCases";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <main>
        <Hero />
        <Features />
        <UseCases />
      </main>
      <Footer />
    </div>
  );
}
