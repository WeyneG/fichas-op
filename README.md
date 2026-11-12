# Fichas · Ordem Paranormal

Site das fichas da mesa. Cada jogador tem a sua ficha com link próprio, abre no
celular ou no note, e tudo sincroniza na hora (PV, PD, perícias, anotações).

- **Personagens** (`/`): lista de fichas da mesa.
- **Ficha** (`/ficha/nome`): PV/PD, atributos, perícias com rolagem de dados,
  habilidades, inventário, histórico, anotações e diário de sessões.
- **Novo personagem** (`/novo`): cada jogador cria a própria ficha e escolhe um PIN.
- **Mesa** (`/mesa`): PV/PD de todo mundo ao vivo. Com o PIN do mestre, dá pra
  ajustar a ficha de qualquer um.

**Quem vê o quê:**
- **Ficha** (PV, PD, perícias, habilidades, inventário): qualquer pessoa com o link vê.
- **Histórico e Anotações**: só o dono (com o PIN) e o mestre veem.
- **Editar**: só o dono (com o PIN) ou o mestre.

---

## Estrutura

```
index.html            página única (o roteamento é feito em JS)
css/style.css         visual
js/config.js          ← AQUI você cola a URL e a chave do Supabase
js/app.js             roteador
js/store.js           salvar/ler (Supabase ou navegador)
js/data.js            perícias, modelos (ex.: Victor)
js/ui.js              utilitários
js/views/*.js         telas (início, ficha, novo, mesa)
supabase/schema.sql   banco de dados (rodar uma vez no Supabase)
vercel.json           faz /ficha/... funcionar na Vercel
```

Não precisa de build, npm nem framework: é HTML + CSS + JS puro.

---

## Passo 1: testar no seu PC (opcional)

Com o `config.js` vazio, o site roda em **modo local** (salva só no navegador).
Serve pra ver como tudo funciona.

```bash
cd ordem-fichas
npx serve -s .
```

Abra `http://localhost:3000`. No modo local, o PIN do mestre é `1234`.

> Abrir o `index.html` com dois cliques **não funciona**. Precisa de um servidor
> como o `serve`, por causa dos módulos JS.

---

## Passo 2: criar o banco no Supabase (grátis)

1. Entre em **https://supabase.com**, faça login com o GitHub e clique em **New project**.
   - **Name:** `fichas-op` (ou outro nome)
   - **Database Password:** gere uma e guarde (não vai usar no site)
   - **Region:** *South America (São Paulo)*
   - Clique em **Create new project** e espere uns 2 minutos.
2. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
3. Abra o arquivo `supabase/schema.sql`, copie **tudo** e cole no editor.
4. **Troque o PIN do mestre:** procure a linha com `extensions.crypt('1234'` e
   troque `1234` pelo PIN que você quiser (4 a 8 números).
5. Clique em **Run**. Tem que aparecer *Success. No rows returned*.
   Depois, faça o mesmo com o arquivo `supabase/rodadas.sql` (combate e ameaças).
6. Pegue as duas informações de acesso:
   - **Project URL:** em **Project Settings → Data API** (ou no botão **Connect**
     no topo). É algo como `https://abcdefgh.supabase.co`.
   - **Chave pública:** em **Project Settings → API Keys**. Use a
     **Publishable key** (`sb_publishable_...`). Em projetos antigos, a
     equivalente é a **anon public** (`eyJ...`).
     ⚠️ **Nunca** use a `secret` / `service_role`.
7. Abra `js/config.js` e cole os dois valores:

```js
export const CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xxxxxxxxx',
  NOME_DA_MESA: 'Ordem Paranormal',   // título que aparece no site
  SUBTITULO: 'Fichas da mesa',
};
```

> Pode deixar essas duas chaves no GitHub público sem problema: elas foram
> feitas pra ficar no navegador. Quem protege as fichas são o PIN e as regras
> do banco (o `schema.sql` bloqueia escrita direta).

Se quiser conferir antes de subir, rode o `npx serve -s .` de novo: o status no
canto de cima tem que mostrar **Conectado**.

---

## Passo 3: subir pro GitHub

