'use client';

import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

type CheckInResult = {
  message?: string;
  ticket?: {
    seatCode: string;
    bookingCode: string;
    movieTitle: string;
    showtime: string;
    cinema: string;
    hall: string;
  };
};

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement | HTMLCanvasElement): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats: string[];
}) => BarcodeDetectorLike;

export function TicketQrCheckin() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [code, setCode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticket, setTicket] = useState<CheckInResult['ticket']>();

  const decodeImage = async (file: File) => {
    setMessage('Đang đọc mã QR trong hình...');
    setSuccess(false);
    setTicket(undefined);

    try {
      const image = await createImageBitmap(file);
      const maxSize = 1600;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('CANVAS_UNAVAILABLE');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(pixels.data, pixels.width, pixels.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!result?.data) {
        setMessage('Không tìm thấy mã QR trong hình. Hãy chọn ảnh rõ hơn.');
        return;
      }

      setCode(result.data);
      await submitCode(result.data);
    } catch {
      setMessage('Không thể đọc hình ảnh QR này.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (image) {
      event.preventDefault();
      void decodeImage(image);
    }
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const submitCode = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    stopCamera();
    setLoading(true);
    setMessage('');
    setTicket(undefined);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/tickets/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await response.json()) as CheckInResult;
      setMessage(data.message ?? 'Đã xử lý mã vé.');
      setTicket(data.ticket);
      setSuccess(response.ok);
      if (response.ok) setCode('');
    } catch {
      setMessage('Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Quét bằng BarcodeDetector (nếu có)
  const scanWithBarcodeDetector = async (detector: BarcodeDetectorLike) => {
    const video = videoRef.current;
    if (!video || !cameraOpen) return;

    try {
      const detected = await detector.detect(video);
      const value = detected[0]?.rawValue;
      if (value) {
        setCode(value);
        await submitCode(value);
        return;
      }
    } catch {
      // frame lỗi tạm thời khi camera mới mở
    }

    scanTimerRef.current = window.setTimeout(() => scanWithBarcodeDetector(detector), 250);
  };

  // Fallback: quét bằng jsQR (khi không có BarcodeDetector)
  const scanWithJsQR = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraOpen || video.readyState < video.HAVE_ENOUGH_DATA) {
      scanTimerRef.current = window.setTimeout(scanWithJsQR, 300);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (result?.data) {
      setCode(result.data);
      void submitCode(result.data);
      return;
    }

    scanTimerRef.current = window.setTimeout(scanWithJsQR, 300);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraSupported(true);
      setCameraOpen(true);
      setMessage('');
    } catch {
      setMessage('Không thể mở camera. Hãy cấp quyền camera hoặc nhập mã QR thủ công.');
      setCameraSupported(false);
    }
  };

  // Gắn stream vào video SAU KHI video đã mount (fix lỗi màn hình đen)
  useEffect(() => {
    if (!cameraOpen || !streamRef.current) return;

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    // Chọn cách quét
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;

    if (Detector) {
      void scanWithBarcodeDetector(new Detector({ formats: ['qr_code'] }));
    } else {
      // Fallback dùng jsQR → desktop cũng quét được
      setCameraSupported(true);
      scanWithJsQR();
    }

    return () => {
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [cameraOpen]);

  const isCombo = Boolean(ticket?.seatCode?.startsWith('Combo:'));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Camera quét QR</h3>
              <p className="mt-1 text-sm text-slate-400">Đưa mã QR vé vào giữa khung hình.</p>
            </div>
            {cameraOpen ? (
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Dừng camera
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Mở camera
              </button>
            )}
          </div>

          <div
            tabIndex={0}
            onPaste={handlePaste}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const image = event.dataTransfer.files[0];
              if (image?.type.startsWith('image/')) void decodeImage(image);
            }}
            className="mt-4 rounded-2xl border border-dashed border-sky-400/30 bg-sky-500/5 p-4 text-center text-sm text-slate-300 outline-none focus:border-sky-400"
          >
            <p>Dán ảnh QR, kéo thả ảnh vào đây hoặc chọn từ thiết bị.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 rounded-xl border border-sky-400/30 px-4 py-2 font-semibold text-sky-300 hover:bg-sky-400/10"
            >
              Chọn ảnh QR
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const image = event.target.files?.[0];
                if (image) void decodeImage(image);
                event.currentTarget.value = '';
              }}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
            {cameraOpen ? (
              <>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  className="aspect-video w-full object-cover"
                />
                {/* canvas ẩn dùng cho fallback jsQR */}
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-slate-500">
                {cameraSupported
                  ? 'Camera đang tắt. Bấm "Mở camera" để quét.'
                  : 'Trình duyệt không hỗ trợ camera. Hãy dùng ô nhập mã bên cạnh.'}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-semibold text-white">Nhập mã QR thủ công</h3>
          <p className="mt-1 text-sm text-slate-400">
            Dùng khi camera không khả dụng hoặc để dán mã vé.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCode(code);
            }}
          >
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ví dụ: BK12345678-A1"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? 'Đang kiểm tra...' : 'Check-in vé'}
            </button>
          </form>
        </section>
      </div>

      {message ? (
        <section
          className={`rounded-2xl border p-5 ${
            success
              ? 'border-emerald-400/30 bg-emerald-500/10'
              : 'border-rose-400/30 bg-rose-500/10'
          }`}
        >
          <p className={success ? 'text-emerald-200' : 'text-rose-200'}>{message}</p>
          {ticket ? (
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <span>
                Phim: <strong className="text-white">{ticket.movieTitle}</strong>
              </span>
              <span>
                {isCombo ? 'Combo' : 'Ghế'}:{' '}
                <strong className="text-white">{ticket.seatCode}</strong>
              </span>
              <span>
                Mã đơn: <strong className="text-white">{ticket.bookingCode}</strong>
              </span>
              <span>
                Rạp:{' '}
                <strong className="text-white">
                  {ticket.cinema} · {ticket.hall}
                </strong>
              </span>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}