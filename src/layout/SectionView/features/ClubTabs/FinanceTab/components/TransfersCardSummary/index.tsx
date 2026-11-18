import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import Load from "../../../../../../../components/Load";
import { Career } from "../../../../../../../common/interfaces/Career";
import TransferInfo from "./components/TransferInfo";
import { useTransferData } from "./hooks/UseTransferData";
import {
  SectionSummaryCard,
  SectionSummaryGrid,
} from "../../../../../ui/SectionSummaryCard";

type TransfersCardSummaryProps = {
  season: ClubData;
  career: Career;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
};

const TransfersCardSummary = ({
  season,
  career,
  onOpenTransfers,
}: TransfersCardSummaryProps) => {
  const { arrivals, departures } = useTransferData(career, season);

  if (!career) {
    return <Load />;
  }

  const content = [
    {
      info: "Chegadas",
      color: "#c81419",
      players: arrivals.map((p) => p.name),
      onClick: () => onOpenTransfers?.("arrivals"),
    },
    {
      info: "Saídas",
      color: "#0bb32a",
      players: departures.map((p) => p.name),
      onClick: () => onOpenTransfers?.("exit"),
    },
  ];

  return (
    <SectionSummaryCard title="Transferências">
      <SectionSummaryGrid>
        {content.map((item) => (
          <TransferInfo
            key={item.info}
            title={item.info}
            color={item.color}
            players={item.players}
            onClick={item.onClick}
          />
        ))}
      </SectionSummaryGrid>
    </SectionSummaryCard>
  );
};

export default TransfersCardSummary;
