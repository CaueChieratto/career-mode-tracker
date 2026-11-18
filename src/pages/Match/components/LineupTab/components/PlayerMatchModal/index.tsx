import Modal from "../../../../../../components/Modal";
import SlideUpModal from "../../../../../../ui/modals/SlideUpModal";
import { Match } from "../../../../../../common/interfaces/Match";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { RatingBadge } from "../../../../../../components/RatingBadge";
import { FiClock } from "react-icons/fi";
import Styles from "./PlayerMatchModal.module.css";
import { PlayerCircle } from "../../../../../../components/PlayerCircle";
import React from "react";

type PlayerMatchModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  match: Match;
  player?: Players | null;
  playerId?: string | null;
};

type StatItem = {
  label: string;
  value: string | number;
  isRating?: boolean;
  hasInfo?: boolean;
};

type StatCategory = {
  title: string;
  stats: StatItem[];
};

export const PlayerMatchModal = ({
  isOpen,
  closeModal,
  match,
  player,
  playerId,
}: PlayerMatchModalProps) => {
  const activePlayerId = player?.id || playerId;
  const playerName = player?.name || "Jogador";
  const shirtNumber = player?.shirtNumber || 10;
  const pStat = match.playerStats?.find(
    (stat) => stat.playerId === activePlayerId,
  );
  const rating = pStat?.rating || "-";
  const minutes = pStat?.minutesPlayed || "-";

  const matchStats: StatCategory[] = [
    {
      title: "Geral",
      stats: [
        {
          label: "Participação em gols (G/A)",
          value: (pStat?.goals || 0) + (pStat?.assists || 0),
        },
        { label: "Gols", value: pStat?.goals || 0 },
        { label: "Assistências", value: pStat?.assists || 0 },
        { label: "Defesas (GOL)", value: pStat?.defenses || 0 },
      ],
    },
    {
      title: "Ataque",
      stats: [
        { label: "Finalizações", value: pStat?.totalFinishings || 0 },
        {
          label: "Finalizações certas",
          value: (pStat?.totalFinishings || 0) - (pStat?.finishingsMissed || 0),
        },
        { label: "Finalizações erradas", value: pStat?.finishingsMissed || 0 },
      ],
    },
    {
      title: "Distribuição",
      stats: [
        { label: "Passes", value: pStat?.totalPasses || 0 },
        {
          label: "Passes certos",
          value: (pStat?.totalPasses || 0) - (pStat?.passesMissed || 0),
        },
        { label: "Passes errados", value: pStat?.passesMissed || 0 },
        {
          label: "Passes decisivos",
          value: pStat?.keyPasses || 0,
          hasInfo: true,
        },
        { label: "Conduções", value: pStat?.totalDribbles || 0 },
        {
          label: "Conduções certas",
          value: (pStat?.totalDribbles || 0) - (pStat?.dribblesMissed || 0),
        },
        { label: "Conduções erradas", value: pStat?.dribblesMissed || 0 },
      ],
    },
    {
      title: "Defesa",
      stats: [
        { label: "Bolas recuperadas", value: pStat?.ballsRecovered || 0 },
        { label: "Bolas perdidas", value: pStat?.ballsLost || 0 },
      ],
    },
    {
      title: "Disciplina & Presença",
      stats: [
        {
          label: "Distância total",
          value: pStat?.distanceKm
            ? `${pStat.distanceKm.toFixed(1)}km`
            : "0.0km",
        },
        { label: "Cartões amarelos", value: pStat?.yellowCard ? 1 : 0 },
        { label: "Cartões vermelhos", value: pStat?.redCard ? 1 : 0 },
        { label: "Gols contra", value: pStat?.ownGoals || 0 },
      ],
    },
  ];

  return (
    <Modal text="" isOpen={isOpen} closeModal={closeModal} slideUp>
      <SlideUpModal>
        <div className={Styles.playerHeader}>
          <PlayerCircle shirtNumber={shirtNumber} />
          <div className={Styles.playerInfo}>
            <span className={Styles.playerName}>{playerName}</span>
            {rating !== "-" && (
              <RatingBadge
                rating={Number(rating)}
                displayValue={Number(rating).toFixed(1)}
              />
            )}
          </div>
        </div>
        <div className={Styles.matchHeader}>
          <div className={Styles.matchTitle}>
            {match.homeTeam} {match.homeScore ?? 0} - {match.awayScore ?? 0}{" "}
            {match.awayTeam}
          </div>
          <div className={Styles.matchDate}>{match.date || "15 de jun."}</div>
        </div>
        <div className={Styles.minutesRow}>
          <div className={Styles.minutesLabel}>
            <FiClock size={18} />
            <span>Minutos jogados</span>
          </div>
          <span className={Styles.minutesValue}>{minutes}'</span>
        </div>
        <div className={Styles.divider}></div>
        <div className={Styles.statsList}>
          {matchStats.map((category, index) => (
            <React.Fragment key={category.title}>
              <div
                className={Styles.statsHeader}
                style={
                  index > 0
                    ? { marginTop: "24px", marginBottom: "12px" }
                    : { marginBottom: "12px" }
                }
              >
                <span className={Styles.statsTitle}>{category.title}</span>
              </div>
              {category.stats.map((stat, idx) => (
                <div
                  className={Styles.statRow}
                  key={`${category.title}-${idx}`}
                >
                  <div className={Styles.statLabel}>{stat.label}</div>
                  <div className={Styles.statValue}>
                    {stat.isRating && stat.value !== "-" ? (
                      <RatingBadge
                        rating={Number(stat.value)}
                        displayValue={Number(stat.value).toFixed(1)}
                      />
                    ) : (
                      stat.value
                    )}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </SlideUpModal>
    </Modal>
  );
};
