import React, { createContext, useContext, useState, useCallback } from "react";

interface ActiveSessionContextType {
  hasActiveSession: boolean;
  setHasActiveSession: (active: boolean) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType>({
  hasActiveSession: false,
  setHasActiveSession: () => {},
});

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [hasActiveSession, setHasActiveSession] = useState(false);

  return (
    <ActiveSessionContext.Provider value={{ hasActiveSession, setHasActiveSession }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
