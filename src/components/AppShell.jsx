import { useState } from 'react';

const NAV = [
  { id: 'diet', label: 'Dieta' },
  { id: 'barcode', label: 'Barcode' },
  { id: 'week', label: 'Settimana' },
  { id: 'settings', label: 'Impostazioni' },
];

function NavList({ section, onSelect }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = item.id === section;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              active ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarContent({ section, onSelect, username, onLogout }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div>
        <div className="text-lg font-black text-white">Diet Planner</div>
        <div className="text-xs text-slate-400">Varianti · Barcode · Open Food Facts</div>
      </div>
      <NavList section={section} onSelect={onSelect} />
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="text-sm text-slate-300">
          Ciao, <span className="font-semibold text-white">{username}</span>
        </div>
        <button
          onClick={onLogout}
          className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
        >
          Esci
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ section, onSectionChange, username, onLogout, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function select(id) {
    onSectionChange(id);
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      {/* Barra laterale (desktop) */}
      <aside className="hidden w-64 shrink-0 bg-gradient-to-b from-slate-950 to-indigo-950 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent section={section} onSelect={select} username={username} onLogout={onLogout} />
        </div>
      </aside>

      {/* Barra in alto con hamburger (mobile) */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-slate-950 px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Apri menu"
          className="rounded-lg p-1 transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-black">Diet Planner</span>
      </div>

      {/* Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80%] bg-gradient-to-b from-slate-950 to-indigo-950 shadow-2xl">
            <SidebarContent section={section} onSelect={select} username={username} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* Contenuto principale */}
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-5">{children}</div>
      </main>
    </div>
  );
}