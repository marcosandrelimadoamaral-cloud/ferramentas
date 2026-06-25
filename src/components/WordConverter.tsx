import React, { useState, useRef } from "react";
import mammoth from "mammoth";
import {
  Upload,
  FileText,
  Sparkles,
  Clipboard,
  Check,
  Download,
  FileCode,
  LayoutGrid,
  RefreshCw,
  Columns,
  Eye,
} from "lucide-react";
import { motion } from "motion/react";

export default function WordConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [viewMode, setViewMode] = useState<"side" | "raw" | "preview">("side");
  const [copied, setCopied] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);

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
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith(".docx")) {
      setFile(selectedFile);
      setMarkdown("");
      setWarnings([]);
      setStatus("idle");
    } else {
      alert("Por favor, selecione um arquivo válido do Microsoft Word (.docx).");
    }
  };

  const convertHtmlToMarkdown = (htmlString: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    let md = "";

    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      let childrenContent = "";
      for (let i = 0; i < element.childNodes.length; i++) {
        childrenContent += walk(element.childNodes[i]);
      }

      switch (tagName) {
        case "p":
          return `\n${childrenContent}\n`;
        case "h1":
          return `\n# ${childrenContent}\n`;
        case "h2":
          return `\n## ${childrenContent}\n`;
        case "h3":
          return `\n### ${childrenContent}\n`;
        case "h4":
          return `\n#### ${childrenContent}\n`;
        case "h5":
          return `\n##### ${childrenContent}\n`;
        case "h6":
          return `\n###### ${childrenContent}\n`;
        case "strong":
        case "b":
          return childrenContent.trim() ? `**${childrenContent}**` : "";
        case "em":
        case "i":
          return childrenContent.trim() ? `*${childrenContent}*` : "";
        case "u":
          return childrenContent.trim() ? `_${childrenContent}_` : "";
        case "ul":
          return `\n${childrenContent}\n`;
        case "ol":
          return `\n${childrenContent}\n`;
        case "li": {
          const parentTag = element.parentElement?.tagName.toLowerCase();
          if (parentTag === "ol") {
            const siblings = Array.from(element.parentElement?.children || []);
            const index = siblings.indexOf(element) + 1;
            return `${index}. ${childrenContent}\n`;
          }
          return `- ${childrenContent}\n`;
        }
        case "br":
          return "\n";
        case "a": {
          const href = element.getAttribute("href") || "";
          return `[${childrenContent}](${href})`;
        }
        case "img": {
          const src = element.getAttribute("src") || "";
          const alt = element.getAttribute("alt") || "imagem";
          return `![${alt}](${src})`;
        }
        case "table":
          return `\n\n| Tabela | Conteúdo |\n|---|---|\n${childrenContent}\n`;
        case "tr":
          return `| ${childrenContent}\n`;
        case "td":
        case "th":
          return `${childrenContent} |`;
        case "blockquote":
          return `\n> ${childrenContent.trim().replace(/\n/g, "\n> ")}\n`;
        case "code":
        case "pre":
          return `\n\`\`\`\n${childrenContent.trim()}\n\`\`\`\n`;
        default:
          return childrenContent;
      }
    };

    // Traverse body child nodes
    for (let i = 0; i < doc.body.childNodes.length; i++) {
      md += walk(doc.body.childNodes[i]);
    }

    // Clean up sequential line breaks to standard markdown formatting
    return md
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const handleConvert = () => {
    if (!file) return;

    setStatus("converting");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Execute mammoth browser-based conversion
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        const msgList = result.messages.map((m) => m.message);

        setWarnings(msgList);

        // Map HTML structure into high-fidelity markdown
        const markdownResult = convertHtmlToMarkdown(html);

        setMarkdown(markdownResult || "Nenhum conteúdo pôde ser extraído do arquivo.");
        setStatus("success");
      } catch (err: any) {
        console.error("Mammoth DOCX parsing failed:", err);
        setStatus("error");
      }
    };

    reader.onerror = () => {
      setStatus("error");
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${file?.name.replace(".docx", "") || "documento"}.md`;
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

  return (
    <div className="flex flex-col gap-6">
      {/* Intro info */}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Conversor Word (.docx) para Markdown (.md)
        </h3>
        <p className="text-xs text-zinc-400">
          Carregue documentos Word e converta-os em arquivos Markdown estruturados instantaneamente e 100% no seu navegador de forma privada.
        </p>
      </div>

      {status === "idle" && (
        <div className="flex flex-col gap-6">
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
              accept=".docx"
              onChange={handleFileChange}
            />

            {!file ? (
              <>
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-4 text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                  Arraste seu arquivo do Word (.docx) aqui
                </h4>
                <p className="text-xs text-zinc-500 max-w-xs mb-3">
                  Apenas arquivos .docx originais do Microsoft Word.
                </p>
                <span className="text-3xs font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
                  Conversão rápida local e offline
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200 max-w-md truncate px-4" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {formatSize(file.size)} • DOCX
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-4 text-3xs text-rose-400 hover:text-rose-300 bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/25 px-2.5 py-1 rounded-md transition-all font-medium"
                >
                  Trocar Documento
                </button>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={handleConvert}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-4 px-6 rounded-2xl transition-all shadow-xl shadow-indigo-600/15"
            >
              <Sparkles className="w-5 h-5" />
              Converter para Markdown (.md)
            </button>
          )}
        </div>
      )}

      {/* Loading Progress State */}
      {status === "converting" && (
        <div className="border border-zinc-800 bg-zinc-950/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[220px]">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
          <h4 className="text-sm font-semibold text-zinc-200">Convertendo documento localmente...</h4>
          <p className="text-xs text-zinc-500 mt-1">Extraindo tags XML, imagens e formatando cabeçalhos.</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="border border-rose-900/30 bg-rose-950/5 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
          <FileText className="w-10 h-10 text-rose-500" />
          <h4 className="text-sm font-semibold text-zinc-200">Erro na Conversão</h4>
          <p className="text-xs text-zinc-400 max-w-md">Não foi possível processar este arquivo .docx. Certifique-se de que o documento não está protegido por senha.</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-xl text-zinc-300 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Conversion Success State */}
      {status === "success" && markdown && (
        <div className="flex flex-col gap-4">
          {/* Header toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <div>
                <span className="text-xs font-bold text-emerald-400 font-mono">CONVERTIDO COM SUCESSO</span>
                <p className="text-3xs text-zinc-500 mt-0.5">{file?.name}</p>
              </div>
            </div>

            {/* Layout controls */}
            <div className="flex items-center gap-2">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("side")}
                  className={`p-1.5 rounded-md ${viewMode === "side" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  title="Lado a Lado"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`p-1.5 rounded-md ${viewMode === "raw" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  title="Apenas Código Markdown"
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("preview")}
                  className={`p-1.5 rounded-md ${viewMode === "preview" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                  title="Visualização Renderizada"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-zinc-850 h-6 w-[1px]"></span>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-3xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition-all font-medium font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                {copied ? "Copiado!" : "Copiar"}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1 text-3xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition-all font-medium font-mono"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Baixar .md</span>
              </button>

              <button
                onClick={() => setStatus("idle")}
                className="text-3xs text-zinc-500 hover:text-zinc-300 px-2.5 py-1.5 rounded-lg"
              >
                Novo Arquivo
              </button>
            </div>
          </div>

          {/* Main workspace container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw code pane */}
            {(viewMode === "side" || viewMode === "raw") && (
              <div className={`flex flex-col gap-2 ${viewMode === "raw" ? "md:col-span-2" : ""}`}>
                <span className="text-4xs text-indigo-400 font-bold uppercase tracking-wider font-mono">Código Raw (.md)</span>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="w-full h-[400px] bg-black/40 border border-zinc-900 rounded-xl p-4 text-xs font-mono text-zinc-300 leading-relaxed focus:outline-none focus:border-zinc-800 select-all"
                />
              </div>
            )}

            {/* Rendered markdown preview pane */}
            {(viewMode === "side" || viewMode === "preview") && (
              <div className={`flex flex-col gap-2 ${viewMode === "preview" ? "md:col-span-2" : ""}`}>
                <span className="text-4xs text-indigo-400 font-bold uppercase tracking-wider font-mono">Pré-visualização</span>
                <div className="w-full h-[400px] bg-zinc-900/10 border border-zinc-900 rounded-xl p-6 overflow-y-auto prose prose-invert max-w-none text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                  {markdown}
                </div>
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="bg-zinc-950/60 border border-zinc-900/50 p-3 rounded-lg text-3xs text-zinc-500 font-mono flex flex-col gap-1 mt-2">
              <span className="font-semibold text-zinc-400">Avisos do Processador Word (Opcional):</span>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className="truncate">{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
