import { useContext } from "react";
import Styles from "./FooterSection_Player.module.css";
import Data from "../../Section.module.css";
import { formatDisplayValue } from "../../../../../../../../../../common/utils/FormatValue";
import { getVisualContract } from "./utils/getVisualContract";
import { Match } from "../../../../../../../../../../common/interfaces/Match";
import { SeasonThemeContext } from "../../../../../../../../../../contexts/SeasonThemeContext";
import { getContinentByCountry } from "../../../../../../../../../../common/utils/league";

type FooterSection_PlayerProps = {
  playerValue?: number;
  salary?: number;
  contractTime?: number;
  matches?: Match[];
  latestFinishedMatchDate?: string | null;
  currency?: string;
  careerNation?: string;
  isEuropean?: boolean;
  arrivalDate?: string | Date | null;
};

const FooterSection_Player = ({
  playerValue,
  salary,
  contractTime,
  matches,
  latestFinishedMatchDate,
  currency: propCurrency,
  careerNation: propCareerNation,
  isEuropean: propIsEuropean,
  arrivalDate,
}: FooterSection_PlayerProps) => {
  const seasonTheme = useContext(SeasonThemeContext);
  const effectiveCurrency = propCurrency ?? seasonTheme?.career?.currency;
  const effectiveNation = propCareerNation ?? seasonTheme?.career?.nation;
  const isEurope =
    typeof propIsEuropean === "boolean"
      ? propIsEuropean
      : effectiveNation
      ? getContinentByCountry(effectiveNation) === "Europa"
      : true;

  if (!playerValue && !salary && !contractTime) {
    return null;
  }

  const matchSource = matches ?? latestFinishedMatchDate ?? null;

  return (
    <footer className={Styles.player_contract}>
      <h3 className={Data.data_title}>
        {playerValue !== undefined ? formatDisplayValue(playerValue, effectiveCurrency) : ""}
      </h3>
      <div className={Styles.player_contract_bottom}>
        <h3 className={Data.data}>
          {salary !== undefined ? formatDisplayValue(salary, effectiveCurrency) : ""}
        </h3>
        <div className={Data.data}>
          {contractTime !== undefined
            ? getVisualContract(contractTime, matchSource, isEurope, arrivalDate)
            : ""}
        </div>
      </div>
    </footer>
  );
};

export default FooterSection_Player;