1. Crie um repositório novo em **https://github.com/new** (ex.: `fichas-op`).
   Pode ser público ou privado.
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "Fichas Ordem Paranormal"
git branch -M main
git remote add origin https://github.com/WeyneG/fichas-op.git
git push -u origin main
```

---

## Passo 4: publicar na Vercel

1. Entre em **https://vercel.com** com o GitHub.
2. Clique em **Add New… → Project** e escolha o repositório `fichas-op` → **Import**.
3. Nas configurações:
   - **Framework Preset:** `Other`
   - **Build Command:** deixe vazio
   - **Output Directory:** deixe vazio (ou `.`)
4. Clique em **Deploy**. Em uns segundos sai um link tipo
   `https://fichas-op.vercel.app`.
5. (Opcional) Pra mudar o nome do link: **Settings → Domains** e edite o
   `.vercel.app`.

A partir daí, todo `git push` atualiza o site sozinho.

---

## Passo 5: usar com a mesa

1. Mande o link no grupo.
2. Cada jogador toca em **Novo personagem**, preenche o nome e escolhe um **PIN**.
   O PIN fica lembrado no aparelho e serve pra desbloquear em outro.
3. Atributos, perícias, PV/PD máximo e habilidades se ajustam direto na ficha.
4. **No celular**, use "Adicionar à tela inicial" pra ficar com cara de app:
   - **Android (Chrome):** menu ⋮ → *Adicionar à tela inicial*
   - **iPhone (Safari):** botão compartilhar → *Adicionar à Tela de Início*
5. **Mestre:** abra **Mesa → Sou o mestre** e digite o PIN do mestre. Aí dá pra
   mexer em PV/PD de qualquer um, e abrir qualquer ficha já vem desbloqueado.

### Combate e ameaças (tela Mesa)

**Mestre (com o PIN):**
- **Iniciar combate:** entram todos os personagens e as ameaças visíveis.
- **Iniciativa:** digite o número de cada um e clique em **Ordenar por iniciativa**
  (maior primeiro). As setas ▲▼ ajustam a ordem na mão.
- **Turnos:** **Próximo ▶** passa a vez. Quando volta pro primeiro, a rodada sobe.
  O **▶** ao lado de um nome dá a vez direto pra ele.
- **Ameaças:** crie criaturas/NPCs com PV. Cada uma pode ficar **Escondida** (os
  jogadores não recebem nada dela) ou **Visível**. Com **PV oculto**, os jogadores só
  veem o estado (Ileso, Ferido, Muito ferido, Caído). As notas são só suas.

**Jogadores:**
- Na Mesa, veem a ordem dos turnos, de quem é a vez e as ameaças reveladas.
- Na ficha, aparece uma faixa com a rodada e, na sua vez, **"É a sua vez!"** (o
  celular vibra, se o aparelho permitir).
- Se a vez for de uma ameaça escondida, aparece **"???"**.

### Sua ficha (Victor)

Em **Novo personagem**, escolha o modelo **"Victor — Vigilante · Professor"**.
Ele já vem com atributos, perícias, habilidades e histórico preenchidos.

---

## Perguntas comuns

**Esqueceram o PIN.** O mestre abre a ficha (com o PIN do mestre) e vai em
**Opções da ficha → Trocar PIN**.

**Quero trocar o PIN do mestre.** Rode de novo, no SQL Editor, só o bloco
`insert into public.app_settings ...` com o PIN novo.

**Backup.** Na ficha desbloqueada, use **Opções da ficha → Exportar backup**.
O arquivo traz tudo, inclusive histórico e anotações. Pra restaurar, use
**Importar backup**.

**Duas pessoas mexendo na mesma ficha ao mesmo tempo.** Fica valendo a última
alteração salva. Na prática, com cada um na sua ficha, não dá problema.

**A ficha não atualiza sozinha em outro aparelho.** Confira se o `schema.sql`
rodou inteiro (a última parte liga o tempo real). Se precisar, ative em
**Database → Publications → supabase_realtime** e marque a tabela `characters`.

**Projeto do Supabase "pausado".** No plano grátis, o Supabase pausa projetos sem
uso por cerca de uma semana. Se acontecer, entre no painel e clique em
**Restore**. As fichas continuam lá.

**Segurança.** O PIN é uma trava simples, pensada pra mesa de amigos. Não use
um PIN que você usa em outras coisas importantes.
