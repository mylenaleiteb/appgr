import { createClient } from '@supabase/supabase-js';
import type { Outfit } from './data';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export async function compressImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha uma imagem de até 20 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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
