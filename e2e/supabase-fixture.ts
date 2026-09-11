import { test as base, expect, type Page } from '@playwright/test';
import { categories, type Clothing, type Outfit } from '../src/data';

// Interceptação exclusiva dos testes. Nenhuma requisição usa um projeto real.
export const test = base.extend<{ backend: void }>({
  backend: [
    async ({ page }, use) => {
      let clothes: Clothing[] = [];
      let outfits: Outfit[] = [];
      const user = {
        id: '11111111-1111-4111-8111-111111111111',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'teste@example.com',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: 'Pessoa de teste' },
        created_at: new Date().toISOString(),
      };
      await page.route('https://vesti-test.supabase.co/**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const path = url.pathname;
        const method = req.method();
        const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
        if (path === '/auth/v1/token')
          return json({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user,
          });
        if (path === '/auth/v1/user') return json(user);
        if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
        if (path === '/rest/v1/categories') return json(categories);
        if (path === '/rest/v1/clothing') {
          const id = url.searchParams.get('id')?.replace(/^eq\./, '');
          if (method === 'GET') return json(clothes);
          if (method === 'POST') {
            const piece = req.postDataJSON() as Clothing;
            clothes = [piece, ...clothes.filter((c) => c.id !== piece.id)];
          } else if (method === 'PATCH') {
            clothes = clothes.map((c) => (c.id === id ? { ...c, ...req.postDataJSON() } : c));
          } else if (method === 'DELETE') {
            clothes = clothes.filter((c) => c.id !== id);
            outfits = outfits.map((o) => ({
              ...o,
              items: o.items.filter((i) => i.clothing_id !== id),
            }));
          } else throw new Error(`Unexpected method: ${method}`);
          return route.fulfill({ status: 204 });
        }
        if (path === '/rest/v1/outfits') return json(outfits);
        if (path === '/rest/v1/rpc/save_outfit') {
          const data = req.postDataJSON();
          const outfit: Outfit = {
            id: data.p_id,
            name: data.p_name,
            favorite: data.p_favorite,
            items: data.p_items,
          };
          outfits = [outfit, ...outfits.filter((o) => o.id !== outfit.id)];
          return route.fulfill({ status: 204 });
        }
        if (path.startsWith('/storage/v1/object/sign/') && method === 'POST') {
          return json({ signedURL: '/object/sign/wardrobe/test.webp?token=test' });
        }
        if (path.startsWith('/storage/v1/object/')) {
          if (method === 'GET')
            return route.fulfill({
              status: 200,
              contentType: 'image/svg+xml',
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#7e8e5c"/></svg>',
            });
          return json({ Key: 'test.webp' });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${path}`);
      });
      await use();
    },
    { auto: true },
  ],
});
export { expect };
export async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Seu guarda-roupa. Mais possibilidades.' }),
  ).toBeVisible();
}
