import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { VideoSettings, ConversionStatus, ConversionProgressInfo } from './types';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import DropZone from './components/DropZone';
import ConversionSettings from './components/ConversionSettings';
import ConversionProgress from './components/ConversionProgress';
import VideoPlayer from './components/VideoPlayer';
import Transcriptor from './components/Transcriptor';
import WordConverter from './components/WordConverter';

// Icons
import { Video, Cpu, Sparkles, FileText, Settings, ShieldCheck, FileAudio, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ActiveTab = 'mkv' | 'transcribe' | 'word';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mkv');
  
  // MKV States
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<VideoSettings>({
    mode: 'remux',
    audioMode: 'copy',
    audioBitrate: '128k',
    resolution: 'original',
    trim: {
      enabled: false,
      start: '0',
      duration: '',
    },
    outputFormat: 'mp4',
  });

  const [progress, setProgress] = useState<ConversionProgressInfo>({
    percent: 0,
    time: '',
    frame: 0,
    speed: '',
    size: '',
    logs: [],
  });

  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const conversionAborted = useRef<boolean>(false);
  const logsRef = useRef<string[]>([]);
  const [suggestedFixAction, setSuggestedFixAction] = useState<'transcode' | 'force_aac' | null>(null);

  const [isFileReading, setIsFileReading] = useState<boolean>(false);
  const [fileReadProgress, setFileReadProgress] = useState<number>(0);
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const fileDataRef = useRef<Uint8Array | null>(null);

  // Auto-init FFmpeg in background when app mounts
  useEffect(() => {
    initFFmpeg();
    return () => {
      // Cleanup preview URL if exists
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, []);

  const initFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    setStatus('loading_ffmpeg');
    const ffmpeg = new FFmpeg();

    // Technical Log parser to populate detailed visual stats in the terminal UI
    ffmpeg.on('log', ({ message }) => {
      logsRef.current.push(message);
      setProgress((prev) => {
        const nextLogs = [...prev.logs, message];
        
        // Parse speed, frame, time, size from standard FFmpeg output logs
        let frame = prev.frame;
        let time = prev.time;
        let speed = prev.speed;
        let size = prev.size;

        const frameMatch = message.match(/frame=\s*(\d+)/);
        if (frameMatch) frame = parseInt(frameMatch[1]);

        const timeMatch = message.match(/time=\s*([\d:.]+)/);
        if (timeMatch) time = timeMatch[1];

        const speedMatch = message.match(/speed=\s*([\d.x]+)/);
        if (speedMatch) speed = speedMatch[1];

        const sizeMatch = message.match(/size=\s*([\d\w]+)/);
        if (sizeMatch) size = sizeMatch[1];

        return {
          ...prev,
          logs: nextLogs,
          frame,
          time,
          speed,
          size,
        };
      });
    });

    // Main standard progress parser
    ffmpeg.on('progress', ({ progress: progressRatio }) => {
      setProgress((prev) => ({
        ...prev,
        percent: Math.min(progressRatio * 100, 100),
      }));
    });

    try {
      // Use single-threaded version of FFmpeg core to bypass SharedArrayBuffer limitations in iframe
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
      setStatus('ready');
      return ffmpeg;
    } catch (err: any) {
      console.error('Failed to load FFmpeg.wasm:', err);
      setStatus('error');
      setErrorMsg('Erro ao iniciar o decodificador de vídeo local (FFmpeg). Certifique-se de estar usando um navegador moderno e conectado à internet.');
      return null;
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setIsFileReading(true);
    setFileReadProgress(0);
    setFileReadError(null);
    fileDataRef.current = null;

    // Auto reset output states when a new file is uploaded
    setOutputUrl(null);
    setOutputSize(null);
    setProgress({
      percent: 0,
      time: '',
      frame: 0,
      speed: '',
      size: '',
      logs: [],
    });
    setErrorMsg(null);
    setSuggestedFixAction(null);

    // Read the file buffer IMMEDIATELY while the browser holds the file reference permission
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setFileReadProgress(percent);
      }
    };
    reader.onload = (event) => {
      if (event.target?.result) {
        fileDataRef.current = new Uint8Array(event.target.result as ArrayBuffer);
        setIsFileReading(false);
      }
    };
    reader.onerror = () => {
      const errorDetail = reader.error ? `${reader.error.name}: ${reader.error.message}` : 'Erro desconhecido';
      console.error('FileReader error:', reader.error);
      setFileReadError(`Erro de permissão no navegador ao ler o arquivo (${errorDetail}). Tente selecionar o arquivo clicando em vez de arrastar, ou use outro navegador.`);
      setIsFileReading(false);
    };
    reader.readAsArrayBuffer(selectedFile);

    if (status === 'error' || status === 'success') {
      setStatus(ffmpegRef.current ? 'ready' : 'idle');
    }
  };

  const handleClear = () => {
    setFile(null);
    setIsFileReading(false);
    setFileReadProgress(0);
    setFileReadError(null);
    fileDataRef.current = null;
    setOutputUrl(null);
    setOutputSize(null);
    setProgress({
      percent: 0,
      time: '',
      frame: 0,
      speed: '',
      size: '',
      logs: [],
    });
    setErrorMsg(null);
    setSuggestedFixAction(null);
    if (status === 'success' || status === 'error') {
      setStatus(ffmpegRef.current ? 'ready' : 'idle');
    }
  };

  const handleCancel = () => {
    conversionAborted.current = true;
    setStatus('ready');
    setProgress((prev) => ({
      ...prev,
      percent: 0,
      speed: '',
      logs: [...prev.logs, '--- CONVERSÃO CANCELADA PELO USUÁRIO ---'],
    }));
  };

  const handleReset = () => {
    handleClear();
  };

  const applySmartFix = (fixType: 'transcode' | 'force_aac') => {
    if (fixType === 'force_aac') {
      const nextSettings: VideoSettings = {
        ...settings,
        mode: 'remux',
        audioMode: 'aac',
      };
      setSettings(nextSettings);
      setTimeout(() => {
        performConversion(nextSettings);
      }, 50);
    } else {
      const nextSettings: VideoSettings = {
        ...settings,
        mode: 'transcode',
        audioMode: 'aac',
        resolution: 'original',
      };
      setSettings(nextSettings);
      setTimeout(() => {
        performConversion(nextSettings);
      }, 50);
    }
  };

  const handleConvert = async () => {
    await performConversion(settings);
  };

  const performConversion = async (activeSettings: VideoSettings) => {
    if (!file) return;
    conversionAborted.current = false;

    // Ensure ffmpeg is fully loaded
    let ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      ffmpeg = await initFFmpeg();
    }
    if (!ffmpeg) return;

    setStatus('converting');
    setProgress({
      percent: 0,
      time: '',
      frame: 0,
      speed: '',
      size: '',
      logs: ['Iniciando sistema de conversão...', 'Carregando arquivo de vídeo na memória local...'],
    });
    logsRef.current = []; // Clear log ref
    setErrorMsg(null);
    setSuggestedFixAction(null);

    try {
      const inputName = file.name;
      const ext = inputName.split('.').pop() || 'mkv';
      const tempInput = `input.${ext}`;
      const tempOutput = activeSettings.outputFormat === 'mp3' ? 'output.mp3' : 'output.mp4';

      // Write uploaded file to virtual WASM filesystem using robust cached or direct ArrayBuffer
      let fileData = fileDataRef.current;
      if (!fileData) {
        setProgress((prev) => ({
          ...prev,
          logs: [...prev.logs, 'Lendo arquivo sob demanda (aguarde)...']
        }));
        const arrayBuffer = await file.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
        fileDataRef.current = fileData;
      }
      
      setProgress((prev) => ({
        ...prev,
        logs: [...prev.logs, 'Arquivo carregado na memória local com sucesso!', 'Escrevendo arquivo no sistema de arquivos virtual do FFmpeg...']
      }));

      await ffmpeg.writeFile(tempInput, fileData);

      setProgress((prev) => ({
        ...prev,
        logs: [...prev.logs, 'Arquivo preparado! Iniciando execução do FFmpeg com os parâmetros selecionados...']
      }));

      // Build precise FFmpeg CLI arguments based on user configs
      const args: string[] = ['-i', tempInput];

      // Trim options
      if (activeSettings.trim.enabled) {
        if (activeSettings.trim.start) {
          args.push('-ss', activeSettings.trim.start);
        }
        if (activeSettings.trim.duration) {
          args.push('-t', activeSettings.trim.duration);
        }
      }

      if (activeSettings.outputFormat === 'mp3') {
        // MP3 extraction mode: Disable video, encode to high quality MP3
        args.push('-vn');
        args.push('-c:a', 'libmp3lame', '-b:a', activeSettings.audioBitrate);
      } else {
        // Video MP4 modes
        if (activeSettings.mode === 'remux') {
          if (activeSettings.audioMode === 'copy') {
            // Pure direct copy of all streams (extremely fast, but fragile if audio codec is incompatible)
            args.push('-c', 'copy', '-sn');
          } else if (activeSettings.audioMode === 'aac') {
            // Smart Copy: Copy video stream directly (instant!), transcode audio to standard AAC for maximum compatibility
            args.push('-c:v', 'copy', '-c:a', 'aac', '-sn');
          } else if (activeSettings.audioMode === 'none') {
            // Copy video stream directly, remove audio track
            args.push('-c:v', 'copy', '-an', '-sn');
          }
        } else {
          // Transcoding mode (re-encode video using H.264 for maximum compatibility)
          if (activeSettings.resolution === 'original') {
            args.push('-c:v', 'libx264', '-preset', 'ultrafast');
          } else {
            let scale = '';
            if (activeSettings.resolution === '1080p') scale = 'scale=1920:1080';
            else if (activeSettings.resolution === '720p') scale = 'scale=1280:720';
            else if (activeSettings.resolution === '480p') scale = 'scale=854:480';
            
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-vf', scale);
          }

          // Audio options for transcode
          if (activeSettings.audioMode === 'copy') {
            args.push('-c:a', 'copy');
          } else if (activeSettings.audioMode === 'aac') {
            args.push('-c:a', 'aac', '-b:a', activeSettings.audioBitrate);
          } else if (activeSettings.audioMode === 'none') {
            args.push('-an');
          }
        }

        // Metadata optimization for fast browser playback/streaming
        args.push('-movflags', '+faststart');
      }

      // Force overwrite output file in virtual filesystem
      args.push('-y', tempOutput);

      // Execute conversion
      const exitCode = await ffmpeg.exec(args);

      if (conversionAborted.current) {
        return;
      }

      if (exitCode !== 0) {
        throw new Error(`FFMPEG_EXIT_CODE_${exitCode}`);
      }

      // Read resulting file from WASM filesystem
      const data = await ffmpeg.readFile(tempOutput);
      
      // Convert to blob URL
      const mimeType = activeSettings.outputFormat === 'mp3' ? 'audio/mp3' : 'video/mp4';
      const outputBlob = new Blob([data as any], { type: mimeType });
      const mp4Url = URL.createObjectURL(outputBlob);

      setOutputUrl(mp4Url);
      setOutputSize(outputBlob.size);
      setStatus('success');

      // Cleanup virtual filesystem to free up precious browser memory
      try {
        await ffmpeg.deleteFile(tempInput);
        await ffmpeg.deleteFile(tempOutput);
      } catch (e) {
        console.warn('Wasm filesystem cleanup warnings:', e);
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setStatus('error');

      // Smart logs diagnostics
      const diagnosticLogs = (logsRef.current.join('\n') + '\n' + (err.message || '')).toLowerCase();
      const rawErrorStr = err.message || err.toString() || 'Erro desconhecido';

      // Analyze error patterns
      if (diagnosticLogs.includes('could not find tag for codec') || 
          diagnosticLogs.includes('not supported in the mp4 container') ||
          diagnosticLogs.includes('not supported in container') ||
          diagnosticLogs.includes('tag for codec') ||
          diagnosticLogs.includes('invalid audio') ||
          diagnosticLogs.includes('error selecting an encoder') ||
          err.message?.includes('FFMPEG_EXIT_CODE_')) {
        
        if (activeSettings.mode === 'remux' && activeSettings.audioMode === 'copy') {
          setErrorMsg(`O arquivo MKV possui faixas de áudio incompatíveis com cópia direta (como DTS, E-AC3 ou FLAC). Use a nossa Correção Inteligente para converter apenas o áudio para AAC e manter a alta velocidade! (Detalhes: ${rawErrorStr})`);
          setSuggestedFixAction('force_aac');
        } else {
          setErrorMsg(`A conversão falhou devido a codecs incompatíveis na faixa de áudio ou vídeo. Recomenda-se a Transcodificação Completa ou extração para MP3. (Detalhes: ${rawErrorStr})`);
          setSuggestedFixAction('transcode');
        }
      } else if (diagnosticLogs.includes('cannot enlarge memory arrays') || diagnosticLogs.includes('out of memory')) {
        setErrorMsg(`O navegador ficou sem memória WebAssembly para processar este arquivo. Tente extrair apenas o áudio para MP3 (opção nas configurações), que consome pouquíssima memória! (Detalhes: ${rawErrorStr})`);
        setSuggestedFixAction(null);
      } else {
        setErrorMsg(`A conversão falhou (${rawErrorStr}). Isso acontece se o arquivo original contiver faixas incompatíveis com o contêiner MP4. Tente usar a Correção Inteligente abaixo ou mude o formato para MP3 nas opções.`);
        setSuggestedFixAction('force_aac');
      }
    }
  };

  const isConverting = status === 'converting';
  const isSuccess = status === 'success';

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8">
        
        {/* Navigation Tabs bar */}
        <div className="flex bg-zinc-900/60 border border-zinc-850 p-1 rounded-2xl max-w-xl mx-auto w-full">
          <button
            onClick={() => setActiveTab('mkv')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'mkv'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
            }`}
          >
            <Video className="w-4.5 h-4.5" />
            <span className="truncate">Conversor MKV</span>
          </button>
          
          <button
            onClick={() => setActiveTab('transcribe')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'transcribe'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
            }`}
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span className="truncate">Transcrição IA</span>
          </button>
          
          <button
            onClick={() => setActiveTab('word')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'word'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span className="truncate">Word para .MD</span>
          </button>
        </div>

        {/* Tab content areas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            {activeTab === 'mkv' && (
              <div className="flex flex-col gap-8">
                {/* Intro text */}
                <div className="text-center sm:text-left flex flex-col gap-1.5 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                    Conversor de Vídeo de Alta Fidelidade
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Mude o formato de seus arquivos MKV para MP4 instantaneamente direto de seu navegador. Sem uploads, sem limite de tamanho de arquivo, e com privacidade total garantida.
                  </p>
                </div>

                {/* FFmpeg Global Initializer State Bar */}
                {status === 'loading_ffmpeg' && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-indigo-300 font-mono">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                      <span>Carregando o núcleo do FFmpeg.wasm (Single-Thread)...</span>
                    </div>
                  </div>
                )}

                {/* Main interactive area split based on status */}
                <div className="flex flex-col gap-8">
                  
                  {/* If not converted successfully yet, show Drag-drop and Settings */}
                  {!isSuccess && (
                    <div className="flex flex-col gap-6">
                      
                      {/* Step 1: Upload File */}
                      <DropZone
                        onFileSelected={handleFileSelected}
                        selectedFile={file}
                        onClear={handleClear}
                      />

                      {isFileReading && (
                        <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-6 flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                              Lendo arquivo para a memória local do navegador...
                            </span>
                            <span className="text-indigo-400 font-bold">{fileReadProgress}%</span>
                          </div>
                          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full transition-all duration-150 ease-out rounded-full"
                              style={{ width: `${fileReadProgress}%` }}
                            />
                          </div>
                          <p className="text-3xs text-zinc-500 font-mono">
                            Dica: Lendo o arquivo imediatamente para evitar que o navegador perca a permissão de acesso após alguns segundos de espera.
                          </p>
                        </div>
                      )}

                      {fileReadError && (
                        <div className="border border-rose-500/20 bg-rose-950/10 rounded-2xl p-5 flex gap-3 text-xs text-rose-300">
                          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">Falha ao acessar arquivo</span>
                            <p>{fileReadError}</p>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Configure and trigger action */}
                      {file && (
                        <div className="flex flex-col gap-6">
                          <ConversionSettings
                            settings={settings}
                            onSettingsChange={setSettings}
                            disabled={isConverting || isFileReading}
                          />

                          {/* Big primary CTA Button to start converting */}
                          {status !== 'converting' && (
                            <button
                              onClick={handleConvert}
                              disabled={isConverting || status === 'loading_ffmpeg' || isFileReading}
                              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Cpu className="w-5 h-5" />
                              {isFileReading 
                                ? `Aguarde, carregando arquivo (${fileReadProgress}%)...`
                                : settings.outputFormat === 'mp3'
                                  ? 'Extrair Áudio MP3'
                                  : settings.mode === 'remux' 
                                    ? 'Converter Agora (Instantâneo)' 
                                    : 'Iniciar Transcodificação'
                              }
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress / logs status feedback */}
                  <ConversionProgress
                    status={status}
                    progress={progress}
                    onCancel={handleCancel}
                    errorMsg={errorMsg}
                  />

                  {status === 'error' && suggestedFixAction && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 border border-amber-500/20 bg-amber-950/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                          💡 Correção Inteligente Disponível
                        </span>
                        <p className="text-2xs text-zinc-300 leading-relaxed max-w-xl">
                          {suggestedFixAction === 'force_aac' 
                            ? 'O arquivo MKV possui faixas de áudio incompatíveis com cópia direta (ex: DTS ou FLAC). Podemos copiar o vídeo instantaneamente e converter apenas o áudio para AAC.'
                            : 'O decodificador recomenda usar o modo de Transcodificação Completa para processar todas as faixas e recriar o vídeo em H.264 compatível.'}
                        </p>
                      </div>
                      <button
                        onClick={() => applySmartFix(suggestedFixAction)}
                        className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer"
                      >
                        {suggestedFixAction === 'force_aac' ? 'Corrigir e Converter (Rápido)' : 'Mudar para Transcodificação'}
                      </button>
                    </motion.div>
                  )}

                  {/* Results video player and download options */}
                  {isSuccess && file && (
                    <VideoPlayer
                      originalName={file.name}
                      originalSize={file.size}
                      outputUrl={outputUrl}
                      outputSize={outputSize}
                      onReset={handleReset}
                      outputFormat={settings.outputFormat}
                    />
                  )}

                </div>

                {/* Informative facts grid for UI polish */}
                {!isConverting && !isSuccess && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-center sm:text-left">
                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl flex flex-col gap-1">
                      <span className="text-xs font-semibold text-zinc-300">Re-mux Direto</span>
                      <p className="text-3xs text-zinc-500 leading-normal">
                        Altera o formato de MKV para MP4 instantaneamente mudando apenas o contêiner. Sem perdas e sem consumo de CPU.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl flex flex-col gap-1">
                      <span className="text-xs font-semibold text-zinc-300">100% no Navegador</span>
                      <p className="text-3xs text-zinc-500 leading-normal">
                        Nenhum byte de vídeo é enviado para servidores. Ideal para vídeos pessoais ou confidenciais de qualquer tamanho.
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl flex flex-col gap-1">
                      <span className="text-xs font-semibold text-zinc-300">Recursos de Corte</span>
                      <p className="text-3xs text-zinc-500 leading-normal">
                        Defina um tempo exato de início e duração para converter e baixar apenas o trecho desejado do seu vídeo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transcribe' && <Transcriptor />}

            {activeTab === 'word' && <WordConverter />}
          </motion.div>
        </AnimatePresence>

      </main>

      <Footer />
    </div>
  );
}
