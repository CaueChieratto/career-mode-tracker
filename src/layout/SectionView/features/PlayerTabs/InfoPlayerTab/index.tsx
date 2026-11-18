import ContractInfoSection from "./components/ContractInfoSection";
import PlayerInfoSection from "./components/PlayerInfoSection";
import PlayerNotFound from "./components/PlayerNotFound";
import ProfitInfoSection from "./components/ProfitInfoSection";
import TransactionInfoSection from "./components/TransactionInfoSection";
import { usePlayerInfo } from "./hooks/usePlayerInfo";
import { Career } from "../../../../../common/interfaces/Career";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { usePlayerGroupStatsContext } from "../../../../../contexts/PlayerGroupStatsContext";
import React, { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

type InfoPlayerTabProps = {
  player?: Players;
  career: Career;
  season?: ClubData;
  notSeason?: boolean;
};

const InfoPlayerTab: React.FC<InfoPlayerTabProps> = ({
  player: propPlayer,
  career,
  season: propSeason,
  notSeason: propNotSeason,
}) => {
  const location = useLocation();
  const groupStatsCtx = usePlayerGroupStatsContext();
  const { seasonId: paramSeasonId } = useParams<{ seasonId?: string }>();
  const effectiveSeasonId = propSeason?.id ?? paramSeasonId;
  const isNotSeason =
    groupStatsCtx?.isGeralPage ??
    propNotSeason ??
    (location.pathname.includes("/Geral") || !effectiveSeasonId);

  const player = useMemo(() => {
    if (isNotSeason || !effectiveSeasonId || !career || !propPlayer)
      return propPlayer;
    const season = career.clubData.find((s) => s.id === effectiveSeasonId);
    if (!season) return propPlayer;
    return season.players.find((p) => p.id === propPlayer.id) || propPlayer;
  }, [propPlayer, career, effectiveSeasonId, isNotSeason]);

  const { transactions, getPlayerAgeForTransaction } = usePlayerInfo(
    player,
    career,
    effectiveSeasonId,
    isNotSeason,
  );
  const currency = career.currency;

  if (!player) {
    return <PlayerNotFound />;
  }

  const hasExitInCurrentView = transactions.some((t) => t.hasBeenSold);

  const showDefaultCards = isNotSeason ? !player.sell : !hasExitInCurrentView;

  return (
    <>
      {showDefaultCards && (
        <>
          <PlayerInfoSection player={player} />
          <ContractInfoSection player={player} currency={currency} />
        </>
      )}
      {transactions.map((transaction, index) => (
        <React.Fragment key={`trans-${index}`}>
          {transaction.hasBeenBought && (
            <TransactionInfoSection
              title={transaction.arrivalTitle}
              clubLabel="Clube anterior"
              club={transaction.fromClub || ""}
              valueLabel={transaction.arrivalValueLabel}
              value={transaction.arrivalValueDisplay}
              ageLabel="Idade na chegada"
              age={
                getPlayerAgeForTransaction(transaction.dataArrival || null) ??
                player.age
              }
              dateLabel="Data da chegada"
              date={transaction.dataArrival || null}
              color="#c81419ff"
              currency={currency}
            />
          )}
          {transaction.hasBeenSold && (
            <TransactionInfoSection
              title={transaction.exitTitle}
              clubLabel="Clube destino"
              club={transaction.leftClub || ""}
              valueLabel={transaction.exitValueLabel}
              value={transaction.exitValueDisplay}
              ageLabel="Idade na saída"
              age={
                getPlayerAgeForTransaction(transaction.dataExit || null) ??
                player.age
              }
              dateLabel="Data da saída"
              date={transaction.dataExit || null}
              color="#0bb32aff"
              currency={currency}
            />
          )}
          {transaction.numericSellValue > 0 && (
            <ProfitInfoSection
              buyValue={transaction.numericBuyValue}
              sellValue={transaction.numericSellValue}
              currency={currency}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export default InfoPlayerTab;
