# Kurokage — Regras do Projeto

## Regra Principal de CSS

**NUNCA** use `style={}` inline para aparência visual em páginas/componentes.
Toda propriedade visual (cor, fundo, borda, padding, font) deve usar `className` com classes de `/src/styles/main.css`.

`style={}` é PERMITIDO apenas para **valores calculados dinamicamente**:
```jsx
// ✅ OK — valor vem de variável
<div style={{ width: `${xpPercent}%` }} />
<div style={{ color: isUnlocked ? 'var(--gold)' : 'var(--muted)' }} />
```

## Estrutura Obrigatória de Toda Tela

```jsx
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

export default function NovaTela({ player, updatePlayer }) {
  const { addToast } = useToast();
  if (!player) return null;
  return (
    <div className="page">
      <PageHeader eyebrow="Categoria" title="Título" subtitle="Descrição" />
      <div className="card">...</div>
    </div>
  );
}
```

## Feedback ao Usuário

- **Sempre** use `addToast()` do `useToast()` — nunca `alert()`
- `addToast('msg', 'success')` | `addToast('msg', 'error')` | `addToast('msg', 'info')`

## Padrão de Banco de Dados

```js
const { error } = await supabase.from('players').update({...}).eq('id', player.id);
if (error) { addToast('Erro: ' + error.message, 'error'); return; }
await updatePlayer(player.user_id);
addToast('Salvo!', 'success');
```

## Classes CSS Principais

Layout: `page`, `grid-2`, `grid-3`, `grid-4`, `grid-auto`, `grid-sidebar`, `flex-row`, `flex-col`, `flex-between`
Cards: `card`, `card-glass`
Tipografia: `page-title`, `section-title`, `card-title`, `mono`, `gold`, `muted`, `danger`, `success`
Botões: `btn-primary`, `btn-ghost`, `btn-danger`, `btn-attr`
Componentes: `badge badge-gold/red/green/muted`, `progress-track`, `progress-fill red/blue/gold/green/yellow`, `dot-indicator red/blue/gold/green`, `attr-row-item`, `points-banner`, `stat-row`, `stats-list`

## Arquivo de referência completo

Ver: `/Users/larrat/.gemini/antigravity/brain/f0ce1427-70d1-41f1-ab59-17a734f2b262/design_system.md`
