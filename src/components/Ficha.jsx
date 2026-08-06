import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Star,
  BookOpen,
  ShieldCheck,
  HeartHandshake,
  Package,
  PawPrint,
  PenLine,
  Dices,
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  Save,
  Target,
  Coins,
  Sparkles,
  AlertTriangle,
  Table2,
  Moon,
  Crosshair,
  Store,
  Search,
  RefreshCw,
} from "lucide-react";

const STORAGE_KEY = "sacramento-ficha-v4";
const OLD_KEYS = ["sacramento-ficha-v3", "sacramento-ficha-v2", "sacramento-ficha"];

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp0 = (v) => Math.max(0, Number(v) || 0);

const TABS = [
  { id: "pontos", label: "Pontos", icon: Star },
  { id: "historias", label: "Histórias", icon: BookOpen },
  { id: "passivas", label: "Passivas", icon: ShieldCheck },
  { id: "redencao", label: "Redenção", icon: HeartHandshake },
  { id: "objetivos", label: "Objetivos", icon: Target },
  { id: "mochila", label: "Mochila", icon: Package },
  { id: "loja", label: "Loja", icon: Store },
  { id: "cavalo", label: "Cavalo", icon: PawPrint },
  { id: "tabelas", label: "Tabelas", icon: Table2 },
  { id: "anotacoes", label: "Anotações", icon: PenLine },
];

const TAMANHOS = [
  { id: "pequeno", label: "Pequeno (½)", valor: 0.5 },
  { id: "padrao", label: "Padrão (1)", valor: 1 },
  { id: "grande", label: "Grande (2)", valor: 2 },
  { id: "muitoGrande", label: "Muito grande (3)", valor: 3 },
];

const STATUS_TABLE = [
  "Atordoamento — sofre -1 Ação de Combate na próxima rodada.",
  "Queda — cai no chão, gasta 1 Movimento para se levantar.",
  "Distração — não pode atacar o mesmo alvo do último ataque.",
  "Sangramento — sofre 1 de dano de Vida adicional ao fim de cada rodada até o fim do combate.",
  "Intimidação — é forçado a se afastar do atacante na próxima rodada.",
  "Desorientação — sofre -1 em todos os Testes de Violência no próximo turno.",
];
const CRIT_TABLE = [
  "Mortal — +2 Círculos de Vida de dano adicionais no turno do atacante.",
  "Desarmar — o inimigo não pode mais atirar com a arma que estava usando.",
  "Vantagem Tática — +1 de Movimento até o fim do combate.",
  "Dança Maluca — o inimigo perde o próximo turno inteiro.",
  "Vantagem Moral — +1 em todos os Testes de Violência até o fim do combate.",
  "Marca da Vingança — o inimigo foge do combate imediatamente.",
];
const FUMBLE_TABLE = [
  "Fogo Amigo — o ataque atinge acidentalmente um aliado ou inocente.",
  "Guarda Aberta — inimigos recebem +1 em testes contra você até o fim do combate.",
  "Abatido — perde o próximo turno inteiro se recompondo.",
  "Quebra de Equipamento — a arma quebra permanentemente (ou dano desarmado é anulado).",
  "Pressão — -1 em todos os seus ataques até o fim do combate.",
  "Queda — cai no chão, precisa gastar 2 ações de qualquer tipo para se levantar.",
];
const BEBEDEIRA_COL1 = ["Fez amizade com...", "Se casou com...", "Roubou algo de...", "Saiu no soco com...", "Perdeu uma aposta de...", "Contou seus segredos para..."];
const BEBEDEIRA_COL2 = ["um padre", "um coveiro", "um interesse amoroso", "uma vaca", "um inimigo", "uma árvore/planta"];
const BEBEDEIRA_COL3 = ["no chão do salão.", "numa cela na cadeia.", "no porão de algum lugar.", "dentro de um caixão no cemitério.", "no meio do mato.", "no chiqueiro/curral."];
const FIDELIDADE_TEXT = [
  "Nível 0 — montaria estranha, nenhum bônus.",
  "Nível 1 — +1 ponto em Potência ou Resistência, à escolha.",
  "Nível 2 — mais +1 ponto em Potência ou Resistência.",
  "Nível 3 — ignora penalidades em testes para saltar obstáculos perigosos.",
  "Nível 4 — atende imediatamente quando chamada pelo nome.",
  "Nível 5 — vem até você se estiver a até 500m de distância.",
];
const CARTA_ESPECIAL_TEXTO = {
  A: "+1 em todos os Testes de Violência no combate atual.",
  K: "+1 Movimento no combate atual.",
  Q: "+1 Ação de Combate no combate atual.",
  J: "efeito não definido com precisão nas regras — o texto original só indica algo como +1 Círculo de Vida/Dor temporário. Confirme com o Juiz antes de aplicar.",
};
const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["♠", "♥", "♦", "♣"];

const PERICIA_LABELS = {
  atencao: "Atenção", medicina: "Medicina", montaria: "Montaria", suor: "Suor",
  negocios: "Negócios", roubo: "Roubo", tradicao: "Tradição", violencia: "Violência",
};

// tipo de arma -> defaults [capacidadeArma (câmara/carregador), coldreMax (reserva equipada)]
const TIPO_ARMA_DEFAULTS = {
  revolver: { capacidadeArma: 6, coldreMax: 36, label: "Revólver (tambor)" },
  garrucha: { capacidadeArma: 1, coldreMax: 36, label: "Garrucha (coldre)" },
  fuzil: { capacidadeArma: 5, coldreMax: 24, label: "Fuzil (bandoleira)" },
  espingarda: { capacidadeArma: 2, coldreMax: 24, label: "Espingarda (bandoleira)" },
  outro: { capacidadeArma: 0, coldreMax: 0, label: "Outro" },
};

// ---------- catálogo (Grande Catálogo de Equipamento, 1880) ----------
function parsePreco(str) {
  if (!str || /não se vende/i.test(str)) return null;
  const nums = (str.match(/[\d.]+/g) || []).map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  return Math.round(((nums[0] + nums[1]) / 2) * 100) / 100;
}
function espacoToTamanho(str) {
  if (!str) return "padrao";
  if (str.includes("½")) return "pequeno";
  const n = parseInt(str, 10);
  if (n >= 3) return "muitoGrande";
  if (n === 2) return "grande";
  return "padrao";
}

