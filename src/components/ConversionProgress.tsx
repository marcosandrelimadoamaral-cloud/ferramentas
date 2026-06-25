import { useState } from 'react';
import { ConversionProgressInfo, ConversionStatus } from '../types';
import { Terminal, RefreshCw, XCircle, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConversionProgressProps {
  status: ConversionStatus;
  progress: ConversionProgressInfo;
  onCancel: () => void;
  errorMsg: string | null;
}

export default function ConversionProgress({ status, progress, onCancel, errorMsg }: ConversionProgressProps) {
  const [showLogs, setShowLogs] = useState(false);

  if (status === 'idle' || status === 'ready') return null;

  const isConverting = status === 'converting';
  const isLoadingFfmpeg = status === 'loading_ffmpeg';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Absolute pulsing background blur for conversion in progress */}
      {isConverting && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/5 rounded-full filter blur-3xl animate-pulse pointer-events-none" />
      )}

      {/* Header state information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLoadingFfmpeg && (
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
          )}
          {isConverting && (
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
          )}
          {isSuccess && (
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {isError && (
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-zinc-200">
              {isLoadingFfmpeg && 'Inicializando FFmpeg WebAssembly...'}
              {isConverting && 'Convertendo seu vídeo localmente...'}
              {isSuccess && 'Conversão finalizada com sucesso!'}
              {isError && 'Ocorreu um erro na conversão'}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isLoadingFfmpeg && 'Carregando os binários do decodificador no seu navegador.'}
              {isConverting && 'Por favor, mantenha esta aba ativa.'}
              {isSuccess && 'Seu arquivo MP4 está pronto para download ou reprodução.'}
              {isError && (errorMsg || 'Erro desconhecido. Tente usar o modo de "Re-muxing Direto".')}
            </p>
          </div>
        </div>

        {isConverting && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 bg-zinc-900 border border-zinc-800 hover:border-rose-500/20 px-2.5 py-1.5 rounded-lg transition-all font-medium"
          >
            <XCircle className="w-4 h-4" />
            Cancelar
          </button>
        )}
      </div>

      {/* Progress indicators */}
      {(isLoadingFfmpeg || isConverting) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>{isLoadingFfmpeg ? 'Preparando...' : `Progresso: ${progress.percent.toFixed(1)}%`}</span>
            {isConverting && progress.speed && <span>Velocidade: {progress.speed}</span>}
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: isLoadingFfmpeg ? '15%' : `${progress.percent}%`,
              }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Extended engineering metrics */}
          {isConverting && (
            <div className="grid grid-cols-3 gap-4 mt-2 bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl text-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-zinc-500 uppercase font-semibold">Frame Atual</span>
                <span className="text-xs text-zinc-300 font-mono font-bold">{progress.frame || '--'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-zinc-500 uppercase font-semibold">Tempo Processado</span>
                <span className="text-xs text-zinc-300 font-mono font-bold">{progress.time || '00:00:00'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-zinc-500 uppercase font-semibold">Tamanho Estimado</span>
                <span className="text-xs text-zinc-300 font-mono font-bold">{progress.size || '--'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable Technical Terminal Logs */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/80">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950/90 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Ver Console Técnico do FFmpeg ({progress.logs.length} linhas)</span>
          </div>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 180 }}
              exit={{ height: 0 }}
              className="overflow-y-auto px-4 py-3 border-t border-zinc-900 bg-black text-3xs font-mono text-zinc-400 leading-relaxed flex flex-col-reverse"
            >
              <div className="flex flex-col">
                {progress.logs.slice(-100).map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap select-all font-light hover:bg-zinc-900/50 py-0.5 px-1 rounded">
                    <span className="text-zinc-600 mr-2">[{index + 1}]</span>
                    {log}
                  </div>
                ))}
                {progress.logs.length === 0 && (
                  <span className="text-zinc-600 italic">Aguardando saída do FFmpeg...</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
