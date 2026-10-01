import { FaChartLine, FaTrophy, FaUserEdit } from "react-icons/fa";
import LazyFlag from "../../../../../../../../components/LazyFlag";
import { FIFA_COUNTRY_CODES } from "../../../../../../../../common/constants/FIFA_COUNTRY_CODES";
import { FocusedCard } from "../../../Cards/FocusedCard";
import { AddPlayerAnnotations } from "../../components/AddPlayerAnnotations";
import { PlayerDevelopment } from "../../components/PlayerDevelopment";
import { PlayerEditor } from "../../components/PlayerEditor";
import { AcademyPlayers } from "../../../../interfaces/AcademyPlayers/AcademyPlayers";
import { EntityWorkspace } from "../../../EntityWorkspace";
import { PlayerPerformance } from "../../components/PlayerPerformance";
import { getPlayerActions } from "./constants/playerActions";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";

interface PlayerWorkspaceProps {
  selectedPlayer?: AcademyPlayers;
}

export const PlayerWorkspace = ({ selectedPlayer }: PlayerWorkspaceProps) => {
  const { isGeral } = useAcademyContext();

  if (!selectedPlayer) return null;

  const hasAnnotations =
    !!selectedPlayer.annotations &&
    selectedPlayer.annotations.trim() !== "" &&
    selectedPlayer.annotations !== "<br>";

  const isReadOnlyNote = false;

  let playerActions = getPlayerActions(hasAnnotations, isReadOnlyNote);

  if (isGeral) {
    playerActions = playerActions.filter(
      (action) => action.id !== "manage-player",
    );
  }

  return (
    <EntityWorkspace
      entity={selectedPlayer}
      keepOpenState="add-note"
      actions={playerActions}
    >
      {(activeComponent, activeContentRef) => (
        <>
          {activeComponent === "manage-player" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaUserEdit}
                title={`Gerenciar ${selectedPlayer.name}`}
                disableAnimation={true}
              >
                <PlayerEditor />
              </FocusedCard>
            </div>
          )}
          {activeComponent === "add-note" && (
            <div ref={activeContentRef}>
              <FocusedCard
                iconNode={
                  FIFA_COUNTRY_CODES[
                    selectedPlayer.nationality?.toUpperCase()
                  ] ? (
                    <LazyFlag
                      code={
                        FIFA_COUNTRY_CODES[
                          selectedPlayer.nationality?.toUpperCase()
                        ]
                      }
                      style={{
                        width: "28px",
                        height: "20px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <span>🌍</span>
                  )
                }
                title={`${selectedPlayer.name}`}
                disableAnimation={true}
              >
                <AddPlayerAnnotations />
              </FocusedCard>
            </div>
          )}
          {activeComponent === "development" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaChartLine}
                title={`Desenvolvimento de ${selectedPlayer.name}`}
                disableAnimation={true}
              >
                <PlayerDevelopment />
              </FocusedCard>
            </div>
          )}
          {activeComponent === "performance" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaTrophy}
                title={`Desempenho de ${selectedPlayer.name}`}
                disableAnimation={true}
              >
                <PlayerPerformance />
              </FocusedCard>
            </div>
          )}
        </>
      )}
    </EntityWorkspace>
  );
};
