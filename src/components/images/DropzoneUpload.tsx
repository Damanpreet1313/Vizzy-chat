"use client";

import React, { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileImage, X, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DropzoneUploadProps {
  onUpload: (file: File, shouldProcess: boolean) => void;
  isLoading?: boolean;
}

export const DropzoneUpload = ({ onUpload, isLoading = false }: DropzoneUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [shouldProcess, setShouldProcess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleUpload = () => {
    if (file) {
      onUpload(file, shouldProcess);
      setUploadSuccess(true);
      setTimeout(() => {
        setFile(null);
        setUploadSuccess(false);
      }, 1500);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const captured = e.target.files?.[0];
    if (captured) {
      setFile(captured);
      setUploadSuccess(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <AnimatePresence mode="wait">
        {uploadSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 bg-secondary/10 border border-secondary/30 rounded-xl"
          >
            <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
            <p className="text-sm font-medium text-secondary">Upload successful!</p>
          </motion.div>
        )}

        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {/* Drag & drop zone */}
            <div
              {...(({ onDrag: _onDrag, ...rest }) => rest)(getRootProps())}
              className={cn(
                "border-2 border-dashed rounded-xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                isDragActive
                  ? "border-primary bg-primary/8 scale-[1.01]"
                  : "border-border hover:border-primary/40 hover:bg-accent/50",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-9 w-9 text-muted-foreground/60 mb-2.5" />
              <p className="text-sm font-medium text-center text-foreground">
                {isDragActive ? "Drop image here…" : "Drag & drop or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 25 MB</p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Camera capture button */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4 text-primary" />
              Take Photo
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col gap-3 p-4 border border-primary/30 rounded-xl bg-card"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) handleUpload();
            }}
            ref={(el) => { if (el) el.focus(); }}
          >
            {/* File info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                  <FileImage className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setUploadSuccess(false); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-lg overflow-hidden max-h-52 bg-black/20">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Options */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shouldProcess}
                onChange={(e) => setShouldProcess(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Upscale 2× &amp; Add Watermark</span>
            </label>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setFile(null); setUploadSuccess(false); }}
                disabled={isLoading}
                className="flex-1 border-border hover:bg-muted text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isLoading}
                className="flex-1 bg-gradient-primary text-white text-sm hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Uploading…
                  </>
                ) : (
                  "Upload Image"
                )}
              </Button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground/50">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-semibold">Enter</kbd> to upload
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
