import { useEffect, useRef, useState } from 'react';

const WANTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// Prima prova l'API nativa del browser; se manca (o c'e' ma non conosce formati,
// capita quando il modulo di sistema non e' installato) carica il fallback ZXing.
// Il fallback pesa, quindi lo importo solo quando serve davvero.
async function loadDetector() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      const usable = WANTED_FORMATS.filter((format) => formats.includes(format));
      if (usable.length > 0) return { Detector: window.BarcodeDetector, formats: usable, native: true };
    } catch {
      // API presente ma rotta: uso il fallback.
    }
  }

  const module = await import('barcode-detector/ponyfill');
  const formats = await module.BarcodeDetector.getSupportedFormats();
  const usable = WANTED_FORMATS.filter((format) => formats.includes(format));
  return { Detector: module.BarcodeDetector, formats: usable, native: false };
}

export default function BarcodeScanner({ open, onClose, onDetect }) {
  const videoRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return undefined;

    let stream = null;
    let timer = null;
    let stopped = false;

    async function start() {
      setError('');
      setStarting(true);

      try {
        const { Detector, formats } = await loadDetector();
        if (stopped) return;
        if (formats.length === 0) {
          setError('Lettura dei codici a barre non disponibile su questo browser.');
          setStarting(false);
          return;
        }

        const detector = new Detector({ formats });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });

        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStarting(false);

        timer = window.setInterval(async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue?.trim();
            if (value) {
              stopped = true;
              window.clearInterval(timer);
              navigator.vibrate?.(80);
              onDetectRef.current?.(value);
            }
          } catch {
            // Frame non leggibile: riprovo al giro dopo.
          }
        }, 180);
      } catch (cameraError) {
        setStarting(false);
        setError(
          cameraError?.name === 'NotAllowedError'
            ? 'Permesso fotocamera negato. Abilitalo dalle impostazioni del browser e riprova.'
            : "Non riesco ad aprire la fotocamera su questo browser."
        );
      }
    }

    start();

    // Spegne sempre la fotocamera: senza questo la spia resta accesa.
    return () => {
      stopped = true;
      if (timer) window.clearInterval(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-44 w-72 max-w-[80vw] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-semibold text-white drop-shadow">
          {starting ? 'Avvio fotocamera…' : 'Inquadra il codice a barre'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
        >
          Chiudi
        </button>
      </div>

      {error && (
        <div className="absolute inset-x-4 bottom-8 rounded-3xl bg-white p-5 text-center shadow-2xl">
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <button type="button" onClick={onClose} className="btn-primary mt-4">Chiudi</button>
        </div>
      )}
    </div>
  );
}