import { test, expect } from '@playwright/test';
test('cadastro, busca, look, edição, persistência e exclusão', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar peça', exact: true }).first().click();
  const modal = page.getByRole('dialog');
  const testImage = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#7e8e5c';
    context.fillRect(0, 0, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await modal.locator('input[type=file]').setInputFiles({
    name: 'teste.png',
    mimeType: 'image/png',
    buffer: Buffer.from(testImage, 'base64'),
  });
  await modal.getByLabel('Nome da peça').fill('Camisa de teste');
  await modal.getByLabel('Categoria').selectOption('camisas');
  await modal.getByRole('button', { name: 'Salvar no guarda-roupa' }).click();
  await expect(modal).toHaveCount(0);
  await page.getByPlaceholder('Buscar uma peça…').fill('Camisa de teste');
  await expect(page.locator('.piece-card')).toHaveCount(1);
  await page.locator('.piece-caption button').click();
  await modal.getByRole('button', { name: 'Montar look com esta peça' }).click();
  await expect(modal.locator('.selected-piece')).toContainText('Camisa de teste');
  await modal.getByLabel('Nome do look').fill('Meu look de teste');
  await modal.getByRole('button', { name: 'Salvar look', exact: true }).click();
  await expect(page.locator('.outfit-card').filter({ hasText: 'Meu look de teste' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.outfit-card').filter({ hasText: 'Meu look de teste' })).toBeVisible();
  await page.getByPlaceholder('Buscar uma peça…').fill('Camisa de teste');
  await page.locator('.piece-caption button').click();
  await modal.getByRole('button', { name: 'Editar peça' }).click();
  await modal.getByLabel('Nome da peça').fill('Camisa editada');
  await modal.getByRole('button', { name: 'Salvar no guarda-roupa' }).click();
  await page.getByPlaceholder('Buscar uma peça…').fill('Camisa editada');
  await page.locator('.piece-caption button').click();
  await modal.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Excluir esta peça?' })
    .getByRole('button', { name: 'Sim, excluir' })
    .click();
  await expect(page.locator('.piece-card')).toHaveCount(0);
  await expect(page.locator('.outfit-card').filter({ hasText: 'Meu look de teste' })).toContainText(
    '0 peças',
  );
});
test('layout sem overflow e navegação por favoritos', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.piece-card')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const navigation = page.locator(
    testInfo.project.name === 'mobile' ? '.bottom-nav' : '.sidebar nav',
  );
  await navigation.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await expect(page.locator('.piece-card')).toHaveCount(3);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-favorites.png`,
    fullPage: true,
  });
});
