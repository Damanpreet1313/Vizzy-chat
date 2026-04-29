"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import {
  ZoomIn, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sliders, GitCompare, Download, Loader2, Check, X,
  Crop, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────── */
type Tab = "upscale" | "transform" | "filters" | "compare";

interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
};

interface ImageOperationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  /** Called with the new processed image URL so it can be inserted into chat */
  onResult?: (url: string) => void;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function buildFilterString(f: FilterState) {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    `blur(${f.blur}px)`,
    `grayscale(${f.grayscale}%)`,
  ].join(" ");
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Canvas toBlob failed"))), type, 0.92)
  );
}

/* ─── Slider row ─────────────────────────────────────────────── */
function FilterSlider({
  label, value, min, max, step = 1,
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium tabular-nums">{value}{label === "Blur" ? "px" : "%"}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
      />
    </div>
  );
}

/* ─── Tab button ─────────────────────────────────────────────── */
function TabBtn({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
        active
          ? "bg-primary/15 text-primary border border-primary/25"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

/* ─── Main modal ─────────────────────────────────────────────── */
export function ImageOperationsModal({
  open, onOpenChange, imageUrl, onResult,
}: ImageOperationsModalProps) {
  const [tab, setTab] = useState<Tab>("upscale");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Transform state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });

  // Upscale factor
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 3 | 4>(2);

  const previewRef = useRef<HTMLCanvasElement>(null);

  // Reset when image changes
  useEffect(() => {
    if (open) {
      setProcessedUrl(null);
      setDone(false);
      setError(null);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setFilters({ ...DEFAULT_FILTERS });
      setTab("upscale");
    }
  }, [open, imageUrl]);

  /* ── Live filter preview ── */
  useEffect(() => {
    if (tab !== "filters") return;
    const canvas = previewRef.current;
    if (!canvas) return;
    let cancelled = false;

    loadImage(imageUrl).then((img) => {
      if (cancelled) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = buildFilterString(filters);
      ctx.drawImage(img, 0, 0);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [filters, tab, imageUrl]);

  /* ── Apply upscale ── */
  const applyUpscale = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const img = await loadImage(imageUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * upscaleFactor;
      canvas.height = img.naturalHeight * upscaleFactor;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch {
      setError("Failed to upscale image.");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, upscaleFactor]);

  /* ── Apply transform ── */
  const applyTransform = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const img = await loadImage(imageUrl);
      const rad = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = img.naturalWidth * cos + img.naturalHeight * sin;
      const h = img.naturalWidth * sin + img.naturalHeight * cos;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const blob = await canvasToBlob(canvas);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch {
      setError("Failed to apply transform.");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, rotation, flipH, flipV]);

  /* ── Apply filters ── */
  const applyFilters = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const img = await loadImage(imageUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = buildFilterString(filters);
      ctx.drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch {
      setError("Failed to apply filters.");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, filters]);

  /* ── Download result ── */
  const downloadResult = () => {
    const url = processedUrl ?? imageUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = `vizzy-edited-${Date.now()}.png`;
    a.click();
  };

  /* ── Send to chat ── */
  const sendToChat = () => {
    if (processedUrl && onResult) {
      onResult(processedUrl);
      setDone(true);
      setTimeout(() => onOpenChange(false), 800);
    }
  };

  const currentApply = tab === "upscale" ? applyUpscale
    : tab === "transform" ? applyTransform
    : applyFilters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-card border-border p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Image Operations
            </DialogTitle>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1.5 px-5 pt-4 pb-2 flex-wrap">
            <TabBtn active={tab === "upscale"}   icon={ZoomIn}      label="Upscale"   onClick={() => { setTab("upscale");    setProcessedUrl(null); }} />
            <TabBtn active={tab === "transform"} icon={RotateCw}    label="Transform" onClick={() => { setTab("transform");  setProcessedUrl(null); }} />
            <TabBtn active={tab === "filters"}   icon={Sliders}     label="Filters"   onClick={() => { setTab("filters");    setProcessedUrl(null); }} />
            <TabBtn active={tab === "compare"}   icon={GitCompare}  label="Compare"   onClick={() => setTab("compare")} />
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            <AnimatePresence mode="wait">

              {/* ── Upscale tab ── */}
              {tab === "upscale" && (
                <motion.div key="upscale" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Enlarge your image using high-quality interpolation.</p>
                  <div className="flex gap-2">
                    {([2, 3, 4] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setUpscaleFactor(f)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
                          upscaleFactor === f
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {f}×
                      </button>
                    ))}
                  </div>
                  <ImagePreview src={processedUrl ?? imageUrl} label={processedUrl ? `${upscaleFactor}× upscaled` : "Original"} />
                </motion.div>
              )}

              {/* ── Transform tab ── */}
              {tab === "transform" && (
                <motion.div key="transform" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Rotate and flip your image.</p>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Rotation: {rotation}°</p>
                    <div className="flex gap-2">
                      {[-90, -45, -15, 15, 45, 90].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => setRotation((r) => r + deg)}
                          className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent/50 transition-all"
                        >
                          {deg > 0 ? `+${deg}°` : `${deg}°`}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRotation(0)}
                        className="flex-1 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Flip */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFlipH((v) => !v)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        flipH ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <FlipHorizontal className="w-4 h-4" /> Flip H
                    </button>
                    <button
                      onClick={() => setFlipV((v) => !v)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        flipV ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <FlipVertical className="w-4 h-4" /> Flip V
                    </button>
                  </div>

                  <ImagePreview src={processedUrl ?? imageUrl} label={processedUrl ? "Transformed" : "Original"} rotation={processedUrl ? 0 : rotation} flipH={processedUrl ? false : flipH} flipV={processedUrl ? false : flipV} />
                </motion.div>
              )}

              {/* ── Filters tab ── */}
              {tab === "filters" && (
                <motion.div key="filters" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Adjust image appearance with real-time preview.</p>

                  <div className="space-y-3">
                    <FilterSlider label="Brightness" value={filters.brightness} min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))} />
                    <FilterSlider label="Contrast"   value={filters.contrast}   min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))} />
                    <FilterSlider label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, saturation: v }))} />
                    <FilterSlider label="Grayscale"  value={filters.grayscale}  min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, grayscale: v }))} />
                    <FilterSlider label="Blur"       value={filters.blur}       min={0} max={20}  step={0.5} onChange={(v) => setFilters((f) => ({ ...f, blur: v }))} />
                  </div>

                  <button
                    onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Reset all filters
                  </button>

                  {/* Live canvas preview */}
                  <div className="rounded-xl overflow-hidden border border-border/50 bg-black/10">
                    <canvas ref={previewRef} className="w-full h-auto max-h-64 object-contain" />
                  </div>
                </motion.div>
              )}

              {/* ── Compare tab ── */}
              {tab === "compare" && (
                <motion.div key="compare" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {processedUrl
                      ? "Drag the slider to compare original vs processed."
                      : "Apply an operation first, then come back here to compare."}
                  </p>
                  {processedUrl ? (
                    <div className="rounded-xl overflow-hidden border border-border/50">
                      <ReactCompareSlider
                        itemOne={<ReactCompareSliderImage src={imageUrl} alt="Original" />}
                        itemTwo={<ReactCompareSliderImage src={processedUrl} alt="Processed" />}
                        style={{ width: "100%", maxHeight: 400 }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border flex items-center justify-center h-48 text-muted-foreground/50 text-sm">
                      No processed image yet
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                <X className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* ── Footer actions ── */}
          {tab !== "compare" && (
            <div className="border-t border-border/50 px-5 py-4 flex items-center gap-2">
              <button
                onClick={currentApply}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-150"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Apply</>
                )}
              </button>

              {processedUrl && (
                <>
                  <button
                    onClick={downloadResult}
                    className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {onResult && (
                    <button
                      onClick={sendToChat}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        done
                          ? "border-secondary bg-secondary/15 text-secondary"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/50"
                      )}
                      title="Send to chat"
                    >
                      {done ? <Check className="w-4 h-4" /> : <Crop className="w-4 h-4" />}
                      {done ? "Sent!" : "Use in chat"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Simple image preview with live CSS transform ───────────── */
function ImagePreview({ src, label, rotation = 0, flipH = false, flipV = false }: {
  src: string; label: string; rotation?: number; flipH?: boolean; flipV?: boolean;
}) {
  const transform = [
    rotation !== 0 ? `rotate(${rotation}deg)` : "",
    flipH ? "scaleX(-1)" : "",
    flipV ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ") || "none";

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 bg-black/10 relative">
      <img
        src={src}
        alt={label}
        style={{ transform }}
        className="w-full h-auto max-h-64 object-contain transition-transform duration-200"
      />
      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
