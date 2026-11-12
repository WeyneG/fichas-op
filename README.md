<div align="center">

<img src="icons/icon-512.png" alt="Fichas · Ordem Paranormal" width="120">

# Fichas · Ordem Paranormal

**Fichas de personagem online para mesas de Ordem Paranormal RPG — com sincronização em tempo real, área do mestre e controle de combate.**

[**🔗 Acessar o site**](https://fichas-op.vercel.app)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---
## 📸 Capturas de tela

<div align="center">

<img width="1147" height="619" alt="image" src="https://github.com/user-attachments/assets/964a6667-1b4b-49bd-87b9-5c36d9c5d6c2" />

<div align="center">

<img width="579" height="882" alt="image" src="https://github.com/user-attachments/assets/1c703bfc-499e-4e02-bb47-5ff3ca38aec0" />

<div align="center">

<img width="1134" height="816" alt="image" src="https://github.com/user-attachments/assets/25056e1f-6407-42e9-ae21-fd73d485ab9c" />

<div align="center">

<img width="1139" height="807" alt="image" src="https://github.com/user-attachments/assets/50659211-fd3a-443c-9a34-25d3fbfc2ac7" />


## 📖 Sobre

Ficha de papel some, apaga e ninguém sabe quanto de vida o outro tem. Este projeto
coloca as fichas da mesa num site só: cada jogador cria a sua, edita pelo celular ou
pelo PC, e tudo aparece atualizado na hora para o grupo e para o mestre.

Feito para a minha mesa de **Ordem Paranormal RPG 2**, com visual inspirado no
estilo das fichas oficiais: tons de cinza, névoa, tags "rasgadas" e fonte de máquina
de escrever.

## ✨ Funcionalidades

### Para os jogadores
- 📜 **Ficha completa** — atributos (Físico, Mente, Emoção), 20 perícias, habilidades, inventário, PV e PD
- 🎲 **Rolagem de dados** — cada perícia rola *dado da perícia + dado do atributo*; histórico de rolagens e DT opcional
- ❤️ **PV e PD rápidos** — botões ±1, dano/cura por quantidade, clique direto nos quadradinhos
- 📝 **Histórico e anotações privadas** — história, aparência, conexões, diário de sessões
- 🎨 **Cor da ficha** — cada jogador escolhe a cor do seu personagem (o site inteiro assume a cor ao abrir a ficha)
- 🔒 **PIN pessoal** — todo mundo vê as fichas, mas só o dono edita
- 💾 **Backup** — exportar e importar a ficha em arquivo
- 📱 **Celular primeiro** — layout responsivo e "Adicionar à tela inicial" com ícone próprio

### Para o mestre
- 🎭 **Modo mestre** — com o PIN de mestre, edita qualquer ficha (inclusive a área privada)
- 👁️ **Mesa ao vivo** — PV/PD de todo o grupo atualizando em tempo real
- ⚔️ **Combate por rodadas** — iniciativa, ordenação, passar turno; o jogador da vez recebe **"É A SUA VEZ!"** na ficha (e o celular vibra)
- 👹 **Ameaças (NPCs)** — criaturas com PV e notas secretas, que podem ficar **escondidas** ou **visíveis**; com PV oculto, os jogadores só veem o estado (*Ileso, Ferido, Muito ferido, Caído*)

## 🛠️ Tecnologias e decisões

| Camada | Escolha | Por quê |
|---|---|---|
| Front-end | HTML, CSS e JavaScript puro (ES Modules) | Sem build, sem framework: abre rápido no celular e é simples de manter |
| Banco | Supabase (PostgreSQL) | Banco relacional de verdade, plano gratuito e API pronta |
| Tempo real | Supabase Realtime | Mudanças de PV, turnos e ameaças chegam em todos os aparelhos na hora |
| Hospedagem | Vercel | Deploy automático a cada `git push` |

### 🔐 Segurança

A chave pública do Supabase fica no navegador, então **a proteção está no banco**, não no front:

- **Row Level Security** em todas as tabelas: a parte pública da ficha é *somente leitura*; PINs, anotações privadas, ameaças escondidas e a ordem completa do combate ficam em tabelas **sem nenhuma policy de acesso**.
- **Escrita só via funções RPC** (`security definer`) que conferem o PIN antes de gravar.
- **PINs com hash bcrypt** (`pgcrypto`) — nunca guardados em texto.
- **Ameaças escondidas** não são filtradas na tela, e sim **no banco**: o navegador do jogador nem recebe esses dados.

## 📁 Estrutura

```
├── index.html             # página única (SPA com roteamento em JS)
├── css/style.css          # visual
├── js/
│   ├── app.js             # roteador e casca do site
│   ├── config.js          # URL e chave pública do Supabase
│   ├── store.js           # camada de dados (Supabase ou modo local)
│   ├── data.js            # perícias, modelos e cores
│   ├── ui.js              # utilitários de interface
│   └── views/             # telas: início, ficha, novo personagem, mesa
├── supabase/
│   ├── schema.sql         # tabelas, segurança e funções das fichas
│   └── rodadas.sql        # combate e ameaças
├── icons/  img/           # ícones e logo
└── vercel.json            # rotas da SPA na Vercel
```

## 🚀 Rodando a sua própria mesa

<details>
<summary><b>1. Testar localmente (modo local, sem banco)</b></summary>

Com o `js/config.js` vazio, o site salva tudo só no navegador:

```bash
npx serve -s .
```

Abra `http://localhost:3000`. No modo local, o PIN do mestre é `1234`.

</details>

<details>
<summary><b>2. Criar o banco no Supabase</b></summary>

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/schema.sql` — antes, troque o PIN do mestre na linha marcada com `<<<<<<`.
3. Rode também `supabase/rodadas.sql`.
4. Em **Project Settings → API Keys**, copie a **Publishable key** e a URL do projeto para o `js/config.js`:

```js
export const CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_...',
  NOME_DA_MESA: 'Ordem Paranormal',
  SUBTITULO: 'Fichas da mesa',
};
```

> A chave *publishable* pode ficar pública — quem protege os dados são as regras do banco. **Nunca** use a chave *secret*.

</details>

<details>
<summary><b>3. Publicar na Vercel</b></summary>

1. Suba o projeto para o GitHub.
2. Na [Vercel](https://vercel.com): **Add New → Project → Import** o repositório.
3. Framework Preset: **Other**, sem build. Clique em **Deploy**.

A partir daí, cada `git push` atualiza o site sozinho.

</details>

## ⚠️ Aviso

Projeto **de fã, sem fins lucrativos e não oficial**. *Ordem Paranormal* e seus elementos
pertencem a Rafael Lange (Cellbit) e à Jambô Editora. Este site não é afiliado nem endossado por eles.

## 👤 Autor

**Weyne Gabriel** — Desenvolvedor Full Stack

[![GitHub](https://img.shields.io/badge/GitHub-WeyneG-181717?style=flat-square&logo=github)](https://github.com/WeyneG)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-weynegabriel-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/weynegabriel)
