import { useState, useCallback } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { ColorsService } from "../../../../../../common/services/ColorsService";
import { swipeClubColors } from "../../helper/swipeClubColors";

type UseClubColorProps = {
  selectedCareer: Career;
  colorsTeams: string[];
};

export const useClubColor = ({
  selectedCareer,
  colorsTeams,
}: UseClubColorProps) => {
  const primaryClubColor = colorsTeams?.[0] ?? "#ffffff";
  const secondaryClubColor = colorsTeams?.[1] ?? "#000000";

  const [colorDefault, setColor] = useState<string>(
    () => ColorsService.getColorSaved(selectedCareer.id) || primaryClubColor,
  );

  const toggleColor = useCallback(() => {
    swipeClubColors({
      colorDefault,
      primaryClubColor,
      secondaryClubColor,
      setColor,
      selectedCareer,
    });
  }, [colorDefault, primaryClubColor, secondaryClubColor, selectedCareer]);

  return { colorDefault, toggleColor };
};
