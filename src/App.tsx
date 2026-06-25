import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
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
import { Video, Cpu, Sparkles, FileText, Settings, ShieldCheck, FileAudio } from 'lucide-react';
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
    if (status === 'error' || status === 'success') {
      setStatus(ffmpegRef.current ? 'ready' : 'idle');
    }
  };

  const handleClear = () => {
    setFile(null);
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

  const handleConvert = async () => {
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
    setErrorMsg(null);

    try {
      const inputName = file.name;
      const ext = inputName.split('.').pop() || 'mkv';
      const tempInput = `input.${ext}`;
      const tempOutput = 'output.mp4';

      // Write uploaded file to virtual WASM filesystem
      await ffmpeg.writeFile(tempInput, await fetchFile(file));

      // Build precise FFmpeg CLI arguments based on user configs
      const args: string[] = ['-i', tempInput];

      // Trim options
      if (settings.trim.enabled) {
        if (settings.trim.start) {
          args.push('-ss', settings.trim.start);
        }
        if (settings.trim.duration) {
          args.push('-t', settings.trim.duration);
        }
      }

      if (settings.mode === 'remux') {
        // Remuxing mode (direct stream copy - lossless & instant!)
        // Disable subtitle copying since MP4 has strict formatting constraints for sub tracks
        args.push('-c', 'copy', '-sn');
      } else {
        // Transcoding mode (re-encode video using H.264 for maximum compatibility)
        if (settings.resolution === 'original') {
          args.push('-c:v', 'libx264', '-preset', 'ultrafast');
        } else {
          let scale = '';
          if (settings.resolution === '1080p') scale = 'scale=1920:1080';
          else if (settings.resolution === '720p') scale = 'scale=1280:720';
          else if (settings.resolution === '480p') scale = 'scale=854:480';
          
          args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-vf', scale);
        }

        // Audio options for transcode
        if (settings.audioMode === 'copy') {
          args.push('-c:a', 'copy');
        } else if (settings.audioMode === 'aac') {
          args.push('-c:a', 'aac', '-b:a', settings.audioBitrate);
        } else if (settings.audioMode === 'none') {
          args.push('-an');
        }
      }

      // Metadata optimization for fast browser playback/streaming
      args.push('-movflags', '+faststart');

      // Force overwrite output file in virtual filesystem
      args.push('-y', tempOutput);

      // Execute conversion
      await ffmpeg.exec(args);

      if (conversionAborted.current) {
        return;
      }

      // Read resulting file from WASM filesystem
      const data = await ffmpeg.readFile(tempOutput);
      
      // Convert to blob URL
      const mp4Blob = new Blob([data as any], { type: 'video/mp4' });
      const mp4Url = URL.createObjectURL(mp4Blob);

      setOutputUrl(mp4Url);
      setOutputSize(mp4Blob.size);
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
      setErrorMsg('A conversão falhou. Isso acontece se o arquivo original estiver corrompido ou contiver faixas incompatíveis. Tente usar a "Transcodificação Completa" nas opções abaixo.');
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

                      {/* Step 2: Configure and trigger action */}
                      {file && (
                        <div className="flex flex-col gap-6">
                          <ConversionSettings
                            settings={settings}
                            onSettingsChange={setSettings}
                            disabled={isConverting}
                          />

                          {/* Big primary CTA Button to start converting */}
                          {status !== 'converting' && (
                            <button
                              onClick={handleConvert}
                              disabled={isConverting || status === 'loading_ffmpeg'}
                              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Cpu className="w-5 h-5" />
                              {settings.mode === 'remux' ? 'Converter Agora (Instantâneo)' : 'Iniciar Transcodificação'}
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

                  {/* Results video player and download options */}
                  {isSuccess && file && (
                    <VideoPlayer
                      originalName={file.name}
                      originalSize={file.size}
                      outputUrl={outputUrl}
                      outputSize={outputSize}
                      onReset={handleReset}
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
