import { useEffect, useRef, useState } from 'react';

// Formati che ci interessano per i prodotti alimentari.
const WANTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// La Barcode Detection API esiste solo in contesti sicuri (HTTPS) e non su tutti
// i browser: su desktop e su Safari di norma manca. Il pulsante va mostrato solo se c'e'.
export function isBarcodeScanSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function BarcodeScanner({ open, onClose, onDetect }) {
  const videoRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let stream = null;
    let timer = null;
    let stopped = false;

    async function start() {
      setError('');

      try {
        // Chiedere formati non supportati dal dispositivo fa fallire il costruttore:
        // tengo solo quelli che dichiara di conoscere.
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = WANTED_FORMATS.filter((format) => supported.includes(format));

        if (formats.length === 0) {
          setError('Questo dispositivo non riconosce i codici a barre dei prodotti.');
          return;
        }

        const detector = new window.BarcodeDetector({ formats });

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

        // ~6 letture al secondo: sufficienti e leggere sulla batteria.
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
            // Frame non leggibile: ignoro e riprovo al giro dopo.
          }
        }, 160);
      } catch (cameraError) {
        setError(
          cameraError?.name === 'NotAllowedError'
            ? 'Permesso fotocamera negato. Abilitalo dalle impostazioni del browser e riprova.'
            : 'Non riesco ad aprire la fotocamera.'
        );
      }
    }

    start();

    // Spegne sempre la fotocamera all'uscita: senza questo la spia resta accesa.
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

      {/* Mirino: il riquadro chiaro al centro, tutto il resto scurito */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-44 w-72 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-semibold text-white drop-shadow">Inquadra il codice a barre</span>
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
          <button type="button" onClick={onClose} className="btn-primary mt-4">
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}