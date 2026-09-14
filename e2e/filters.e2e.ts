import { test, expect, login } from './supabase-fixture';

test('filtra tipos e cores e preserva peça antiga ao informar cor', async ({ page }) => {
  await login(page);
  await page.evaluate(async () => {
    for (const piece of [
      { id: 'old-shirt', name: 'Camisa antiga', category_id: 'camisas' },
      { id: 'blue-shirt', name: 'Camisa azul', category_id: 'camisas', color: 'Azul' },
      { id: 'blue-tee', name: 'Camiseta azul', category_id: 'camisetas', color: 'Azul' },
      { id: 'pants', name: 'Calça azul', category_id: 'calcas', color: 'Azul' },
    ]) {
      await fetch('https://vesti-test.supabase.co/rest/v1/clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...piece, favorite: true, image_path: `test/${piece.id}.webp` }),
      });
    }
  });
  await page.reload();
  await page.locator('.piece-caption button').filter({ hasText: 'Calça azul' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'Montar look com esta peça' }).click();
  const top = modal.locator('.look-slot').filter({ hasText: 'Parte de cima' });
  await top.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(top.locator('.picker button')).toHaveCount(3);
  await top.getByLabel('Tipo de peça').selectOption('camisas');
  await expect(top.locator('.picker button')).toHaveCount(2);
  await top.getByLabel('Cor', { exact: true }).selectOption('Azul');
  await expect(top.locator('.picker button')).toHaveText(['Camisa azul']);
  await top.getByLabel('Cor', { exact: true }).selectOption('Preto');
  await expect(top.getByText(/Nenhuma peça encontrada/)).toBeVisible();
  await top.getByLabel('Cor', { exact: true }).selectOption('none');
  await top.getByRole('button', { name: 'Camisa antiga' }).click();
  await modal.getByLabel('Nome do look').fill('Look preservado');
  await modal.getByRole('button', { name: 'Salvar look', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.locator('.piece-caption button').filter({ hasText: 'Camisa antiga' }).click();
  await modal.getByRole('button', { name: 'Editar peça' }).click();
  await expect(modal.getByLabel('Cor')).toHaveValue('');
  await modal.getByLabel('Cor').selectOption('Verde');
  await modal.getByRole('button', { name: 'Salvar no guarda-roupa' }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await page.locator('.color-filter select').selectOption('Verde');
  await expect(page.locator('.piece-card')).toHaveCount(1);
  await expect(page.locator('.piece-card')).toContainText('Camisa antiga');
  await expect(page.locator('.outfit-card').filter({ hasText: 'Look preservado' })).toContainText(
    '2 peças',
  );
});
