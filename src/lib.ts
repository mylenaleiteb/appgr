import { createClient } from '@supabase/supabase-js';
import type { Outfit } from './data';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export type ImageCrop = { x: number; y: number; width: number; height: number };
export function validateImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha uma imagem de até 20 MB.');
}
export async function compressImage(file: File, crop?: ImageCrop): Promise<Blob> {
  validateImage(file);
  const bitmap = await createImageBitmap(file);
  const area = crop || { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  if (
    !Object.values(area).every(Number.isFinite) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x + area.width > bitmap.width ||
    area.y + area.height > bitmap.height
  ) {
    bitmap.close();
    throw new Error('Ajuste o recorte para ficar dentro da foto.');
  }
  const scale = Math.min(1, 1400 / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  canvas
    .getContext('2d')!
    .drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))),
      'image/webp',
      0.82,
    ),
  );
}
export const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
export function validateLook(name: string, items: Outfit['items']) {
  if (!name.trim()) throw new Error('Dê um nome ao seu look.');
  if (!items.length) throw new Error('Selecione pelo menos uma peça.');
}
