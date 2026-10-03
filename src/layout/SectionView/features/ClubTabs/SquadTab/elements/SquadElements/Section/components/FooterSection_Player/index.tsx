import { useContext } from "react";
import Styles from "./FooterSection_Player.module.css";
import Data from "../../Section.module.css";
import { formatDisplayValue } from "../../../../../../../../../../common/utils/FormatValue";
import { getVisualContract } from "./utils/getVisualContract";
import { Match } from "../../../../../../../../../../common/interfaces/Match";
import { SeasonThemeContext } from "../../../../../../../../../../contexts/SeasonThemeContext";
import { getContinentByCountry } from "../../../../../../../../../../common/services/GetContinentByCountry";

type FooterSection_PlayerProps = {
  playerValue: number;
  salary: number;
  contractTime: number;
  matches: Match[];
  currency?: string;
  careerNation?: string;
  isEuropean?: boolean;
};

const FooterSection_Player = ({
  playerValue,
  salary,
  contractTime,
  matches,
  currency,
  careerNation,
  isEuropean,
}: FooterSection_PlayerProps) => {
  const seasonTheme = useContext(SeasonThemeContext);
  const effectiveNation = careerNation ?? seasonTheme?.career?.nation;
  const isEurope =
    typeof isEuropean === "boolean"
      ? isEuropean
      : effectiveNation
      ? getContinentByCountry(effectiveNation) === "Europa"
      : true;

  return (
    <footer className={Styles.player_contract}>
      <h3 className={Data.data_title}>
        {formatDisplayValue(playerValue, currency)}
      </h3>
      <div className={Styles.player_contract_bottom}>
        <h3 className={Data.data}>{formatDisplayValue(salary, currency)}</h3>
        <div className={Data.data}>
          {getVisualContract(contractTime, matches, isEurope)}
        </div>
      </div>
    </footer>
  );
};

export default FooterSection_Player;
