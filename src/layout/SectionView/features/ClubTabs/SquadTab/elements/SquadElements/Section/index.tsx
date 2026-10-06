import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import FooterSection_Player from "./components/FooterSection_Player";
import HeaderSection_Player from "./components/HeaderSection_Player";
import Data from "./Section.module.css";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { PlayerModal } from "./ui/PlayerModal";
import { SectionScreen } from "../../../../../../config/screens";

type SectionProps = {
  id: string;
  name: string;
  position: string;
  shirtNumber: string;
  age: number;
  nation: string;
  playerValue: number;
  salary: number;
  captain: boolean;
  contractTime: number;
  matches: Match[];
  loan?: boolean;
  incomingLoan?: boolean;
  contract?: Contract[];
  currency?: string;
  isAcademy?: boolean;
  academyNickname?: string;
  careerId?: string;
  groupId?: string;
  careerNation?: string;
  isEuropean?: boolean;
  onOpenScreen?: (screen: SectionScreen) => void;
};

export const Section = ({
  id,
  age,
  name,
  nation,
  position,
  shirtNumber,
  salary,
  playerValue,
  captain,
  contractTime,
  matches,
  loan,
  incomingLoan,
  contract,
  currency,
  isAcademy,
  academyNickname,
  careerId: propsCareerId,
  groupId: propsGroupId,
  careerNation,
  isEuropean,
  onOpenScreen,
}: SectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { careerId: paramsCareerId, groupId: paramsGroupId } = useParams<{
    careerId?: string;
    groupId?: string;
  }>();

  const finalCareerId = propsCareerId || paramsCareerId;
  const finalGroupId = propsGroupId || paramsGroupId;
  const isGroup = location.pathname.includes("/CareerGroup");

  const handleNavigate = () => {
    if (!location.pathname.includes("/Geral")) {
      setIsModalOpen(true);
      return;
    }
    if (isGroup && finalGroupId && finalCareerId) {
      navigate(
        `/Career/${finalCareerId}/Geral/Player/${id}?fromGroup=true&groupId=${finalGroupId}`,
      );
      return;
    }
    if (finalCareerId) {
      navigate(`/Career/${finalCareerId}/Geral/Player/${id}`);
    }
  };

  let displaySalary = salary;

  if (loan && contract && contract.length > 0) {
    const lastContract = contract[contract.length - 1];

    if (lastContract.isLoan && lastContract.wagePercentage !== undefined) {
      displaySalary = salary * ((100 - lastContract.wagePercentage) / 100);
    }
  }

  const finalNickname = isAcademy ? academyNickname : undefined;

  return (
    <>
      <section className={Data.player} onClick={handleNavigate}>
        <HeaderSection_Player
          age={age}
          name={name}
          nation={nation}
          position={position}
          shirtNumber={shirtNumber}
          captain={captain}
          isAcademy={isAcademy}
          nickname={finalNickname}
        />

        <FooterSection_Player
          contractTime={contractTime}
          salary={displaySalary}
          playerValue={playerValue}
          matches={matches}
          currency={currency}
          careerNation={careerNation}
          isEuropean={isEuropean}
        />
      </section>

      {isModalOpen && (
        <PlayerModal
          id={id}
          playerName={name}
          incomingLoan={incomingLoan}
          loan={loan}
          onClose={() => setIsModalOpen(false)}
          onOpenScreen={onOpenScreen}
        />
      )}
    </>
  );
};
