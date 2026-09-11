import { test, expect, login } from './supabase-fixture';

test('recorta os pixels da foto, permite reajustar, cancelar e manter a imagem inteira', async ({
  page,
}, testInfo) => {
  await login(page);
  await page.getByRole('button', { name: 'Adicionar peça', exact: true }).first().click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Nome da peça').fill('Peça com recorte');
  const original = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 150, 400);
    context.fillStyle = '#00ff00';
    context.fillRect(150, 0, 300, 400);
    context.fillStyle = '#0000ff';
    context.fillRect(450, 0, 150, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const photo = {
    name: 'cores.png',
    mimeType: 'image/png',
    buffer: Buffer.from(original, 'base64'),
  };
  await modal.locator('input[type=file]').setInputFiles(photo);
  await expect(modal).toHaveAccessibleName('Ajustar foto');
  await modal.getByRole('button', { name: 'Quadrado', exact: true }).click();
  const zoom = modal.getByRole('slider', { name: 'Zoom da foto' });
  await expect(zoom).toBeEnabled();
  await zoom.focus();
  await zoom.press('End');
  await expect(zoom).toHaveValue('3');
  await modal.getByRole('button', { name: 'Quadrado', exact: true }).click();
  expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-crop.png` });
  await expect(modal.getByRole('button', { name: 'Aplicar recorte' })).toBeEnabled();
  await modal.getByRole('button', { name: 'Aplicar recorte' }).click();
  await expect(modal.getByLabel('Nome da peça')).toHaveValue('Peça com recorte');
  const preview = modal.getByAltText('Preview da peça');
  await expect(preview).toBeVisible();
  await expect
    .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const cropped = await preview.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(img, 0, 0);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      pixel: Array.from(context.getImageData(5, 5, 1, 1).data),
      source: img.src,
    };
  });
  expect(cropped.width).toBe(cropped.height);
  expect(cropped.width).toBeLessThan(400);
  expect(cropped.pixel[1]).toBeGreaterThan(240);
  expect(cropped.pixel[0]).toBeLessThan(15);
  expect(cropped.pixel[2]).toBeLessThan(15);
  expect(cropped.source).toMatch(/^data:image\/webp/);
  await modal.getByRole('button', { name: 'Ajustar recorte', exact: true }).click();
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(preview).toHaveAttribute('src', cropped.source);
  // Reselecionar o mesmo arquivo deve abrir o editor novamente.
  await modal.locator('input[type=file]').setInputFiles(photo);
  await expect(modal).toHaveAccessibleName('Ajustar foto');
  await modal.getByRole('button', { name: 'Usar foto inteira', exact: true }).click();
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(600);
  expect(await preview.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(400);
  await modal.getByRole('button', { name: 'Salvar no guarda-roupa' }).click();
  await expect(page.locator('.piece-card')).toHaveCount(1);
});

test('cancelar a primeira foto preserva os campos e não permite salvar sem foto', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Adicionar peça', exact: true }).first().click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Nome da peça').fill('Minha camisa');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    return canvas.toDataURL().split(',')[1];
  });
  await modal.locator('input[type=file]').setInputFiles({
    name: 'teste.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(modal.getByLabel('Nome da peça')).toHaveValue('Minha camisa');
  await expect(modal.getByRole('button', { name: 'Salvar no guarda-roupa' })).toBeDisabled();
  await expect(modal.getByAltText('Preview da peça')).toHaveCount(0);
});
