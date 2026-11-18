import { AddSquadPlayerProvider } from "./contexts/AddSquadPlayerContext";
import AddSquad_PlayerScreen from "./screens/AddSquad_PlayerScreen";
import { AddSquadPlayerProps } from "./types";

export default function AddSquad_Player(props: AddSquadPlayerProps) {
  return (
    <AddSquadPlayerProvider {...props}>
      <AddSquad_PlayerScreen />
    </AddSquadPlayerProvider>
  );
}

export type { AddSquadPlayerProps };
