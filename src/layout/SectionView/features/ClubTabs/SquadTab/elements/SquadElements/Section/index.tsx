import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import FooterSection_Player from "./components/FooterSection_Player";
import HeaderSection_Player from "./components/HeaderSection_Player";
import Data from "./Section.module.css";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { PlayerModal } from "./ui/PlayerModal";
import { SectionScreen } from "../../../../../../config/screens";
import { calculatePlayerAge } from "../../../../../../../../common/utils/calculatePlayerAge";

export type SectionProps = {
  player?: Players;
  latestFinishedMatchDate?: string | null;
  onOpenScreen?: (screen: SectionScreen) => void;
  careerCreatedAt?: Date | string | null;
  seasonNumber?: number;
  id?: string;
  name?: string;
  position?: string;
  shirtNumber?: string;
  age?: number;
  nation?: string;
  playerValue?: number;
  salary?: number;
  captain?: boolean;
  contractTime?: number;
  matches?: Match[];
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
  sell?: boolean;
};

export const Section = ({
  player,
  latestFinishedMatchDate,
  onOpenScreen,
  id: propId,
  age: propAge,
  name: propName,
  nation: propNation,
  position: propPosition,
  shirtNumber: propShirtNumber,
  salary: propSalary,
  playerValue: propPlayerValue,
  captain: propCaptain,
  contractTime: propContractTime,
  matches,
  loan: propLoan,
  incomingLoan: propIncomingLoan,
  contract: propContract,
  currency,
  isAcademy: propIsAcademy,
  academyNickname: propAcademyNickname,
  careerId: propsCareerId,
  groupId: propsGroupId,
  careerNation,
  isEuropean,
  sell: propSell,
  careerCreatedAt,
  seasonNumber,
}: SectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const location = useLocation();

  const { careerId: paramsCareerId, groupId: paramsGroupId } = useParams<{
    careerId?: string;
    groupId?: string;
  }>();

  const p = player;
  const id = p?.id ?? propId ?? "";
  const name = p?.name ?? propName ?? "";
  const calculatedAge = p?.birthDate
    ? calculatePlayerAge(
        p.birthDate,
        careerCreatedAt,
        seasonNumber,
        careerNation,
        matches,
      )
    : 0;
  const age = calculatedAge > 0 ? calculatedAge : (p?.age ?? propAge ?? 0);
  const nation = p?.nation ?? propNation ?? "";
  const position = (p?.position as string) ?? propPosition ?? "";
  const shirtNumber = p?.shirtNumber ?? propShirtNumber ?? "";
  const salary = p?.salary ?? propSalary;
  const playerValue = p?.playerValue ?? propPlayerValue;
  const captain = Boolean(p?.captain ?? propCaptain);
  const contractTime = p?.contractTime ?? propContractTime;
  const loan = Boolean(p?.loan ?? propLoan);
  const incomingLoan = Boolean(p?.incomingLoan ?? propIncomingLoan);
  const contract = p?.contract ?? propContract;
  const isAcademy = Boolean(p?.isAcademy ?? propIsAcademy);
  const sell = Boolean(p?.sell ?? propSell);
  const academyNickname = p?.academyNickname ?? propAcademyNickname;

  const finalCareerId = propsCareerId || paramsCareerId;
  const finalGroupId = propsGroupId || paramsGroupId;
  const isGroup = location.pathname.includes("/CareerGroup");

  const handleNavigate = () => {
    if (!location.pathname.includes("/Geral")) {
      setIsModalOpen(true);
      return;
    }
    if (onOpenScreen && finalCareerId) {
      onOpenScreen({
        key: "player",
        playerId: id,
        careerId: finalCareerId,
        isNotSeason: true,
        isFromGroup: isGroup,
        groupId: isGroup ? finalGroupId : undefined,
      });
    }
  };

  let displaySalary = salary;

  if (loan && contract && contract.length > 0 && salary !== undefined) {
    const lastContract = contract[contract.length - 1];

    if (lastContract.isLoan && lastContract.wagePercentage !== undefined) {
      displaySalary = salary * ((100 - lastContract.wagePercentage) / 100);
    }
  }

  const lastContract =
    contract && contract.length > 0
      ? contract[contract.length - 1]
      : undefined;

  const resolvedContractTime =
    contractTime !== undefined && contractTime > 0
      ? contractTime
      : incomingLoan && (lastContract?.loanDuration || lastContract?.contractTime)
      ? Number(lastContract?.loanDuration || lastContract?.contractTime)
      : contractTime;

  const arrivalDate = incomingLoan ? lastContract?.dataArrival : undefined;

  const finalNickname = isAcademy ? academyNickname : undefined;
  const hasContractData =
    (playerValue !== undefined && playerValue > 0) ||
    (salary !== undefined && salary > 0) ||
    (resolvedContractTime !== undefined && resolvedContractTime > 0) ||
    (contract && contract.length > 0);

  return (
    <>
      <section
        id={id ? `player-row-${id}` : undefined}
        data-player-id={id || undefined}
        data-player-name={name || undefined}
        className={Data.player}
        onClick={handleNavigate}
      >
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

        {hasContractData && (
          <FooterSection_Player
            contractTime={resolvedContractTime}
            arrivalDate={arrivalDate}
            salary={displaySalary}
            playerValue={playerValue}
            matches={matches}
            latestFinishedMatchDate={latestFinishedMatchDate}
            currency={currency}
            careerNation={careerNation}
            isEuropean={isEuropean}
          />
        )}
      </section>

      {isModalOpen && (
        <PlayerModal
          player={player}
          id={id}
          playerName={name}
          incomingLoan={incomingLoan}
          loan={loan}
          sell={sell}
          contract={contract}
          onClose={() => setIsModalOpen(false)}
          onOpenScreen={onOpenScreen}
        />
      )}
    </>
  );
};
