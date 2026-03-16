
import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type MainLayoutProps = {
  children: React.ReactNode;
  /** Sobrescreve classes do <main>. Use p-0 overflow-hidden flex flex-col min-h-0 para conteúdo edge-to-edge (ex.: Atendimento). */
  mainClassName?: string;
};

export function MainLayout({ children, mainClassName }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main
          className={
            mainClassName ??
            "flex-1 overflow-y-auto p-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
