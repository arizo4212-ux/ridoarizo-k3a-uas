import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, RefreshCw, Upload, X } from 'lucide-react';

interface SelfieCameraModalProps {
  mode: 'clock-in' | 'clock-out';
  employeeName: string;
  onClose: () => void;
  onConfirm: (payload: { selfieDataUrl: string; locationText: string; notes: string }) => Promise<void>;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  mode,
  employeeName,
  onClose,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [capturedImage, setCapturedImage] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [locationText, setLocationText] = useState<string>('Mendeteksi lokasi...');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Perangkat atau browser tidak mendukung akses kamera langsung. Gunakan unggah foto.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(
        'Akses kamera tidak tersedia atau ditolak. Anda dapat mengambil foto melalui tombol Unggah Selfie di bawah.'
      );
    }
  };

  useEffect(() => {
    startCamera();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lng = pos.coords.longitude.toFixed(5);
          setLocationText(`GPS ${lat}, ${lng}`);
        },
        () => {
          setLocationText('Lokasi perangkat tidak diizinkan');
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    } else {
      setLocationText('GPS tidak tersedia');
    }

    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const size = 320;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const minDim = Math.min(vw, vh);
    const sx = (vw - minDim) / 2;
    const sy = (vh - minDim) / 2;

    // Mirror horizontally for natural selfie view
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.62);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.62));
        stopCamera();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage('');
    setSubmitError(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm({
        selfieDataUrl: capturedImage,
        locationText,
        notes,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan presensi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              {mode === 'clock-in' ? 'Clock-In Foto Selfie' : 'Clock-Out Foto Selfie'}
            </h3>
            <p className="text-xs text-slate-500">{employeeName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Tutup kamera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Camera or Preview Box */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 flex items-center justify-center">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Hasil foto selfie presensi"
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-slate-300 bg-slate-900">
                    <Camera className="h-8 w-8 text-teal-400" />
                    <span>Menyiapkan kamera depan...</span>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900 text-slate-200">
                    <Camera className="h-9 w-9 text-amber-400" />
                    <p className="text-xs leading-relaxed">{cameraError}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <MapPin className="h-4 w-4 text-teal-700 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>

          <div>
            <label htmlFor="attendance-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Catatan (Opsional)
            </label>
            <input
              id="attendance-notes"
              type="text"
              maxLength={250}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === 'clock-in'
                  ? 'Contoh: Shift pagi di kantor pusat'
                  : 'Contoh: Pekerjaan hari ini selesai'
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {submitError}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileFallback}
            className="hidden"
          />

          {/* Actions */}
          {!capturedImage ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!cameraReady}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 min-h-[48px]"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>Ambil Foto Selfie</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[48px]"
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span>Unggah Selfie</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[48px]"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span>Ulangi</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[48px]"
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>
                  {submitting
                    ? 'Menyimpan...'
                    : mode === 'clock-in'
                      ? 'Simpan Clock-In'
                      : 'Simpan Clock-Out'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
