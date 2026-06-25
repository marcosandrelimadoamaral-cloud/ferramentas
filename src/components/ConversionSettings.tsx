import { VideoSettings, ConversionMode, AudioMode, ResolutionMode } from '../types';
import { Settings, Zap, Shield, Volume2, Maximize, Crop, Music, Video, FileAudio } from 'lucide-react';

interface ConversionSettingsProps {
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
  disabled?: boolean;
}

export default function ConversionSettings({ settings, onSettingsChange, disabled = false }: ConversionSettingsProps) {
  const updateSetting = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => {
    if (disabled) return;
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleTrimChange = (key: 'enabled' | 'start' | 'duration', value: any) => {
    if (disabled) return;
    onSettingsChange({
      ...settings,
      trim: {
        ...settings.trim,
        [key]: value,
      },
    });
  };

  const isAudioOnly = settings.outputFormat === 'mp3';

  return (
    <div className={`border border-zinc-800 bg-zinc-950/20 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80">
        <Settings className="w-5 h-5 text-indigo-400" />
        <h3 className="font-semibold text-zinc-100 text-sm">Opções de Conversão</h3>
      </div>

      {/* 1. Format Selection */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
          <FileAudio className="w-4 h-4 text-indigo-400" />
          Formato de Saída Desejado
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSetting('outputFormat', 'mp4')}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              settings.outputFormat === 'mp4'
                ? 'border-indigo-500 bg-indigo-500/5 text-zinc-100'
                : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                Vídeo MP4 Completo
              </span>
              <span className="text-3xs mt-1 text-zinc-500 leading-normal">
                Para assistir em qualquer TV, celular ou computador.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('outputFormat', 'mp3')}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              settings.outputFormat === 'mp3'
                ? 'border-emerald-500 bg-emerald-500/5 text-zinc-100'
                : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                Apenas Áudio MP3 (Super Leve)
              </span>
              <span className="text-3xs mt-1 text-zinc-500 leading-normal">
                Perfeito para transcrição de voz ou ouvir o áudio.
              </span>
            </div>
          </button>
        </div>
      </div>

      {!isAudioOnly ? (
        <>
          {/* 2. Conversion Mode */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-amber-400" />
              Modo de Processamento de Vídeo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateSetting('mode', 'remux')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                  settings.mode === 'remux'
                    ? 'border-indigo-500 bg-indigo-500/5 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  Re-muxing Direto
                  <span className="text-2xs font-mono font-bold bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded">RÁPIDO</span>
                </span>
                <span className="text-3xs mt-1 text-zinc-400 leading-normal">
                  Copia as faixas de vídeo/áudio sem decodificar. 100% fiel, instantâneo e sem perda de qualidade.
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('mode', 'transcode')}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                  settings.mode === 'transcode'
                    ? 'border-indigo-500 bg-indigo-500/5 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  Transcodificação Completa
                  <span className="text-2xs font-mono font-bold bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded">COMPATÍVEL</span>
                </span>
                <span className="text-3xs mt-1 text-zinc-400 leading-normal">
                  Re-codifica vídeo para H.264. Ideal para vídeos pesados ou codecs incompatíveis com navegadores.
                </span>
              </button>
            </div>
          </div>

          {/* 3. Audio Mode */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              Faixa de Áudio do Vídeo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['copy', 'aac', 'none'] as AudioMode[]).map((mode) => {
                const labels: Record<AudioMode, string> = {
                  copy: 'Copiar Original',
                  aac: 'Forçar AAC',
                  none: 'Sem Áudio (Mudo)'
                };
                const desc: Record<AudioMode, string> = {
                  copy: settings.mode === 'remux' ? 'Rápido (pode falhar se codec incompatível)' : 'Cópia Lossless',
                  aac: settings.mode === 'remux' ? 'Compatível (Vídeo Copiado + Áudio AAC)' : 'Áudio AAC Comp.',
                  none: 'Sem trilha de áudio'
                };

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      updateSetting('audioMode', mode);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      settings.audioMode === mode
                        ? 'border-indigo-500 bg-indigo-500/5 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <span className="text-xs font-medium">{labels[mode]}</span>
                    <span className="text-3xs text-zinc-500 mt-0.5 font-mono">{desc[mode]}</span>
                  </button>
                );
              })}
            </div>
            {settings.mode === 'remux' && settings.audioMode === 'copy' && (
              <p className="text-3xs text-amber-400 mt-1">
                💡 <b>Dica:</b> Se o seu arquivo MKV der erro na conversão rápida, altere a faixa de áudio para <b>"Forçar AAC"</b>. Isso copia o vídeo instantaneamente mas reconverte o áudio incompatível (como DTS/FLAC), resolvendo 99% das falhas!
              </p>
            )}
          </div>
        </>
      ) : (
        /* 4. Bitrate Selection for MP3 Mode */
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            Qualidade do Áudio MP3 (Bitrate)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['128k', '192k', '256k'] as const).map((bitrate) => {
              const labels: Record<string, string> = {
                '128k': 'Básica (128 kbps)',
                '192k': 'Recomendada (192 kbps)',
                '256k': 'Alta Definição (256 kbps)'
              };

              return (
                <button
                  key={bitrate}
                  type="button"
                  onClick={() => {
                    updateSetting('audioBitrate', bitrate);
                  }}
                  className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border text-center transition-all ${
                    settings.audioBitrate === bitrate
                      ? 'border-emerald-500 bg-emerald-500/5 text-zinc-200'
                      : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <span className="text-xs font-semibold">{bitrate.toUpperCase()}</span>
                  <span className="text-3xs text-zinc-500 mt-0.5">{labels[bitrate]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row layout for resolution/bitrate and trim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Output Resolution */}
        {!isAudioOnly && (
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Maximize className="w-4 h-4 text-indigo-400" />
              Resolução de Saída
            </label>
            <select
              value={settings.resolution}
              disabled={settings.mode === 'remux'}
              onChange={(e) => updateSetting('resolution', e.target.value as ResolutionMode)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="original">Manter Resolução Original</option>
              <option value="1080p">Full HD (1920x1080)</option>
              <option value="720p">HD (1280x720)</option>
              <option value="480p">SD (854x480)</option>
            </select>
            {settings.mode === 'remux' && (
              <p className="text-3xs text-zinc-500">
                * Bloqueado na resolução original para o modo Re-mux ultra-rápido.
              </p>
            )}
          </div>
        )}

        {/* 4. Basic Trimming (Cortar) */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Crop className="w-4 h-4 text-indigo-400" />
            Cortar Trecho (Opcional)
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trim-enabled"
                checked={settings.trim.enabled}
                onChange={(e) => handleTrimChange('enabled', e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
              />
              <label htmlFor="trim-enabled" className="text-xs text-zinc-300 select-none">
                Ativar corte do arquivo de saída
              </label>
            </div>

            {settings.trim.enabled && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-3xs text-zinc-500">Início (segundos ou HH:MM:SS)</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={settings.trim.start}
                    onChange={(e) => handleTrimChange('start', e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-3xs text-zinc-500">Duração (segundos)</span>
                  <input
                    type="text"
                    placeholder="Ex: 30"
                    value={settings.trim.duration}
                    onChange={(e) => handleTrimChange('duration', e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
