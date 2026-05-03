import { createContext, useContext, useState, type ReactNode } from "react";

interface ModalState {
  seriesId: string;
  title: string;
}

interface HistoryModalContextValue {
  open: (seriesId: string, title: string) => void;
  close: () => void;
  state: ModalState | null;
}

const HistoryModalContext = createContext<HistoryModalContextValue | null>(null);

export function HistoryModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);
  return (
    <HistoryModalContext.Provider
      value={{
        open: (seriesId, title) => setState({ seriesId, title }),
        close: () => setState(null),
        state,
      }}
    >
      {children}
    </HistoryModalContext.Provider>
  );
}

export function useHistoryModal() {
  const ctx = useContext(HistoryModalContext);
  if (!ctx) throw new Error("useHistoryModal must be used within HistoryModalProvider");
  return ctx;
}
