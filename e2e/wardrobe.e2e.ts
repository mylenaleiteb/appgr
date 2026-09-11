import { test, expect, login } from './supabase-fixture';
test('cadastro, busca, look, edição, persistência e exclusão', async ({ page }) => {
  await login(page);
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
  await modal.getByRole('button', { name: 'Usar foto inteira', exact: true }).click();
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
test('conta nova sem peças de exemplo, layout sem overflow e favoritos vazios', async ({
  page,
}, testInfo) => {
  await login(page);
  await expect(page.locator('.piece-card')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const navigation = page.locator(
    testInfo.project.name === 'mobile' ? '.bottom-nav' : '.sidebar nav',
  );
  await navigation.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await expect(page.locator('.piece-card')).toHaveCount(0);
  await expect(page.getByText('Seu estilo começa aqui', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-favorites.png`,
    fullPage: true,
  });
});

test('exige login apesar dos dados antigos locais e retorna à entrada após sair', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'vesti-demo',
      JSON.stringify({ clothes: [{ id: 'old', name: 'Peça antiga' }], outfits: [] }),
    ),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /demonstração/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Adicionar peça', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ainda não tenho uma conta' }).click();
  await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Já tenho uma conta' }).click();
  await login(page);
  await page
    .locator(testInfo.project.name === 'mobile' ? '.bottom-nav' : '.sidebar nav')
    .getByRole('button', {
      name: testInfo.project.name === 'mobile' ? 'Perfil' : 'Meu perfil',
      exact: true,
    })
    .click();
  await expect(page.locator('.profile-panel')).toContainText('teste@example.com');
  await expect(page.getByText(/demonstração/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
});
