import { useMemo } from "react";
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

  const { clubColor } = useClubColors(
    ColorsService.getColorSaved(career.id) || "#ffffff",
  );

  const isGrouped =
    sortOption === "Ordenar por padrão" || sortOption.includes("(Agrupado)");
  const criteria = sortOption.split(" (")[0];

  const { groupedData, flatData } = useMemo(() => {
    return buildSquadData(season.players, criteria, isAsc);
  }, [season.players, criteria, isAsc]);

  const currency = career.currency || "€";

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
                  {...player}
                  matches={season.matches || []}
                  key={`${player.id}-${y}`}
                  currency={currency}
                  careerNation={career.nation}
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
              {...player}
              matches={season.matches || []}
              key={`${player.id}-${x}`}
              currency={currency}
              careerNation={career.nation}
              academyNickname={academyNickname}
              onOpenScreen={onOpenScreen}
            />
          ))}
        </Card>
      )}
    </ContainerClubContent>
  );
};

export default SquadTab;
