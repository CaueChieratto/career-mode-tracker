import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../common/interfaces/Match";
import { Teams } from "../../../../../../../common/interfaces/Teams";
import { AddMatchesProvider } from "./contexts/AddMatchesContext";
import { AddMatchesScreen } from "./screens/AddMatchesScreen";

import { Trophy } from "../../../../../../../common/interfaces/club/trophy";

export type OptimisticMatchData =
  | { type: "ADD"; match: Match; team?: Teams; trophies?: Trophy[] }
  | { type: "UPDATE"; match: Match; team?: Teams; trophies?: Trophy[] }
  | { type: "DELETE"; matchId: string };

type AddMatchesScreenProps = {
  career: Career;
  season: ClubData;
  matchesId?: string;
  onClose: (data?: OptimisticMatchData) => void;
};

export default function AddMatches(props: AddMatchesScreenProps) {
  return (
    <AddMatchesProvider {...props}>
      <AddMatchesScreen />
    </AddMatchesProvider>
  );
}
