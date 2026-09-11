import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { compressImage, type ImageCrop } from './lib';

type Props = {
  file: File;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onApply: (blob: Blob) => Promise<void>;
  onCancel: () => void;
};

export default function ImageCropEditor({ file, busy, onBusyChange, onApply, onCancel }: Props) {
  const [source, setSource] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState('portrait');
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const area = useRef<ImageCrop | null>(null);
  const saving = useRef(false);
  const ratios = [
    { id: 'portrait', name: 'Vertical', value: 3 / 4 },
    { id: 'square', name: 'Quadrado', value: 1 },
    { id: 'landscape', name: 'Horizontal', value: 4 / 3 },
    { id: 'original', name: 'Original', value: naturalAspect },
  ];

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function apply(whole = false) {
    if (saving.current || !ready || (!whole && !area.current)) return;
    saving.current = true;
    onBusyChange(true);
    setError('');
    try {
      const result = await compressImage(file, whole ? undefined : area.current!);
      await onApply(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível preparar a foto. Tente novamente.',
      );
    } finally {
      saving.current = false;
      onBusyChange(false);
    }
  }

  return (
    <div className="crop-editor" aria-busy={busy}>
      <p className="muted" id="crop-instructions">
        Arraste a foto para enquadrar a peça. Use o zoom ou o gesto de pinça para aproximar.
      </p>
      <fieldset disabled={busy} className="crop-controls">
        <legend className="sr-only">Formato do recorte</legend>
        <div className="crop-ratios">
          {ratios.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip ${ratio === option.id ? 'selected' : ''}`}
              aria-pressed={ratio === option.id}
              onClick={() => {
                if (ratio === option.id) return;
                area.current = null;
                setRatio(option.id);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
        <div className={`crop-viewport ${busy ? 'is-busy' : ''}`}>
          {source && (
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={ratios.find((option) => option.id === ratio)!.value}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={(_percent, pixels) => {
                area.current = pixels;
              }}
              onMediaLoaded={(media) => {
                setNaturalAspect(media.naturalWidth / media.naturalHeight);
                setReady(true);
              }}
              mediaProps={{
                alt: 'Foto para recortar',
                onError: () => {
                  setReady(false);
                  setError('Não foi possível abrir esta foto. Escolha outra imagem.');
                },
              }}
              cropperProps={{
                'aria-label': 'Área de recorte da foto',
                'aria-describedby': 'crop-instructions',
              }}
            />
          )}
        </div>
        <label className="crop-zoom">
          <span>
            <ZoomOut size={17} />
            Zoom <output>{zoom.toFixed(1)}×</output>
            <ZoomIn size={17} />
          </span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            disabled={!ready}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom da foto"
          />
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
          }}
        >
          <RotateCcw size={15} />
          Centralizar novamente
        </button>
      </fieldset>
      {error && (
        <p className="crop-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="primary full"
        disabled={busy || !ready}
        onClick={() => void apply()}
      >
        <Check size={17} />
        {busy ? 'Preparando foto…' : 'Aplicar recorte'}
      </button>
      <button
        type="button"
        className="secondary full"
        disabled={busy || !ready}
        onClick={() => void apply(true)}
      >
        Usar foto inteira
      </button>
      <button type="button" className="text-button full" disabled={busy} onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}
