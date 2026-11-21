// =====================================================================
//  REGRAS RÁPIDAS — resumo do Playtest Alpha v1.1 (pp. 14–26)
//  Gaveta lateral que abre de qualquer tela: botão "Regras" no topo,
//  ou qualquer elemento com data-rules="id-da-seção".
//  Só regras — nada da missão (sem spoilers).
// =====================================================================
import { esc } from './ui.js';

const d = (n) => `<span class="rd">d${n}</span>`;

export const RULES = [
  {
    id: 'testes', t: 'Testes', k: 'teste dt rolar somar atributo perícia passo a passo',
    h: `<p>Quando há chance de falhar, você faz um <b>teste</b>: rola <b>o dado do atributo + o dado da perícia</b> e soma os dois.</p>
      <p>Se a soma for <b>igual ou maior que a DT</b>, você consegue. Neste playtest a <b>DT padrão é 7</b>, a não ser que o mestre ou o texto diga outro número.</p>
      <ol class="rsteps">
        <li>O mestre diz qual <b>atributo</b> e qual <b>perícia</b> usar (de acordo com o que você descreveu) e define a DT.</li>
        <li>Você rola os dois dados juntos, soma e fala o total.</li>
        <li>O mestre compara com a DT: igual ou maior, passou; menor, falhou.</li>
      </ol>
      <p class="rnote">Cada perícia tem um atributo-base (veja <a data-rules="pericias">Perícias</a>), mas o mestre pode pedir outro atributo se a ação pedir.</p>`,
  },
  {
    id: 'criticos', t: 'Crítico e falha crítica', k: 'critico falha critica vexame machucado desatenção irritação acidente frustração perda d8 tabela',
    h: `<div class="rbox good"><b>Sucesso crítico</b><p>Dois ou mais dados com o <b>mesmo valor</b>, e esse valor é <b>6 ou mais</b> (6 e 6, 8 e 8…). Você <b>passa automaticamente</b>, seja qual for a DT. Em investigação, ainda ganha <b>uma informação a mais</b>.</p></div>
      <div class="rbox bad"><b>Falha crítica</b><p><b>Todos os dados deram 1.</b> Você falha automaticamente e sofre uma penalidade: o mestre escolhe, ou rola ${d(8)} na tabela.</p></div>
      <table class="rtab"><thead><tr><th>${d(8)}</th><th>Efeito</th></tr></thead><tbody>
        <tr><td>1</td><td><b>Vexame.</b> Descreva a ação do jeito mais vergonhoso possível. Sem efeito nas regras.</td></tr>
        <tr><td>2</td><td><b>Machucado.</b> Físico cai 1 passo até o fim da cena.</td></tr>
        <tr><td>3</td><td><b>Desatenção.</b> Mente cai 1 passo até o fim da cena.</td></tr>
        <tr><td>4</td><td><b>Irritação.</b> Emoção cai 1 passo até o fim da cena.</td></tr>
        <tr><td>5</td><td><b>Acidente.</b> Você perde ${d(4)} PV.</td></tr>
        <tr><td>6</td><td><b>Frustração.</b> Você perde ${d(4)} PD.</td></tr>
        <tr><td>7</td><td><b>Perda.</b> Um item que você carrega (ou um espaço de compra) se perde: quebrou, foi esquecido ou roubado.</td></tr>
        <tr><td>8</td><td>Nada além da falha.</td></tr>
      </tbody></table>
      <p class="rnote">Se o efeito não fizer sentido na cena, o mestre escolhe outro. Na ficha, o site já avisa o crítico e rola essa tabela sozinho.</p>`,
  },
  {
    id: 'ra-rb', t: 'Rolagem alta e baixa (RA/RB)', k: 'ra rb rolagem alta baixa dano',
    h: `<p>Além da soma, importa o valor de cada dado. A <b>rolagem alta (RA)</b> é o <b>maior resultado</b> entre os dados, e a <b>rolagem baixa (RB)</b> é o <b>menor</b>.</p>
      <p>Vale o número que saiu, não o tipo do dado. Se o ${d(6)} tirou 6 e o ${d(8)} tirou 3: <b>RA 6</b> e <b>RB 3</b>.</p>
      <p class="rnote">Muita coisa usa RA/RB: dano no combate, arrombar, alcançar… A ficha mostra a RA e a RB em cada rolagem.</p>`,
  },
  {
    id: 'opostos', t: 'Testes opostos', k: 'oposto disputa contra',
    h: `<p>Quando um personagem tenta algo <b>contra outro</b>, o mestre pode pedir um teste oposto em vez de usar DT: cada um faz o seu teste e <b>quem tirar mais vence</b>.</p>
      <p class="rnote">Ex.: dois personagens pulam pra pegar uma arma no chão. Os dois rolam Acrobacia; quem tirar mais pega primeiro.</p>`,
  },
  {
    id: 'ajuda', t: 'Ajudar outro personagem', k: 'ajuda ajudar aliado passo',
    h: `<p>Gaste <b>sua ação</b> e escolha uma perícia que faça sentido pra ajudar. Ela precisa ser <b>pelo menos ${d(6)}</b> (não dá pra ajudar com ${d(4)}).</p>
      <table class="rtab"><tbody>
        <tr><td>Sua perícia ${d(6)} ou ${d(8)}</td><td>o aliado sobe <b>1 passo</b> no teste</td></tr>
        <tr><td>Sua perícia ${d(10)} ou ${d(12)}</td><td>o aliado sobe <b>2 passos</b> no teste</td></tr>
      </tbody></table>
      <p class="rnote">Na ficha de quem recebe a ajuda: use <b>Passos da perícia</b> no card Modificadores.</p>`,
  },
  {
    id: 'dados', t: 'Dados extras e passos', k: 'bonus dado extra passo aumentar diminuir quatro tres d20 modificador',
    h: `<p>Algumas habilidades e itens deixam você rolar <b>dados a mais</b>, e tudo é somado. Mas o limite é <b>4 dados rolados</b> por teste, e <b>só 3 deles contam</b> pra soma.</p>
      <p><b>Passo</b> é trocar o dado por um tipo acima ou abaixo:</p>
      <p class="rscale">${d(4)} &lt; ${d(6)} &lt; ${d(8)} &lt; ${d(10)} &lt; ${d(12)}</p>
      <p>Um ${d(6)} que desce um passo vira ${d(4)}; um ${d(10)} que sobe vira ${d(12)}. Nada fica abaixo de ${d(4)}, e normalmente nada passa de ${d(12)}. Só efeitos raros, quase sempre paranormais, levam um ${d(12)} a ${d(20)}.</p>
      <p class="rnote">Na ficha: <b>Dados bônus</b> e <b>Passos da perícia</b> ficam no card Modificadores. Se você rolar 4 dados, o site soma os 3 maiores.</p>`,
  },
  {
    id: 'escala', t: 'Atributos e escala dos dados', k: 'atributo físico mente emoção escala treinado especialista mestre grão destreinado',
    h: `<p><b>Físico:</b> força, coordenação, velocidade e fôlego. <b>Mente:</b> raciocínio, estudo e percepção. <b>Emoção:</b> força de vontade, carisma e instinto.</p>
      <table class="rtab"><thead><tr><th></th><th>Atributo</th><th>Perícia</th></tr></thead><tbody>
        <tr><td>${d(4)}</td><td>Abaixo da média (criança, idoso, enfermo)</td><td>Destreinado: leigo</td></tr>
        <tr><td>${d(6)}</td><td>Média humana, um adulto típico</td><td>Treinado: profissional iniciante</td></tr>
        <tr><td>${d(8)}</td><td>Acima da média: talentoso ou treinado</td><td>Especialista: profissional veterano</td></tr>
        <tr><td>${d(10)}</td><td>Muito acima: dos melhores da região</td><td>Mestre: dá palestra, ganha prêmio</td></tr>
        <tr><td>${d(12)}</td><td>Ápice humano: atleta olímpico, Nobel</td><td>Grão-mestre: referência mundial</td></tr>
      </tbody></table>`,
  },
  {
    id: 'pericias', t: 'Perícias', k: 'lista perícias acrobacia aptidão atletismo crime disciplina enganação furtividade intimidação intuição luta máquinas medicina ocultismo percepção persuasão pesquisa pontaria sobrevivência tecnologia vigor',
    h: `<table class="rtab sk"><tbody>
        <tr><td><b>Acrobacia</b></td><td>ginástica, parkour, equilíbrio, skate</td><td>Fís</td></tr>
        <tr><td><b>Aptidão</b></td><td>um campo de estudo: Artes, Atualidades, Burocracia, Exatas, Humanas ou Tática</td><td>Men</td></tr>
        <tr><td><b>Atletismo</b></td><td>correr, saltar, escalar, nadar</td><td>Fís</td></tr>
        <tr><td><b>Crime</b></td><td>furtar, abrir fechaduras, falsificar</td><td>Fís</td></tr>
        <tr><td><b>Disciplina</b></td><td>estudar, se concentrar, aguentar traumas e sustos</td><td>Emo</td></tr>
        <tr><td><b>Enganação</b></td><td>mentir, se disfarçar, seduzir</td><td>Emo</td></tr>
        <tr><td><b>Furtividade</b></td><td>se esconder, andar sem ser notado</td><td>Fís</td></tr>
        <tr><td><b>Intimidação</b></td><td>assustar e coagir pessoas</td><td>Emo</td></tr>
        <tr><td><b>Intuição</b></td><td>"sexto sentido" sobre pessoas e lugares</td><td>Emo</td></tr>
        <tr><td><b>Luta</b></td><td>atacar desarmado ou corpo a corpo</td><td>Fís</td></tr>
        <tr><td><b>Máquinas</b></td><td>operar e consertar máquinas, dirigir</td><td>Men</td></tr>
        <tr><td><b>Medicina</b></td><td>primeiros socorros, tratamento, necropsia</td><td>Men</td></tr>
        <tr><td><b>Ocultismo</b></td><td>saber sobre o paranormal</td><td>Men</td></tr>
        <tr><td><b>Percepção</b></td><td>notar coisas com os sentidos, revistar lugares</td><td>Men</td></tr>
        <tr><td><b>Persuasão</b></td><td>convencer com argumento e lábia</td><td>Emo</td></tr>
        <tr><td><b>Pesquisa</b></td><td>documentos, bancos de dados, analisar evidências</td><td>Men</td></tr>
        <tr><td><b>Pontaria</b></td><td>atacar com arma de arremesso ou de disparo</td><td>Fís</td></tr>
        <tr><td><b>Sobrevivência</b></td><td>acampar, rastrear, acalmar animais</td><td>Men</td></tr>
        <tr><td><b>Tecnologia</b></td><td>usar dispositivos, hackear redes</td><td>Men</td></tr>
        <tr><td><b>Vigor</b></td><td>fôlego, resistir a veneno, aguentar ferimentos</td><td>Fís</td></tr>
      </tbody></table>`,
  },
  {
    id: 'cenas', t: 'Cenas, rodadas e ações', k: 'cena rodada ação turno ordem vez npc',
    h: `<p><b>Cena</b> é um pedaço da história: uma conversa, a investigação de um lugar, uma luta. Quem decide quando começa e quando acaba é o mestre.</p>
      <p><b>Rodadas:</b> quando o mestre quer ordem, cada jogador tem sua vez. Vocês escolhem a ordem; quem já sabe o que fazer vai primeiro. Na dúvida, começa à esquerda do mestre e segue no sentido horário. <b>NPCs agem por último.</b></p>
      <p><b>Ações:</b> por rodada você faz <b>1 ação importante</b> (investigar uma estante, atacar, fugir) e quantas <b>ações pequenas</b> fizerem sentido (falar algo curto, soltar um objeto).</p>
      <p class="rnote">O combate completo vai ter regra própria de ordem, que ainda não saiu no playtest.</p>`,
  },
  {
    id: 'investigacao', t: 'Investigação', k: 'investigar examinar interagir recapitular compartilhar ponto de interesse pista pd',
    h: `<ol class="rsteps">
        <li>O mestre descreve o lugar e diz quais são os <b>pontos de interesse</b> (objetos, lugares, pessoas).</li>
        <li>Na sua vez, você usa uma das ações abaixo e pode receber informações.</li>
        <li>Repete até o grupo parar, ou até algo interromper (tipo uma criatura chegando…).</li>
      </ol>
      <table class="rtab"><tbody>
        <tr><td><b>Investigar</b></td><td>Escolha um ponto de interesse. O mestre descreve e lista as perícias. Você diz <b>uma perícia e o valor dela</b> e recebe as informações com DT <b>até esse valor</b> (perícia ${d(8)} libera até DT 8). Depois, escolha <b>Examinar</b> ou <b>Interagir</b>.</td></tr>
        <tr><td><b>↳ Examinar</b></td><td>Faça o teste da perícia. Se bater a DT de uma informação nova, você recebe. <b>Se não ganhar nada novo, perde 1 PD.</b></td></tr>
        <tr><td><b>↳ Interagir</b></td><td>Descreva algo simples que você faz com o ponto (tirar o quadro da parede, abrir a gaveta). O mestre resolve.</td></tr>
        <tr><td><b>Recapitular</b></td><td>Interprete seu personagem relembrando tudo que o grupo já sabe. Se o mestre achar coerente: <b>Intuição DT 10</b>, passou ganha uma pista nova.</td></tr>
        <tr><td><b>Compartilhar</b></td><td>Explique a um aliado uma pista que você achou nesta cena. Ele faz <b>Pesquisa DT 10</b> como ação livre; se passar, deduz uma pista nova.</td></tr>
        <tr><td><b>Habilidades e itens</b></td><td>Conforme a descrição. O mestre decide se servem e o efeito (normalmente +1 passo).</td></tr>
      </tbody></table>
      <p class="rnote">Recapitular e Compartilhar só dão certo <b>uma vez por cena</b>. Na rodada seguinte, no mesmo ponto, você pode trocar de perícia ou repetir. Pontos de interesse podem esconder coisas ruins também (se cortar num vidro, por exemplo), e alguns não têm pista nenhuma.</p>
      <p class="rnote">Obs.: no resumo de ações o PDF cita Intuição pra Compartilhar, e no texto cita Pesquisa. Se der dúvida, o mestre decide.</p>`,
  },
  {
    id: 'acesso', t: 'Desafios de acesso', k: 'fechadura destrancar arrombar senha crime hack técnico social alcançar sustentar cofre porta',
    h: `<h4>Destrancar (técnica)</h4>
      <ol class="rsteps">
        <li>O mestre rola alguns dados escondido; os números, na ordem, são a <b>senha</b>.</li>
        <li>Você pega a mesma quantidade de dados e <b>vira os números que quiser</b>, sem rolar.</li>
        <li>O mestre diz, em ordem, se cada um está <b>alto, baixo ou exato</b> (ou faz som: tic, toc, click).</li>
      </ol>
      <table class="rtab"><thead><tr><th>Crime</th><th>${d(4)}</th><th>${d(6)}</th><th>${d(8)}</th><th>${d(10)}</th><th>${d(12)}</th></tr></thead>
        <tbody><tr><td>tentativas/rodada</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr></tbody></table>
      <p class="rnote">Cada fechadura tem um máximo de tentativas. Passou disso, ela quebra: só arrombando ou achando a chave.</p>
      <h4>Arrombar (força bruta)</h4>
      <p>Gaste <b>1 PV</b> e faça <b>Atletismo</b> contra a DT do objeto. Se passar, some a sua <b>RA</b> aos pontos. Quando chegar na <b>pontuação alvo (PA)</b>, abriu. Pode fazer barulho ou estragar o que tem dentro.</p>
      <h4>Hackear</h4>
      <p><b>Técnico:</b> teste de <b>Tecnologia</b>, depois resolva uma conta em <b>10 segundos</b>. Quanto melhor o teste, mais fácil a conta.<br>
      <b>Social:</b> teste de <b>Intuição</b>; se passar, responda perguntas sobre quem criou a senha. Cada 3 pontos acima da DT dá direito a errar uma vez.<br>
      Falhou? Tenta de novo na próxima rodada, mas o aparelho pode bloquear ou disparar alarme.</p>
      <h4>Alcançar</h4>
      <p><b>Seguro:</b> 2 ações seguidas, um teste de <b>Acrobacia</b> em cada. Passou nas duas, alcançou. Falhou em uma, toma dano = <b>RB</b> e recomeça.<br>
      <b>Arriscado:</b> 1 ação, <b>Acrobacia com DT +3</b>. Passou, alcançou. Falhou, toma dano = <b>RA</b>.</p>
      <h4>Sustentar</h4>
      <p>Pra erguer ou empurrar algo pesado: gaste <b>1 PV</b> e faça <b>Atletismo</b>. No fim de cada rodada, se quiser continuar segurando, faz outro teste com <b>−1 passo acumulado</b> por rodada.</p>`,
  },
  {
    id: 'combate', t: 'Combate (simplificado)', k: 'combate luta ataque dano esquiva agressores briga',
    h: `<p><b>Luta:</b> os dois fazem <b>Luta</b> em teste oposto. Quem vencer causa dano = sua <b>RA</b> se estiver com arma, ou sua <b>RB</b> se estiver desarmado.</p>
      <p><b>Esquiva:</b> em vez de contra-atacar, você só se defende: faz <b>Acrobacia</b> contra a Luta do agressor e ganha <b>+${d(6)}</b> no teste. Se vencer, ninguém toma dano.</p>
      <p><b>Vários agressores:</b> você só luta (ou esquiva) contra um. Cada um dos outros faz <b>Luta DT 7</b>; se passar, acerta.</p>
      <p class="rnote">É a versão simplificada do playtest. O combate completo ainda vai sair.</p>`,
  },
  {
    id: 'ferimentos', t: 'Ferimentos e traumas (0 PV / 0 PD)', k: 'morrer morte 0 pv pd ferimento trauma vigor disciplina colapso',
    h: `<div class="rbox bad"><b>Chegou a 0 PV</b><p>Faça <b>Vigor DT 7</b>. Passou, continua agindo. Falhou, <b>morre</b>. A cada novo dano que tomar com 0 PV, faz outro teste e a DT sobe <b>+3</b>: 7 → 10 → 13 → 16…</p></div>
      <div class="rbox bad"><b>Chegou a 0 PD</b><p>Mesma coisa com <b>Disciplina</b> (DT 7, +3 por teste). Falhou, tem um <b>colapso mental e morre</b>.</p></div>
      <p class="rnote">Na ficha: quando PV ou PD zera, aparece o botão do teste com a DT certa, e ela sobe +3 sozinha a cada teste. Regra simplificada do playtest: no jogo completo vai ter ferimentos e traumas permanentes.</p>`,
  },
];

