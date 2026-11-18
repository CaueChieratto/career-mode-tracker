import { IoMdInformationCircleOutline } from "react-icons/io";
import Styles from "./TransferInfo.module.css";

type TransferInfoProps = {
  title: string;
  color: string;
  players: string[];
  onClick: () => void;
};

const TransferInfo = ({
  title,
  color,
  players,
  onClick,
}: TransferInfoProps) => (
  <div className={Styles.infos} onClick={onClick}>
    <div className={Styles.container} style={{ color }}>
      <h2 className={Styles.h2}>{title}</h2>
      <div className={Styles.icon}>
        <IoMdInformationCircleOutline />
      </div>
    </div>
    <div className={Styles.players}>
      {players.map((player, index) => (
        <div className={Styles.player} key={index}>
          {player}
        </div>
      ))}
    </div>
  </div>
);

export default TransferInfo;
