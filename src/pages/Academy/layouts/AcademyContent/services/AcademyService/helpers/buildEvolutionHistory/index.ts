import { v4 as uuidv4 } from "uuid";
import { AcademyPlayersHistory } from "../../../../../../../../common/interfaces/AcademyData";

export const buildEvolutionHistory = (
  date: string,
  description: string,
  oldValue: string,
  newValue: string,
  changedAttribute: string = "status",
): AcademyPlayersHistory => {
  return {
    id: uuidv4(),
    date,
    description,
    changedAttribute,
    oldValue,
    newValue,
  };
};