// ---------------------------------------------------------------------
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let el = null, lastFocus = null;

function build() {
  el = document.createElement('div');
  el.className = 'rules';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="rules-bg" data-rules-close></div>
    <aside class="rules-pan" role="dialog" aria-modal="true" aria-label="Regras rápidas">
      <header class="rules-h">
        <div><span class="tag">Regras rápidas</span><small>Playtest Alpha v1.1</small></div>
        <button class="x" data-rules-close aria-label="Fechar regras">×</button>
      </header>
      <label class="search rules-q"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="rules-q" placeholder="Buscar regra (ex.: crítico, fechadura, 0 PV)" autocomplete="off" spellcheck="false"></label>
      <nav class="rules-nav">${RULES.map((r) => `<button data-rules-go="${r.id}">${esc(r.t)}</button>`).join('')}</nav>
      <div class="rules-body">${RULES.map((r) => `<section class="rsec" id="rule-${r.id}" data-k="${esc(norm(r.t + ' ' + r.k + ' ' + r.h.replace(/<[^>]+>/g, ' ')))}"><h3>${esc(r.t)}</h3>${r.h}</section>`).join('')}
        <p class="rules-empty hint" hidden>Nada encontrado. Tenta outra palavra.</p>
        <p class="rules-foot">Resumo feito pela mesa a partir do PDF oficial do playtest. Em caso de dúvida, vale o que o mestre decidir.</p></div>
    </aside>`;
  document.body.appendChild(el);
  el.querySelector('#rules-q').addEventListener('input', (e) => filter(e.target.value));
}

function filter(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  let any = false;
  el.querySelectorAll('.rsec').forEach((s) => {
    const ok = words.every((w) => s.dataset.k.includes(w));
    s.hidden = !ok; any = any || ok;
  });
  el.querySelector('.rules-empty').hidden = any;
  el.querySelectorAll('[data-rules-go]').forEach((b) => { b.hidden = !!words.length && el.querySelector(`#rule-${b.dataset.rulesGo}`).hidden; });
}

