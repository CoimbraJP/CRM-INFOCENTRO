import Link from "next/link";
import { useRouter } from "next/router";
import { Ico } from "../lib/icons";

const ITENS = [
  { href: "/", rota: "/", label: "CRM", icone: "layoutKanban" },
  { href: "/os", rota: "/os", label: "OS", icone: "wrench" },
  { href: "/estrategias", rota: "/estrategias", label: "Estratégias", icone: "target" },
  { href: "/aniversarios", rota: "/aniversarios", label: "Aniversários", icone: "cake" },
  { href: "/etiquetas", rota: "/etiquetas", label: "Etiquetas", icone: "tag" },
  { href: "/calendario", rota: "/calendario", label: "Calendário", icone: "calendar" },
];

export default function Sidebar({ colapsada, alternar }) {
  const router = useRouter();
  return (
    <nav className={"sidebar" + (colapsada ? " colapsada" : "")}>
      <button className="sidebar-toggle" onClick={alternar} title={colapsada ? "Expandir menu" : "Recolher menu"}>
        <Ico n="menu" size={20} />
      </button>
      <div className="sidebar-itens">
        {ITENS.map((it) => {
          const ativo = router.pathname === it.rota;
          return (
            <Link key={it.href} href={it.href} className={"sidebar-item" + (ativo ? " ativo" : "")} title={it.label}>
              <Ico n={it.icone} size={19} />
              <span className="sidebar-label">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