const CATALOGO = {
  "Armas Comuns": {
    cols: 4,
    itens: [
      ["Revólver", "15 - 25", "1 linha", "6 balas · recarga 2 Ações · 3 Vida · coldre"],
      ["Fuzil", "25 - 40", "3 linhas", "5 balas · recarga 2 Ações · 3 Vida · bandoleira"],
      ["Espingarda", "25 - 40", "2 linhas", "2 balas · recarga 1 Ação · 3 Vida · bandoleira"],
      ["Garrucha", "10 - 20", "1 linha", "1 bala · recarga 2 Ações · 2 Vida · coldre"],
      ["Zarabatana", "3 - 10", "1 linha", "dano = efeito do veneno · alcance perto"],
      ["Estilingue", "1 - 5", "1 linha", "alcance perto"],
      ["Boleadeira", "1", "1 linha", "alcance perto · derruba e paralisa"],
      ["Arco e Flecha", "25 - 25", "2 linhas", "alcance longe"],
      ["Faca", "1 - 5", "½ linha", "3 Dor · bainha"],
      ["Sabre (Espada)", "5 - 25", "1 linha", "bainha"],
      ["Lança", "15 - 25", "2 linhas", ""],
      ["Machadinha", "5 - 10", "1 linha", ""],
      ["Machado de Lenha", "1 - 2", "2 linhas", ""],
      ["Martelo de Mão", "5 - 10", "1 linha", ""],
    ],
  },
  "Acessórios e Munição": {
    cols: 3,
    itens: [
      ["Bainha", "3 - 10", "1 linha", "armazena faca/espada"],
      ["Bandoleira", "5 - 20", "1 linha", "carrega fuzil/espingarda + até 24 balas"],
      ["Coldre", "4 - 15", "1 linha", "carrega revólver ou similar"],
      ["Cinturão de Bala", "15", "1 linha", "até 36 projéteis de revólver"],
      ["Coldre de Ombro", "20", "1 linha", ""],
      ["Munição de revólver (caixa c/12)", "3 - 8", "1 linha", "ocupa espaço se fora de coldre/bandoleira"],
      ["Munição de espingarda (caixa c/6)", "7 - 10", "1 linha", "ocupa espaço se fora de coldre/bandoleira"],
      ["Munição de fuzil (caixa c/6)", "6 - 12", "2 linhas", "ocupa espaço se fora de coldre/bandoleira"],
    ],
  },
  "Armas Especiais": {
    cols: 4,
    itens: [
      ["Pistola Automática", "1000 - 2000", "1 linha", "11 balas · single-action: 1 disparo extra por Ação"],
      ["Magnum de Cano Alongado", "2000 - 4000", "1 linha", "6 balas ·.357 · dano devastador"],
      ["Mauser C69", "2000 - 4000", "1 linha", "15 balas · carregador grande"],
      ["Carabina de Repetição", "1000 - 2000", "2 linhas", "7 balas · 1 disparo extra na 1ª Ação (-1 no teste)"],
      ["Derringer", "300", "1 linha", "2 balas · revólver escondido (Ataque Sacana)"],
      ["Espingarda de Cano Serrado", "50 - 150", "2 linhas", "2 balas · menor alcance · cabe no coldre"],
      ["Canhão de Cavalaria", "Não se vende", "—", "1 tiro · 2 turnos p/ recarregar · área 3m · NA 7"],
      ["Metralhadora Montada", "Não se vende", "—", "2 turnos p/ recarregar · linha, turno inteiro, 3 dano/Ação-Mov"],
      ["Explosivos (TNT/Dinamite)", "30 - 40", "½ linha", "3 Ações p/ preparar · área 1,5m · 5 Vida"],
    ],
  },
  "Itens de Proteção": {
    cols: 4,
    itens: [
      ["Sobretudo", "10", "1 linha", "reduz 1 dano · limite 2 · sem penalidade"],
      ["Colete de Couro Reforçado", "50 - 70", "1 linha", "reduz 1 · limite 3 · -1 Ação (mín. 1)"],
      ["Colete de Couro com Madeira", "100 - 200", "2 linhas", "reduz 2 · limite 5 · -1 Ação e -1 Mov (mín. 1)"],
      ["Ombreiras de Ferro", "150 - 250", "1 linha", "reduz 2 · limite 4 · -1 Mov (mín. 1)"],
      ["Placas de Metal", "400 - 500", "2 linhas", "reduz 3 · limite 4 · -2 Mov (mín. 1)"],
      ["Panelas Chumbadas", "100 - 400", "1 linha", "reduz 3 · limite 4 · -2 Ações e -1 Mov (mín. 1)"],
    ],
  },
  "Mercearia": {
    cols: 3,
    itens: [
      ["Açúcar (½ kg)", "1 - 2", "½ linha"], ["Alcaçuz (doces)", "0.50 - 1", "padrao"],
      ["Atum (lata)", "0.10 - 0.50", "½ linha"], ["Azeite (garrafa)", "2", "1 linha"],
      ["Biscoitos", "0.50 - 1", "padrao"], ["Carne Seca (1 kg)", "1 - 2", "1 linha"],
      ["Café (lata)", "0.50 - 1", "1 linha"], ["Cenouras (5)", "0.05 - 0.25", "1 linha"],
      ["Cerveja (garrafa)", "0.25 - 1", "padrao"], ["Chocolate (barra)", "1 - 4", "½ linha"],
      ["Conhaque Fino (garrafa)", "40 - 60", "½ linha"], ["Ervilhas (lata)", "3 - 15", "½ linha"],
      ["Erva Medicinal (½ kg)", "5 - 50", "½ linha"], ["Farinha (½ kg)", "1 - 2", "1 linha"],
      ["Feijão (lata)", "0.50 - 2", "1 linha"], ["Folhas de Chá (½ kg)", "1 - 2", "padrao"],
      ["Fósforos (10)", "0.05 - 0.10", "padrao"], ["Jornal", "0.25", "1 linha"],
      ["Leite (½ litro)", "3 - 5", "padrao"], ["Maçã (3)", "0.10", "1 linha"],
      ["Martelo", "0.50 - 1", "½ linha"], ["Milho (lata)", "0.10 - 0.50", "padrao"],
      ["Mochila", "1", "½ linha"], ["Óleo (lanterna)", "0.50 - 1.25", "½ linha"],
      ["Ovos (6)", "1 - 2.50", "padrao"], ["Paierinho (5)", "0.50 - 1", "1 linha"],
      ["Pinga (garrafa)", "0.25 - 1", "½ linha"], ["Pão de Queijo (10)", "1 - 2", "½ linha"],
      ["Sardinha (lata)", "0.10 - 0.25", "½ linha"], ["Sabão (barra)", "0.10 - 0.25", "½ linha"],
      ["Sopa", "0.50 - 2", "½ linha"], ["Queijo (½ kg)", "3 - 6", "½ linha"],
      ["Tabaco (½ kg)", "2 - 5", "1 linha"], ["Tábua de Lavar", "1 - 3", "½ linha"],
      ["Tônico Capilar (frasco)", "10 - 15", "1 linha"], ["Vinho (garrafa)", "10 - 5", "1 linha"],
      ["Unguento (frasco)", "5 - 10", "1 linha"], ["Uísque (garrafa)", "5 - 10", "1 linha"],
    ],
  },
  "Roupa e Vestuário": {
    cols: 2,
    nota: "Vestido no corpo não ocupa slot; guardado na mochila ocupa ½ linha.",
    itens: [
      ["Anel (latão - diamante)", "1 - 1500"], ["Avental de Médico", "2 - 5"], ["Batina", "1 - 2"],
      ["Bengala", "1 - 2"], ["Boina", "0.50 - 1"], ["Bolsa de Mão", "10 - 20"], ["Botas", "5 - 10"],
      ["Blusa de Inverno", "10 - 30"], ["Blusa de Verão", "1 - 5"], ["Brincos (latão - diamantes)", "5 - 1500"],
      ["Broche (latão - prata)", "2 - 500"], ["Calça", "2 - 8"], ["Camisa", "2 - 5"], ["Camisola", "10 - 25"],
      ["Cartola", "15 - 20"], ["Casaco", "2 - 15"], ["Ceroulas", "1 - 2"], ["Chapéu", "5 - 100"],
      ["Cinto", "1 - 5"], ["Colar (ferro - pérolas)", "2 - 2500"], ["Colete", "3 - 15"], ["Echarpe", "1 - 2"],
      ["Estetoscópio", "10 - 50"], ["Lenço de Pescoço", "0.50 - 1"], ["Leque", "1 - 3"], ["Lingerie", "3 - 100"],
      ["Luvas", "0.25 - 1"], ["Gargantilha", "0.50 - 1"], ["Gravata", "1 - 5"], ["Jaqueta", "10 - 300"],
      ["Óculos", "5 - 25"], ["Macacão Jeans", "0.50 - 3"], ["Meias", "0.10 - 0.25"], ["Paletó", "20 - 50"],
      ["Perneiras", "10 - 15"], ["Pijamas", "1 - 30"], ["Poncho", "1 - 50"], ["Pulseira (lata - diamante)", "2 - 2000"],
      ["Saia", "1 - 15"], ["Sapatos", "2 - 100"], ["Sobretudo (roupa)", "10 - 200"], ["Sombrero", "5 - 20"],
      ["Suspensórios", "1 - 5"], ["Vestido (trabalho - gala)", "2 - 150"], ["Tuxedo", "10 - 50"], ["Xale de Lã", "1 - 2"],
    ],
  },
  "Armazém": {
    cols: 3,
    itens: [
      ["Acordeão (sanfona)", "30 - 50", "1 linha"], ["Alicate de Arame", "20 - 50", "1 linha"],
      ["Algemas", "2 - 4", "½ linha"], ["Arame (10m)", "3 - 5", "2 linhas"], ["Banjo", "50 - 100", "1 linha"],
      ["Baralho", "0.50 - 2", "padrao"], ["Barraca", "7 - 12", "1 linha"], ["Berimbau", "1 - 2", "1 linha"],
      ["Binóculo", "25 - 40", "½ linha"], ["Brinquedo", "10 - 20", "½ linha"], ["Bússola", "1 - 5", "padrao"],
      ["Cadeado", "0.50 - 1", "½ linha"], ["Cantil", "3 - 5", "padrao"], ["Corrente (2m)", "10 - 25", "1 linha"],
      ["Corda (5m)", "1 - 5", "1 linha"], ["Dados (3)", "0.50 - 1", "padrao"], ["Detonador", "3 - 5", "1 linha"],
      ["Foice", "10 - 25", "1 linha"], ["Forcado", "10 - 25", "1 linha"], ["Fósforos", "0.05 - 0.10", "padrao"],
      ["Flauta", "2 - 100", "1 linha"], ["Gaita (Harmônica)", "15 - 25", "½ linha"], ["Ganzá (Chocalho)", "5 - 10", "padrao"],
      ["Gazuas (20)", "0.50 - 1", "1 linha"], ["Graxa (pote)", "1 - 2", "padrao"], ["Isqueiro", "5 - 30", "1 linha"],
      ["Lanterna", "5 - 10", "½ linha"], ["Linha e Agulha", "0.50 - 1", "padrao"], ["Lona (2m)", "20 - 30", "½ linha"],
      ["Machado", "10 - 25", "½ linha"], ["Marreta", "10 - 25", "padrao"], ["Óculos", "20 - 50", "1 linha"],
      ["Óleo (lata)", "1 - 2", "½ linha"], ["Pá", "1 - 2", "½ linha"], ["Pandeiro", "60 - 80", "padrao"],
      ["Panela", "3 - 10", "1 linha"], ["Pavio (10m)", "10 - 15", "½ linha"], ["Pé de Cabra", "5 - 10", "½ linha"],
      ["Pregos (20)", "0.50 - 1", "½ linha"], ["Pederneira", "0.50 - 1", "½ linha"], ["Picareta", "10 - 25", "1 linha"],
      ["Relógio de Bolso", "25 - 50", "½ linha"], ["Sabão (Barra)", "0.25 - 0.50", "1 linha"], ["Saco de Dormir", "0.25 - 0.50", "1 linha"],
      ["Tesourão", "25 - 50", "1 linha"], ["Tamborim", "10 - 20", "1 linha"], ["Vara de Pescar", "3 - 5", "2 linhas"],
      ["Viola", "30 - 60", "1 linha"], ["Violão", "30 - 60", "1 linha"], ["Violino", "50 - 100", "padrao"],
      ["Zabumba", "30 - 50", "padrao"], ["Chave Inglesa", "5", "1 linha"],
    ],
  },
  "Farmácia da Eficácia": {
    cols: 4,
    itens: [
      ["Adrenalina (seringa)", "400 - 500", "½ linha", "+3 Vida instantâneo · rebote: -1 Ação e -1 Mov até descansar"],
      ["Álcool (frasco)", "3 - 5", "½ linha", "desinfeta feridas"],
      ["Arsênico (frasco)", "2 - 4", "½ linha", "reduz efeito de venenos se oral"],
      ["Babosa (erva)", "2", "½ linha", "trata dores musculares, limpa feridas"],
      ["Boldo (erva)", "2", "½ linha", "chá p/ úlcera, dor de cabeça, insolação"],
      ["Cavalinha (erva)", "2", "½ linha", "chá desintoxica venenos/malária/indigestão"],
      ["Cânfora (pasta)", "10 - 30", "½ linha", "1 Ação p/ aplicar · cura 1 Vida em combate"],
      ["Erva-Doce (erva)", "2", "½ linha", "chá p/ prisão de ventre e flatulência"],
      ["Folha de Salgueiro (erva)", "3", "½ linha", "trata febre e dor de cabeça"],
      ["Gengibre (raiz)", "2", "½ linha", "chá p/ tosse, resfriado, febre"],
      ["Laxante (frasco)", "5 - 10", "½ linha", "trata constipação e inchaço"],
      ["Mil-Folhas (erva)", "2", "½ linha", "chá p/ circulação respiratória"],
      ["Morfina (ampola)", "50 - 100", "½ linha", "anestésico/analgésico intenso"],
      ["Pomada de Cavalo (pasta)", "5 - 10", "½ linha", "cura 3 Vida da montaria em descansos"],
      ["Tônico Milagroso (frasco)", "10 - 50", "½ linha", "Sorte: preta = +3 Vida instant.; vermelha = envenenado"],
      ["Unguento (pasta)", "5 - 10", "½ linha", "cura 1 Vida se aplicado em descansos"],
      ["Xarope de Tosse (frasco)", "5 - 10", "½ linha", "cura tosse e doenças pulmonares"],
    ],
  },
  "Criações e Animais": {
    cols: 3,
    itens: [
      ["Apicultura", "5 - 10", "—"], ["Bodes/Cabras (unidade)", "10 - 100", "—"],
      ["Bolsa de Montaria (Alforje)", "2 - 10", "—", "+10 slots na montaria"],
      ["Bovino", "10 - 300", "—"], ["Canoa", "20 - 50", "—"],
      ["Carroça", "15 - 30", "—", "30 slots de carga"], ["Carro", "1 - 25", "—", "20 slots de carga"],
      ["Cavalo", "1 - 250", "—", "montaria base · Velocidade concede 10m/ponto"],
      ["Curral (dia/semana)", "1 - 2", "—"], ["Galinhas", "1 - 3", "—"],
      ["Mulas/Burricos", "1 - 100", "—"], ["Ovelhas/Cordeiros", "5 - 5", "—"],
      ["Sela", "3 - 10", "—", "equipamento padrão de montaria"], ["Suínos", "10 - 30", "—"],
    ],
  },
};

// ---------- pip layout for a d6 face ----------
const PIP_LAYOUTS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function DieFace({ value }) {
  const active = PIP_LAYOUTS[value] || [];
  return (
    <div className="die-face">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`pip ${active.includes(i) ? "pip-on" : ""}`} />
      ))}
    </div>
  );
}

