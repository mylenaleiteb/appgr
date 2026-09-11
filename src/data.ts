export type Position = 'TOP' | 'OUTERWEAR' | 'BOTTOM' | 'ONE_PIECE' | 'SHOES' | 'ACCESSORY';
export type Category = { id: string; name: string; type: Position };
export type Clothing = {
  id: string;
  name: string;
  category_id: string;
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
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=85`;
export const seedClothes: Clothing[] = [
  {
    id: 'demo-1',
    name: 'Camiseta essencial',
    category_id: 'camisetas',
    favorite: true,
    image_path: photo('photo-1521572163474-6864f9cf17ab'),
  },
  {
    id: 'demo-2',
    name: 'Jeans de todos os dias',
    category_id: 'calcas',
    favorite: false,
    image_path: photo('photo-1542272604-787c3835535d'),
  },
  {
    id: 'demo-3',
    name: 'Camisa clássica',
    category_id: 'camisas',
    favorite: true,
    image_path: photo('photo-1598033129183-c4f50c736f10'),
  },
  {
    id: 'demo-4',
    name: 'Tênis caramelo',
    category_id: 'calcados',
    favorite: false,
    image_path: photo('photo-1549298916-b41d501d3772'),
  },
  {
    id: 'demo-5',
    name: 'Vestido leve',
    category_id: 'vestidos',
    favorite: true,
    image_path: photo('photo-1595777457583-95e059d581b8'),
  },
  {
    id: 'demo-6',
    name: 'Bolsa caramelo',
    category_id: 'acessorios',
    favorite: false,
    image_path: photo('photo-1553062407-98eeb64c6a62'),
  },
];
export const seedOutfits: Outfit[] = [
  {
    id: 'look-1',
    name: 'Um café, sem pressa',
    favorite: true,
    items: [
      { clothing_id: 'demo-1', position: 'TOP' },
      { clothing_id: 'demo-2', position: 'BOTTOM' },
      { clothing_id: 'demo-4', position: 'SHOES' },
    ],
  },
  {
    id: 'look-2',
    name: 'Leve para o fim de semana',
    favorite: false,
    items: [
      { clothing_id: 'demo-5', position: 'ONE_PIECE' },
      { clothing_id: 'demo-6', position: 'ACCESSORY' },
    ],
  },
];
