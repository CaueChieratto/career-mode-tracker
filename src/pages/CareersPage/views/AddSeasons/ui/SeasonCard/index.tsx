import Styles from "./SeasonCard.module.css";
import { TbHandClick } from "react-icons/tb";
import { IoMdCloseCircle } from "react-icons/io";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import Load from "../../../../../../components/Load";
import Card from "../../../../../../ui/Card";

type SeasonCardProps = {
  season?: ClubData;
  title?: string;
  titleClassName?: string;
  isLoading?: boolean;
  onClick: () => void;
  onDelete?: () => void | Promise<void>;
};

const SeasonCard = ({
  season,
  title,
  titleClassName,
  isLoading = false,
  onClick,
  onDelete,
}: SeasonCardProps) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      void onDelete();
    }
  };

  const displayTitle = title ?? `Temporada ${season?.seasonNumber ?? ""}`;

  return (
    <Card className={Styles.card} onClick={!isLoading ? onClick : undefined}>
      {isLoading ? (
        <Load />
      ) : (
        <>
          {onDelete && (
            <div className={Styles.icon} onClick={handleDeleteClick}>
              <IoMdCloseCircle size={25} color="red" />
            </div>
          )}
          <h1 className={titleClassName ?? Styles.h1}>{displayTitle}</h1>
          <TbHandClick />
        </>
      )}
    </Card>
  );
};

export default SeasonCard;

