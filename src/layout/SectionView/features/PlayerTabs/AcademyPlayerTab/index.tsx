import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaChartLine, FaTrophy } from "react-icons/fa";
import LazyFlag from "../../../../../components/LazyFlag";
import { useClubColors } from "../../../../../common/hooks/Colors/UseClubColors";
import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { ColorsService } from "../../../../../common/services/ColorsService";
import { getContinentByCountry } from "../../../../../common/services/GetContinentByCountry";
import { FIFA_COUNTRY_CODES } from "../../../../../common/constants/FIFA_COUNTRY_CODES";
import NoStatsMessage from "../../../../../components/NoStatsMessage";
import { AcademyContext } from "../../../../../pages/Academy/layouts/contexts/AcademyContext";
import { FocusedCard } from "../../../../../pages/Academy/layouts/AcademyContent/components/Cards/FocusedCard";
import { AddPlayerAnnotations } from "../../../../../pages/Academy/layouts/AcademyContent/components/Player/components/AddPlayerAnnotations";
import { PlayerDevelopment } from "../../../../../pages/Academy/layouts/AcademyContent/components/Player/components/PlayerDevelopment";
import { PlayerPerformance } from "../../../../../pages/Academy/layouts/AcademyContent/components/Player/components/PlayerPerformance";
import Styles from "./AcademyPlayerTab.module.css";
import { useAcademyPlayerData } from "./hooks/useAcademyPlayerData";
import { buildMockAcademyContext } from "./helpers/buildMockAcademyContext";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../../../common/services/Firebase";

type AcademyPlayerTabProps = {
  player?: Players;
  career: Career;
  season?: ClubData;
};

const useCollapsibleCard = (playerId: string | undefined, cardName: string) => {
  const storageKey = playerId
    ? `@academy_playerTab_${cardName}_expanded_${playerId}`
    : "";

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!storageKey) return false;
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : false;
  });

  const toggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  return [isExpanded, toggle] as const;
};

const AcademyPlayerTab: React.FC<AcademyPlayerTabProps> = ({
  player,
  career,
  season,
}) => {
  const location = useLocation();
  const isGeral = location.pathname.includes("/Geral") || !season;

  const savedColor = ColorsService.getColorSaved(career?.id);
  const { clubColor, darkClubColor } = useClubColors(
    savedColor ?? career?.colorsTeams,
  );

  const careerStartYear = useMemo(
    () => new Date(career.createdAt).getFullYear(),
    [career.createdAt],
  );

  const isEurope = useMemo(
    () => getContinentByCountry(career.nation) === "Europa",
    [career.nation],
  );

  const { academyPlayer, tournamentsAcademy } = useAcademyPlayerData({
    player,
    isGeral,
    seasonNumber: season?.seasonNumber,
    careerStartYear,
    isEurope,
  });

  const [realAnnotations, setRealAnnotations] = useState<string>("");

  useEffect(() => {
    const fetchAcademyNotes = async () => {
      if (!player?.academyData?.id || !career?.clubData) return;
      const user = auth.currentUser;
      if (!user) return;

      for (const s of career.clubData) {
        const docRef = doc(
          db,
          `users/${user.uid}/careers/${career.id}/seasons/${s.id}/academyPlayers/${player.academyData.id}`,
        );
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().annotations) {
          setRealAnnotations(snap.data().annotations);
          break;
        }
      }
    };
    fetchAcademyNotes();
  }, [player, career]);

  const [isPerformanceExpanded, togglePerformance] = useCollapsibleCard(
    player?.id,
    "performance",
  );
  const [isDevelopmentExpanded, toggleDevelopment] = useCollapsibleCard(
    player?.id,
    "development",
  );
  const [isAnnotationsExpanded, toggleAnnotations] = useCollapsibleCard(
    player?.id,
    "annotations",
  );

  if (!player || !player.isAcademy || !academyPlayer) {
    return (
      <NoStatsMessage
        textOne="Jogador não é da base"
        textTwo="Este jogador não possui histórico ou dados da categoria de base para exibir."
      />
    );
  }

  const mockContext = buildMockAcademyContext({
    isGeral,
    career,
    season,
    tournamentsAcademy,
    academyPlayer: {
      ...academyPlayer,
      annotations: realAnnotations || academyPlayer.annotations || "",
    },
  });

  const countryCode =
    FIFA_COUNTRY_CODES[academyPlayer.nationality?.toUpperCase()];

  return (
    <AcademyContext.Provider value={mockContext}>
      <div
        className={Styles.container}
        style={
          {
            "--club-color": clubColor,
            "--club-color-dark": darkClubColor,
          } as React.CSSProperties
        }
      >
        <FocusedCard
          iconNode={
            countryCode ? (
              <LazyFlag code={countryCode} className={Styles.flag} />
            ) : (
              <span> </span>
            )
          }
          title={academyPlayer.name}
          disableAnimation={true}
          isCollapsible={true}
          isExpanded={isAnnotationsExpanded}
          onToggle={toggleAnnotations}
        >
          <AddPlayerAnnotations />
        </FocusedCard>

        <FocusedCard
          Icon={FaTrophy}
          title={`Desempenho de ${academyPlayer.name}`}
          disableAnimation={true}
          isCollapsible={true}
          isExpanded={isPerformanceExpanded}
          onToggle={togglePerformance}
        >
          <PlayerPerformance />
        </FocusedCard>

        <FocusedCard
          Icon={FaChartLine}
          title={`Desenvolvimento de ${academyPlayer.name}`}
          disableAnimation={true}
          isCollapsible={true}
          isExpanded={isDevelopmentExpanded}
          onToggle={toggleDevelopment}
        >
          <PlayerDevelopment />
        </FocusedCard>
      </div>
    </AcademyContext.Provider>
  );
};

export default AcademyPlayerTab;
