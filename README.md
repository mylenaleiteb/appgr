# Vesti — guarda-roupa digital

Aplicação mobile-first em React, TypeScript, Tailwind CSS e Supabase. Interface em português com acesso por conta autenticada.

## Executar

Requer Node.js 20.19+ (recomendado Node 22).

```sh
npm install
npm run dev
```

Abra a URL informada pelo Vite (normalmente http://localhost:5173).

## Conectar o Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/migrations/001_initial.sql` no SQL Editor de um projeto novo. A migration cria tabelas, categorias, índices, RLS, função transacional para salvar looks e bucket privado `wardrobe`.
   Depois execute `supabase/migrations/002_clothing_color.sql` para adicionar a cor opcional.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL do projeto e sua chave pública anon/publishable. Nunca use a chave service_role no frontend.
4. No Supabase Auth, habilite o provedor de e-mail/senha. Configure Site URL e as URLs de redirecionamento para o endereço de desenvolvimento e produção. Com confirmação de e-mail ativa, confirme o cadastro pelo link recebido antes de entrar.
5. Reinicie `npm run dev`.

O Supabase precisa estar configurado para usar a aplicação. Sem as variáveis, o app mostra uma tela de indisponibilidade; com a conexão configurada, abre a autenticação. Novas contas começam vazias, e roupas, fotos e looks são salvos somente no Supabase. A imagem editorial do início é externa e exige internet. Fontes externas têm fallback local.

## Funcionalidades

- Início com visão do acervo, guarda-roupa por categorias, busca, favoritos e ordenação.
- Fotos com preview e recorte opcional: arrastar, zoom e formatos vertical, quadrado, horizontal ou original. É possível manter a foto inteira, cancelar sem perder o formulário e reajustar o recorte antes de salvar. A imagem é recortada a partir do arquivo original, redimensionada até 1400px e comprimida em WebP antes do upload.
- Cadastro, edição, exclusão confirmada, detalhes de peças e looks relacionados.
- Montagem visual por posição, pré-seleção a partir de uma peça, múltiplos acessórios e sobreposições sem restrições rígidas.
- Looks persistidos apenas como relações com peças, sem gerar imagem composta. Criação e edição dos relacionamentos acontecem em uma única transação PostgreSQL.
- Autenticação, logout, fotos privadas com URLs temporárias renovadas durante a sessão, RLS por conta e navegação inferior no mobile.
- Estados vazios, skeleton, feedback de ações, suporte a redução de movimento e modais com controle de foco e Escape.

O bucket é `wardrobe`; o objeto tem caminho `{user_id}/{uuid}.webp`, formando `wardrobe/{user_id}/{uuid}.webp`. Categorias são dados, não enums: novas categorias podem ser inseridas por administradores no banco com um dos seis tipos funcionais. Excluir uma peça remove as relações, preservando os looks, que podem ser completados novamente. Exclusões/alterações do banco e Storage são operações separadas: falhas na limpeza de fotos são comunicadas; para produção em grande escala, recomenda-se rotina de limpeza de objetos órfãos.

## Validação e publicação

### Publicar no GitHub Pages

O GitHub Pages hospeda a interface; autenticação, banco PostgreSQL e fotos continuam no Supabase. O workflow `.github/workflows/deploy.yml` já instala dependências, testa, gera o build e publica automaticamente quando a branch `main` recebe um push.

1. Envie os arquivos do projeto para seu repositório, incluindo `package-lock.json` e `.github/workflows/deploy.yml`. Não envie `.env` nem `node_modules`. Se a branch principal tiver outro nome, ajuste `branches: [main]` no workflow.
2. No repositório, abra **Settings → Pages → Build and deployment → Source** e selecione **GitHub Actions**.
3. Para usar contas reais, execute a migration no Supabase conforme a seção anterior. No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` usando os mesmos valores públicos do `.env` local. Use somente a chave anon/publishable, nunca service_role ou chave secreta do Supabase. Os valores `VITE_` entram no JavaScript publicado; a proteção dos dados é feita pelas políticas RLS.
4. Abra **Actions → Publicar Vesti no GitHub Pages → Run workflow** ou faça um novo push na `main`. Ao terminar, o endereço aparece no deploy e em **Settings → Pages**. Normalmente será `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
5. No Supabase, em **Authentication → URL Configuration**, coloque esse endereço completo, com a barra final, em **Site URL** e **Redirect URLs**. Mantenha também `http://localhost:5173/` nos redirecionamentos permitidos se continuar desenvolvendo localmente.

Sem os dois secrets, a publicação mostra uma tela de indisponibilidade. Após adicionar ou alterar secrets, execute o workflow novamente: essas variáveis são incorporadas durante o build. Confirme cadastro por e-mail, login e upload no endereço publicado antes de compartilhar o acesso.

O caminho base é detectado pelo GitHub Pages, incluindo o nome do repositório. O build local usa caminhos relativos. Não é necessário criar uma branch `gh-pages` nem publicar os arquivos TypeScript diretamente. Configurar o workflow localmente não publica o site: é preciso enviá-lo ao GitHub e habilitar Pages.

Referências: [deploy Vite no GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), [redirecionamentos do Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls).

### Verificar localmente

```sh
npm test
npm run build
npm run preview
```

Testes de navegador: `npm run test:e2e`. A configuração usa o Microsoft Edge instalado, em modo headless, nos tamanhos desktop e iPhone 13. Para outros ambientes, ajuste `channel` em `playwright.config.ts` e instale o navegador correspondente. Os testes iniciam um servidor isolado na porta 5174 com credenciais fictícias e interceptam as chamadas ao Supabase, sem usar a conta ou os dados reais. Cobrem login obrigatório, cadastro de peças, montagem de looks, recarga, edição, exclusão e logout. A integração com o serviço real deve ser validada separadamente. `npm run format` formata o código.

O build fica em `dist/` e pode ser publicado em hospedagem estática HTTPS. Configure as variáveis `VITE_` no ambiente de build. A navegação usa estado interno e não requer regras de rewrite. O projeto não inclui credenciais nem provisiona um serviço Supabase automaticamente.

Para verificar a integração real após a configuração: crie duas contas, cadastre e edite uma foto, salve um look, recarregue a página, teste favoritos e exclusão; confirme que a segunda conta não acessa os dados nem os objetos Storage da primeira.

Referências: [Supabase Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [controle de acesso ao Storage](https://supabase.com/docs/guides/storage/security/access-control).

## Atualizar um projeto com peças já cadastradas

Antes de publicar esta versão, execute somente `supabase/migrations/002_clothing_color.sql` no SQL Editor do projeto Supabase existente. Não execute novamente `001_initial.sql`. A nova migration apenas adiciona a coluna opcional `color`, sem alterar peças, fotos, favoritos ou relações dos looks. As peças existentes aparecem como “Sem cor informada”; use **Editar peça → Cor** para preenchê-la quando quiser, sem reenviar a foto.

A escolha de peças nos looks permite combinar filtros de tipo (categorias da posição escolhida) e cor. Ao abrir uma posição, os filtros voltam a mostrar todas as opções. O guarda-roupa também permite filtrar por cor, inclusive peças sem cor informada.
