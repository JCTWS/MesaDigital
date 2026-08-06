import React, { useState, useEffect, useRef, useCallback } from "react";
import { BookUser, Crosshair } from "lucide-react";
import FichaSacramento from "./components/Ficha.jsx";
import Mesa from "./components/Mesa.jsx";
import { supabase } from "./supabaseClient.js";

const LINK_KEY = "sacramento-mesa-link";

export default function App() {
  const [tab, setTab] = useState("ficha");
  const [mesaLink, setMesaLinkState] = useState(null); // { mesaId, codigo, personagemId, deviceId }
  const syncTimer = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem(LINK_KEY);
    if (raw) {
      try {
        setMesaLinkState(JSON.parse(raw));
      } catch {
        /* ignora link corrompido */
      }
    }
  }, []);

  const setMesaLink = (link) => {
    setMesaLinkState(link);
    if (link) localStorage.setItem(LINK_KEY, JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY);
  };

  // chamado pela Ficha sempre que nome/vida/dor mudam — empurra pro
  // Supabase com debounce, só quando há uma mesa vinculada.
  const handleVidaSnapshot = useCallback(
    (snap) => {
      if (!mesaLink?.personagemId) return;
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        await supabase
          .from("personagens")
          .update({
            nome: snap.nome?.trim() || "(sem nome)",
            vida_max: snap.vidaMax,
            vida_perdida: snap.vidaPerdida,
            dor_max: snap.dorMax,
            dor_perdida: snap.dorMarcada,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mesaLink.personagemId);
      }, 600);
    },
    [mesaLink]
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px" }}>
      <nav style={navStyle}>
        <button style={tabStyle(tab === "ficha")} onClick={() => setTab("ficha")}>
          <BookUser size={15} /> Ficha
        </button>
        <button style={tabStyle(tab === "mesa")} onClick={() => setTab("mesa")}>
          <Crosshair size={15} /> Mesa{mesaLink ? ` — ${mesaLink.codigo}` : ""}
        </button>
      </nav>

      {tab === "ficha" && <FichaSacramento mesaLink={mesaLink} onVidaSnapshot={handleVidaSnapshot} />}
      {tab === "mesa" && <Mesa mesaLink={mesaLink} setMesaLink={setMesaLink} />}
    </div>
  );
}

const navStyle = { display: "flex", gap: 8, marginBottom: 12 };
const tabStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid #3d2615",
  background: active ? "#5c3a21" : "transparent",
  color: active ? "#e8dcb8" : "#3d2615",
  cursor: "pointer",
  fontFamily: "'Vollkorn', serif",
  fontWeight: 600,
});
