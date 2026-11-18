import { useEffect, useRef, useState } from "react";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import CaptainArmbandIcon from "../../../../../../../ui/CaptainArmbandIcon";
import Styles from "./CaptainsHierarchyEditor.module.css";

export interface CaptainItem {
  id: string;
  name: string;
  shirtNumber?: string;
  position?: string;
  isCurrentPlayer?: boolean;
}

export interface CaptainsHierarchyEditorProps {
  initialCaptains: CaptainItem[];
  currentPlayer: CaptainItem;
  onChangeOrder: (orderedCaptainIds: string[], currentRank: number) => void;
  clubColor?: string;
}

export const CaptainsHierarchyEditor = ({
  initialCaptains,
  currentPlayer,
  onChangeOrder,
  clubColor,
}: CaptainsHierarchyEditorProps) => {
  const [captains, setCaptains] = useState<CaptainItem[]>(() => {
    const list = [...initialCaptains];
    const existingIndex = list.findIndex(
      (c) => c.id === currentPlayer.id || c.isCurrentPlayer,
    );

    if (existingIndex !== -1) {
      list[existingIndex] = { ...currentPlayer, isCurrentPlayer: true };
    } else {
      if (list.length < 5) {
        list.push({ ...currentPlayer, isCurrentPlayer: true });
      }
    }
    return list;
  });

  const isCurrentInList = captains.some(
    (c) => c.id === currentPlayer.id || c.isCurrentPlayer,
  );
  const isFull = !isCurrentInList && captains.length >= 5;

  const onChangeOrderRef = useRef(onChangeOrder);
  useEffect(() => {
    onChangeOrderRef.current = onChangeOrder;
  });

  const notifyChange = (updated: CaptainItem[]) => {
    const currentIdx = updated.findIndex(
      (c) => c.id === currentPlayer.id || c.isCurrentPlayer,
    );
    const currentRank = currentIdx !== -1 ? currentIdx + 1 : 0;
    onChangeOrderRef.current(
      updated.map((c) => c.id),
      currentRank,
    );
  };

  useEffect(() => {
    notifyChange(captains);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...captains];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setCaptains(updated);
    notifyChange(updated);
  };

  const moveDown = (index: number) => {
    if (index >= captains.length - 1) return;
    const updated = [...captains];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setCaptains(updated);
    notifyChange(updated);
  };

  const replaceCaptain = (targetIndex: number) => {
    const updated = [...captains];
    updated[targetIndex] = { ...currentPlayer, isCurrentPlayer: true };
    setCaptains(updated);
    notifyChange(updated);
  };

  return (
    <div
      className={`${Styles.container} swiper-no-swiping`}
      style={clubColor ? ({ "--club-color": clubColor } as React.CSSProperties) : undefined}
    >
      <div className={Styles.title}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CaptainArmbandIcon /> Ordem de Capitães
        </span>
        <span className={Styles.limit_badge}>
          {captains.length} / 5 capitães
        </span>
      </div>

      {isFull && (
        <div className={Styles.warning}>
          O limite de 5 capitães foi atingido. Substitua um capitão existente
          abaixo para incluir este atleta.
        </div>
      )}

      <ul className={Styles.list}>
        {captains.map((item, index) => {
          const isThisPlayer =
            item.isCurrentPlayer || item.id === currentPlayer.id;

          return (
            <li
              key={item.id || `cap_${index}`}
              className={`${Styles.item} ${
                isThisPlayer ? Styles.current_player_item : ""
              }`}
            >
              <div className={Styles.left}>
                <span className={Styles.rank_badge}>#{index + 1}</span>
                <div className={Styles.player_info}>
                  <span className={Styles.player_name}>
                    {item.shirtNumber ? `#${item.shirtNumber} ` : ""}
                    {item.name || "Novo Jogador"}
                    {isThisPlayer && (
                      <span className={Styles.current_tag}>(Este Atleta)</span>
                    )}
                  </span>
                  <span className={Styles.player_sub}>
                    {item.position || "Sem posição"} • {index + 1}º Capitão
                  </span>
                </div>
              </div>

              <div className={Styles.controls}>
                <button
                  type="button"
                  className={Styles.arrow_btn}
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title="Subir posição"
                  aria-label="Subir capitão"
                >
                  <FaChevronUp />
                </button>
                <button
                  type="button"
                  className={Styles.arrow_btn}
                  onClick={() => moveDown(index)}
                  disabled={index === captains.length - 1}
                  title="Descer posição"
                  aria-label="Descer capitão"
                >
                  <FaChevronDown />
                </button>
                {isFull && !isThisPlayer && (
                  <button
                    type="button"
                    className={Styles.replace_btn}
                    onClick={() => replaceCaptain(index)}
                  >
                    Substituir
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