function CircleTrack({ max, filled, onChange, kind }) {
  const count = Math.max(0, Math.round(max));
  return (
    <div className={`circle-track circle-track-${kind}`}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className={`circle ${i < filled ? "circle-filled" : ""}`}
          onClick={() => onChange(i < filled ? i : i + 1)}
          title={`marcar até ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ---------- dado simplificado: rolar + vantagem/desvantagem ----------
function DiceRoller() {
  const [modifier, setModifier] = useState(0);
  const [vantagem, setVantagem] = useState(false);
  const [desvantagem, setDesvantagem] = useState(false);
  const [testeViolencia, setTesteViolencia] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [resultado, setResultado] = useState(null);
  const [extra, setExtra] = useState(null);
  const [pending, setPending] = useState(null); // "crit" | "fumble" | null — aguardando rolagem de efeito
  const [effectDie, setEffectDie] = useState(1);
  const [rollingEffect, setRollingEffect] = useState(false);
  const intervalRef = useRef(null);
  const effectIntervalRef = useRef(null);
  const NA = 6;

  const toggleVantagem = (v) => {
    setVantagem(v);
    if (v) setDesvantagem(false);
  };
  const toggleDesvantagem = (v) => {
    setDesvantagem(v);
    if (v) setVantagem(false);
  };

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setResultado(null);
    setExtra(null);
    setPending(null);
    let ticks = 0;
    intervalRef.current = setInterval(() => {
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      ticks += 1;
      if (ticks > 9) {
        clearInterval(intervalRef.current);
        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        setDice([d1, d2]);
        const natural = vantagem ? Math.max(d1, d2) : d1;
        const penal = desvantagem ? 1 : 0;
        const total = natural + clamp0(modifier) - penal;
        const sucesso = total >= NA;
        setResultado({ natural, total, sucesso });
        if (testeViolencia && natural === 6) setPending("crit");
        else if (testeViolencia && natural === 1) setPending("fumble");
        setRolling(false);
      }
    }, 80);
  };

  const rollEffect = () => {
    if (rollingEffect || !pending) return;
    setRollingEffect(true);
    let ticks = 0;
    effectIntervalRef.current = setInterval(() => {
      setEffectDie(1 + Math.floor(Math.random() * 6));
      ticks += 1;
      if (ticks > 9) {
        clearInterval(effectIntervalRef.current);
        const final = 1 + Math.floor(Math.random() * 6);
        setEffectDie(final);
        const table = pending === "crit" ? CRIT_TABLE : FUMBLE_TABLE;
        setExtra({ type: pending, text: table[final - 1] });
        setRollingEffect(false);
        setPending(null);
      }
    }, 80);
  };

  useEffect(() => () => { clearInterval(intervalRef.current); clearInterval(effectIntervalRef.current); }, []);

  return (
    <div className="dice-tray">
      <div className="dice-tray-header">
        <Dices size={18} />
        <span>Rolagem (d6) · NA 6</span>
      </div>

      <div className="dice-field-row">
        <label>Antecedente</label>
        <input type="number" min={0} className="dice-num" value={modifier} onChange={(e) => setModifier(clamp0(e.target.value))} />
      </div>

      <div className="dice-toggle-row">
        <button className={`toggle-chip ${vantagem ? "toggle-chip-on" : ""}`} onClick={() => toggleVantagem(!vantagem)}>
          Vantagem
        </button>
        <button className={`toggle-chip ${desvantagem ? "toggle-chip-on" : ""}`} onClick={() => toggleDesvantagem(!desvantagem)}>
          Desvantagem
        </button>
      </div>
      {desvantagem && <p className="side-hint">aplica -1 fixo (redutores maiores, combine com o Juiz)</p>}

      <label className="dice-check">
        <input type="checkbox" checked={testeViolencia} onChange={(e) => setTesteViolencia(e.target.checked)} />
        Teste de Violência (crítico/falha)
      </label>

      <div className="dice-stage">
        <div className={`die ${rolling ? "die-rolling" : ""}`}>
          <DieFace value={dice[0]} />
        </div>
        {vantagem && (
          <div className={`die die-ghost ${rolling ? "die-rolling" : ""}`}>
            <DieFace value={dice[1]} />
          </div>
        )}
      </div>

      <button className="roll-btn" onClick={roll} disabled={rolling}>
        {rolling ? "Rolando..." : "Rolar"}
      </button>

      {resultado && !rolling && (
        <div className={`result-line ${resultado.sucesso ? "result-sucesso" : "result-falha"}`}>
          Total: <strong>{resultado.total}</strong> — {resultado.sucesso ? "sucesso" : "falha"}
        </div>
      )}

      {pending && (
        <div className={`extra-box extra-${pending}`}>
          <strong>{pending === "crit" ? "Acerto crítico!" : "Falha crítica!"}</strong>
          <p>Role novamente para saber o que acontece.</p>
          <div className="dice-stage" style={{ minHeight: 40 }}>
            <div className={`die ${rollingEffect ? "die-rolling" : ""}`} style={{ width: 34, height: 34 }}>
              <DieFace value={effectDie} />
            </div>
          </div>
          <button className="roll-btn" onClick={rollEffect} disabled={rollingEffect}>
            {rollingEffect ? "Rolando..." : "Rolar efeito"}
          </button>
        </div>
      )}

      {extra && (
        <div className={`extra-box extra-${extra.type}`}>
          <strong>{extra.type === "crit" ? "Acerto crítico!" : "Falha crítica!"}</strong>
          <p>{extra.text}</p>
        </div>
      )}
    </div>
  );
}

function CartasDeSina({ value, onChange }) {
  return (
    <div className="side-box">
      <div className="side-box-header">
        <Sparkles size={15} />
        <span>Cartas de Sina</span>
      </div>
      <div className="stepper-row">
        <button className="icon-btn stepper-btn" onClick={() => onChange(clamp0(value - 1))}>-</button>
        <span className="stepper-value">{value}</span>
        <button className="icon-btn stepper-btn" onClick={() => onChange(clamp0(value + 1))}>+</button>
      </div>
      {value > 2 && (
        <p className="side-warning"><AlertTriangle size={12} /> acima do limite de acúmulo (2 por sessão)</p>
      )}
      <p className="side-hint">Não gastas até o fim da sessão viram +1 XP cada.</p>
    </div>
  );
}

function IniciativaWidget() {
  const [card, setCard] = useState(null);
  const draw = () => {
    setCard({ rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: SUITS[Math.floor(Math.random() * SUITS.length)] });
  };
  const especial = card && CARTA_ESPECIAL_TEXTO[card.rank];
  const vermelho = card && (card.suit === "♥" || card.suit === "♦");
  return (
    <div className="side-box">
      <div className="side-box-header">
        <Crosshair size={15} />
        <span>Iniciativa</span>
      </div>
      <div className="card-stage">
        {card ? (
          <div className={`playing-card ${vermelho ? "playing-card-red" : ""}`}>
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </div>
        ) : (
          <div className="playing-card playing-card-empty">?</div>
        )}
      </div>
      <button className="roll-btn" onClick={draw}>Puxar carta</button>
      {especial && (
        <div className="extra-box extra-crit" style={{ marginTop: 6 }}>
          <strong>Carta especial ({card.rank})</strong>
          <p>Manter posição ou descartar (vai pro fim da ordem) para: {especial}</p>
        </div>
      )}
      <p className="side-hint">Ordem: Ás &gt; K &gt; Q &gt; J &gt; 10...2. Empate PJs: decidem entre si. PJ x NPC: NPC vence.</p>
    </div>
  );
}

function EntryEditor({ items, onChange, placeholderTitulo, placeholderTexto }) {
  const update = (id, field, value) => onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  const remove = (id) => onChange(items.filter((it) => it.id !== id));
  const add = () => onChange([...items, { id: uid(), titulo: "", texto: "" }]);
  return (
    <div className="entry-list">
      {items.map((it) => (
        <div className="entry-card" key={it.id}>
          <div className="entry-card-top">
            <input className="ledger-input entry-title" placeholder={placeholderTitulo} value={it.titulo} onChange={(e) => update(it.id, "titulo", e.target.value)} />
            <button className="icon-btn" onClick={() => remove(it.id)}><Trash2 size={15} /></button>
          </div>
          <textarea className="ledger-textarea" placeholder={placeholderTexto} value={it.texto} onChange={(e) => update(it.id, "texto", e.target.value)} rows={3} />
        </div>
      ))}
      <button className="add-line" onClick={add}><Plus size={14} /> adicionar</button>
    </div>
  );
}

function InventoryEditor({ items, onChange, showEquipado }) {
  const update = (id, field, value) => onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  const remove = (id) => onChange(items.filter((it) => it.id !== id));
  const add = () => onChange([...items, { id: uid(), nome: "", tamanho: "padrao", equipado: false, notas: "" }]);
  return (
    <div className="inv-list">
      {items.map((it) => (
        <div className="inv-row" key={it.id}>
          <input className="ledger-input inv-name" placeholder="Item" value={it.nome} onChange={(e) => update(it.id, "nome", e.target.value)} />
          <select className="ledger-input inv-tamanho" value={it.tamanho} onChange={(e) => update(it.id, "tamanho", e.target.value)}>
            {TAMANHOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {showEquipado && (
            <label className="inv-equipado">
              <input type="checkbox" checked={!!it.equipado} onChange={(e) => update(it.id, "equipado", e.target.checked)} /> equipado
            </label>
          )}
          <input className="ledger-input inv-notas" placeholder="observações" value={it.notas} onChange={(e) => update(it.id, "notas", e.target.value)} />
          <button className="icon-btn" onClick={() => remove(it.id)}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="add-line" onClick={add}><Plus size={14} /> adicionar item</button>
    </div>
  );
}

function slotsUsed(items) {
  const map = Object.fromEntries(TAMANHOS.map((t) => [t.id, t.valor]));
  return items.filter((it) => !it.equipado).reduce((sum, it) => sum + (map[it.tamanho] ?? 1), 0);
}

// ---------- tambor de revólver ----------
function Tambor({ capacidade, camaras, onChange }) {
  const size = 78, r = 26;
  return (
    <div className="tambor" style={{ width: size, height: size }}>
      {camaras.map((loaded, i) => {
        const angle = (360 / capacidade) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = size / 2 + r * Math.cos(rad) - 9;
        const y = size / 2 + r * Math.sin(rad) - 9;
        return (
          <button
            key={i}
            className={`camara ${loaded ? "camara-loaded" : ""}`}
            style={{ left: x, top: y }}
            onClick={() => {
              const novo = [...camaras];
              novo[i] = !novo[i];
              onChange(novo);
            }}
          />
        );
      })}
    </div>
  );
}

function WeaponRow({ weapon, onUpdate, onRemove, compact }) {
  const setField = (field, value) => onUpdate({ ...weapon, [field]: value });

  const setTipo = (tipo) => {
    const def = TIPO_ARMA_DEFAULTS[tipo];
    if (tipo === "revolver" || tipo === "garrucha") {
      onUpdate({
        ...weapon,
        tipo,
        capacidadeArma: def.capacidadeArma,
        coldreMax: def.coldreMax,
        coldreAtual: Math.min(weapon.coldreAtual ?? def.coldreMax, def.coldreMax),
        camaras: Array.from({ length: def.capacidadeArma }).map(() => true),
      });
    } else {
      onUpdate({
        ...weapon,
        tipo,
        capacidadeArma: def.capacidadeArma,
        coldreMax: def.coldreMax,
        noCorpo: def.capacidadeArma,
        coldreAtual: def.coldreMax,
      });
    }
  };

  const isRevolver = weapon.tipo === "revolver" || weapon.tipo === "garrucha";
  const carregado = isRevolver ? (weapon.camaras || []).filter(Boolean).length : weapon.noCorpo;

  const recarregar = () => {
    if (isRevolver) {
      const camaras = [...(weapon.camaras || [])];
      let disponivel = clamp0(weapon.coldreAtual);
      for (let i = 0; i < camaras.length && disponivel > 0; i++) {
        if (!camaras[i]) {
          camaras[i] = true;
          disponivel -= 1;
        }
      }
      const gasto = clamp0(weapon.coldreAtual) - disponivel;
      onUpdate({ ...weapon, camaras, coldreAtual: clamp0(weapon.coldreAtual) - gasto });
    } else {
      const falta = Math.max(0, weapon.capacidadeArma - weapon.noCorpo);
      const transferir = Math.min(falta, clamp0(weapon.coldreAtual));
      onUpdate({ ...weapon, noCorpo: weapon.noCorpo + transferir, coldreAtual: clamp0(weapon.coldreAtual) - transferir });
    }
  };

  return (
    <div className="weapon-row">
      {!compact && (
        <div className="weapon-top">
          <input className="ledger-input weapon-name" placeholder="Nome da arma" value={weapon.nome} onChange={(e) => setField("nome", e.target.value)} />
          <select className="ledger-input weapon-tipo" value={weapon.tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPO_ARMA_DEFAULTS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
          </select>
          <button className="icon-btn" onClick={onRemove}><Trash2 size={15} /></button>
        </div>
      )}
      {!compact && weapon.tipo !== "outro" && (
        <div className="weapon-caps">
          <label>
            capacidade
            <input type="number" min={0} className="dice-num" value={weapon.capacidadeArma} onChange={(e) => {
              const cap = clamp0(e.target.value);
              if (isRevolver) {
                const novo = Array.from({ length: cap }).map((_, i) => weapon.camaras?.[i] ?? true);
                onUpdate({ ...weapon, capacidadeArma: cap, camaras: novo });
              } else {
                onUpdate({ ...weapon, capacidadeArma: cap, noCorpo: Math.min(weapon.noCorpo, cap) });
              }
            }} />
          </label>
          <label>
            reserva máx.
            <input type="number" min={0} className="dice-num" value={weapon.coldreMax} onChange={(e) => {
              const max = clamp0(e.target.value);
              onUpdate({ ...weapon, coldreMax: max, coldreAtual: Math.min(weapon.coldreAtual, max) });
            }} />
          </label>
        </div>
      )}

      <div className="weapon-body">
        {isRevolver ? (
          <Tambor capacidade={weapon.capacidadeArma} camaras={weapon.camaras || []} onChange={(c) => setField("camaras", c)} />
        ) : weapon.tipo !== "outro" ? (
          <div className="stepper-row">
            <button className="icon-btn stepper-btn" onClick={() => setField("noCorpo", clamp0(weapon.noCorpo - 1))}>-</button>
            <span className="weapon-count">{weapon.noCorpo}</span>
            <button className="icon-btn stepper-btn" onClick={() => setField("noCorpo", Math.min(weapon.capacidadeArma, weapon.noCorpo + 1))}>+</button>
          </div>
        ) : null}

        {weapon.tipo !== "outro" && (
          <>
            <span className="weapon-count weapon-count-main">
              ({carregado}/{weapon.coldreAtual})
            </span>
            <div className="stepper-row">
              <button className="icon-btn stepper-btn" onClick={() => setField("coldreAtual", clamp0(weapon.coldreAtual - 1))}>-</button>
              <span className="weapon-count">coldre</span>
              <button className="icon-btn stepper-btn" onClick={() => setField("coldreAtual", Math.min(weapon.coldreMax, weapon.coldreAtual + 1))}>+</button>
            </div>
            <button className="icon-btn" title="recarregar do coldre" onClick={recarregar}>
              <RefreshCw size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArmasEquipadas({ armas, onChange }) {
  const add = () => {
    const def = TIPO_ARMA_DEFAULTS.revolver;
    onChange([
      ...armas,
      {
        id: uid(),
        nome: "",
        tipo: "revolver",
        capacidadeArma: def.capacidadeArma,
        coldreMax: def.coldreMax,
        coldreAtual: def.coldreMax,
        camaras: Array(def.capacidadeArma).fill(true),
        noCorpo: def.capacidadeArma,
      },
    ]);
  };
  const update = (id, novo) => onChange(armas.map((a) => (a.id === id ? novo : a)));
  const remove = (id) => onChange(armas.filter((a) => a.id !== id));
  return (
    <div className="weapon-list">
      {armas.map((a) => <WeaponRow key={a.id} weapon={a} onUpdate={(w) => update(a.id, w)} onRemove={() => remove(a.id)} />)}
      <button className="add-line" onClick={add}><Plus size={14} /> adicionar arma equipada</button>
    </div>
  );
}

function BebedeiraRoller({ suor }) {
  const [doses, setDoses] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [apagao, setApagao] = useState(null);
  const rolar = () => {
    const d = 1 + Math.floor(Math.random() * 6);
    const na = 6 + clamp0(doses);
    const total = d + clamp0(suor);
    const sucesso = total >= na;
    setResultado({ d, total, na, sucesso });
    setApagao(sucesso ? null : {
      c1: BEBEDEIRA_COL1[Math.floor(Math.random() * 6)],
      c2: BEBEDEIRA_COL2[Math.floor(Math.random() * 6)],
      c3: BEBEDEIRA_COL3[Math.floor(Math.random() * 6)],
    });
  };
  return (
    <div className="bebedeira-box">
      <div className="dice-field-row">
        <label>Doses além do limite</label>
        <input type="number" min={0} className="dice-num" value={doses} onChange={(e) => setDoses(clamp0(e.target.value))} />
      </div>
      <p className="section-hint" style={{ margin: "4px 0" }}>Rola 1d6 + Suor ({suor}) contra NA {6 + clamp0(doses)}.</p>
      <button className="add-line" onClick={rolar}>Rolar teste de bebedeira</button>
      {resultado && (
        <div className={`result-line ${resultado.sucesso ? "result-sucesso" : "result-falha"}`} style={{ marginTop: 6 }}>
          d6={resultado.d} + Suor total {resultado.total} (NA {resultado.na}) — {resultado.sucesso ? "ressaca funcional" : "apagão"}
        </div>
      )}
      {resultado?.sucesso && <p className="section-hint">Até o dia seguinte: +1 carta na Iniciativa, -1 em Testes de Violência, +1 Movimento.</p>}
      {apagao && <div className="banner banner-info">Ontem você {apagao.c1} {apagao.c2}. Você acorda {apagao.c3}</div>}
    </div>
  );
}

// ---------- Loja ----------
function Loja({ dinheiro, onComprar }) {
  const [busca, setBusca] = useState("");
  const [categoriaAberta, setCategoriaAberta] = useState(null);
  const [abrirCompra, setAbrirCompra] = useState(null); // {categoria, nome, preco, espaco, obs}
  const [precoPago, setPrecoPago] = useState(0);
  const [qtd, setQtd] = useState(1);

  const abrirForm = (categoria, item) => {
    const [nome, preco, espaco, obs] = item;
    setAbrirCompra({ categoria, nome, preco, espaco, obs });
    setPrecoPago(parsePreco(preco) ?? 0);
    setQtd(1);
  };

  const confirmar = () => {
    if (!abrirCompra) return;
    const custo = clamp0(precoPago) * clamp0(qtd || 1);
    if (custo > dinheiro) return;
    onComprar({
      nome: abrirCompra.nome + (qtd > 1 ? ` (${qtd}x)` : ""),
      tamanho: espacoToTamanho(abrirCompra.espaco),
      notas: [abrirCompra.obs, `comprado por R$${precoPago}`].filter(Boolean).join(" · "),
      custo,
    });
    setAbrirCompra(null);
  };

  const buscaLower = busca.trim().toLowerCase();
  const resultadosBusca = buscaLower
    ? Object.entries(CATALOGO).flatMap(([cat, dados]) =>
        dados.itens.filter((it) => it[0].toLowerCase().includes(buscaLower)).map((it) => [cat, it])
      )
    : null;

  return (
    <section>
      <h2 className="section-title">
        <Store size={18} /> Loja — <Coins size={14} /> R$ {dinheiro}
      </h2>
      <div className="loja-search">
        <Search size={14} />
        <input className="ledger-input" style={{ flex: 1 }} placeholder="Buscar item..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {resultadosBusca ? (
        <div className="loja-list">
          {resultadosBusca.length === 0 && <p className="section-hint">Nenhum item encontrado.</p>}
          {resultadosBusca.map(([cat, it], i) => (
            <div className="loja-row" key={cat + it[0] + i}>
              <div className="loja-row-main">
                <strong>{it[0]}</strong>
                <span className="loja-cat">{cat}</span>
              </div>
              <span className="loja-preco">R$ {it[1]}</span>
              <button className="add-line" onClick={() => abrirForm(cat, it)}>comprar</button>
            </div>
          ))}
        </div>
      ) : categoriaAberta ? (
        <div>
          <button className="add-line" onClick={() => setCategoriaAberta(null)}>← categorias</button>
          {CATALOGO[categoriaAberta].nota && <p className="section-hint">{CATALOGO[categoriaAberta].nota}</p>}
          <div className="loja-list">
            {CATALOGO[categoriaAberta].itens.map((it, i) => (
              <div className="loja-row" key={it[0] + i}>
                <div className="loja-row-main">
                  <strong>{it[0]}</strong>
                  {it[3] && <span className="loja-obs">{it[3]}</span>}
                </div>
                <span className="loja-preco">R$ {it[1]}</span>
                <button className="add-line" onClick={() => abrirForm(categoriaAberta, it)}>comprar</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="loja-categorias">
          {Object.keys(CATALOGO).map((cat) => (
            <button key={cat} className="loja-cat-btn" onClick={() => setCategoriaAberta(cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {abrirCompra && (
        <div className="loja-modal">
          <div className="loja-modal-box">
            <h3 className="subsection-title">{abrirCompra.nome}</h3>
            <p className="section-hint">faixa de preço: R$ {abrirCompra.preco} · espaço: {abrirCompra.espaco}</p>
            {abrirCompra.obs && <p className="section-hint">{abrirCompra.obs}</p>}
            <div className="dice-field-row">
              <label>Preço pago (R$)</label>
              <input type="number" min={0} className="dice-num" value={precoPago} onChange={(e) => setPrecoPago(clamp0(e.target.value))} />
            </div>
            <div className="dice-field-row">
              <label>Quantidade</label>
              <input type="number" min={1} className="dice-num" value={qtd} onChange={(e) => setQtd(Math.max(1, clamp0(e.target.value)))} />
            </div>
            <p className="section-hint">
              Custo total: R$ {(clamp0(precoPago) * clamp0(qtd || 1)).toFixed(2)}
              {clamp0(precoPago) * clamp0(qtd || 1) > dinheiro && <span className="over-warning"> — dinheiro insuficiente</span>}
            </p>
            <div className="card-actions">
              <button
                className="add-line"
                onClick={confirmar}
                disabled={clamp0(precoPago) * clamp0(qtd || 1) > dinheiro}
              >
                Confirmar compra
              </button>
              <button className="add-line" onClick={() => setAbrirCompra(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function FichaSacramento({ mesaLink, onVidaSnapshot } = {}) {
  const [character, setCharacter] = useState(defaultCharacter());
  const [activeTab, setActiveTab] = useState("pontos");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const fileInputRef = useRef(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          setCharacter({ ...defaultCharacter(), ...JSON.parse(res.value) });
          setLoading(false);
          return;
        }
      } catch (e) {}
      for (const key of OLD_KEYS) {
        try {
          const old = await window.storage.get(key, false);
          if (old && old.value) {
            const o = JSON.parse(old.value);
            setCharacter({
              ...defaultCharacter(),
              nome: o.nome || "", arquetipo: o.arquetipo || "", portrait: o.portrait || null,
              nivel: o.nivel || 1, dinheiro: o.dinheiro ?? 200,
              atributos: o.atributos || defaultCharacter().atributos,
              pericias: o.pericias || defaultCharacter().pericias,
              historias: o.historias?.length ? o.historias : defaultCharacter().historias,
              passivas: o.passivas?.length ? o.passivas : defaultCharacter().passivas,
              mochila: o.mochila?.length ? o.mochila : defaultCharacter().mochila,
              anotacoes: o.anotacoes || "",
            });
            break;
          }
        } catch (e) {}
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const result = await window.storage.set(STORAGE_KEY, JSON.stringify(character), false);
        setSaveState(result ? "saved" : "error");
      } catch (e) { setSaveState("error"); }
    }, 700);
    return () => clearTimeout(t);
  }, [character, loading]);

  const patch = useCallback((field, value) => setCharacter((prev) => ({ ...prev, [field]: value })), []);

  const handlePortrait = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const maxW = 260;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        patch("portrait", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const resetFicha = async () => {
    if (!window.confirm("Isso apaga a ficha salva e começa uma nova. Continuar?")) return;
    const fresh = defaultCharacter();
    setCharacter(fresh);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(fresh), false); } catch (e) {}
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <style>{globalStyles}</style>
        <Loader2 className="spin" size={22} />
        <span>Abrindo a ficha...</span>
      </div>
    );
  }

  const { atributos, pericias, redencao } = character;
  const movimentos = 1 + clamp0(atributos.velocidade);
  const acoesCombate = 1 + clamp0(atributos.coragem);
  const vidaMax = 6 + clamp0(atributos.fisico) + clamp0(character.vidaBonusManual);
  const dorMax = 6;

  // avisa o App (que decide se empurra pro Supabase) sempre que os
  // dados que a Mesa precisa mostrar mudam. Sem mesaLink isso não faz nada.
  useEffect(() => {
    if (!onVidaSnapshot) return;
    onVidaSnapshot({ nome: character.nome, vidaMax, vidaPerdida: character.vidaPerdida, dorMax, dorMarcada: character.dorMarcada });
  }, [character.nome, vidaMax, character.vidaPerdida, dorMax, character.dorMarcada, onVidaSnapshot]);

  const bonusNivel = [2, 4, 6].filter((n) => character.nivel >= n).length;
  const poolAntecedente = 4 + clamp0(atributos.intelecto) + bonusNivel + clamp0(character.antecedenteBonusManual);
  const gastoAntecedente = Object.values(pericias).reduce((a, b) => a + clamp0(b), 0);

  const cavaloVidaMax = 6 + clamp0(character.cavalo.resistencia);
  const cavaloCapacidade = 15 + (character.cavalo.alforje ? 10 : 0);
  const cavaloUsado = slotsUsed(character.cavalo.itens);
  const mochilaUsado = slotsUsed(character.mochila);

  const patchAtributo = (key, value) => patch("atributos", { ...atributos, [key]: clamp0(value) });
  const patchPericia = (key, value) => patch("pericias", { ...pericias, [key]: clamp0(value) });

  const resolverEstouroDor = () => {
    patch("dorMarcada", 0);
    patch("vidaPerdida", Math.min(vidaMax, character.vidaPerdida + 1));
    patch("ultimoStatusDor", STATUS_TABLE[Math.floor(Math.random() * 6)]);
  };
  const descansoPadrao = () => { patch("dorMarcada", 0); patch("vidaPerdida", clamp0(character.vidaPerdida - 2)); };
  const descansoMedico = () => { patch("dorMarcada", 0); patch("vidaPerdida", clamp0(character.vidaPerdida - 3)); };

  const toggleObjetivo = (id) => {
    const alvo = character.objetivos.find((o) => o.id === id);
    patch("objetivos", character.objetivos.map((o) => (o.id === id ? { ...o, feito: !o.feito } : o)));
    patch("cartasDeSina", clamp0(character.cartasDeSina + (!alvo.feito ? 1 : -1)));
  };
  const usarCartaRedencao = (id) => patch("redencao", { ...redencao, cartas: redencao.cartas.map((c) => (c.id === id ? { ...c, usada: true } : c)) });
  const descartarCartaRedencao = (id) => {
    patch("redencao", { ...redencao, cartas: redencao.cartas.map((c) => (c.id === id ? { ...c, descartada: true } : c)) });
    patch("cartasDeSina", clamp0(character.cartasDeSina + 1));
  };

  const comprarItem = ({ nome, tamanho, notas, custo }) => {
    patch("dinheiro", clamp0(character.dinheiro - custo));
    patch("mochila", [...character.mochila, { id: uid(), nome, tamanho, equipado: false, notas }]);
  };

  return (
    <div className="sacramento-root">
      <style>{globalStyles}</style>
      <div className="ledger">
        <nav className="spine">
          <div className="spine-brand">SACRAMENTO</div>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} className={`spine-tab ${activeTab === t.id ? "spine-tab-active" : ""}`} onClick={() => setActiveTab(t.id)}>
                <Icon size={16} /><span>{t.label}</span>
              </button>
            );
          })}
          <div className="spine-footer">
            {mesaLink && <span className="save-indicator" title="vida/dor sincronizando com a mesa">🔗 mesa: {mesaLink.codigo}</span>}
            <span className={`save-indicator save-${saveState}`}>
              {saveState === "saving" && <Loader2 size={12} className="spin" />}
              {saveState === "saved" && <Save size={12} />}
              {saveState === "saving" ? "salvando" : saveState === "saved" ? "salvo" : saveState === "error" ? "erro ao salvar" : ""}
            </span>
            <button className="reset-btn" onClick={resetFicha}><RotateCcw size={13} /> nova ficha</button>
          </div>
        </nav>

        <main className="page">
          <header className="poster">
            <div className="portrait-frame" onClick={() => fileInputRef.current?.click()}>
              {character.portrait ? <img src={character.portrait} alt="retrato" /> : (
                <div className="portrait-empty"><Upload size={20} /><span>retrato</span></div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePortrait} style={{ display: "none" }} />
            </div>
            <div className="poster-fields">
              <input className="name-input" placeholder="Nome do personagem" value={character.nome} onChange={(e) => patch("nome", e.target.value)} />
              <input className="arquetipo-input" placeholder="Arquétipo / ocupação" value={character.arquetipo} onChange={(e) => patch("arquetipo", e.target.value)} />
              <div className="poster-meta">
                <label>Nível <input type="number" min={0} className="dice-num small-num" value={character.nivel} onChange={(e) => patch("nivel", clamp0(e.target.value))} /></label>
                <label><Coins size={13} /> R$ <input type="number" min={0} className="dice-num small-num" value={character.dinheiro} onChange={(e) => patch("dinheiro", clamp0(e.target.value))} /></label>
              </div>
              {character.armasEquipadas.length > 0 && (
                <div className="poster-armas">
                  {character.armasEquipadas.map((a) => {
                    const carregado = a.tipo === "revolver" || a.tipo === "garrucha" ? (a.camaras || []).filter(Boolean).length : a.noCorpo;
                    return (
                      <span key={a.id} className="poster-arma-chip">
                        {a.nome || "(sem nome)"} — ({carregado}/{a.coldreAtual})
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="stamp">procurado</div>
          </header>

          <div className="page-body">
            <div className="tab-content">
              {activeTab === "pontos" && (
                <section>
                  <h2 className="section-title">Pontos</h2>

                  <div className="attr-grid">
                    {[["fisico", "Físico", "+1 Vida máx / ponto"], ["velocidade", "Velocidade", "+1 Movimento / ponto"], ["intelecto", "Intelecto", "+1 Antecedente / ponto"], ["coragem", "Coragem", "+1 Ação de Combate / ponto"]].map(([key, label, hint]) => (
                      <div className="attr-card" key={key}>
                        <span className="attr-card-label">{label}</span>
                        <input type="number" min={0} className="ledger-input attr-card-input" value={atributos[key]} onChange={(e) => patchAtributo(key, e.target.value)} />
                        <span className="attr-card-hint">{hint}</span>
                      </div>
                    ))}
                  </div>
                  <p className="section-hint">Atributos nunca são rolados — só geram essas estatísticas passivas. Toda rolagem usa um Antecedente.</p>

                  <div className="derived-grid">
                    <div className="derived-item"><span>Movimentos</span><strong>{movimentos}</strong></div>
                    <div className="derived-item"><span>Ações em Combate</span><strong>{acoesCombate}</strong></div>
                    <div className="derived-item"><span>Defesa base</span><strong>5</strong><span className="derived-note">surpresa 3 · cobertura parcial 6 · completa 7</span></div>
                  </div>

                  {character.armasEquipadas.length > 0 && (
                    <div className="track-block">
                      <div className="track-label-row">Armamento</div>
                      <div className="weapon-list">
                        {character.armasEquipadas.map((a) => (
                          <div key={a.id}>
                            <div className="weapon-summary-name" style={{ marginBottom: 4 }}>{a.nome || "(sem nome)"}</div>
                            <WeaponRow
                              weapon={a}
                              compact
                              onUpdate={(w) => patch("armasEquipadas", character.armasEquipadas.map((it) => (it.id === a.id ? w : it)))}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="section-hint">tambor, munição e recarga são interativos aqui — pra trocar nome/tipo/capacidade, vá em Mochila → Armas equipadas</p>
                    </div>
                  )}

                  <div className="track-block">
                    <div className="track-label-row"><span>Círculos de Vida ({vidaMax - character.vidaPerdida}/{vidaMax})</span></div>
                    <CircleTrack max={vidaMax} filled={character.vidaPerdida} onChange={(v) => patch("vidaPerdida", v)} kind="vida" />
                    {character.vidaPerdida >= vidaMax && vidaMax > 0 && (
                      <div className="banner banner-warn">Vida esgotada — Teste de Morte (1d6): 1 ou 6 sobrevive (gasta 1 Movimento + 1 Ação para recuperar 3 de Vida); qualquer outro resultado é morte. Sem segundo teste no mesmo combate.</div>
                    )}
                    <div className="attr-row" style={{ marginTop: 6 }}>
                      <label className="small-label">Bônus extra de Vida máx (habilidades)</label>
                      <input type="number" min={0} className="ledger-input attr-num" value={character.vidaBonusManual} onChange={(e) => patch("vidaBonusManual", clamp0(e.target.value))} />
                    </div>
                  </div>

                  <div className="track-block">
                    <div className="track-label-row"><span>Círculos de Dor ({character.dorMarcada}/{dorMax})</span></div>
                    <CircleTrack max={dorMax} filled={character.dorMarcada} onChange={(v) => patch("dorMarcada", v)} kind="dor" />
                    {character.dorMarcada >= dorMax && (
                      <div className="banner banner-warn">
                        Dor esgotada — sofre 1 de dano de Vida e rola 1d6 na tabela de status.
                        <button className="add-line" style={{ marginTop: 6 }} onClick={resolverEstouroDor}>Resolver estouro (sorteia status, reseta Dor, -1 Vida)</button>
                      </div>
                    )}
                    {character.ultimoStatusDor && <div className="banner banner-info">Último status sorteado: {character.ultimoStatusDor}</div>}
                  </div>

                  <div className="descanso-row">
                    <Moon size={14} />
                    <button className="add-line" onClick={descansoPadrao}>Descanso 24h padrão (Dor→0, +2 Vida)</button>
                    <button className="add-line" onClick={descansoMedico}>Descanso c/ Medicina (Dor→0, +3 Vida)</button>
                  </div>

                  <h3 className="subsection-title">
                    Antecedentes — gasto {gastoAntecedente}/{poolAntecedente}
                    {gastoAntecedente > poolAntecedente && <span className="over-warning"> (acima do disponível)</span>}
                  </h3>
                  <div className="attr-row" style={{ marginBottom: 8 }}>
                    <label className="small-label">Bônus extra de Antecedente (fora nível/Intelecto)</label>
                    <input type="number" min={0} className="ledger-input attr-num" value={character.antecedenteBonusManual} onChange={(e) => patch("antecedenteBonusManual", clamp0(e.target.value))} />
                  </div>
                  <div className="pericia-grid">
                    {Object.entries(PERICIA_LABELS).map(([key, label]) => (
                      <div className="pericia-row" key={key}>
                        <span className="pericia-label">{label}</span>
                        <input type="number" min={0} className={`ledger-input attr-num ${character.nivel <= 1 && pericias[key] > 2 ? "input-warn" : ""}`} value={pericias[key]} onChange={(e) => patchPericia(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <p className="section-hint">No nível 1, o limite por Antecedente na criação é 2 (o sistema não define um teto para níveis mais altos).</p>
                </section>
              )}

              {activeTab === "historias" && (
                <section>
                  <h2 className="section-title">Histórias</h2>
                  <p className="section-hint">Aba livre de anotações narrativas — as cartas de História/Pesadelo da Sessão 1 não fazem parte das regras contínuas.</p>
                  <EntryEditor items={character.historias} onChange={(v) => patch("historias", v)} placeholderTitulo="Título da história" placeholderTexto="O que aconteceu..." />
                </section>
              )}

              {activeTab === "passivas" && (
                <section>
                  <h2 className="section-title">Passivas</h2>
                  <p className="section-hint">2 iniciais na criação; +1 nos níveis 2, 3, 4 e 6.</p>
                  <EntryEditor items={character.passivas} onChange={(v) => patch("passivas", v)} placeholderTitulo="Nome da habilidade" placeholderTexto="Efeito..." />
                </section>
              )}

              {activeTab === "redencao" && (
                <section>
                  <h2 className="section-title">Redenção</h2>
                  <p className="section-hint">3 Cartas de Redenção (ação heróica ligada ao passado, uma vez por aventura cada, ou descarte definitivo por 1 Carta de Sina) + 1 Carta de Pesadelo (trauma, ativada pelo Juiz).</p>
                  <h3 className="subsection-title">Cartas de Redenção</h3>
                  <div className="entry-list">
                    {redencao.cartas.map((c) => (
                      <div className={`entry-card ${c.usada || c.descartada ? "entry-card-dim" : ""}`} key={c.id}>
                        <div className="entry-card-top">
                          <input className="ledger-input entry-title" placeholder="Gatilho / ação heróica" value={c.titulo} disabled={c.usada || c.descartada}
                            onChange={(e) => patch("redencao", { ...redencao, cartas: redencao.cartas.map((cc) => cc.id === c.id ? { ...cc, titulo: e.target.value } : cc) })} />
                        </div>
                        <textarea className="ledger-textarea" placeholder="Detalhes do gatilho narrativo..." rows={2} disabled={c.usada || c.descartada} value={c.texto}
                          onChange={(e) => patch("redencao", { ...redencao, cartas: redencao.cartas.map((cc) => cc.id === c.id ? { ...cc, texto: e.target.value } : cc) })} />
                        {c.usada && <p className="section-hint">usada nesta aventura (virada)</p>}
                        {c.descartada && <p className="section-hint">descartada — virou 1 Carta de Sina</p>}
                        {!c.usada && !c.descartada && (
                          <div className="card-actions">
                            <button className="add-line" onClick={() => usarCartaRedencao(c.id)}>Usar (virar)</button>
                            <button className="add-line" onClick={() => descartarCartaRedencao(c.id)}>Descartar por 1 Carta de Sina</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <h3 className="subsection-title">Carta de Pesadelo</h3>
                  <div className="entry-card">
                    <label className="dice-check" style={{ marginBottom: 8 }}>
                      <input type="checkbox" checked={redencao.pesadelo.ativa} onChange={(e) => patch("redencao", { ...redencao, pesadelo: { ...redencao.pesadelo, ativa: e.target.checked } })} />
                      ativada pelo Juiz nesta cena
                    </label>
                    <input className="ledger-input entry-title" style={{ marginBottom: 6 }} placeholder="Trauma / conflito interno" value={redencao.pesadelo.titulo}
                      onChange={(e) => patch("redencao", { ...redencao, pesadelo: { ...redencao.pesadelo, titulo: e.target.value } })} />
                    <textarea className="ledger-textarea" placeholder="Fraqueza mecânica/narrativa imposta..." rows={3} value={redencao.pesadelo.texto}
                      onChange={(e) => patch("redencao", { ...redencao, pesadelo: { ...redencao.pesadelo, texto: e.target.value } })} />
                  </div>
                </section>
              )}

              {activeTab === "objetivos" && (
                <section>
                  <h2 className="section-title">Objetivos Secretos</h2>
                  <p className="section-hint">Interprete a mania durante a sessão, avise o Juiz e marque — cada um concede 1 Carta de Sina automaticamente.</p>
                  <div className="entry-list">
                    {character.objetivos.map((o) => (
                      <div className="entry-card" key={o.id}>
                        <div className="entry-card-top">
                          <input type="checkbox" checked={o.feito} onChange={() => toggleObjetivo(o.id)} />
                          <input className="ledger-input entry-title" placeholder="Título do objetivo" value={o.titulo}
                            onChange={(e) => patch("objetivos", character.objetivos.map((it) => it.id === o.id ? { ...it, titulo: e.target.value } : it))} />
                          <button className="icon-btn" onClick={() => patch("objetivos", character.objetivos.filter((it) => it.id !== o.id))}><Trash2 size={15} /></button>
                        </div>
                        <textarea className="ledger-textarea" placeholder="Descrição da mania..." rows={2} value={o.texto}
                          onChange={(e) => patch("objetivos", character.objetivos.map((it) => it.id === o.id ? { ...it, texto: e.target.value } : it))} />
                      </div>
                    ))}
                    <button className="add-line" onClick={() => patch("objetivos", [...character.objetivos, { id: uid(), titulo: "", texto: "", feito: false }])}>
                      <Plus size={14} /> adicionar objetivo
                    </button>
                  </div>
                </section>
              )}

              {activeTab === "mochila" && (
                <section>
                  <h2 className="section-title">Armas equipadas</h2>
                  <p className="section-hint">Até 4 armas + 1 faca de caça equipadas não ocupam slot da mochila. Formato de munição: (carregado/reserva no coldre-bandoleira). Use o botão de recarregar para mover da reserva pro carregado/tambor.</p>
                  <ArmasEquipadas armas={character.armasEquipadas} onChange={(v) => patch("armasEquipadas", v)} />

                  <h2 className="section-title" style={{ marginTop: 20 }}>
                    Mochila — {mochilaUsado}/10 slots
                    {mochilaUsado > 10 && <span className="over-warning"> (acima da capacidade)</span>}
                  </h2>
                  <p className="section-hint">Roupas vestidas, moedas miúdas e as armas/munição já equipadas acima não ocupam slot aqui.</p>
                  <InventoryEditor items={character.mochila} onChange={(v) => patch("mochila", v)} showEquipado />
                </section>
              )}

              {activeTab === "loja" && <Loja dinheiro={character.dinheiro} onComprar={comprarItem} />}

              {activeTab === "cavalo" && (
                <section>
                  <h2 className="section-title">Cavalo</h2>
                  <input className="ledger-input horse-name" placeholder="Nome da montaria" value={character.cavalo.nome} onChange={(e) => patch("cavalo", { ...character.cavalo, nome: e.target.value })} />
                  <div className="attr-grid" style={{ marginBottom: 12 }}>
                    <div className="attr-card">
                      <span className="attr-card-label">Potência</span>
                      <input type="number" min={0} className="ledger-input attr-card-input" value={character.cavalo.potencia} onChange={(e) => patch("cavalo", { ...character.cavalo, potencia: clamp0(e.target.value) })} />
                      <span className="attr-card-hint">corridas / perseguições</span>
                    </div>
                    <div className="attr-card">
                      <span className="attr-card-label">Resistência</span>
                      <input type="number" min={0} className="ledger-input attr-card-input" value={character.cavalo.resistencia} onChange={(e) => patch("cavalo", { ...character.cavalo, resistencia: clamp0(e.target.value) })} />
                      <span className="attr-card-hint">+1 Vida máx / ponto</span>
                    </div>
                    <div className="attr-card">
                      <span className="attr-card-label">Fidelidade</span>
                      <input type="number" min={0} max={5} className="ledger-input attr-card-input" value={character.cavalo.fidelidade} onChange={(e) => patch("cavalo", { ...character.cavalo, fidelidade: Math.max(0, Math.min(5, clamp0(e.target.value))) })} />
                      <span className="attr-card-hint">0 a 5</span>
                    </div>
                  </div>
                  <p className="section-hint">{FIDELIDADE_TEXT[character.cavalo.fidelidade]}</p>

                  <div className="track-block">
                    <div className="track-label-row"><span>Vida ({cavaloVidaMax - character.cavalo.vidaPerdida}/{cavaloVidaMax})</span></div>
                    <CircleTrack max={cavaloVidaMax} filled={character.cavalo.vidaPerdida} onChange={(v) => patch("cavalo", { ...character.cavalo, vidaPerdida: v })} kind="vida" />
                  </div>
                  <div className="track-block">
                    <div className="track-label-row"><span>Dor ({character.cavalo.dorMarcada}/6)</span></div>
                    <CircleTrack max={6} filled={character.cavalo.dorMarcada} onChange={(v) => patch("cavalo", { ...character.cavalo, dorMarcada: v })} kind="dor" />
                  </div>

                  <label className="dice-check" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={character.cavalo.alforje} onChange={(e) => patch("cavalo", { ...character.cavalo, alforje: e.target.checked })} />
                    Bolsa de montaria (alforje) equipada (+10 slots)
                  </label>

                  <h3 className="subsection-title">
                    Carga — {cavaloUsado}/{cavaloCapacidade} slots
                    {cavaloUsado > cavaloCapacidade && <span className="over-warning"> (acima da capacidade)</span>}
                  </h3>
                  <InventoryEditor items={character.cavalo.itens} onChange={(v) => patch("cavalo", { ...character.cavalo, itens: v })} />
                  <textarea className="ledger-textarea" placeholder="Temperamento, aparência, notas..." rows={4} style={{ marginTop: 10 }} value={character.cavalo.notas} onChange={(e) => patch("cavalo", { ...character.cavalo, notas: e.target.value })} />
                </section>
              )}

              {activeTab === "tabelas" && (
                <section>
                  <h2 className="section-title">Tabelas de referência</h2>
                  <h3 className="subsection-title">Status por estouro de Dor (1d6)</h3>
                  <ol className="ref-list">{STATUS_TABLE.map((t, i) => <li key={i}>{t}</li>)}</ol>
                  <h3 className="subsection-title">Acerto Crítico (Violência, 6 seguido de 6)</h3>
                  <ol className="ref-list">{CRIT_TABLE.map((t, i) => <li key={i}>{t}</li>)}</ol>
                  <h3 className="subsection-title">Falha Crítica (Violência, 1 seguido de 1)</h3>
                  <ol className="ref-list">{FUMBLE_TABLE.map((t, i) => <li key={i}>{t}</li>)}</ol>
                  <h3 className="subsection-title">Defesa e cobertura</h3>
                  <ul className="ref-list">
                    <li>Base: 5</li><li>Surpresa: 3</li><li>Cobertura parcial: 6 (sem penalidade)</li><li>Cobertura completa: 7 (-1 em Testes de Violência ao atirar dela)</li>
                  </ul>
                  <h3 className="subsection-title">Fidelidade da montaria</h3>
                  <ol className="ref-list">{FIDELIDADE_TEXT.map((t, i) => <li key={i}>{t}</li>)}</ol>
                  <h3 className="subsection-title">Descanso e cura</h3>
                  <ul className="ref-list">
                    <li>24h padrão: Dor→0, +2 Vida</li>
                    <li>24h com Medicina (≥1 ponto) supervisionando: Dor→0, +3 Vida, sem rolagem</li>
                    <li>Tratamento arriscado: 1d6 + Medicina vs NA 6 → sucesso +2 Vida extra; falha: só recupera Dor</li>
                    <li>Unguento no descanso: +1 Vida extra</li>
                    <li>Pomada de cavalo no descanso: +3 Vida direto pra montaria</li>
                  </ul>
                  <h3 className="subsection-title">Bebedeira</h3>
                  <p className="section-hint">NA = 6 + 1 por dose além do limite tolerável. Teste: 1d6 + Suor.</p>
                  <BebedeiraRoller suor={pericias.suor} />
                </section>
              )}

              {activeTab === "anotacoes" && (
                <section>
                  <h2 className="section-title">Anotações</h2>
                  <textarea className="ledger-textarea anotacoes-area" placeholder="Qualquer coisa solta que precise anotar..." rows={16} value={character.anotacoes} onChange={(e) => patch("anotacoes", e.target.value)} />
                </section>
              )}
            </div>

            <aside className="side-dock">
              <DiceRoller />
              <IniciativaWidget />
              <CartasDeSina value={character.cartasDeSina} onChange={(v) => patch("cartasDeSina", v)} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function defaultCharacter() {
  return {
    nome: "", apelido: "", arquetipo: "", portrait: null, nivel: 1, dinheiro: 200,
    atributos: { fisico: 0, velocidade: 0, intelecto: 0, coragem: 0 },
    antecedenteBonusManual: 0, vidaBonusManual: 0, vidaPerdida: 0, dorMarcada: 0, ultimoStatusDor: "",
    pericias: { atencao: 0, medicina: 0, montaria: 0, suor: 0, negocios: 0, roubo: 0, tradicao: 0, violencia: 0 },
    historias: [{ id: uid(), titulo: "", texto: "" }],
    passivas: [{ id: uid(), titulo: "", texto: "" }],
    redencao: {
      cartas: [
        { id: uid(), titulo: "", texto: "", usada: false, descartada: false },
        { id: uid(), titulo: "", texto: "", usada: false, descartada: false },
        { id: uid(), titulo: "", texto: "", usada: false, descartada: false },
      ],
      pesadelo: { titulo: "", texto: "", ativa: false },
    },
    objetivos: [
      { id: uid(), titulo: "", texto: "", feito: false },
      { id: uid(), titulo: "", texto: "", feito: false },
      { id: uid(), titulo: "", texto: "", feito: false },
    ],
    cartasDeSina: 0,
    mochila: [{ id: uid(), nome: "", tamanho: "padrao", equipado: false, notas: "" }],
    armasEquipadas: [],
    cavalo: {
      nome: "", potencia: 0, resistencia: 0, fidelidade: 0, vidaPerdida: 0, dorMarcada: 0, alforje: false,
      itens: [{ id: uid(), nome: "", tamanho: "padrao", notas: "" }], notas: "",
    },
    anotacoes: "",
  };
}

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Rye&family=Vollkorn:wght@400;600;700&family=Courier+Prime:wght@400;700&display=swap');
/* "TheWildBunch" é uma fonte comercial (não está no Google Fonts), então não dá pra importar por link.
   Se você tiver os arquivos da fonte (.woff2/.otf), descomente e ajuste o @font-face abaixo com a URL onde hospedar os arquivos.
   Enquanto isso, o app usa 'Rye' como alternativa nos mesmos lugares. */
/* @font-face {
  font-family: 'TheWildBunch';
  src: url('CAMINHO_PARA_SUA_FONTE/TheWildBunch.woff2') format('woff2');
  font-display: swap;
} */
:root { --parchment:#e8dcb8; --parchment-deep:#d6c494; --ink:#2a1d14; --leather:#5c3a21; --leather-dark:#3d2615; --rust:#9c4221; --brass:#a6812e; --green:#4f6a3d; }
.loading-screen { display:flex; align-items:center; justify-content:center; gap:10px; min-height:240px; font-family:'Vollkorn',serif; color:var(--leather-dark); background:var(--parchment); }
.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.sacramento-root { font-family:'Vollkorn',serif; color:var(--ink); background:var(--leather-dark); padding:18px; border-radius:6px; }
.ledger { display:flex; min-height:560px; background:var(--parchment); border-radius:4px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.45); border:1px solid var(--leather-dark); }
.spine { width:148px; flex-shrink:0; background:linear-gradient(180deg, var(--leather), var(--leather-dark)); display:flex; flex-direction:column; padding:14px 0; border-right:3px double var(--brass); }
.spine-brand { font-family:'TheWildBunch','Rye',serif; color:var(--parchment); font-size:15px; text-align:center; letter-spacing:2px; padding:0 10px 14px; border-bottom:1px solid rgba(230,220,190,0.25); margin-bottom:10px; }
.spine-tab { display:flex; align-items:center; gap:8px; background:transparent; border:none; color:rgba(232,220,184,0.75); font-family:'Vollkorn',serif; font-size:12.5px; padding:7px 14px; cursor:pointer; text-align:left; border-left:3px solid transparent; }
.spine-tab:hover { background:rgba(230,220,190,0.08); color:var(--parchment); }
.spine-tab-active { background:var(--parchment); color:var(--leather-dark); border-left:3px solid var(--rust); font-weight:600; }
.spine-footer { margin-top:auto; padding:10px 12px 0; display:flex; flex-direction:column; gap:8px; border-top:1px solid rgba(230,220,190,0.25); }
.save-indicator { font-family:'Courier Prime',monospace; font-size:10.5px; color:rgba(232,220,184,0.6); display:flex; align-items:center; gap:4px; height:14px; }
.reset-btn { display:flex; align-items:center; gap:5px; background:transparent; border:1px solid rgba(230,220,190,0.35); color:rgba(232,220,184,0.85); font-size:11px; padding:5px 8px; border-radius:3px; cursor:pointer; font-family:'Vollkorn',serif; }
.reset-btn:hover { background:rgba(230,220,190,0.1); }
.page { flex:1; padding:20px 26px 26px; background: repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(92,58,33,0.05) 28px), var(--parchment); overflow-y:auto; }
.poster { display:flex; align-items:flex-start; gap:18px; padding-bottom:14px; border-bottom:2px solid var(--leather); margin-bottom:18px; position:relative; }
.portrait-frame { width:84px; height:84px; border:3px solid var(--leather); border-radius:4px; background:var(--parchment-deep); display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; flex-shrink:0; box-shadow:0 0 0 3px var(--parchment), 0 0 0 4px var(--brass); }
.portrait-frame img { width:100%; height:100%; object-fit:cover; }
.portrait-empty { display:flex; flex-direction:column; align-items:center; gap:4px; color:var(--leather); font-size:10px; font-family:'Courier Prime',monospace; }
.poster-fields { display:flex; flex-direction:column; gap:6px; flex:1; }
.name-input { font-family:'TheWildBunch','Rye',serif; font-size:26px; color:var(--leather-dark); background:transparent; border:none; border-bottom:1px dashed var(--brass); padding:2px 0; }
.name-input:focus { outline:none; border-bottom:1px solid var(--rust); }
.arquetipo-input { font-family:'Courier Prime',monospace; font-size:12.5px; color:var(--leather); background:transparent; border:none; letter-spacing:1px; }
.arquetipo-input:focus { outline:none; }
.poster-meta { display:flex; gap:14px; font-family:'Courier Prime',monospace; font-size:12px; color:var(--leather); align-items:center; }
.poster-meta label { display:flex; align-items:center; gap:4px; }
.small-num { width:52px !important; }
.poster-armas { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
.poster-arma-chip { background:var(--leather); color:var(--parchment); font-family:'Courier Prime',monospace; font-size:10.5px; padding:3px 7px; border-radius:10px; }
.stamp { position:absolute; right:6px; top:-6px; font-family:'TheWildBunch','Rye',serif; font-size:12px; color:var(--rust); border:2px solid var(--rust); padding:3px 10px; border-radius:3px; transform:rotate(8deg); opacity:0.55; letter-spacing:1px; text-transform:uppercase; }
.page-body { display:flex; gap:22px; align-items:flex-start; }
.tab-content { flex:1; min-width:0; }
.section-title { font-family:'TheWildBunch','Rye',serif; font-size:18px; color:var(--leather-dark); margin:0 0 4px; letter-spacing:0.5px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.subsection-title { font-family:'TheWildBunch','Rye',serif; font-size:14px; color:var(--leather); margin:16px 0 8px; }
.section-hint { font-size:12px; color:var(--leather); font-style:italic; margin:0 0 14px; line-height:1.5; }
.over-warning { color:var(--rust); font-size:12px; font-style:italic; }
.ledger-input, .ledger-textarea { font-family:'Vollkorn',serif; background:rgba(255,252,240,0.55); border:1px solid var(--parchment-deep); border-radius:3px; padding:6px 9px; color:var(--ink); font-size:13.5px; }
.ledger-input:focus, .ledger-textarea:focus { outline:none; border-color:var(--brass); background:rgba(255,252,240,0.85); }
.ledger-textarea { width:100%; resize:vertical; line-height:1.5; }
.anotacoes-area { font-family:'Courier Prime',monospace; font-size:12.5px; }
.input-warn { border-color:var(--rust) !important; box-shadow:0 0 0 1px var(--rust); }
.attr-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:10px; margin-bottom:8px; }
.attr-card { background:rgba(255,252,240,0.4); border:1px solid var(--parchment-deep); border-radius:5px; padding:8px 10px; display:flex; flex-direction:column; gap:4px; }
.attr-card-label { font-weight:600; font-size:12.5px; color:var(--leather-dark); }
.attr-card-input { width:60px; text-align:center; font-family:'Courier Prime',monospace; }
.attr-card-hint { font-size:10.5px; color:var(--leather); font-style:italic; }
.derived-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:10px; margin-bottom:16px; }
.derived-item { background:var(--leather); color:var(--parchment); border-radius:5px; padding:8px 10px; display:flex; flex-direction:column; gap:2px; }
.derived-item span:first-child { font-size:11px; opacity:0.85; }
.derived-item strong { font-family:'Courier Prime',monospace; font-size:18px; }
.derived-note { font-size:9.5px !important; opacity:0.7; }
.track-block { margin-bottom:12px; }
.track-label-row { font-size:12.5px; font-weight:600; color:var(--leather-dark); margin-bottom:6px; font-family:'Courier Prime',monospace; }
.circle-track { display:flex; gap:6px; flex-wrap:wrap; }
.circle { width:20px; height:20px; border-radius:50%; border:2px solid var(--leather); background:var(--parchment); cursor:pointer; padding:0; }
.circle-track-vida .circle-filled { background:var(--rust); border-color:var(--rust); }
.circle-track-dor .circle-filled { background:var(--brass); border-color:var(--brass); }
.banner { margin-top:8px; padding:8px 10px; border-radius:4px; font-size:12px; line-height:1.5; }
.banner-warn { background:rgba(156,66,33,0.12); border:1px solid var(--rust); color:var(--leather-dark); }
.banner-info { background:rgba(166,129,46,0.15); border:1px solid var(--brass); color:var(--leather-dark); }
.descanso-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:14px 0; color:var(--leather); }
.small-label { font-size:11.5px; color:var(--leather); flex:1; }
.pericia-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:8px; }
.pericia-row { display:flex; align-items:center; justify-content:space-between; gap:6px; }
.pericia-label { font-size:12.5px; }
.attr-row { display:flex; align-items:center; gap:6px; }
.attr-num { width:56px; font-family:'Courier Prime',monospace; text-align:center; }
.entry-list { display:flex; flex-direction:column; gap:12px; }
.entry-card { background:rgba(255,252,240,0.35); border:1px solid var(--parchment-deep); border-radius:4px; padding:10px; }
.entry-card-dim { opacity:0.55; }
.entry-card-top { display:flex; gap:8px; margin-bottom:6px; align-items:center; }
.entry-title { flex:1; font-weight:600; }
.card-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
.inv-list { display:flex; flex-direction:column; gap:8px; }
.inv-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.inv-name { flex:1.2; min-width:100px; }
.inv-tamanho { flex:0.9; min-width:100px; }
.inv-notas { flex:1.5; min-width:100px; }
.inv-equipado { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--leather); white-space:nowrap; }
.horse-name { width:100%; margin-bottom:10px; font-weight:600; }
.add-line { display:flex; align-items:center; gap:5px; align-self:flex-start; background:transparent; border:1px dashed var(--brass); color:var(--leather); font-family:'Vollkorn',serif; font-size:12.5px; padding:6px 10px; border-radius:3px; cursor:pointer; margin-top:2px; }
.add-line:hover { background:rgba(166,129,46,0.1); }
.add-line:disabled { opacity:0.5; cursor:not-allowed; }
.icon-btn { background:transparent; border:none; color:var(--leather); cursor:pointer; padding:4px; border-radius:3px; display:flex; align-items:center; justify-content:center; }
.icon-btn:hover { background:rgba(156,66,33,0.15); color:var(--rust); }
.ref-list { margin:0 0 14px; padding-left:18px; font-size:12.5px; line-height:1.6; color:var(--ink); }
.bebedeira-box { background:rgba(255,252,240,0.35); border:1px solid var(--parchment-deep); border-radius:5px; padding:10px; }
.weapon-list { display:flex; flex-direction:column; gap:10px; }
.weapon-row { background:rgba(255,252,240,0.35); border:1px solid var(--parchment-deep); border-radius:5px; padding:8px; }
.weapon-top { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
.weapon-name { flex:1.3; min-width:100px; }
.weapon-tipo { flex:1; min-width:150px; }
.weapon-caps { display:flex; gap:14px; margin-bottom:6px; }
.weapon-caps label { display:flex; flex-direction:column; gap:2px; font-size:10.5px; color:var(--leather); }
.weapon-body { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.weapon-count { font-family:'Courier Prime',monospace; font-size:12.5px; color:var(--leather-dark); }
.weapon-count-main { font-weight:700; font-size:14px; }
.weapon-summary { display:flex; align-items:center; gap:8px; padding:4px 0; }
.weapon-summary-name { font-size:12.5px; font-weight:600; min-width:90px; }
.tambor { position:relative; border-radius:50%; background:var(--leather-dark); border:2px solid var(--brass); flex-shrink:0; }
.camara { position:absolute; width:18px; height:18px; border-radius:50%; border:2px solid var(--parchment); background:var(--leather); cursor:pointer; padding:0; }
.camara-loaded { background:var(--brass); }
.side-dock { width:200px; flex-shrink:0; display:flex; flex-direction:column; gap:12px; position:sticky; top:0; }
.dice-tray { background:var(--leather); border:1px solid var(--leather-dark); border-radius:6px; padding:14px; display:flex; flex-direction:column; align-items:stretch; gap:8px; }
.dice-tray-header { display:flex; align-items:center; gap:6px; color:var(--parchment); font-family:'TheWildBunch','Rye',serif; font-size:13px; letter-spacing:0.5px; }
.dice-field-row { display:flex; align-items:center; justify-content:space-between; gap:6px; }
.dice-field-row label { color:rgba(232,220,184,0.85); font-size:11px; }
.dice-num { width:54px; font-family:'Courier Prime',monospace; text-align:center; }
.dice-check { display:flex; align-items:center; gap:6px; color:rgba(232,220,184,0.85); font-size:11px; }
.dice-toggle-row { display:flex; gap:6px; }
.toggle-chip { flex:1; background:rgba(230,220,190,0.1); border:1px solid rgba(230,220,190,0.3); color:rgba(232,220,184,0.85); font-size:11px; padding:6px; border-radius:4px; cursor:pointer; font-family:'Vollkorn',serif; }
.toggle-chip-on { background:var(--rust); border-color:var(--rust); color:var(--parchment); font-weight:600; }
.dice-stage { display:flex; gap:10px; min-height:56px; align-items:center; justify-content:center; }
.die { width:44px; height:44px; background:var(--parchment); border:2px solid var(--brass); border-radius:8px; box-shadow:0 3px 0 var(--leather-dark); }
.die-rolling { animation: dieShake 0.08s linear infinite; }
@keyframes dieShake { 0% { transform:rotate(-4deg); } 50% { transform:rotate(4deg); } 100% { transform:rotate(-4deg); } }
.die-ghost { opacity:0.8; transform:scale(0.85); }
.die-face { width:100%; height:100%; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:6px; box-sizing:border-box; }
.pip { border-radius:50%; }
.pip-on { background:var(--leather-dark); margin:auto; width:6px; height:6px; }
.roll-btn { width:100%; background:var(--rust); color:var(--parchment); border:none; font-family:'TheWildBunch','Rye',serif; letter-spacing:1px; font-size:13px; padding:8px; border-radius:4px; cursor:pointer; }
.roll-btn:hover { filter:brightness(1.08); }
.roll-btn:disabled { opacity:0.6; cursor:not-allowed; }
.result-line { font-family:'Courier Prime',monospace; font-size:12.5px; text-align:center; padding:4px; border-radius:3px; }
.result-sucesso { color:#cfe8b8; background:rgba(79,106,61,0.35); }
.result-falha { color:#f0c9c0; background:rgba(156,66,33,0.35); }
.extra-box { border-radius:4px; padding:8px; font-size:11.5px; line-height:1.4; color:var(--parchment); }
.extra-crit { background:rgba(79,106,61,0.4); border:1px solid var(--green); }
.extra-fumble { background:rgba(156,66,33,0.4); border:1px solid var(--rust); }
.side-box { background:var(--leather); border:1px solid var(--leather-dark); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:6px; }
.side-box-header { display:flex; align-items:center; gap:6px; color:var(--parchment); font-family:'TheWildBunch','Rye',serif; font-size:12.5px; }
.stepper-row { display:flex; align-items:center; justify-content:center; gap:10px; }
.stepper-btn { color:var(--parchment); border:1px solid rgba(230,220,190,0.4); width:22px; height:22px; }
.stepper-value { font-family:'Courier Prime',monospace; font-size:16px; color:var(--parchment); }
.side-warning { display:flex; align-items:center; gap:4px; color:#f0c9c0; font-size:10.5px; margin:0; }
.side-hint { color:rgba(232,220,184,0.7); font-size:10px; margin:0; }
.card-stage { display:flex; align-items:center; justify-content:center; padding:4px 0; }
.playing-card { width:48px; height:64px; background:var(--parchment); border-radius:5px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Courier Prime',monospace; font-weight:700; font-size:15px; color:var(--ink); box-shadow:0 2px 0 var(--leather-dark); }
.playing-card-red { color:var(--rust); }
.playing-card-empty { color:var(--leather); opacity:0.6; }
.loja-search { display:flex; align-items:center; gap:6px; background:rgba(255,252,240,0.5); border:1px solid var(--parchment-deep); border-radius:4px; padding:4px 8px; margin-bottom:12px; }
.loja-categorias { display:flex; flex-wrap:wrap; gap:8px; }
.loja-cat-btn { background:var(--leather); color:var(--parchment); border:none; padding:8px 12px; border-radius:5px; font-family:'Vollkorn',serif; font-size:12.5px; cursor:pointer; }
.loja-cat-btn:hover { filter:brightness(1.15); }
.loja-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.loja-row { display:flex; align-items:center; gap:10px; background:rgba(255,252,240,0.35); border:1px solid var(--parchment-deep); border-radius:4px; padding:6px 10px; flex-wrap:wrap; }
.loja-row-main { display:flex; flex-direction:column; flex:1; min-width:140px; }
.loja-cat { font-size:10px; color:var(--leather); font-style:italic; }
.loja-obs { font-size:10.5px; color:var(--leather); font-style:italic; }
.loja-preco { font-family:'Courier Prime',monospace; font-size:12px; color:var(--leather-dark); white-space:nowrap; }
.loja-modal { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
.loja-modal-box { background:var(--parchment); border:2px solid var(--leather); border-radius:6px; padding:18px; max-width:360px; width:100%; }
@media (max-width: 720px) {
  .ledger { flex-direction:column; }
  .spine { width:100%; flex-direction:row; flex-wrap:wrap; padding:10px; }
  .spine-brand { display:none; }
  .spine-footer { flex-direction:row; margin-left:auto; }
  .page-body { flex-direction:column; }
  .side-dock { width:100%; flex-direction:row; flex-wrap:wrap; }
  .camara { width:22px; height:22px; }
}
`;
