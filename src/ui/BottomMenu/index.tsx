import { LuSun } from "react-icons/lu";
import Styles from "./BottomMenu.module.css";
import { FiMoon } from "react-icons/fi";
import { BsQuestionCircle } from "react-icons/bs";
import { useTheme } from "../../contexts/LightThemeContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaPeopleArrows } from "react-icons/fa";
import { IoColorPalette } from "react-icons/io5";

type BottomMenuProps = {
  noHavePlayers?: boolean;
  changeClubColor?: () => void;
  playerId?: string;
  careerId?: string;
};

const BottomMenu = ({
  noHavePlayers,
  changeClubColor,
  playerId: propPlayerId,
  careerId: propCareerId,
}: BottomMenuProps) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const {
    careerId: paramCareerId,
    seasonId,
    playerId: paramPlayerId,
  } = useParams();
  const location = useLocation();

  const effectivePlayerId = propPlayerId ?? paramPlayerId;
  const effectiveCareerId = propCareerId ?? paramCareerId;

  const compareClick = () => {
    if (!effectiveCareerId) return;

    if (effectivePlayerId) {
      navigate(
        `/Career/${effectiveCareerId}/Geral/Player/${effectivePlayerId}/Compare`,
      );
    } else if (location.pathname.includes("/Geral")) {
      navigate(`/Career/${effectiveCareerId}/Geral/Compare`);
    } else if (seasonId) {
      navigate(`/Career/${effectiveCareerId}/Season/${seasonId}/Compare`);
    }
  };

  return (
    <div className={Styles.background}>
      <div className={Styles.container}>
        <div>
          {theme === "light" ? (
            <LuSun size={30} onClick={toggleTheme} />
          ) : (
            <FiMoon size={30} onClick={toggleTheme} />
          )}
        </div>

        {!noHavePlayers && <FaPeopleArrows size={30} onClick={compareClick} />}

        {changeClubColor && (
          <IoColorPalette size={30} onClick={changeClubColor} />
        )}

        <BsQuestionCircle size={30} onClick={() => navigate("/tutorial")} />
      </div>
    </div>
  );
};

export default BottomMenu;
