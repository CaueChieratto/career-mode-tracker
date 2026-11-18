import { useMemo, useState, useEffect } from "react";
import { SquadElements } from "./elements/SquadElements";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import Card from "../../../../../ui/Card";
import Styles from "./SquadTab.module.css";
import { Career } from "../../../../../common/interfaces/Career";
import { ContainerClubContent } from "../../../../../components/ContainerClubContent";
import { ButtonsSwitch } from "../../../../../components/ButtonsSwitch";
import { POSITION_DATA } from "../../../../../common/types/Positions";
import { useSquadSort } from "./hooks/useSquadSort";
import { buildSquadData } from "./helpers/buildSquadData";
import { buildSquadCopyText } from "./helpers/buildSquadCopyText";
import { SORTS_OPTIONS } from "./constants/SORTS_OPTIONS";
import { useClubColors } from "../../../../../common/hooks/Colors/UseClubColors";
import { ColorsService } from "../../../../../common/services/ColorsService";
import { Copy } from "../../../../../common/utils/Copy";
import { useLocation } from "react-router-dom";
import { SectionScreen } from "../../../config/screens";
import { AddPlayerChoiceModal } from "./elements/SquadElements/Section/ui/AddPlayerChoiceModal";
import { getLatestFinishedMatch } from "./elements/SquadElements/Section/components/FooterSection_Player/utils/getLatestFinishedMatch";
import { useScrollAnchorRestore } from "../../../../../common/hooks/useScrollAnchorRestore";

type SquadTabProps = {
  season: ClubData;
  career: Career;
  onOpenScreen?: (screen: SectionScreen) => void;
};

const SquadTab = ({ season, career, onOpenScreen }: SquadTabProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const storageKeySuffix = isGeralPage ? "geral" : season.id;

  const { sortOption, isAsc, handleSortChange } =
    useSquadSort(storageKeySuffix);

  useScrollAnchorRestore("squad", [season.players]);

  const { clubColor, darkClubColor } = useClubColors(
    ColorsService.getColorSaved(career.id) || "#ffffff",
  );

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsChoiceModalOpen(true);
    };
    window.addEventListener("open-add-player-choice-modal", handleOpen);
    return () => {
      window.removeEventListener("open-add-player-choice-modal", handleOpen);
    };
  }, []);

  const handleSelectElenco = () => {
    setIsChoiceModalOpen(false);
    onOpenScreen?.({ key: "addSquadPlayer" });
  };

  const handleSelectTransferencia = () => {
    setIsChoiceModalOpen(false);
    onOpenScreen?.({ key: "addTransferPlayer" });
  };

  const isGrouped =
    sortOption === "Ordenar por padrão" || sortOption.includes("(Agrupado)");
  const criteria = sortOption.split(" (")[0];

  const { groupedData, flatData } = useMemo(() => {
    return buildSquadData(season.players, criteria, isAsc, season.matches);
  }, [season.players, criteria, isAsc, season.matches]);

  const currency = career.currency || "€";

  const latestFinishedMatchDate = useMemo(() => {
    if (!season.matches || !season.matches.length) return null;
    const latest = getLatestFinishedMatch(season.matches);
    return latest?.date || null;
  }, [season.matches]);

  const copySquad = async () => {
    if (!flatData.length) return;
    const text = buildSquadCopyText(flatData, currency);

    await Copy(text, "Elenco copiado com sucesso!");
  };

  const academyNickname = career?.academy?.nickname;

  return (
    <ContainerClubContent>
      <ButtonsSwitch
        selectOptions={SORTS_OPTIONS}
        selectValue={sortOption}
        onSelectChange={handleSortChange}
        onClickCopy={copySquad}
      />

      {isGrouped ? (
        POSITION_DATA.map((group, i) => {
          const players = groupedData.get(group.key) || [];

          if (group.key === "loaned" && players.length === 0) return null;

          return (
            <Card key={`${group.name}-${i}`} className={Styles.card}>
              <SquadElements.Header
                name={group.name}
                color={group.color}
                quantity={players.length}
              />
              {players.map((player, y) => (
                <SquadElements.Section
                  key={`${player.id}-${y}`}
                  player={player}
                  latestFinishedMatchDate={latestFinishedMatchDate}
                  currency={currency}
                  careerNation={career.nation}
                  careerCreatedAt={career.createdAt}
                  seasonNumber={season.seasonNumber}
                  matches={season.matches}
                  academyNickname={player.academyNickname || academyNickname}
                  onOpenScreen={onOpenScreen}
                />
              ))}
            </Card>
          );
        })
      ) : (
        <Card className={Styles.card}>
          <SquadElements.Header name={sortOption} color={clubColor} />
          {flatData.map((player, x) => (
            <SquadElements.Section
              key={`${player.id}-${x}`}
              player={player}
              latestFinishedMatchDate={latestFinishedMatchDate}
              currency={currency}
              careerNation={career.nation}
              careerCreatedAt={career.createdAt}
              seasonNumber={season.seasonNumber}
              matches={season.matches}
              academyNickname={academyNickname}
              onOpenScreen={onOpenScreen}
            />
          ))}
        </Card>
      )}

      {isChoiceModalOpen && (
        <AddPlayerChoiceModal
          onClose={() => setIsChoiceModalOpen(false)}
          onSelectElenco={handleSelectElenco}
          onSelectTransferencia={handleSelectTransferencia}
          clubColor={clubColor}
          darkClubColor={darkClubColor}
        />
      )}
    </ContainerClubContent>
  );
};

export default SquadTab;
