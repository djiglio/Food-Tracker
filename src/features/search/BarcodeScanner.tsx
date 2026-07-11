import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, Search } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Inizializza lo scanner
    const initScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode("reader", { 
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8],
          verbose: false
        });
        
        // Configuriamo lo scanner per usare la telecamera posteriore ed essere molto reattivo
        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 }, // Reticolo a forma di codice a barre
            aspectRatio: window.innerWidth / window.innerHeight,
          },
          (decodedText: string) => {
            // Quando un codice viene trovato
            if (!isProcessing) {
              setIsProcessing(true);
              
              // Pausa visiva e aptica se supportata
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
              
              // Chiudi lo scanner stream
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  onScan(decodedText);
                }).catch((err: unknown) => {
                  console.error("Errore stop scanner", err);
                  onScan(decodedText);
                });
              }
            }
          },
          (_errorMessage: string) => {
            // Ignoriamo i continui log di "non trovato" per frame
          }
        );
      } catch (err) {
        console.error(err);
        setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
      }
    };

    initScanner();

    // Pulizia
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-300">
      {/* Header Assoluto */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <h2 className="text-white font-bold text-lg tracking-tight drop-shadow-md">Scanner Alimenti</h2>
        <button onClick={onClose} className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full text-white active:scale-95 transition-all border border-zinc-700">
          <X size={20} />
        </button>
      </div>

      {/* Area Fotocamera Centrale */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {error ? (
          <div className="p-6 text-center text-red-400">
            <p>{error}</p>
          </div>
        ) : (
          <div id="reader" className="w-full max-h-full aspect-[3/4] object-cover bg-black" />
        )}

        {/* Overlay Caricamento se il codice è stato letto e stiamo fetchando */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
            <h3 className="text-white font-bold text-xl">Codice Trovato!</h3>
            <p className="text-zinc-400">Ricerca nel database in corso...</p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="bg-zinc-950 p-6 pb-safe border-t border-zinc-900">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-900 rounded-2xl shrink-0 text-brand-primary">
            <Search size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Inquadra il Codice a Barre</h3>
            <p className="text-zinc-400 text-xs">Allinea il codice all'interno del riquadro luminoso sulla fotocamera. La scansione è automatica.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
