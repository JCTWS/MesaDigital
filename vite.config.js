import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANTE: troque "sacramento-app" pelo nome exato do seu repositório
// no GitHub. Se o repo for github.com/seu-usuario/minha-mesa, aqui deve
// ficar base: "/minha-mesa/". Sem isso os assets não carregam no Pages.
export default defineConfig({
  plugins: [react()],
  base: "/MesaDigital/",
});
