import { useCallback, useRef, useState } from "react";
import type { Career } from "../engine/types";
import { Hub } from "./Hub";
import { NewCareer } from "./NewCareer";
import { Race } from "./Race";
import { RaceResultScreen } from "./RaceResult";
import { Retired } from "./Retired";
import { SeasonEnd } from "./SeasonEnd";
import { deleteSlot, saveSlot } from "./storage";
import { Strategy } from "./Strategy";
import { Title } from "./Title";

export type Act = (fn: (c: Career) => void, opts?: { save?: boolean | ((c: Career) => boolean) }) => void;

export function App() {
  const [slot, setSlot] = useState<number | null>(null);
  const [career, setCareerState] = useState<Career | null>(null);
  const [creating, setCreating] = useState(false);
  const ref = useRef<Career | null>(null);
  const setCareer = (c: Career | null) => { ref.current = c; setCareerState(c); };

  // All game mutations go through act(): clone, mutate synchronously, store, autosave.
  const act: Act = useCallback(
    (fn, opts) => {
      if (!ref.current) return;
      const next = structuredClone(ref.current);
      fn(next);
      const save = typeof opts?.save === "function" ? opts.save(next) : opts?.save !== false;
      if (save && slot !== null) saveSlot(slot, next);
      ref.current = next;
      setCareerState(next);
    },
    [slot],
  );

  const quit = () => { setCareer(null); setSlot(null); setCreating(false); };

  if (creating && slot !== null) {
    return (
      <NewCareer
        onCancel={quit}
        onCreate={(c) => { saveSlot(slot, c); setCareer(c); setCreating(false); }}
      />
    );
  }

  if (!career || slot === null) {
    return (
      <Title
        onLoad={(s, c) => { setSlot(s); setCareer(c); }}
        onNew={(s) => { deleteSlot(s); setSlot(s); setCreating(true); }}
      />
    );
  }

  switch (career.phase) {
    case "hub": return <Hub c={career} act={act} onQuit={quit} />;
    case "quali":
    case "strategy": return <Strategy c={career} act={act} />;
    case "race": return <Race c={career} act={act} />;
    case "raceResult": return <RaceResultScreen c={career} act={act} />;
    case "seasonEnd": return <SeasonEnd c={career} act={act} />;
    case "retired": return <Retired c={career} onQuit={quit} />;
  }
}
