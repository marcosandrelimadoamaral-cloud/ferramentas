import { Video, Sparkles, ShieldCheck } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Video className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              ReMux<span className="text-indigo-400">MKV</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">Conversor MKV para MP4 Local</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Seguro & Offline (Sem uploads)</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
            <span>Vite + WebAssembly</span>
          </div>
        </div>
      </div>
    </header>
  );
}
