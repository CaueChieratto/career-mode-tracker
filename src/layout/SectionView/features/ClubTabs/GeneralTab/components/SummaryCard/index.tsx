import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import SummaryItem from "./components/SummaryItem";
import { BsCalendar4 } from "react-icons/bs";
import { FaMoneyBillWave, FaHandHoldingUsd } from "react-icons/fa";
import { FaUserGroup } from "react-icons/fa6";
import { useSummaryData } from "./hooks/UseSummaryData";
import { Career } from "../../../../../../../common/interfaces/Career";
import {
  SectionSummaryCard,
  SectionSummaryGrid,
} from "../../../../../ui/SectionSummaryCard";

type SummaryCardProps = {
  season: ClubData;
  career: Career;
};

const iconMap: { [key: string]: React.ReactNode } = {
  "Total de jogadores": <FaUserGroup />,
  "Média de idade": <BsCalendar4 />,
  "Salários Semanais": <FaMoneyBillWave />,
  "Valor do plantel": <FaHandHoldingUsd />,
};

const SummaryCard = ({ season, career }: SummaryCardProps) => {
  const { content } = useSummaryData(season, career);

  return (
    <SectionSummaryCard title="Resumo da equipe">
      <SectionSummaryGrid>
        {content.map((item) => (
          <SummaryItem
            key={item.info}
            info={item.info}
            number={item.number}
            icon={iconMap[item.info]}
          />
        ))}
      </SectionSummaryGrid>
    </SectionSummaryCard>
  );
};

export default SummaryCard;
