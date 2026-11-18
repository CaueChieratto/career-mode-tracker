import { Career } from "../../../../common/interfaces/Career";
import ContainerButton from "../../../../components/ContainerButton";
import SummarySection from "./components/SummarySection";
import Card from "../../../../ui/Card";
import DataInCard from "./ui/DataInCard";
import Styles from "./CareerCard.module.css";
import { CareerCardButtons } from "./components/CareerCardButtons";
import { ClubNameInCard } from "./ui/ClubNameInCard";
import { useCareerPage } from "../../contexts/CareerPageContext";

interface CareerCardProps {
  career: Career;
  isGroupItem?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const CareerCard = ({
  career,
  isGroupItem,
  isExpanded,
  onToggleExpand,
}: CareerCardProps) => {
  const { buttons, onOpenModal, setSelectedCareer } = useCareerPage();

  const content = (
    <div
      className={`${Styles.card_container} ${isGroupItem ? Styles.group_container : ""}`}
    >
      <ClubNameInCard
        selectedCareer={career}
        clubName={career.clubName}
        colorsTeams={career.colorsTeams}
        managerName={career.managerName}
        teamBadge={career.teamBadge}
        isGroupItem={isGroupItem}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />

      {(!isGroupItem || isExpanded) && (
        <div className={Styles.expandableBody}>
          <SummarySection career={career} />
          <footer className={Styles.footer}>
            <DataInCard createdAt={career.createdAt} />
            <ContainerButton>
              {buttons.map((button, i) => (
                <CareerCardButtons
                  key={i}
                  career={career}
                  setSelectedCareer={setSelectedCareer}
                  onOpenModal={onOpenModal}
                  button={button}
                />
              ))}
            </ContainerButton>
          </footer>
        </div>
      )}
    </div>
  );

  return isGroupItem ? (
    content
  ) : (
    <Card
      setSelectedCareer={setSelectedCareer}
      selectedCareer={career}
      onOpenModal={onOpenModal}
    >
      {content}
    </Card>
  );
};

export default CareerCard;
