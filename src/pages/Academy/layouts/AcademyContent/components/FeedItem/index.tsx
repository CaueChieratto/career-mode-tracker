import { FaHistory } from "react-icons/fa";
import Styles from "./FeedItem.module.css";
import { iconMap } from "./constants/iconMap";
import { AcademyListItem } from "../AcademyListItem";
import { DefaultCircle } from "../../ui/DefaultCircle";
import { InfoItem } from "../../ui/InfoItem";
import { FeedItemModal } from "./components/FeedItemModal";
import { useModal } from "./hooks/useModal";
import { FeedEvent } from "./types/FeedEvent";

type FeedItemProps = {
  id: string | number;
  type: string;
  title: string;
  subtitle: string;
  socialSubtitle?: string;
  time: string;
  details?: FeedEvent["details"];
  clubName: string;
};

export const FeedItem = ({
  id,
  subtitle,
  socialSubtitle,
  time,
  title,
  type,
  details,
  clubName,
}: FeedItemProps) => {
  const { isOpen, open, close } = useModal();
  const feedIcon = iconMap[type?.toLowerCase()] ?? <FaHistory />;

  return (
    <>
      <AcademyListItem
        className={Styles.feedItemCustom}
        titleClassName={Styles.feedTitle}
        infoClassName={Styles.feedInfo}
        disableOverflow={true}
        iconNode={<DefaultCircle isActive={isOpen}>{feedIcon}</DefaultCircle>}
        title={title}
        subtitle={subtitle}
        rightContent={<InfoItem className={Styles.feedTime}>{time}</InfoItem>}
        isSelected={isOpen}
        onClick={open}
      />

      {isOpen && (
        <FeedItemModal
          eventId={id}
          title={title}
          type={type}
          subtitle={subtitle}
          socialSubtitle={socialSubtitle}
          time={time}
          details={details}
          onClose={close}
          clubName={clubName}
        />
      )}
    </>
  );
};
