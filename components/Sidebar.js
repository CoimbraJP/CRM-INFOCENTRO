import Link from "next/link";
import { useRouter } from "next/router";
import { Ico } from "../lib/icons";

const ITENS = [
  { href: "/", rota: "/", label: "CRM", icone: "layoutKanban" },
  { href: "/os", rota: "/os", label: "OS", icone: "wrench", soInfocentro: true },
  { href: "/metricas", rota: "/metricas", label: "Métricas", icone: "chart" },
  { href: "/estrategias", rota: "/estrategias", label: "Estratégias", icone: "target" },
  { href: "/aniversarios", rota: "/aniversarios", label: "Aniversários", icone: "cake" },
  { href: "/etiquetas", rota: "/etiquetas", label: "Etiquetas", icone: "tag" },
  { href: "/calendario", rota: "/calendario", label: "Calendário", icone: "calendar" },
];

export default function Sidebar({ colapsada, alternar, sessao }) {
  const router = useRouter();
  // OS (integração PDV) só existe pra conta INFOCENTRO
  const itens = ITENS.filter((it) => !it.soInfocentro || !sessao || sessao.tenant === "INFOCENTRO");
  return (
    <nav className={"sidebar" + (colapsada ? " colapsada" : "")}>
      <button className="sidebar-toggle" onClick={alternar} title={colapsada ? "Expandir menu" : "Recolher menu"}>
        <Ico n="menu" size={20} />
      </button>
      <div className="sidebar-itens">
        {itens.map((it) => {
          const ativo = router.pathname === it.rota;
          return (
            <Link key={it.href} href={it.href} className={"sidebar-item" + (ativo ? " ativo" : "")} title={it.label}>
              <Ico n={it.icone} size={19} />
              <span className="sidebar-label">{it.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="sidebar-rodape">
        {sessao?.usuario && (
          <div className="sidebar-conta" title={"Conta: " + sessao.usuario}>
            <Ico n="user" size={17} />
            <span className="sidebar-label">{sessao.usuario}{sessao.admin ? " (master)" : ""}</span>
          </div>
        )}
        <Link href="/configuracoes" className={"sidebar-item" + (router.pathname === "/configuracoes" ? " ativo" : "")} title="Configurações">
          <Ico n="settings" size={19} />
          <span className="sidebar-label">Configurações</span>
        </Link>
      </div>
    </nav>
  );
}
