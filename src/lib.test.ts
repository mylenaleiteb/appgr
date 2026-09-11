import { describe, expect, it } from 'vitest';
import { validateLook } from './lib';
import { categories, positions } from './data';
describe('looks', () => {
  it('rejeita look vazio ou sem nome', () => {
    expect(() => validateLook('   ', [{ clothing_id: 'a', position: 'TOP' }])).toThrow();
    expect(() => validateLook('Domingo', [])).toThrow();
  });
  it('permite peça única, sobreposição e acessórios sem exigir calçado', () => {
    expect(() =>
      validateLook('Sobreposição', [
        { clothing_id: 'a', position: 'ONE_PIECE' },
        { clothing_id: 'b', position: 'TOP' },
        { clothing_id: 'c', position: 'ACCESSORY' },
        { clothing_id: 'd', position: 'ACCESSORY' },
      ]),
    ).not.toThrow();
  });
  it('todas as categorias têm posições funcionais reconhecidas', () => {
    expect(categories).toHaveLength(10);
    categories.forEach((c) => expect(positions[c.type]).toBeTruthy());
  });
});
