import { AddSeasonPlayerProvider } from "./contexts/AddSeasonPlayerContext";
import AddSeason_PlayerScreen from "./screens/AddSeason_PlayerScreen";
import { AddSeasonPlayerProps } from "./types";

export default function AddSeason_Player(props: AddSeasonPlayerProps) {
  return (
    <AddSeasonPlayerProvider {...props}>
      <AddSeason_PlayerScreen />
    </AddSeasonPlayerProvider>
  );
}

export type { AddSeasonPlayerProps };
