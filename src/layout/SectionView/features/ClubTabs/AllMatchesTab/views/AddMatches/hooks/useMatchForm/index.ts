import { useEffect, useMemo, useRef, useState } from "react";
import { getMatchFormFields } from "../../constants/MatchFormFields";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { useAddMatchesContext } from "../../contexts/context";
import { ServiceMatches } from "../../services/ServiceMatches";

export function useMatchForm() {
  const {
    matchesId,
    season,
    career,
    formValues,
    setFormValues,
    booleanValues,
    handleBooleanChange,
  } = useAddMatchesContext();

  const initializedMatchId = useRef<string | null>(null);
  const lastVenueDirection = useRef<"Casa" | "Fora">("Casa");
  const prevVenueRef = useRef<string>(formValues.matchVenue || "Casa");

  const savedMonth = useMemo(() => {
    if (!season) return "Tudo";
    return localStorage.getItem(`matchSelectedMonth_${season.id}`) || "Tudo";
  }, [season]);

  useEffect(() => {
    if (!matchesId || !season || !career) return;

    if (initializedMatchId.current === matchesId) return;

    const matchToEdit = season.matches?.find((m) => m.matchesId === matchesId);
    if (!matchToEdit) return;

    let initialVenue = "Casa";
    let initialNeutralHost = "Meu clube";
    if (matchToEdit.isNeutral) {
      initialVenue = "Neutro";
      const isUserHome = matchToEdit.homeTeam === career.clubName;
      initialNeutralHost = isUserHome ? "Meu clube" : "Adversário";
      lastVenueDirection.current = isUserHome ? "Casa" : "Fora";
    } else if (matchToEdit.homeTeam === career.clubName) {
      initialVenue = "Casa";
      lastVenueDirection.current = "Casa";
    } else {
      initialVenue = "Fora";
      lastVenueDirection.current = "Fora";
    }

    const opponentTeam =
      matchToEdit.homeTeam === career.clubName
        ? matchToEdit.awayTeam
        : matchToEdit.homeTeam;

    const isKnockout = !!matchToEdit.isKnockout || !!matchToEdit.stage;
    const isReturnMatch = !!matchToEdit.isReturnMatch;

    let initialDate = matchToEdit.date.substring(0, 5);
    if (savedMonth !== "Tudo") {
      initialDate = initialDate.substring(0, 2);
    }

    setFormValues({
      date: initialDate,
      league: matchToEdit.league,
      opponentTeam,
      matchVenue: initialVenue,
      neutralHost: initialNeutralHost,
      stadium: matchToEdit.stadium || "",
      stage: matchToEdit.stage || "",
    });

    handleBooleanChange("isHomeMatch", initialVenue === "Casa");
    handleBooleanChange("isKnockout", isKnockout);
    handleBooleanChange("isReturnMatch", isReturnMatch);

    prevVenueRef.current = initialVenue;
    initializedMatchId.current = matchesId;
  }, [
    matchesId,
    season,
    career,
    setFormValues,
    handleBooleanChange,
    savedMonth,
  ]);

  useEffect(() => {
    const currentVenue = formValues.matchVenue || "Casa";
    const prevVenue = prevVenueRef.current;

    if (currentVenue === "Casa") {
      lastVenueDirection.current = "Casa";
    } else if (currentVenue === "Fora") {
      lastVenueDirection.current = "Fora";
    } else if (currentVenue === "Neutro" && prevVenue !== "Neutro") {
      const inheritedHost =
        lastVenueDirection.current === "Fora" ? "Adversário" : "Meu clube";
      setFormValues((prev) => ({
        ...prev,
        neutralHost: inheritedHost,
      }));
    }

    prevVenueRef.current = currentVenue;
  }, [formValues.matchVenue, setFormValues]);

  const leagueOptions = useMemo(
    () => season?.leagues?.map((l) => l.name) ?? [],
    [season],
  );

  const [persistedStadiums, setPersistedStadiums] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    if (!career?.id) return;

    const fetchStadiums = async () => {
      try {
        const stadiums = await ServiceMatches.getStadiumsByCareerOrGroup(
          career.id,
          career.groupId,
        );
        if (isActive) {
          setPersistedStadiums(stadiums);
        }
      } catch (error) {
        console.error("Erro ao buscar estádios:", error);
      }
    };

    void fetchStadiums();

    return () => {
      isActive = false;
    };
  }, [career?.id, career?.groupId]);

  const stadiumOptions = useMemo(() => {
    const stadiumsSet = new Set<string>();

    career?.stadiums?.forEach((s) => {
      if (s?.trim()) stadiumsSet.add(s.trim());
    });

    career?.clubData?.forEach((seasonData) => {
      seasonData.matches?.forEach((m) => {
        if (m.stadium?.trim()) stadiumsSet.add(m.stadium.trim());
      });
    });

    persistedStadiums.forEach((s) => {
      if (s?.trim()) stadiumsSet.add(s.trim());
    });

    const stadiumSearch = (formValues.stadium ?? "").trim().toLowerCase();

    return Array.from(stadiumsSet)
      .filter((s) => !stadiumSearch || s.toLowerCase().includes(stadiumSearch))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [career?.stadiums, career?.clubData, persistedStadiums, formValues.stadium]);

  const stageOptions = useMemo(() => {
    const defaultStages = [
      "Playoffs",
      "Oitavas de Final",
      "Quartas de Final",
      "Semifinal",
      "Final",
    ];
    const stagesSet = new Set<string>(defaultStages);

    career?.stages?.forEach((s) => {
      if (s?.trim()) stagesSet.add(s.trim());
    });

    career?.clubData?.forEach((seasonData) => {
      seasonData.matches?.forEach((m) => {
        if (m.stage?.trim()) stagesSet.add(m.stage.trim());
      });
    });

    const stageSearch = (formValues.stage ?? "").trim().toLowerCase();

    return Array.from(stagesSet)
      .filter((s) => !stageSearch || s.toLowerCase().includes(stageSearch))
      .sort((a, b) => {
        const aIndex = defaultStages.indexOf(a);
        const bIndex = defaultStages.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b, "pt-BR");
      });
  }, [career?.stages, career?.clubData, formValues.stage]);

  const localTeams = useMemo<Teams[]>(() => {
    const teamMap = new Map<string, Teams>();

    career?.clubData?.forEach((seasonData) => {
      seasonData.teams?.forEach((team) => {
        if (team.showMatch === false || !team.name) return;

        const normalizedName = team.name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

        const key = `${normalizedName}-${team.leagueName ?? ""}`;

        if (!teamMap.has(key)) {
          teamMap.set(key, team);
        }
      });
    });

    return Array.from(teamMap.values());
  }, [career?.clubData]);

  const [globalTeamNames, setGlobalTeamNames] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    const fetchAllTeamsData = async () => {
      try {
        const globalTeams = await ServiceMatches.getAllTeamsAcrossUserCareers();

        if (isActive) {
          setGlobalTeamNames(globalTeams);
        }
      } catch (error) {
        console.error("Erro ao buscar times globais:", error);
      }
    };

    void fetchAllTeamsData();

    return () => {
      isActive = false;
    };
  }, []);

  const teamOptions = useMemo(() => {
    const localTeamNames = localTeams
      .filter(
        (team) => !formValues.league || team.leagueName === formValues.league,
      )
      .map((team) => team.name);

    const availableNames = formValues.league
      ? localTeamNames
      : [...localTeamNames, ...globalTeamNames];

    const searchValue = (formValues.opponentTeam ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    const uniqueTeams = new Map<string, string>();

    availableNames.forEach((teamName) => {
      const normalizedName = teamName.trim().toLowerCase().replace(/\s+/g, "");

      if (!normalizedName) return;
      if (searchValue && !normalizedName.includes(searchValue)) return;

      if (!uniqueTeams.has(normalizedName)) {
        uniqueTeams.set(normalizedName, teamName);
      }
    });

    return Array.from(uniqueTeams.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [localTeams, globalTeamNames, formValues.league, formValues.opponentTeam]);

  const currentVenue = formValues.matchVenue || "Casa";
  const isKnockout = booleanValues.isKnockout ?? false;

  const matchToEdit = useMemo(
    () => season?.matches?.find((m) => m.matchesId === matchesId),
    [season?.matches, matchesId],
  );

  const isPriorKnockoutMatchPresent = useMemo(() => {
    if (
      !isKnockout ||
      !formValues.league ||
      !formValues.opponentTeam ||
      !season?.matches
    ) {
      return false;
    }
    const currentOpponent = formValues.opponentTeam.trim().toLowerCase();
    const currentLeague = formValues.league.trim().toLowerCase();

    return season.matches.some((m) => {
      if (m.matchesId === matchesId) return false;
      if (m.league?.trim().toLowerCase() !== currentLeague) return false;
      const mIsHome = m.homeTeam === career?.clubName;
      const mOpponent = (mIsHome ? m.awayTeam : m.homeTeam).trim().toLowerCase();
      if (mOpponent !== currentOpponent) return false;
      return !!m.isKnockout || !!m.stage;
    });
  }, [
    isKnockout,
    formValues.league,
    formValues.opponentTeam,
    season?.matches,
    matchesId,
    career?.clubName,
  ]);

  const showReturnMatch =
    isKnockout && (isPriorKnockoutMatchPresent || !!matchToEdit?.isReturnMatch);

  const formFields = useMemo(
    () =>
      getMatchFormFields(
        leagueOptions,
        savedMonth,
        teamOptions,
        stadiumOptions,
        stageOptions,
        currentVenue,
        isKnockout,
        showReturnMatch,
      ),
    [
      leagueOptions,
      savedMonth,
      teamOptions,
      stadiumOptions,
      stageOptions,
      currentVenue,
      isKnockout,
      showReturnMatch,
    ],
  );

  return { formFields };
}
