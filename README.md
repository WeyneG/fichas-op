<div align="center">

<img src="icons/icon-512.png" alt="Fichas · Ordem Paranormal" width="120">

# Fichas · Ordem Paranormal

**Fichas de personagem online para mesas de Ordem Paranormal RPG 2, com sincronização em tempo real, área do mestre, combate por rodadas, Modo TV e regras rápidas.**

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

<img width="1147" height="619" alt="Tela inicial" src="https://github.com/user-attachments/assets/964a6667-1b4b-49bd-87b9-5c36d9c5d6c2" />

<img width="579" height="882" alt="Ficha no celular" src="https://github.com/user-attachments/assets/1c703bfc-499e-4e02-bb47-5ff3ca38aec0" />

<img width="1134" height="816" alt="Ficha do agente" src="https://github.com/user-attachments/assets/25056e1f-6407-42e9-ae21-fd73d485ab9c" />

<img width="1139" height="807" alt="Mesa do mestre" src="https://github.com/user-attachments/assets/50659211-fd3a-443c-9a34-25d3fbfc2ac7" />

</div>

## 📖 Sobre

Ficha de papel some, apaga e ninguém sabe quanto de vida o outro tem. Este projeto
coloca as fichas da mesa num site só: cada jogador cria a sua, edita pelo celular ou
pelo PC, e tudo aparece atualizado na hora para o grupo e para o mestre.

Feito para a minha mesa **presencial** de **Ordem Paranormal RPG 2**, com visual inspirado
no estilo das fichas oficiais: tons de cinza, névoa, tags "rasgadas" e fonte de máquina
de escrever. As regras de rolagem seguem o **Playtest Alpha v1.1**.

## ✨ Funcionalidades

### 🧑 Para os jogadores

**Ficha do agente**
- 📜 **Ficha completa:** atributos (Físico, Mente, Emoção) com −/+, todas as perícias (incluindo as 6 Aptidões), habilidades, equipamentos, PV, PD e armadura
- 🔎 **Perícias organizadas:** ordenar por nome ou por passo
- 🗂️ **Habilidades e equipamentos** em abas, com busca e cards que abrem e fecham
- ❤️ **PV e PD rápidos:** ±1, dano/cura por quantidade e clique direto nos quadradinhos
- 🎮 **Modo jogo / Modo edição:** durante a sessão a ficha trava e sobra só o que importa (PV, PD, rolagens e anotações)
- 🎨 **Cor da ficha:** cada jogador escolhe a cor do seu personagem, e o site inteiro assume essa cor ao abrir a ficha

**Rolagens (Playtest Alpha v1.1)**
- 🎲 **Teste de perícia:** dado da perícia + dado do atributo, com DT padrão 7
- ➕ **Modificadores:** dados bônus e passos (d4 → d12), respeitando o limite de 4 dados rolados e 3 somados
- ✨ **Crítico automático:** dois ou mais dados iguais com valor 6 ou mais passam direto
- 💀 **Falha crítica:** todos os dados em 1, e o site já rola o d8 da tabela de efeitos
- 📊 **RA e RB** (rolagem alta e baixa) em toda rolagem, para dano, arrombar, alcançar etc.
- 🩸 **0 PV / 0 PD:** botão do teste de Vigor ou Disciplina, com a DT subindo +3 sozinha a cada teste
- 🧮 **Rolagem livre:** ícones de d4 a d20 ou expressão digitada (`2d6+1d4+3`)
- 🌀 Dados girando, histórico de rolagens e selo de crítico

**Investigação e personagem**
- 🕵️ **Investigação:** pontos de interesse e anotações em 4 abas cada, além do diário de sessões
- 🤝 **Relações:** cards com foto, nome, grau (1 a 3) e marcação de "usada nesta missão"
- 📝 **Histórico:** história, aparência, personalidade e perguntas do personagem

**Geral**
- 📚 **Regras rápidas:** painel com busca, aberto de qualquer tela, com testes, críticos, investigação, desafios de acesso (fechaduras, hack, alcançar), combate e ferimentos. A ficha tem atalhos `?` que abrem direto na regra certa
- 🔒 **PIN pessoal:** todo mundo vê as fichas, mas só o dono edita
- 💾 **Backup:** exportar e importar a ficha em arquivo
- 📱 **Celular primeiro:** layout responsivo e "Adicionar à tela inicial" com ícone próprio

### 🎭 Para o mestre
- 🔑 **Modo mestre:** com o PIN de mestre, edita qualquer ficha (inclusive a área privada)
- 👁️ **Mesa ao vivo:** PV/PD de todo o grupo atualizando em tempo real
- ⚔️ **Combate por rodadas:** iniciativa, ordenação e passar turno. O jogador da vez recebe **"É A SUA VEZ!"** na ficha, e o celular vibra
- 👹 **Ameaças (NPCs):** criaturas com PV e notas secretas, que podem ficar **escondidas** ou **visíveis**. Com o PV oculto, os jogadores só veem o estado (*Ileso, Ferido, Muito ferido, Caído*)
- 📺 **Modo TV (`/tv`):** tela para deixar na TV da mesa, mostrando o grupo e a ordem do combate, com revelação dramática de ameaças. Só aparece o que é público, e o mestre controla tudo pelo celular

### 🌫️ Visual
- Tema cinza com névoa e partículas, com a cor de destaque de cada ficha
- Efeitos opcionais (botão ✦): dano com tremida, vinheta de PV baixo, glitch, transições de página e respiração leve do retrato
- Respeita a opção do sistema de **reduzir movimento**

## 🛠️ Tecnologias e decisões

| Camada | Escolha | Por quê |
|---|---|---|
| Front-end | HTML, CSS e JavaScript puro (ES Modules) | Sem build, sem framework: abre rápido no celular e é simples de manter |
| Banco | Supabase (PostgreSQL) | Banco relacional de verdade, plano gratuito e API pronta |
| Tempo real | Supabase Realtime | Mudanças de PV, turnos e ameaças chegam em todos os aparelhos na hora |
| Hospedagem | Vercel | Deploy automático a cada `git push` |

### 🔐 Segurança

A chave pública do Supabase fica no navegador, então **a proteção está no banco**, não no front:

- **Row Level Security** em todas as tabelas: a parte pública da ficha é *somente leitura*. PINs, anotações privadas, ameaças escondidas e a ordem completa do combate ficam em tabelas **sem nenhuma policy de acesso**.
- **Escrita só via funções RPC** (`security definer`) que conferem o PIN antes de gravar.
- **PINs com hash bcrypt** (`pgcrypto`), nunca guardados em texto.
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
│   ├── ui.js              # utilitários de interface, ícones dos dados e rolagem por expressão
│   ├── fx.js              # efeitos visuais
│   ├── rules.js           # regras rápidas (Playtest Alpha v1.1)
│   └── views/             # telas: início, ficha, novo personagem, mesa e TV
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
2. No **SQL Editor**, rode `supabase/schema.sql`. Antes, troque o PIN do mestre na linha marcada com `<<<<<<`.
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

> A chave *publishable* pode ficar pública, porque quem protege os dados são as regras do banco. **Nunca** use a chave *secret*.

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
As regras rápidas são um resumo próprio, escrito a partir do Playtest Alpha v1.1, e não substituem o material oficial.

## 👤 Autor

**Weyne Gabriel**, Desenvolvedor Full Stack

[![GitHub](https://img.shields.io/badge/GitHub-WeyneG-181717?style=flat-square&logo=github)](https://github.com/WeyneG)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-weynegabriel-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/weynegabriel)
