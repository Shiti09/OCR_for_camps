import { useCallback, useRef, useState } from "react";

interface Props {
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File | null) => void;
  onRunOCR: () => void;
  ocrRunning: boolean;
  meta?: { engine: string; elapsed_ms: number; confidence: number } | null;
}

const ACCEPT = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function Uploader({ file, previewUrl, onFile, onRunOCR, ocrRunning, meta }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files.length) return;
      const f = files[0];
      if (!ACCEPT.includes(f.type)) {
        alert("Please upload JPG, PNG, or WebP.");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
          Camp Sheet Image
        </h2>
        {file && (
          <button
            onClick={() => onFile(null)}
            className="text-xs text-gray-400 hover:text-red-400 transition"
          >
            Remove
          </button>
        )}
      </div>

      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex-1 min-h-[280px] rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center px-6 transition-all ${
            drag
              ? "border-cyan-400 bg-cyan-500/5"
              : "border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.02]"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center mb-4 pulse-ring">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="text-base font-medium text-gray-100">
            Drop handwritten table image here
          </div>
          <div className="text-xs text-gray-400 mt-1">
            or click to browse — JPG, PNG, WebP
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center min-h-[280px] max-h-[380px]">
            <img
              src={previewUrl}
              alt="upload preview"
              className="max-h-[380px] w-auto object-contain"
            />
            {ocrRunning && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full spin-slow" />
                <div className="text-sm text-cyan-200 font-medium">
                  Running GLM-OCR…
                </div>
                <div className="text-[11px] text-gray-400">
                  Preprocessing → adaptive threshold → token decode
                </div>
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-500 truncate">
            {file?.name} • {file ? (file.size / 1024).toFixed(0) : 0} KB
          </div>
        </div>
      )}

      <button
        onClick={onRunOCR}
        disabled={!file || ocrRunning}
        className="btn-primary rounded-xl px-4 py-3 flex items-center justify-center gap-2"
      >
        {ocrRunning ? (
          <>
            <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full spin-slow" />
            Extracting…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5L20 7" opacity="0.0" />
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            </svg>
            Run OCR Extraction
          </>
        )}
      </button>

      {meta && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="text-gray-500">Engine</div>
            <div className="text-gray-200 font-medium truncate">{meta.engine}</div>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="text-gray-500">Time</div>
            <div className="text-gray-200 font-medium">{meta.elapsed_ms} ms</div>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="text-gray-500">Confidence</div>
            <div className="text-gray-200 font-medium">
              {(meta.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
