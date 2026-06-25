import React, { useState, useRef } from 'react';
import { Upload, FileVideo, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export default function DropZone({ onFileSelected, selectedFile, onClear }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileSelected(file);
      } else {
        alert('Por favor, selecione um arquivo de vídeo válido (preferencialmente .mkv, .avi, .mov ou similar).');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const isValidFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith('.mkv') || name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.mov') || name.endsWith('.webm') || name.endsWith('.flv');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".mkv,.avi,.mov,.webm,.flv,.mp4"
        onChange={handleFileInput}
      />

      {!selectedFile ? (
        <motion.div
          id="dropzone-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/5 scale-[1.01]'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/30 hover:bg-zinc-950/55'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-5 text-zinc-400 group-hover:text-indigo-400 transition-colors">
            <Upload className="w-8 h-8 text-indigo-400" />
          </div>

          <h3 className="text-base font-semibold text-zinc-200 mb-1.5">
            Arraste seu arquivo MKV aqui
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            Ou <span className="text-indigo-400 hover:text-indigo-300 underline font-medium">clique para navegar</span> nos seus arquivos do computador.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-2xs font-mono text-zinc-500 bg-zinc-950/80 px-4 py-2 rounded-lg border border-zinc-900">
            <span>Suporta: .mkv, .avi, .mov, etc.</span>
            <span className="text-zinc-800">|</span>
            <span>Sem limite de tamanho</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          id="file-details-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-6 relative overflow-hidden"
        >
          {/* Subtle design element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shrink-0">
                <FileVideo className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate pr-4" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-mono">
                  <span>{formatSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase text-indigo-400 font-bold text-2xs bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                    {selectedFile.name.split('.').pop()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-rose-500/5 border border-zinc-800 hover:border-rose-500/20 px-3 py-1.5 rounded-lg transition-all shrink-0 font-medium"
            >
              Remover Arquivo
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick explanation guide on formats */}
      <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-4 flex gap-3 text-xs text-zinc-400 leading-relaxed">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-300 block mb-0.5">Por que converter MKV para MP4?</span>
          MKV (Matroska) é um excelente contêiner, mas não é suportado nativamente pelo Safari, iPhones, iPads, Apple TV e pela maioria dos navegadores web modernos de forma direta. Converter para MP4 com áudio compatível garante que seu vídeo rode em qualquer dispositivo, site ou TV sem problemas de carregamento.
        </div>
      </div>
    </div>
  );
}