function go(id) {
  const s = el.querySelector(`#rule-${id}`); if (!s) return;
  if (s.hidden) { el.querySelector('#rules-q').value = ''; filter(''); }
  el.querySelectorAll('[data-rules-go]').forEach((b) => b.classList.toggle('on', b.dataset.rulesGo === id));
  const body = el.querySelector('.rules-body');
  body.scrollTo({ top: body.scrollTop + s.getBoundingClientRect().top - body.getBoundingClientRect().top - 4, behavior: 'smooth' });
  const chip = el.querySelector(`[data-rules-go="${id}"]`);
  if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash');
}

export function openRules(id) {
  if (!el) build();
  lastFocus = document.activeElement;
  el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('rules-open');
  if (id) setTimeout(() => go(id), 60);
  else setTimeout(() => { const q = el.querySelector('#rules-q'); if (window.matchMedia('(pointer: fine)').matches) q.focus(); }, 60);
}
export function closeRules() {
  if (!el || !el.classList.contains('open')) return;
  el.classList.remove('open'); el.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('rules-open');
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ok */ }
}

export function initRules() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-rules],[data-rules-close],[data-rules-go]');
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-rules-close')) closeRules();
    else if (t.hasAttribute('data-rules-go')) go(t.dataset.rulesGo);
    else if (el && el.classList.contains('open') && el.contains(t)) go(t.dataset.rules);
    else openRules(t.dataset.rules || '');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRules(); });
}
