import React, { useState, useEffect, useCallback, useRef } from "react";
import { Users, Crosshair, Plus, Trash2, Copy, LogOut, Skull, Check } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { getDeviceId } from "../lib/device.js";

const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["♠", "♥", "♦", "♣"];
const rankIndex = (r) => RANKS.indexOf(r);

export default function Mesa({ mesaLink, setMesaLink }) {
  return mesaLink ? <Quadro mesaLink={mesaLink} setMesaLink={setMesaLink} /> : <Entrada setMesaLink={setMesaLink} />;
}

function Entrada({ setMesaLink }) {
  const [modo, setModo] = useState("entrar"); // entrar | criar
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const confirmar = async () => {
    if (!codigo.trim() || !pin.trim() || !nome.trim()) {
      setErro("preencha nome, código e PIN");
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      const rpc = modo === "criar" ? "mesa_criar" : "mesa_entrar";
      const { data, error } = await supabase.rpc(rpc, { p_codigo: codigo, p_pin: pin });
      if (error) throw error;
      const mesa = Array.isArray(data) ? data[0] : data;
      if (!mesa) throw new Error("não foi possível entrar na mesa");

      const deviceId = getDeviceId();
      // procura um personagem já existente deste dispositivo nesta mesa
      const { data: existentes } = await supabase
        .from("personagens")
        .select("id")
        .eq("mesa_id", mesa.id)
        .eq("device_id", deviceId)
        .limit(1);

      let personagemId = existentes?.[0]?.id;
      if (!personagemId) {
        const { data: criado, error: errCriar } = await supabase
          .from("personagens")
          .insert({ mesa_id: mesa.id, device_id: deviceId, nome: nome.trim() })
          .select("id")
          .single();
        if (errCriar) throw errCriar;
        personagemId = criado.id;
      }

      setMesaLink({ mesaId: mesa.id, codigo: codigo.trim().toLowerCase(), personagemId, deviceId });
    } catch (e) {
      setErro(e.message || "erro ao entrar na mesa");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button style={pillStyle(modo === "entrar")} onClick={() => setModo("entrar")}>entrar numa mesa</button>
        <button style={pillStyle(modo === "criar")} onClick={() => setModo("criar")}>criar mesa nova</button>
      </div>
      <label style={labelStyle}>Seu nome</label>
      <input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Dutch" />
      <label style={labelStyle}>Código da mesa</label>
      <input style={inputStyle} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ex: saloon-42" />
      <label style={labelStyle}>PIN</label>
      <input style={inputStyle} type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="ex: 4 dígitos" />
      {erro && <p style={{ color: "#9c4221", fontSize: 12 }}>{erro}</p>}
      <button style={btnStyle} onClick={confirmar} disabled={carregando}>
        {carregando ? "..." : modo === "criar" ? "criar mesa" : "entrar"}
      </button>
      <p style={{ fontSize: 11, color: "#5c3a21", marginTop: 8 }}>
        O código + PIN funcionam como uma portinha simples pra sua mesa — não é criptografia forte, é só pra
        evitar que alguém aleatório entre. Quem tiver os dois dados consegue ver e mexer na mesa.
      </p>
    </div>
  );
}

function Quadro({ mesaLink, setMesaLink }) {
  const [mesa, setMesa] = useState({ turno_index: 0, rodada_atual: 1 });
  const [personagens, setPersonagens] = useState([]);
  const [iniciativa, setIniciativa] = useState([]);
  const channelRef = useRef(null);

  const refetchTudo = useCallback(async () => {
    const [{ data: m }, { data: p }, { data: i }] = await Promise.all([
      supabase.from("mesas_publicas").select("*").eq("id", mesaLink.mesaId).single(),
      supabase.from("personagens").select("*").eq("mesa_id", mesaLink.mesaId).order("nome"),
      supabase.from("iniciativa").select("*").eq("mesa_id", mesaLink.mesaId),
    ]);
    if (m) setMesa(m);
    if (p) setPersonagens(p);
    if (i) setIniciativa(i);
  }, [mesaLink.mesaId]);

  useEffect(() => {
    refetchTudo();
    const channel = supabase
      .channel(`mesa-${mesaLink.mesaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "personagens", filter: `mesa_id=eq.${mesaLink.mesaId}` }, refetchTudo)
      .on("postgres_changes", { event: "*", schema: "public", table: "iniciativa", filter: `mesa_id=eq.${mesaLink.mesaId}` }, refetchTudo)
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas", filter: `id=eq.${mesaLink.mesaId}` }, refetchTudo)
      .subscribe();
    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [mesaLink.mesaId, refetchTudo]);

  const addNPC = async () => {
    const npcNome = prompt("Nome do NPC/inimigo:");
    if (!npcNome?.trim()) return;
    await supabase.from("personagens").insert({
      mesa_id: mesaLink.mesaId,
      device_id: `npc-${crypto.randomUUID?.() || Math.random()}`,
      nome: npcNome.trim(),
      npc: true,
    });
  };

  const removerPersonagem = async (id) => {
    await supabase.from("personagens").delete().eq("id", id);
  };

  const puxarCarta = async (personagemId) => {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    await supabase.from("iniciativa").delete().eq("personagem_id", personagemId).eq("rodada", mesa.rodada_atual);
    await supabase.from("iniciativa").insert({ mesa_id: mesaLink.mesaId, personagem_id: personagemId, rank, suit, rodada: mesa.rodada_atual });
  };

  const filaOrdenada = iniciativa
    .filter((c) => c.rodada === mesa.rodada_atual)
    .slice()
    .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));

  const proximoTurno = async () => {
    if (filaOrdenada.length === 0) return;
    const next = (mesa.turno_index + 1) % filaOrdenada.length;
    await supabase.rpc("mesa_atualizar_turno", { p_mesa_id: mesaLink.mesaId, p_turno_index: next, p_rodada: mesa.rodada_atual });
  };

  const novaRodada = async () => {
    await supabase.rpc("mesa_atualizar_turno", { p_mesa_id: mesaLink.mesaId, p_turno_index: 0, p_rodada: mesa.rodada_atual + 1 });
  };

  const sair = async () => {
    await supabase.from("personagens").delete().eq("id", mesaLink.personagemId);
    setMesaLink(null);
  };

  const personagemPorId = Object.fromEntries(personagens.map((p) => [p.id, p]));

  return (
    <div>
      <header style={headerStyle}>
        <strong>Mesa {mesaLink.codigo}</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={chipStyle} onClick={() => navigator.clipboard?.writeText(mesaLink.codigo)}>
            <Copy size={12} /> copiar código
          </button>
          <button style={chipStyle} onClick={sair}>
            <LogOut size={12} /> sair
          </button>
        </div>
      </header>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <section style={{ ...cardStyle, flex: 1, minWidth: 280 }}>
          <div style={panelTitleStyle}><Users size={16} /> Jogadores na mesa</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {personagens.length === 0 && <p style={hintStyle}>ninguém entrou ainda</p>}
            {personagens.map((p) => (
              <div key={p.id} style={rowStyle}>
                {p.npc ? <Skull size={13} /> : <span style={dotStyle} />}
                <span style={{ flex: 1, fontSize: 12.5 }}>
                  {p.nome} {p.id === mesaLink.personagemId ? "(você)" : ""}
                </span>
                <BarraVida vidaMax={p.vida_max} vidaPerdida={p.vida_perdida} />
                <button style={miniBtnStyle} onClick={() => puxarCarta(p.id)}>puxar carta</button>
                <button style={iconBtnStyle} onClick={() => removerPersonagem(p.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button style={addLineStyle} onClick={addNPC}><Plus size={14} /> adicionar NPC/inimigo</button>
        </section>

        <section style={{ ...cardStyle, flex: 1, minWidth: 280 }}>
          <div style={panelTitleStyle}><Crosshair size={16} /> Iniciativa — rodada {mesa.rodada_atual}</div>
          <div style={corkStyle}>
            {filaOrdenada.length === 0 && <p style={hintStyle}>ninguém puxou carta ainda nesta rodada</p>}
            {filaOrdenada.map((c, i) => {
              const p = personagemPorId[c.personagem_id];
              const vermelho = c.suit === "♥" || c.suit === "♦";
              const atual = i === mesa.turno_index;
              return (
                <div key={c.id} style={cartaStyle(atual, i)}>
                  {atual && <span style={ribbonStyle}>na vez</span>}
                  <span style={{ fontSize: 10.5, textAlign: "center" }}>{p?.nome || "?"}</span>
                  <span style={{ fontFamily: "'Courier Prime',monospace", fontWeight: 700, fontSize: 16, color: vermelho ? "#9c4221" : "#2a1d14" }}>
                    {c.rank}{c.suit}
                  </span>
                  {p && <BarraVida vidaMax={p.vida_max} vidaPerdida={p.vida_perdida} compact />}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button style={btnStyle} onClick={proximoTurno} disabled={filaOrdenada.length === 0}>próximo turno</button>
            <button style={addLineStyle} onClick={novaRodada}>nova rodada</button>
          </div>
          <p style={hintStyle}>Ordem: Ás &gt; K &gt; Q &gt; J &gt; 10...2. Empate PJ×PJ: decidem entre si. PJ×NPC: PJ vence.</p>
        </section>
      </div>
    </div>
  );
}

function BarraVida({ vidaMax, vidaPerdida, compact }) {
  const max = Math.max(0, vidaMax || 0);
  const atual = Math.max(0, max - (vidaPerdida || 0));
  const pct = max > 0 ? Math.round((atual / max) * 100) : 0;
  return (
    <div title={`${atual}/${max} vida`} style={{ width: compact ? 44 : 60 }}>
      <div style={{ height: 6, background: "#d6c494", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct > 40 ? "#4f6a3d" : "#9c4221" }} />
      </div>
      {!compact && <span style={{ fontSize: 9.5, color: "#5c3a21" }}>{atual}/{max}</span>}
    </div>
  );
}

const cardStyle = { background: "#e8dcb8", border: "1px solid #3d2615", borderRadius: 6, padding: 14, fontFamily: "'Vollkorn',serif", color: "#2a1d14" };
const labelStyle = { fontSize: 11, color: "#5c3a21", display: "block", marginTop: 6 };
const inputStyle = { width: "100%", boxSizing: "border-box", fontFamily: "'Vollkorn',serif", background: "rgba(255,252,240,0.6)", border: "1px solid #d6c494", borderRadius: 3, padding: "7px 9px", fontSize: 13.5, marginTop: 3 };
const btnStyle = { background: "#9c4221", color: "#e8dcb8", border: "none", fontFamily: "'Rye',serif", letterSpacing: 1, fontSize: 12.5, padding: "8px 12px", borderRadius: 4, cursor: "pointer", marginTop: 10 };
const pillStyle = (active) => ({ flex: 1, background: active ? "#5c3a21" : "transparent", color: active ? "#e8dcb8" : "#5c3a21", border: "1px solid #5c3a21", borderRadius: 4, padding: "6px 8px", fontSize: 11.5, cursor: "pointer" });
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#5c3a21", color: "#e8dcb8", borderRadius: 5, padding: "10px 14px", marginBottom: 14 };
const chipStyle = { display: "flex", alignItems: "center", gap: 5, background: "rgba(230,220,190,0.12)", border: "1px solid rgba(230,220,190,0.3)", color: "#e8dcb8", fontSize: 11, padding: "5px 9px", borderRadius: 4, cursor: "pointer" };
const panelTitleStyle = { display: "flex", alignItems: "center", gap: 6, fontFamily: "'Rye',serif", color: "#3d2615", fontSize: 15, marginBottom: 10 };
const rowStyle = { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,252,240,0.4)", border: "1px solid #d6c494", borderRadius: 4, padding: "6px 8px" };
const dotStyle = { width: 8, height: 8, borderRadius: "50%", background: "#4f6a3d", flexShrink: 0 };
const miniBtnStyle = { background: "#5c3a21", color: "#e8dcb8", border: "none", fontSize: 10.5, padding: "5px 8px", borderRadius: 3, cursor: "pointer" };
const iconBtnStyle = { background: "transparent", border: "none", color: "#5c3a21", cursor: "pointer", padding: 3 };
const addLineStyle = { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px dashed #a6812e", color: "#5c3a21", fontSize: 12, padding: "6px 10px", borderRadius: 3, cursor: "pointer" };
const hintStyle = { fontSize: 11, color: "#5c3a21", fontStyle: "italic", margin: "4px 0" };
const corkStyle = { background: "repeating-linear-gradient(45deg, #b98a56, #b98a56 6px, #ad7e4c 6px, #ad7e4c 12px)", border: "6px solid #3d2615", borderRadius: 4, padding: 16, display: "flex", flexWrap: "wrap", gap: 14, minHeight: 100, marginBottom: 10 };
const cartaStyle = (atual, i) => ({
  position: "relative",
  background: "#e8dcb8",
  width: 84,
  padding: "10px 6px 8px",
  borderRadius: 2,
  boxShadow: "0 3px 6px rgba(0,0,0,0.35)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (2 + (i % 3))}deg)`,
  outline: atual ? "2px solid #a6812e" : "none",
});
const ribbonStyle = { position: "absolute", top: -11, right: -14, background: "#9c4221", color: "#e8dcb8", fontSize: 8.5, padding: "2px 6px", borderRadius: 2, transform: "rotate(8deg)" };
