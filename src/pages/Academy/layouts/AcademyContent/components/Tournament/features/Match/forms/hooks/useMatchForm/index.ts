import { useState } from "react";
import { MatchFormTexts } from "../../types/MatchFormTexts";
import { getMatchFormRows } from "../../utils/getMatchFormRows";
import { useAsyncForm } from "../../../../../../../hooks/useAsyncForm";
import { AcademyMatches } from "../../../../../../../../../../../common/interfaces/AcademyData";
import { MatchDataPayload } from "../../types/MatchDataPayload";

type UseMatchFormProps = {
  texts: MatchFormTexts;
  teamOptions: string[];
  statusOptions: string[];
  onSubmitData: (data: MatchDataPayload) => Promise<void>;
  initialData?: Partial<AcademyMatches>;
};

export const useMatchForm = ({
  texts,
  teamOptions,
  statusOptions,
  onSubmitData,
  initialData,
}: UseMatchFormProps) => {
  const [opponentTeam, setOpponentTeam] = useState(
    initialData?.opponentTeam || "",
  );

  const [status, setStatus] = useState(initialData?.status || "");

  const parseMatchData = (formData: FormData): MatchDataPayload => {
    return {
      date: (formData.get("date") as string) || "",
      opponentTeam: opponentTeam,
      status: status,
    };
  };

  const { isLoading, submit } = useAsyncForm<MatchDataPayload>(
    onSubmitData,
    parseMatchData,
  );

  const formRows = getMatchFormRows({
    texts,
    teamOptions: teamOptions.filter((t) =>
      t.toLowerCase().includes(opponentTeam.toLowerCase()),
    ),
    statusOptions: statusOptions.filter((s) =>
      s.toLowerCase().includes(status.toLowerCase()),
    ),
    opponentTeam,
    setOpponentTeam,
    status,
    setStatus,
    initialData,
  });

  return { isLoading, submit, formRows, opponentTeam, status };
};
