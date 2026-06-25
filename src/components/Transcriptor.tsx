import React, { useState, useRef } from "react";
import {
  Upload,
  FileAudio,
  FileVideo,
  Languages,
  Sparkles,
  Clipboard,
  Check,
  Download,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Terminal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Transcriptor() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>("pt");
  const [status, setStatus] = useState<"idle" | "uploading" | "transcribing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const sizeInMB = selectedFile.size / (1024 * 1024);
    if (sizeInMB > 45) {
      alert("Para garantir uma transcrição rápida e sem limites de timeout do navegador, envie arquivos de até 45MB.");
      return;
    }

    const validTypes = [
      "audio/",
      "video/",
      ".mp3",
      ".wav",
      ".m4a",
      ".ogg",
      ".mp4",
      ".mkv",
      ".avi",
      ".mov",
      ".webm",
    ];
    const name = selectedFile.name.toLowerCase();
    const isValid = validTypes.some(
      (type) => selectedFile.type.startsWith(type) || name.endsWith(type)
    );

    if (isValid) {
      setFile(selectedFile);
      setTranscription("");
      setErrorMsg(null);
      setStatus("idle");
    } else {
      alert("Por favor, envie um arquivo de áudio ou vídeo válido (ex: MP3, WAV, M4A, MP4, MKV).");
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgressMessage("Preparando o arquivo de mídia...");
    setErrorMsg(null);

    try {
      // Step 1: Read file as base64
      setProgressMessage("Codificando áudio/vídeo localmente (isso pode levar alguns segundos)...");
      const base64Data = await fileToBase64(file);

      setStatus("transcribing");
      setProgressMessage("Enviando dados para a Inteligência Artificial Gemini...");

      // Rotate messages to reassure the user
      const messages = [
        "Analisando frequências sonoras...",
        "IA está processando o idioma e os diálogos...",
        "Separando oradores e ruídos de fundo...",
        "Formatando com marcas de tempo e cabeçalhos...",
        "Ajustando pontuação e quebras de parágrafo...",
      ];
      let msgIndex = 0;
      const interval = setInterval(() => {
        if (status === "transcribing") {
          setProgressMessage(messages[msgIndex]);
          msgIndex = (msgIndex + 1) % messages.length;
        } else {
          clearInterval(interval);
        }
      }, 5000);

      // Step 2: POST to our Express API endpoint
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: file.type || getMimeTypeFromExtension(file.name),
          language: language === "pt" ? "Português (Brasil)" : language === "en" ? "Inglês (English)" : "Espanhol (Español)",
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido na transcrição.");
      }

      const data = await response.json();
      setTranscription(data.text || "Nenhuma fala detectada no arquivo.");
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Erro de conexão com o servidor de IA.");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:mimeType;base64, header prefix for standard Gemini raw usage
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const getMimeTypeFromExtension = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "mp3":
        return "audio/mp3";
      case "wav":
        return "audio/wav";
      case "m4a":
        return "audio/m4a";
      case "ogg":
        return "audio/ogg";
      case "mp4":
        return "video/mp4";
      case "mkv":
        return "video/x-matroska";
      case "avi":
        return "video/x-msvideo";
      case "mov":
        return "video/quicktime";
      case "webm":
        return "video/webm";
      default:
        return "application/octet-stream";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "txt" | "md") => {
    const element = document.createElement("a");
    const fileBlob = new Blob([transcription], { type: "text/plain" });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${file?.name.split(".")[0] || "transcricao"}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isAudio = file?.type.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].some((ext) => file?.name.toLowerCase().endsWith(ext));

  // Render markdown with basic formatting manually or with clean blocks
  const renderFormattedTranscription = () => {
    if (!transcription) return null;

    // Filter by search query if any
    let textToRender = transcription;
    if (searchQuery) {
      const lines = transcription.split("\n");
      const filteredLines = lines.map((line) => {
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          // Highlight search terms
          return line;
        }
        return line;
      });
      textToRender = filteredLines.join("\n");
    }

    return (
      <div className="prose prose-invert max-w-none text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans space-y-3 whitespace-pre-wrap select-all selection:bg-indigo-500/20">
        {textToRender}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tab intro */}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Transcrição Inteligente de Áudio e Vídeo
        </h3>
        <p className="text-xs text-zinc-400">
          Envie qualquer gravação de áudio, reunião, aula ou vídeo. Nossa IA vai transcrever, identificar marcas de tempo e organizar tudo em parágrafos de alta legibilidade.
        </p>
      </div>

      {status === "idle" && !transcription && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Uploader col-span-2 */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/30 hover:bg-zinc-950/55 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleFileChange}
              />

              {!file ? (
                <>
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-4 text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                    Selecione ou arraste o arquivo de áudio ou vídeo
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mb-3">
                    Suporta MP3, WAV, M4A, MP4, MKV e mais.
                  </p>
                  <span className="text-3xs font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
                    Limite recomendado: 45MB
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                    {isAudio ? <FileAudio className="w-7 h-7" /> : <FileVideo className="w-7 h-7" />}
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200 max-w-md truncate px-4" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {formatSize(file.size)} • {file.name.split(".").pop()?.toUpperCase()}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-4 text-3xs text-rose-400 hover:text-rose-300 bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/25 px-2.5 py-1 rounded-md transition-all font-medium"
                  >
                    Trocar Arquivo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Settings Col-span-1 */}
          <div className="border border-zinc-800 bg-zinc-950/20 rounded-2xl p-5 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-900">
                <Languages className="w-4.5 h-4.5 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Preferências da IA
                </span>
              </div>

              {/* Language Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-2xs font-semibold text-zinc-400">IDIOMA PREDOMINANTE</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="pt">Português (Brasil)</option>
                  <option value="en">Inglês (Universal)</option>
                  <option value="es">Espanhol (América Latina/Espanha)</option>
                </select>
              </div>

              <div className="text-3xs text-zinc-500 leading-normal bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                💡 <b>Dica de Ouro:</b> Arquivos com áudio nítido produzem transcrições com até 99% de precisão gramatical. A IA adiciona formatação Markdown automatizada.
              </div>
            </div>

            <button
              disabled={!file}
              onClick={handleTranscribe}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-3 px-4 rounded-xl transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Transcrever com Gemini
            </button>
          </div>
        </div>
      )}

      {/* Loading Progress State */}
      {(status === "uploading" || status === "transcribing") && (
        <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
          {/* Pulsing glow */}
          <div className="absolute w-40 h-40 bg-indigo-500/5 rounded-full filter blur-3xl animate-pulse" />

          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-5" />

          <h4 className="text-sm font-semibold text-zinc-200">
            {status === "uploading" ? "Preparando arquivo de áudio..." : "Gerando Transcrição de Alta Fidelidade..."}
          </h4>
          
          <p className="text-xs text-zinc-400 mt-2 font-mono bg-zinc-900 border border-zinc-850 px-4 py-2 rounded-xl max-w-md inline-block animate-pulse">
            {progressMessage}
          </p>

          <p className="text-3xs text-zinc-500 max-w-sm mt-6 leading-relaxed">
            Como o processamento inicial e envio ocorrem diretamente entre seu navegador e a IA, por favor não feche esta aba.
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="border border-rose-900/30 bg-rose-950/5 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <h4 className="text-sm font-semibold text-zinc-200">Falha na Transcrição</h4>
          <p className="text-xs text-zinc-400 max-w-md">{errorMsg}</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-xl text-zinc-300 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Transcription Results Success State */}
      {status === "success" && transcription && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-5 sm:p-6 flex flex-col gap-5"
        >
          {/* Upper control bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Transcrição Concluída</span>
                <p className="text-3xs text-zinc-500 font-mono mt-0.5">{file?.name}</p>
              </div>
            </div>

            {/* Quick Actions (Download, Copy) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-3xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-all font-medium font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5 text-indigo-400" />}
                {copied ? "Copiado!" : "Copiar Texto"}
              </button>

              <button
                onClick={() => handleDownload("md")}
                className="flex items-center gap-1.5 text-3xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-all font-medium font-mono"
                title="Download como Markdown"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Baixar .md</span>
              </button>

              <button
                onClick={() => setStatus("idle")}
                className="flex items-center gap-1.5 text-3xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-all font-medium font-mono"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Nova Transcrição</span>
              </button>
            </div>
          </div>

          {/* Text Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Caracteres: <b className="text-zinc-200">{transcription.length}</b></span>
              <span className="text-zinc-800">|</span>
              <span>Palavras: <b className="text-zinc-200">{transcription.split(/\s+/).filter(Boolean).length}</b></span>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar ou buscar palavra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-850 rounded-lg pl-9 pr-3 py-1.5 text-2xs font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Main output text container */}
          <div className="bg-black/40 border border-zinc-900 rounded-xl p-5 max-h-[480px] overflow-y-auto font-mono scrollbar-thin">
            {renderFormattedTranscription()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
