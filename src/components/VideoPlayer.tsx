import { Download, PlayCircle, RefreshCw, FileVideo, FileAudio, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoPlayerProps {
  originalName: string;
  originalSize: number;
  outputUrl: string | null;
  outputSize: number | null;
  onReset: () => void;
  outputFormat?: 'mp4' | 'mp3';
}

export default function VideoPlayer({ 
  originalName, 
  originalSize, 
  outputUrl, 
  outputSize, 
  onReset,
  outputFormat = 'mp4'
}: VideoPlayerProps) {
  if (!outputUrl) return null;

  const mkvExtIndex = originalName.lastIndexOf('.');
  const baseName = mkvExtIndex !== -1 ? originalName.substring(0, mkvExtIndex) : originalName;
  const outputFileName = outputFormat === 'mp3' ? `${baseName}.mp3` : `${baseName}.mp4`;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compare sizes
  const difference = outputSize && originalSize ? originalSize - outputSize : 0;
  const diffPercent = outputSize && originalSize ? ((difference / originalSize) * 100).toFixed(0) : '0';
  const sizeSaved = difference > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      {/* 1. Comparison & Download Card */}
      <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  {outputFormat === 'mp3' ? 'Áudio extraído com sucesso!' : 'Seu arquivo foi convertido!'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {outputFormat === 'mp3' ? 'Arquivo MP3 gerado 100% localmente.' : 'MP4 gerado com sucesso localmente.'}
                </p>
              </div>
            </div>

            {/* Comparison details */}
            <div className="flex flex-wrap items-center gap-4 mt-1 font-mono text-xs">
              <div className="flex flex-col bg-zinc-900 border border-zinc-900 px-3.5 py-2 rounded-xl text-center min-w-[100px]">
                <span className="text-4xs text-zinc-500 uppercase">Original (MKV)</span>
                <span className="text-zinc-300 font-semibold mt-0.5">{formatSize(originalSize)}</span>
              </div>
              <div className="text-zinc-600 text-lg font-bold">→</div>
              <div className="flex flex-col bg-indigo-500/5 border border-indigo-500/10 px-3.5 py-2 rounded-xl text-center min-w-[100px]">
                <span className="text-4xs text-indigo-400 uppercase">
                  {outputFormat === 'mp3' ? 'Extraído (MP3)' : 'Convertido (MP4)'}
                </span>
                <span className="text-indigo-200 font-semibold mt-0.5">
                  {outputSize ? formatSize(outputSize) : 'Calculando...'}
                </span>
              </div>

              {outputSize && sizeSaved && (
                <div className="flex items-center gap-1.5 text-2xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl">
                  <span className="font-bold">-{diffPercent}% menor</span>
                  <span className="text-zinc-500">•</span>
                  <span>{outputFormat === 'mp3' ? 'Áudio extraído super leve' : 'Menos espaço ocupado'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={outputUrl}
              download={outputFileName}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/15 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Baixar {outputFormat === 'mp3' ? 'Áudio MP3' : 'Vídeo MP4'}
            </a>

            <button
              onClick={onReset}
              className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-3 px-4 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Converter Outro
            </button>
          </div>
        </div>
      </div>

      {/* 2. Visual / Audio Player Preview */}
      <motion.div className="border border-zinc-800 bg-zinc-950/60 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            {outputFormat === 'mp3' ? (
              <FileAudio className="w-4 h-4 text-emerald-400" />
            ) : (
              <FileVideo className="w-4 h-4 text-indigo-400" />
            )}
            <span className="truncate max-w-[200px] sm:max-w-md" title={outputFileName}>{outputFileName}</span>
          </div>
          <span className="text-2xs font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">PREVIEW</span>
        </div>

        {outputFormat === 'mp3' ? (
          <div className="p-10 bg-zinc-900/10 flex flex-col items-center justify-center gap-5 text-center min-h-[220px]">
            <div className="relative w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-full flex items-center justify-center animate-pulse">
              <FileAudio className="w-8 h-8" />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow border border-zinc-950">MP3</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-zinc-200 text-sm">Faixa de Áudio Extraída</h4>
              <p className="text-3xs text-zinc-500 font-mono">Formato: MPEG Audio Layer III (MP3) • Estéreo</p>
            </div>
            <div className="w-full max-w-md bg-zinc-950/90 p-4 rounded-2xl border border-zinc-900/80 shadow-inner">
              <audio
                src={outputUrl}
                controls
                className="w-full focus:outline-none accent-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-black flex items-center justify-center relative group">
            <video
              src={outputUrl}
              controls
              className="w-full h-full max-h-[480px] object-contain block focus:outline-none"
              poster=""
            />
          </div>
        )}

        {outputFormat !== 'mp3' && (
          <div className="p-4 bg-zinc-950/50 border-t border-zinc-900 flex gap-2.5 text-xs text-zinc-400">
            <AlertCircle className="w-4.5 h-4.5 text-zinc-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Se o vídeo acima reproduzir o áudio mas não mostrar imagem, ou vice-versa, seu reprodutor do navegador pode ter restrições com codecs específicos do vídeo original (por exemplo, HEVC/H.265 ou DTS). Baixe o arquivo e assista em reprodutores completos como o <span className="text-indigo-400 underline cursor-pointer" onClick={() => window.open('https://www.videolan.org/vlc/', '_blank')}>VLC Player</span> ou <span className="text-indigo-400 underline cursor-pointer" onClick={() => window.open('https://mpc-hc.org/', '_blank')}>MPC-HC</span>, onde a reprodução de MP4 é 100% garantida.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
