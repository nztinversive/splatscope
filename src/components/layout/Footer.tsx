import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/70 bg-[#0A0A0F]/90">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>(c) 2026 SplatScope. Search your 3D world.</p>
        <div className="flex items-center gap-5">
          <Link href="/explore" className="transition hover:text-cyan-300">
            Explore
          </Link>
          <Link href="/gallery" className="transition hover:text-cyan-300">
            Gallery
          </Link>
          <Link href="/about" className="transition hover:text-cyan-300">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
