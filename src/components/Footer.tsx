import { Heart, Github, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-6 mt-16 text-zinc-500 text-xs">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <p className="text-zinc-400 font-medium">ReMuxMKV — Conversor MKV para MP4 de Alto Desempenho</p>
          <p className="max-w-md leading-relaxed text-zinc-500">
            Seus dados nunca saem do seu computador. Todo o processamento de áudio e vídeo é realizado localmente no seu navegador através de tecnologia WebAssembly (FFmpeg.wasm).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-4 text-zinc-400">
            <div className="flex items-center gap-1.5" title="Conversão rápida de contêiner">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Remux Instantâneo</span>
            </div>
            <div className="flex items-center gap-1.5" title="Sua privacidade é garantida">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Privacidade Total</span>
            </div>
          </div>

          <div className="text-zinc-600 border-l border-zinc-800 pl-6 hidden sm:block">
            <span>Desenvolvido com tecnologia de ponta</span>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-zinc-900 flex justify-between items-center text-zinc-600">
        <p>&copy; {new Date().getFullYear()} ReMuxMKV. Nenhum direito reservado (Código Aberto).</p>
        <div className="flex items-center gap-1">
          <span>Criado para o melhor desempenho em vídeo</span>
        </div>
      </div>
    </footer>
  );
}
