import { FaTrophy } from "react-icons/fa";
import { HiPencilSquare, HiTrash } from "react-icons/hi2";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { formatDisplayValue } from "../../../../../../../../../common/utils/FormatValue";
import Styles from "./TransferBonusCardList.module.css";

type TransferBonusCardListProps = {
  bonuses: TransferBonus[];
  clubColor: string;
  currency?: string;
  editingIndex: number | null;
  onEditBonus: (index: number) => void;
  onDeleteBonus: (index: number) => void;
};

export const TransferBonusCardList = ({
  bonuses,
  clubColor,
  currency = "EUR",
  editingIndex,
  onEditBonus,
  onDeleteBonus,
}: TransferBonusCardListProps) => {
  if (!bonuses || bonuses.length === 0) {
    return null;
  }

  return (
    <div className={Styles.container}>
      {bonuses.map((bonus, index) => {
        if (editingIndex === index) {
          return null;
        }

        const isEditingThis = editingIndex === index;
        const isPerformance =
          bonus.bonusCategory === "Desempenho" || bonus.category === "performance";
        const countVal = bonus.targetCount ?? bonus.metricTarget;
        const baseObjective =
          bonus.bonusTarget || bonus.name || bonus.description || "Objetivo";
        const targetText =
          isPerformance && countVal ? `${countVal} ${baseObjective}` : baseObjective;

        return (
          <div
            key={bonus.id || index}
            className={`${Styles.bonus_card} ${
              isEditingThis ? Styles.editing : ""
            }`}
          >
            <div className={Styles.header}>
              <div className={Styles.category_title}>
                <FaTrophy className={Styles.trophy_icon} />
                <span>
                  {bonus.bonusCategory ||
                    (bonus.category === "performance"
                      ? "Desempenho"
                      : bonus.category === "award"
                        ? "Prêmio"
                        : "Objetivo atingido")}
                  {isEditingThis ? " (Em edição)" : ""}
                </span>
              </div>
              <div className={Styles.actions}>
                <button
                  type="button"
                  className={Styles.action_btn}
                  onClick={() => onEditBonus(index)}
                  title="Editar bônus"
                >
                  <HiPencilSquare />
                </button>
                <button
                  type="button"
                  className={`${Styles.action_btn} ${Styles.delete_btn}`}
                  onClick={() => onDeleteBonus(index)}
                  title="Excluir bônus"
                >
                  <HiTrash />
                </button>
              </div>
            </div>
            <div className={Styles.content}>
              <p className={Styles.badge} style={{ backgroundColor: clubColor }}>
                Meta: {targetText}
              </p>
              {bonus.targetLeague && (
                <p
                  className={Styles.badge}
                  style={{ backgroundColor: clubColor }}
                >
                  Liga: {bonus.targetLeague}
                </p>
              )}
              <p className={Styles.badge} style={{ backgroundColor: clubColor }}>
                Valor: {formatDisplayValue(bonus.value, currency)}
              </p>
              <p
                className={
                  bonus.status === "paid" || bonus.paid
                    ? Styles.statusPaid
                    : Styles.statusPending
                }
              >
                Status: {bonus.status === "paid" || bonus.paid ? "Liquidado" : "Pendente"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransferBonusCardList;

