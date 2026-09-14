export type Position = 'TOP' | 'OUTERWEAR' | 'BOTTOM' | 'ONE_PIECE' | 'SHOES' | 'ACCESSORY';
export type Category = { id: string; name: string; type: Position };
export type Clothing = {
  id: string;
  name: string;
  category_id: string;
  color?: string | null;
  favorite: boolean;
  image_path: string;
  image_url?: string;
};
export type Outfit = {
  id: string;
  name: string;
  favorite: boolean;
  items: { clothing_id: string; position: Position }[];
};
export const positions: Record<Position, string> = {
  TOP: 'Parte de cima',
  OUTERWEAR: 'Casaco',
  BOTTOM: 'Parte de baixo',
  ONE_PIECE: 'Peça única',
  SHOES: 'Calçados',
  ACCESSORY: 'Acessórios',
};
export const categories: Category[] = [
  ['camisetas', 'Camisetas', 'TOP'],
  ['camisas', 'Camisas', 'TOP'],
  ['regatas', 'Regatas', 'TOP'],
  ['calcas', 'Calças', 'BOTTOM'],
  ['shorts', 'Shorts', 'BOTTOM'],
  ['saias', 'Saias', 'BOTTOM'],
  ['vestidos', 'Vestidos', 'ONE_PIECE'],
  ['casacos', 'Casacos', 'OUTERWEAR'],
  ['calcados', 'Calçados', 'SHOES'],
  ['acessorios', 'Acessórios', 'ACCESSORY'],
].map(([id, name, type]) => ({ id, name, type: type as Position }));

export const colors = [
  'Preto',
  'Branco',
  'Cinza',
  'Bege',
  'Marrom',
  'Azul',
  'Verde',
  'Amarelo',
  'Laranja',
  'Vermelho',
  'Rosa',
  'Roxo',
  'Dourado',
  'Prateado',
  'Multicolorido',
];
