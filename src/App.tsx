import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Camera,
  Crop,
  Heart,
  House,
  Layers3,
  LogOut,
  Plus,
  Search,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import {
  categories as defaults,
  positions,
  type Category,
  type Clothing,
  type Outfit,
  type Position,
} from './data';
import { blobToDataURL, validateImage, supabase, validateLook } from './lib';
const ImageCropEditor = lazy(() => import('./ImageCropEditor'));

type Page = 'Início' | 'Guarda-roupa' | 'Looks' | 'Favoritos' | 'Perfil';
const navigation = [
  { name: 'Início', icon: House },
  { name: 'Guarda-roupa', icon: Shirt },
  { name: 'Looks', icon: Layers3 },
  { name: 'Favoritos', icon: Heart },
  { name: 'Perfil', icon: UserRound },
] as const;
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    ref.current?.focus();
  }, [title]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll('[role=dialog]')).at(-1) !== ref.current) return;
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select,[tabindex="0"]',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Photo({ piece }: { piece: Clothing }) {
  return (
    <img
      src={piece.image_url || piece.image_path}
      alt={piece.name}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.opacity = '.2';
      }}
    />
  );
}
export default function App() {
  const [page, setPage] = useState<Page>('Início');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaults);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Partial<Clothing> | null>(null);
  const [preview, setPreview] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [look, setLook] = useState<Outfit | null>(null);
  const [picker, setPicker] = useState<Position | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'piece' | 'look'; id: string } | null>(null);
  const [signup, setSignup] = useState(false);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      if (supabase && session) {
        const [c, o, cat] = await Promise.all([
          supabase.from('clothing').select('*').order('created_at', { ascending: false }),
          supabase
            .from('outfits')
            .select('*,items:outfit_items(clothing_id,position)')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('*').order('sort_order'),
        ]);
        if (c.error || o.error || cat.error) throw c.error || o.error || cat.error;
        const rows = await Promise.all(
          (c.data as Clothing[]).map(async (piece) => {
            const { data, error } = await supabase!.storage
              .from('wardrobe')
              .createSignedUrl(piece.image_path, 3600);
            if (error) throw error;
            return { ...piece, image_url: data.signedUrl };
          }),
        );
        setClothes(rows);
        setOutfits(o.data);
        setCategories(cat.data);
      } else {
        setClothes([]);
        setOutfits([]);
      }
    } catch (e) {
      setLoadError(true);
      notify(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [session?.user.id]);
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => void load(), 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [session?.user.id]);
  function errorMessage(e: unknown) {
    return e instanceof Error
      ? e.message
      : typeof e === 'object' && e && 'message' in e
        ? String(e.message)
        : 'Não foi possível concluir. Tente novamente.';
  }
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const go = (next: Page) => {
    setPage(next);
    setQuery('');
    setCategory('all');
    setFavoritesOnly(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openEditor = (piece?: Clothing) => {
    setEditor(piece || { name: '', category_id: categories[0]?.id, favorite: false });
    setPreview(piece?.image_url || piece?.image_path || '');
    setBlob(null);
    setCropFile(null);
    setPhotoFile(null);
    setDetail(null);
  };
  function choosePhoto(file?: File) {
    if (!file) return;
    try {
      validateImage(file);
      setCropFile(file);
    } catch (e) {
      notify(errorMessage(e));
    }
  }
  async function savePiece(e: FormEvent) {
    e.preventDefault();
    if (!editor || uploading || cropFile) return;
    await action(async () => {
      if (!preview || !editor.category_id)
        throw new Error('Adicione uma foto e escolha uma categoria.');
      const id = editor.id || crypto.randomUUID();
      let path = editor.image_path || '';
      let uploaded = false;
      if (blob) {
        path = `${session!.user.id}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase!.storage
          .from('wardrobe')
          .upload(path, blob, { contentType: 'image/webp' });
        if (error) throw error;
        uploaded = true;
      }
      const piece: Clothing = {
        id,
        name:
          editor.name?.trim() ||
          categories.find((c) => c.id === editor.category_id)?.name ||
          'Minha peça',
        category_id: editor.category_id,
        favorite: !!editor.favorite,
        image_path: path,
      };
      const { error } = await supabase!
        .from('clothing')
        .upsert({ ...piece, user_id: session!.user.id });
      if (error) {
        if (uploaded) await supabase!.storage.from('wardrobe').remove([path]);
        throw error;
      }
      if (uploaded && editor.image_path) {
        const cleanup = await supabase!.storage.from('wardrobe').remove([editor.image_path]);
        if (cleanup.error) notify('Peça salva. A foto anterior não pôde ser removida.');
      }
      const { data } = await supabase!.storage.from('wardrobe').createSignedUrl(path, 3600);
      piece.image_url = data?.signedUrl;
      setClothes((old) =>
        editor.id ? old.map((p) => (p.id === id ? piece : p)) : [piece, ...old],
      );
      setEditor(null);
      setPhotoFile(null);
      notify('Peça salva no seu guarda-roupa.');
    });
  }
  async function favorite(kind: 'piece' | 'look', id: string) {
    await action(async () => {
      const list = kind === 'piece' ? clothes : outfits;
      const item = list.find((i) => i.id === id)!;
      const { error } = await supabase!
        .from(kind === 'piece' ? 'clothing' : 'outfits')
        .update({ favorite: !item.favorite })
        .eq('id', id);
      if (error) throw error;
      if (kind === 'piece')
        setClothes((old) => old.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
      else setOutfits((old) => old.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
    });
  }
  const startLook = (piece?: Clothing) => {
    setDetail(null);
    setLook({
      id: crypto.randomUUID(),
      name: '',
      favorite: false,
      items: piece
        ? [
            {
              clothing_id: piece.id,
              position: categories.find((c) => c.id === piece.category_id)!.type,
            },
          ]
        : [],
    });
  };
  async function saveLook(e: FormEvent) {
    e.preventDefault();
    if (!look) return;
    await action(async () => {
      validateLook(look.name, look.items);
      const clean = { ...look, name: look.name.trim() };
      const { error } = await supabase!.rpc('save_outfit', {
        p_id: clean.id,
        p_name: clean.name,
        p_favorite: clean.favorite,
        p_items: clean.items,
      });
      if (error) throw error;
      setOutfits((old) =>
        old.some((o) => o.id === clean.id)
          ? old.map((o) => (o.id === clean.id ? clean : o))
          : [clean, ...old],
      );
      setLook(null);
      setPicker(null);
      notify('Look salvo. Sua próxima combinação está pronta!');
    });
  }
  async function remove() {
    if (!confirm) return;
    await action(async () => {
      const { error } = await supabase!
        .from(confirm.kind === 'piece' ? 'clothing' : 'outfits')
        .delete()
        .eq('id', confirm.id);
      if (error) throw error;
      if (confirm.kind === 'piece') {
        const piece = clothes.find((c) => c.id === confirm.id);
        setClothes((old) => old.filter((p) => p.id !== confirm.id));
        setOutfits((old) =>
          old.map((o) => ({ ...o, items: o.items.filter((i) => i.clothing_id !== confirm.id) })),
        );
        setDetail(null);
        if (piece) {
          const { error } = await supabase!.storage.from('wardrobe').remove([piece.image_path]);
          if (error) notify('Peça excluída. Não foi possível limpar a foto do Storage.');
        }
      } else {
        setOutfits((old) => old.filter((o) => o.id !== confirm.id));
        setLook(null);
      }
      setConfirm(null);
      notify('Excluído com sucesso.');
    });
  }
  const selected = clothes.find((c) => c.id === detail);
  const name = session?.user.user_metadata?.name || 'você';
  let filtered = clothes.filter(
    (p) =>
      (category === 'all' || p.category_id === category) &&
      (!(favoritesOnly || page === 'Favoritos') || p.favorite) &&
      p.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  );
  if (sort) filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  const pieceCard = (piece: Clothing) => (
    <article className="piece-card" key={piece.id}>
      <button className="piece-photo" onClick={() => setDetail(piece.id)}>
        <Photo piece={piece} />
        <span className="photo-open">
          Ver peça <ArrowRight size={16} />
        </span>
      </button>
      <button
        className={`favorite ${piece.favorite ? 'active' : ''}`}
        disabled={busy}
        aria-label={piece.favorite ? 'Remover dos favoritos' : 'Favoritar peça'}
        onClick={() => void favorite('piece', piece.id)}
      >
        <Heart size={18} fill={piece.favorite ? 'currentColor' : 'none'} />
      </button>
      <div className="piece-caption">
        <button onClick={() => setDetail(piece.id)}>{piece.name}</button>
        <span>{categories.find((c) => c.id === piece.category_id)?.name}</span>
      </div>
    </article>
  );
  const outfitCard = (outfit: Outfit) => (
    <article className="outfit-card" key={outfit.id}>
      <button
        className="composition"
        onClick={() => {
          setLook({ ...outfit, items: [...outfit.items] });
          setPicker(null);
        }}
      >
        {outfit.items.length ? (
          outfit.items.map((i) => {
            const p = clothes.find((c) => c.id === i.clothing_id);
            return p ? <Photo key={i.clothing_id} piece={p} /> : null;
          })
        ) : (
          <span>Adicione novas peças a este look</span>
        )}
        <span className="look-tag">
          <Layers3 size={12} />
          {outfit.items.length} peças
        </span>
      </button>
      <div className="outfit-caption">
        <div>
          <h3>{outfit.name}</h3>
          <span>Uma combinação com a sua essência</span>
        </div>
        <button
          className={`icon-button ${outfit.favorite ? 'text-olive' : ''}`}
          disabled={busy}
          aria-label="Favoritar look"
          onClick={() => void favorite('look', outfit.id)}
        >
          <Heart size={18} fill={outfit.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
  const empty = (title: string, description: string, cta: string, click: () => void) => (
    <div className="empty">
      <Shirt size={35} />
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="primary" onClick={click}>
        <Plus size={17} />
        {cta}
      </button>
    </div>
  );
  if (!supabase)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <span className="brand">
            vesti<span>✳</span>
          </span>
          <h1>Voltamos em breve.</h1>
          <p>Não foi possível conectar ao seu guarda-roupa. Tente novamente mais tarde.</p>
          <button className="secondary" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  if (!authReady)
    return (
      <div className="auth-screen">
        <span className="brand">
          vesti<span>✳</span>
        </span>
        <p>Preparando seu espaço…</p>
      </div>
    );
  if (!session)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <a className="brand" href={import.meta.env.BASE_URL}>
            vesti<span>✳</span>
          </a>
          <span className="eyebrow">MENOS DÚVIDAS. MAIS VOCÊ.</span>
          <h1>
            Seu estilo começa
            <br />
            com o que você tem.
          </h1>
          <p>Um lugar para suas peças e todas as suas possibilidades.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action(async () => {
                const email = String(f.get('email')),
                  password = String(f.get('password'));
                const result = signup
                  ? await supabase!.auth.signUp({
                      email,
                      password,
                      options: { data: { name: f.get('name') } },
                    })
                  : await supabase!.auth.signInWithPassword({ email, password });
                if (result.error) throw result.error;
                if (signup && !result.data.session)
                  notify('Confira seu e-mail para confirmar o cadastro.');
              });
            }}
          >
            {signup && (
              <label>
                Seu nome
                <input name="name" autoComplete="given-name" />
              </label>
            )}
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                minLength={6}
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Aguarde…' : signup ? 'Criar minha conta' : 'Entrar'}
            </button>
          </form>
          <button className="text-button" onClick={() => setSignup(!signup)}>
            {signup ? 'Já tenho uma conta' : 'Ainda não tenho uma conta'}
          </button>
        </div>
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go('Início');
          }}
        >
          vesti<span>✳</span>
        </a>
        <div className="brand-caption">SEU GUARDA-ROUPA DIGITAL</div>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? 'nav-item selected' : 'nav-item'}
              onClick={() => go(name)}
            >
              <Icon size={20} />
              <span>{name === 'Perfil' ? 'Meu perfil' : name}</span>
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-star">✳</span>
          <p>
            Você não precisa de mais.
            <br />
            <strong>Precisa de possibilidades.</strong>
          </p>
          <span>Redescubra o que já é seu.</span>
        </div>
        <button className="account" onClick={() => go('Perfil')}>
          <div className="avatar">{name[0].toUpperCase()}</div>
          <div>
            <strong>{name}</strong>
            <span>Meu guarda-roupa</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="mobile-brand brand">
            vesti<span>✳</span>
          </span>
          <div className="breadcrumb">
            Meu espaço <ChevronRight size={13} />
            <span>{page}</span>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <span /> Um espaço só seu
            </span>
            <button className="avatar" aria-label="Meu perfil" onClick={() => go('Perfil')}>
              {name[0].toUpperCase()}
            </button>
          </div>
        </header>
        <main>
          {page === 'Início' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow greeting">
                    <Sun size={15} /> UM NOVO DIA, NOVAS COMBINAÇÕES
                  </div>
                  <h1>
                    Seu guarda-roupa. <em>Mais possibilidades.</em>
                  </h1>
                  <p>Redescubra suas peças e vista a sua melhor versão.</p>
                </div>
                <button className="primary" onClick={() => openEditor()}>
                  <Plus size={18} />
                  Adicionar peça
                </button>
              </section>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <Sparkles size={14} /> SEU ESTILO, DO SEU JEITO
                  </span>
                  <h2>
                    O próximo look incrível
                    <br />
                    já está no seu
                    <br />
                    <em>guarda-roupa.</em>
                  </h2>
                  <p>
                    Um novo olhar para as peças que você ama.
                    <br />
                    Misture, experimente e encontre combinações.
                  </p>
                  <button className="primary" onClick={() => startLook()}>
                    Montar meu look <ArrowRight size={17} />
                  </button>
                  <span className="hero-footnote">
                    Mais criatividade. Menos “não tenho o que vestir”.
                  </span>
                </div>
                <div className="hero-photo">
                  <img
                    src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
                    alt="Inspiração de estilo com roupas em tons naturais"
                  />
                  <div className="hero-photo-shade" />
                  {/*<span className="editorial-word">
                    wear your
                    <br />
                    <i>own story.</i>
                  </span> */}
                  <span className="floating-label">
                    <span>✳</span> O que você tem.
                    <br />
                    Tudo o que pode ser.
                  </span>
                </div>
              </section>
              <div className="stats">
                <button onClick={() => go('Guarda-roupa')}>
                  <span className="stat-icon">
                    <Shirt />
                  </span>
                  <div>
                    <strong>{clothes.length.toString().padStart(2, '0')}</strong>
                    <span>peças no guarda-roupa</span>
                  </div>
                  <ArrowRight size={17} />
                </button>
                <button onClick={() => go('Looks')}>
                  <span className="stat-icon">
                    <Layers3 />
                  </span>
                  <div>
                    <strong>{outfits.length.toString().padStart(2, '0')}</strong>
                    <span>looks com a sua essência</span>
                  </div>
                  <ArrowRight size={17} />
                </button>
                <button onClick={() => go('Favoritos')}>
                  <span className="stat-icon">
                    <Heart />
                  </span>
                  <div>
                    <strong>
                      {(
                        clothes.filter((c) => c.favorite).length +
                        outfits.filter((o) => o.favorite).length
                      )
                        .toString()
                        .padStart(2, '0')}
                    </strong>
                    <span>favoritos para repetir</span>
                  </div>
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <section className="page-heading">
              <div>
                <div className="eyebrow">UM ESPAÇO PARA O SEU ESTILO</div>
                <h1>
                  {page === 'Guarda-roupa'
                    ? 'Meu guarda-roupa'
                    : page === 'Looks'
                      ? 'Meus looks'
                      : page === 'Favoritos'
                        ? 'Os seus favoritos'
                        : 'Do seu jeito'}
                </h1>
                <p>
                  {page === 'Guarda-roupa'
                    ? 'Cada peça tem uma história. E muitas possibilidades.'
                    : page === 'Looks'
                      ? 'Combinações para todos os seus momentos.'
                      : page === 'Favoritos'
                        ? 'Aquelas peças e combinações que são sempre uma boa ideia.'
                        : 'Seu perfil e as preferências do seu espaço.'}
                </p>
              </div>
              {page !== 'Perfil' && (
                <button
                  className="primary"
                  onClick={() => (page === 'Looks' ? startLook() : openEditor())}
                >
                  <Plus size={18} />
                  {page === 'Looks' ? 'Criar look' : 'Adicionar peça'}
                </button>
              )}
            </section>
          )}
          {(page === 'Início' || page === 'Guarda-roupa' || page === 'Favoritos') && (
            <section className="wardrobe-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {page === 'Início'
                      ? 'Um novo olhar para suas peças'
                      : page === 'Favoritos'
                        ? 'Peças favoritas'
                        : 'Todas as suas peças'}
                    <span className="count">
                      {page === 'Favoritos'
                        ? clothes.filter((c) => c.favorite).length
                        : clothes.length}
                    </span>
                  </h2>
                  {page === 'Início' && (
                    <p>As suas favoritas de hoje. As possibilidades de amanhã.</p>
                  )}
                </div>
                {page === 'Início' && (
                  <button className="text-button" onClick={() => go('Guarda-roupa')}>
                    Ver guarda-roupa <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <div className="filters">
                <div className="category-list">
                  <button
                    className={category === 'all' ? 'chip selected' : 'chip'}
                    onClick={() => setCategory('all')}
                  >
                    Todas
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={category === c.id ? 'chip selected' : 'chip'}
                      onClick={() => setCategory(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="search-row">
                  <label className="search">
                    <Search size={17} />
                    <input
                      placeholder="Buscar uma peça…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label="Limpar busca"
                        onClick={() => setQuery('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <button
                    className={`filter-button ${favoritesOnly ? 'enabled' : ''}`}
                    aria-pressed={favoritesOnly}
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                  >
                    <Heart size={16} />
                    <span>Favoritas</span>
                  </button>
                  <button
                    className={`filter-button ${sort ? 'enabled' : ''}`}
                    onClick={() => setSort(!sort)}
                    aria-label="Ordenar por nome"
                    aria-pressed={sort}
                  >
                    <ArrowDownUp size={16} />
                    <span>{sort ? 'Nome A–Z' : 'Recentes'}</span>
                  </button>
                </div>
              </div>
              {loadError ? (
                <div className="empty">
                  <h3>Não foi possível carregar seu guarda-roupa</h3>
                  <button className="primary" onClick={() => void load()}>
                    Tentar novamente
                  </button>
                </div>
              ) : loading ? (
                <div className="clothes-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <div className="skeleton" key={i} />
                  ))}
                </div>
              ) : filtered.length ? (
                <div className="clothes-grid">
                  {(page === 'Início' ? filtered.slice(0, 4) : filtered).map(pieceCard)}
                  {page === 'Guarda-roupa' && (
                    <button className="add-card" onClick={() => openEditor()}>
                      <span>
                        <Plus />
                      </span>
                      <strong>Espaço para mais uma história</strong>
                      <small>Adicione uma peça</small>
                    </button>
                  )}
                </div>
              ) : (
                empty(
                  query || category !== 'all' || favoritesOnly
                    ? 'Nenhuma peça por aqui'
                    : 'Seu estilo começa aqui',
                  query
                    ? 'Experimente outro nome ou ajuste os filtros.'
                    : 'Fotografe sua primeira peça e descubra novas combinações.',
                  'Adicionar peça',
                  () => openEditor(),
                )
              )}
            </section>
          )}
          {(page === 'Looks' || page === 'Favoritos' || page === 'Início') && (
            <section className="looks-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">INSPIRAÇÃO QUE JÁ É SUA</div>
                  <h2>
                    {page === 'Favoritos'
                      ? 'Looks favoritos'
                      : page === 'Início'
                        ? 'Prontos para sair com você'
                        : 'Suas combinações'}
                  </h2>
                </div>
                {page === 'Início' && (
                  <button className="text-button" onClick={() => go('Looks')}>
                    Ver todos os looks <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <div className="outfits-grid">
                {outfits.filter((o) => page !== 'Favoritos' || o.favorite).map(outfitCard)}
                <button className="create-look-card" onClick={() => startLook()}>
                  <span className="sparkle-circle">
                    <Sparkles size={26} />
                  </span>
                  <h3>Sua próxima combinação</h3>
                  <p>
                    Peças conhecidas.
                    <br />
                    Um jeito novo de vestir.
                  </p>
                  <span className="text-button">
                    Criar um look <Plus size={17} />
                  </span>
                </button>
              </div>
            </section>
          )}
          {page === 'Perfil' && (
            <section className="profile-panel">
              <div className="avatar large">{name[0].toUpperCase()}</div>
              <h2>{name}</h2>
              <p>{session.user.email}</p>
              <div className="profile-row">
                <Shirt />
                <span>Peças cadastradas</span>
                <strong>{clothes.length}</strong>
              </div>
              <div className="profile-row">
                <Layers3 />
                <span>Looks salvos</span>
                <strong>{outfits.length}</strong>
              </div>
              <div className="profile-row">
                <CheckCheck />
                <span>Fotos privadas e dados protegidos por conta</span>
              </div>
              <button
                className="primary"
                onClick={() =>
                  void action(async () => {
                    const { error } = await supabase!.auth.signOut();
                    if (error) throw error;
                    setSession(null);
                    setClothes([]);
                    setOutfits([]);
                    setEditor(null);
                    setCropFile(null);
                    setPhotoFile(null);
                    setDetail(null);
                    setLook(null);
                    setConfirm(null);
                    go('Início');
                  })
                }
              >
                <LogOut size={17} />
                Sair da conta
              </button>
            </section>
          )}
          {/*<footer className="footer">
            <span className="brand">
              vesti<span>✳</span>
            </span>
            <span>Menos excesso. Mais essência.</span>
            <span>Feito para o seu jeito de vestir.</span>
          </footer>*/}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {navigation.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => go(name)} className={page === name ? 'selected' : ''}>
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {editor && (
        <Modal
          title={cropFile ? 'Ajustar foto' : editor.id ? 'Editar peça' : 'Uma nova possibilidade'}
          onClose={() => {
            if (!busy && !uploading) {
              if (cropFile) setCropFile(null);
              else {
                setEditor(null);
                setPhotoFile(null);
              }
            }
          }}
        >
          {cropFile ? (
            <Suspense
              fallback={
                <p className="muted" role="status">
                  Preparando editor de foto…
                </p>
              }
            >
              <ImageCropEditor
                file={cropFile}
                busy={uploading}
                onBusyChange={setUploading}
                onCancel={() => setCropFile(null)}
                onApply={async (result) => {
                  const url = await blobToDataURL(result);
                  setBlob(result);
                  setPreview(url);
                  setPhotoFile(cropFile);
                  setCropFile(null);
                }}
              />
            </Suspense>
          ) : (
            <form onSubmit={savePiece}>
              <p className="muted">Um registro da sua peça. Muitos looks pela frente.</p>
              <label className={`upload-area ${preview ? 'has-photo' : ''}`}>
                {preview ? (
                  <img src={preview} alt="Preview da peça" />
                ) : (
                  <>
                    <Camera size={35} />
                    <strong>Adicione a foto da sua peça</strong>
                    <span>JPG, PNG ou WebP • até 20 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || uploading}
                  onChange={(e) => {
                    choosePhoto(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <span className="upload-label">
                  <Upload size={16} />
                  {uploading ? 'Preparando imagem…' : preview ? 'Trocar foto' : 'Escolher foto'}
                </span>
              </label>
              {photoFile && (
                <button
                  type="button"
                  className="secondary full"
                  disabled={busy || uploading}
                  onClick={() => setCropFile(photoFile)}
                >
                  <Crop size={16} />
                  Ajustar recorte
                </button>
              )}
              <label>
                Nome da peça <small>opcional</small>
                <input
                  value={editor.name || ''}
                  maxLength={100}
                  placeholder="Ex.: minha camisa de linho"
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                />
              </label>
              <label>
                Categoria
                <select
                  required
                  value={editor.category_id || ''}
                  onChange={(e) => setEditor({ ...editor, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!editor.favorite}
                  onChange={(e) => setEditor({ ...editor, favorite: e.target.checked })}
                />
                <Heart size={17} /> É uma das minhas favoritas
              </label>
              <button className="primary full" disabled={busy || uploading || !preview}>
                {busy ? 'Salvando sua peça…' : 'Salvar no guarda-roupa'}
                <Check size={17} />
              </button>
            </form>
          )}
        </Modal>
      )}
      {selected && (
        <Modal title="Peça" onClose={() => setDetail(null)}>
          <div className="detail-photo">
            <Photo piece={selected} />
            <button
              className={`favorite ${selected.favorite ? 'active' : ''}`}
              disabled={busy}
              aria-label="Favoritar peça"
              onClick={() => void favorite('piece', selected.id)}
            >
              <Heart fill={selected.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <span className="eyebrow">
            {categories.find((c) => c.id === selected.category_id)?.name}
          </span>
          <h2 className="detail-title">{selected.name}</h2>
          <button className="primary full" onClick={() => startLook(selected)}>
            <Sparkles size={17} />
            Montar look com esta peça
          </button>
          <div className="detail-actions">
            <button className="secondary" onClick={() => openEditor(selected)}>
              <SlidersHorizontal size={16} />
              Editar peça
            </button>
            <button
              className="text-button danger"
              onClick={() => setConfirm({ kind: 'piece', id: selected.id })}
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
          <h3>Looks com esta peça</h3>
          <div className="related-looks">
            {outfits
              .filter((o) => o.items.some((i) => i.clothing_id === selected.id))
              .map((o) => (
                <button
                  key={o.id}
                  className="profile-row"
                  onClick={() => {
                    setDetail(null);
                    setLook({ ...o, items: [...o.items] });
                  }}
                >
                  <Layers3 size={18} />
                  <span>{o.name}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
          </div>
          {!outfits.some((o) => o.items.some((i) => i.clothing_id === selected.id)) && (
            <p className="muted">O primeiro look desta peça ainda está por vir.</p>
          )}
        </Modal>
      )}
      {look && (
        <Modal
          title={outfits.some((o) => o.id === look.id) ? 'Seu look' : 'Vamos montar um look?'}
          onClose={() => {
            if (!busy) {
              setLook(null);
              setPicker(null);
            }
          }}
        >
          <form onSubmit={saveLook}>
            <label>
              Nome do look
              <input
                value={look.name}
                maxLength={100}
                required
                placeholder="Ex.: domingo sem pressa"
                onChange={(e) => setLook({ ...look, name: e.target.value })}
              />
            </label>
            <p className="muted">
              Toque em uma posição e escolha uma peça. Seu estilo faz as regras.
            </p>
            <div className="look-builder">
              {(Object.entries(positions) as [Position, string][]).map(([position, label]) => (
                <div key={position} className="look-slot">
                  <div className="slot-label">
                    {label}
                    <small>
                      {['OUTERWEAR', 'SHOES', 'ACCESSORY'].includes(position) ? 'opcional' : ''}
                    </small>
                  </div>
                  <div className="slot-content">
                    {look.items
                      .filter((i) => i.position === position)
                      .map((i) => {
                        const piece = clothes.find((c) => c.id === i.clothing_id);
                        return piece ? (
                          <div className="selected-piece" key={i.clothing_id}>
                            <Photo piece={piece} />
                            <span>{piece.name}</span>
                            <button
                              type="button"
                              aria-label={`Remover ${piece.name}`}
                              onClick={() =>
                                setLook({
                                  ...look,
                                  items: look.items.filter(
                                    (item) => item.clothing_id !== i.clothing_id,
                                  ),
                                })
                              }
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : null;
                      })}
                    <button
                      className="slot-add"
                      type="button"
                      onClick={() => setPicker(picker === position ? null : position)}
                    >
                      <Plus size={18} />
                      {look.items.some((i) => i.position === position) && position !== 'ACCESSORY'
                        ? 'Trocar'
                        : 'Adicionar'}
                    </button>
                  </div>
                  {picker === position && (
                    <div className="picker">
                      {clothes
                        .filter(
                          (c) =>
                            categories.find((cat) => cat.id === c.category_id)?.type === position &&
                            !look.items.some((i) => i.clothing_id === c.id),
                        )
                        .map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              setLook({
                                ...look,
                                items: [
                                  ...look.items.filter(
                                    (i) => position === 'ACCESSORY' || i.position !== position,
                                  ),
                                  { clothing_id: c.id, position },
                                ],
                              });
                              setPicker(null);
                            }}
                          >
                            <Photo piece={c} />
                            <span>{c.name}</span>
                          </button>
                        ))}
                      {!clothes.some(
                        (c) =>
                          categories.find((cat) => cat.id === c.category_id)?.type === position &&
                          !look.items.some((i) => i.clothing_id === c.id),
                      ) && (
                        <p>
                          Nenhuma outra peça nesta posição. Cadastre novas peças no guarda-roupa.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {look.items.some((i) => i.position === 'ONE_PIECE') &&
              look.items.some((i) => i.position === 'TOP' || i.position === 'BOTTOM') && (
                <p className="notice">
                  Peças únicas costumam substituir a parte de cima e de baixo. Mas sobreposições
                  também são bem-vindas!
                </p>
              )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={look.favorite}
                onChange={(e) => setLook({ ...look, favorite: e.target.checked })}
              />
              Salvar como favorito
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar look'}
              <Check size={17} />
            </button>
            {outfits.some((o) => o.id === look.id) && (
              <button
                type="button"
                className="text-button danger full"
                onClick={() => setConfirm({ kind: 'look', id: look.id })}
              >
                <Trash2 size={16} />
                Excluir look
              </button>
            )}
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={confirm.kind === 'piece' ? 'Excluir esta peça?' : 'Excluir este look?'}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p className="muted">
            {confirm.kind === 'piece'
              ? 'A foto será excluída e a peça será removida dos looks que a utilizam. Os looks serão mantidos.'
              : 'A combinação será excluída. Suas peças continuam no guarda-roupa.'}
          </p>
          <div className="detail-actions">
            <button className="secondary" disabled={busy} onClick={() => setConfirm(null)}>
              Manter
            </button>
            <button className="primary destructive" disabled={busy} onClick={() => void remove()}>
              {busy ? 'Excluindo…' : 'Sim, excluir'}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
