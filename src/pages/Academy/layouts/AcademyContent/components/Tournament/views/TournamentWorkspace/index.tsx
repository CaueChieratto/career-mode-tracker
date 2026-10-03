import { useState, useEffect } from "react";
import { FaCalendarAlt, FaTrophy, FaList, FaUsers } from "react-icons/fa";
import { FocusedCard } from "../../../Cards/FocusedCard";
import { AcademyTournaments } from "../../../../interfaces/AcademyTournaments/AcademyTournaments";
import { EntityWorkspace } from "../../../EntityWorkspace";
import { tournamentActions } from "./constants/tournamentActions";
import { TournamentEditor } from "../../components/TournamentEditor";
import { AcademyMatches } from "../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { ManageMatchView } from "../../features/Match/components/ManageMatchView";
import { TournamentMatchList } from "../../features/Match/components/TournamentMatchList";
import { CreateAcademyMatchForm } from "../../features/Match/containers/CreateAcademyMatchForm";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";

import { buildTournamentCopyText } from "./helpers/buildTournamentCopyText";
import { Copy } from "../../../../../../../../common/utils/Copy";

interface TournamentWorkspaceProps {
  selectedTournament?: AcademyTournaments;
}

const MatchStateWatcher = ({
  activeComponent,
  setEditingMatch,
  setManagingMatch,
}: {
  activeComponent: string | null;
  setEditingMatch: (match: AcademyMatches | undefined) => void;
  setManagingMatch: (match: AcademyMatches | undefined) => void;
}) => {
  useEffect(() => {
    if (activeComponent !== "add-matches") {
      setEditingMatch(undefined);
    }
    if (activeComponent !== "manage-match") {
      setManagingMatch(undefined);
    }
  }, [activeComponent, setEditingMatch, setManagingMatch]);
  return null;
};

export const TournamentWorkspace = ({
  selectedTournament,
}: TournamentWorkspaceProps) => {
  const { isGeral, career, allPlayersAcademy } = useAcademyContext();
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [editingMatch, setEditingMatch] = useState<
    AcademyMatches | undefined
  >();
  const [managingMatch, setManagingMatch] = useState<
    AcademyMatches | undefined
  >();

  if (!selectedTournament) return null;

  const handleCopyTournament = async () => {
    if (!selectedTournament) return;
    const formatted = buildTournamentCopyText(
      selectedTournament,
      career,
      allPlayersAcademy,
    );
    await Copy(formatted, "Torneio copiado com sucesso!");
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  let availableActions = tournamentActions
    .map((action) => {
      if (action.id === "copy-tournament") {
        return {
          ...action,
          subtitle: copyFeedback ? "Copiado com sucesso!" : "Toque para copiar",
          onClick: handleCopyTournament,
        };
      }
      return action;
    })
    .filter(
      (action) =>
        action.id !== "view-matches" ||
        (selectedTournament.matches && selectedTournament.matches.length >= 1),
    );

  if (isGeral) {
    availableActions = availableActions.filter(
      (action) =>
        action.id === "view-matches" || action.id === "copy-tournament",
    );
  }

  return (
    <EntityWorkspace
      entity={selectedTournament}
      actions={availableActions}
      getCustomBack={(active) => {
        if (active === "manage-match") {
          return {
            target: "view-matches",
            title: "Voltar para Partidas",
            subtitle: "Ver lista de partidas",
            icon: <FaList />,
          };
        }
        return null;
      }}
    >
      {(activeComponent, activeContentRef, setActiveComponent) => (
        <>
          <MatchStateWatcher
            activeComponent={activeComponent}
            setEditingMatch={setEditingMatch}
            setManagingMatch={setManagingMatch}
          />

          {activeComponent === "add-matches" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaCalendarAlt}
                title={
                  editingMatch
                    ? "Editar Partida"
                    : `Partidas: ${selectedTournament.name}`
                }
                disableAnimation={true}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <CreateAcademyMatchForm
                    initialData={
                      editingMatch ||
                      ({
                        date: selectedTournament.date,
                      } as Partial<AcademyMatches>)
                    }
                    onMatchAdded={() => {
                      setActiveComponent("view-matches");
                    }}
                  />
                </div>
              </FocusedCard>
            </div>
          )}

          {activeComponent === "view-matches" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaList}
                title={`Partidas de ${selectedTournament.name}`}
                disableAnimation={true}
              >
                <TournamentMatchList
                  matches={selectedTournament.matches}
                  onEdit={
                    isGeral
                      ? undefined
                      : (match) => {
                          setEditingMatch(match);
                          setActiveComponent("add-matches");
                        }
                  }
                  onEnterMatch={
                    isGeral
                      ? undefined
                      : (match) => {
                          setManagingMatch(match);
                          setActiveComponent("manage-match");
                        }
                  }
                />
              </FocusedCard>
            </div>
          )}

          {activeComponent === "manage-match" && managingMatch && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaUsers}
                title={`Em jogo vs ${managingMatch.opponentTeam}`}
                disableAnimation={true}
              >
                <ManageMatchView
                  match={managingMatch}
                  onBack={() => setActiveComponent("view-matches")}
                />
              </FocusedCard>
            </div>
          )}

          {activeComponent === "manage-tournaments" && (
            <div ref={activeContentRef}>
              <FocusedCard
                Icon={FaTrophy}
                title={`Gerenciar ${selectedTournament.name}`}
                disableAnimation={true}
              >
                <TournamentEditor />
              </FocusedCard>
            </div>
          )}
        </>
      )}
    </EntityWorkspace>
  );
};
