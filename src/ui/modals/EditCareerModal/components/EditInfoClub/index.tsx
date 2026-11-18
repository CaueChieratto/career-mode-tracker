import { useState } from "react";
import { GrUserManager } from "react-icons/gr";
import { MdEditCalendar, MdKeyboardArrowRight } from "react-icons/md";
import { FaShieldAlt } from "react-icons/fa";
import { BiWorld } from "react-icons/bi";
import { Inputs } from "../../../../../common/elements/Inputs";
import { formatDateInput } from "../../../../../common/utils/Date";
import Input from "../../../../../components/Input";
import Label from "../../../../../components/Label";
import SearchableSelect from "../../../../../components/SearchableSelect";
import { CareerModalMode } from "../../hooks/useClubImgAndColor";
import { CAREER_COUNTRY_OPTIONS } from "../../constants/countryOptions";
import Styles from "./EditInfoClub.module.css";

type EditInfoClubProps = {
  mode: CareerModalMode;
  clubName: string;
  setClubName: React.Dispatch<React.SetStateAction<string>>;
  clubOptions?: string[];
  nation?: string;
  setNation?: React.Dispatch<React.SetStateAction<string>>;
  managerName: string;
  setManagerName: React.Dispatch<React.SetStateAction<string>>;
  createdAt: string;
  setCreatedAt: React.Dispatch<React.SetStateAction<string>>;
};

const EditInfoClub = ({
  mode,
  clubName,
  setClubName,
  clubOptions = [],
  nation,
  setNation,
  managerName,
  createdAt,
  setCreatedAt,
  setManagerName,
}: EditInfoClubProps) => {
  const [activeInput, setActiveInput] = useState<string | null>(null);

  return (
    <div className={Styles.container_club_info}>
      <p className={Styles.section_title}>INFORMAÇÕES DO CLUBE</p>
      <div className={Styles.card_container}>
        <div
          className={`${Styles.row} ${activeInput === "club" ? Styles.row_active_select : ""}`}
          onClick={() => setActiveInput("club")}
        >
          <div
            className={`${Styles.icon_wrapper} ${activeInput === "club" ? Styles.icon_green : ""}`}
          >
            <FaShieldAlt size={18} />
          </div>
          <div className={Styles.text_wrapper}>
            <span className={Styles.label_text}>Clube</span>
            <SearchableSelect
              name="club"
              options={clubOptions}
              value={clubName || ""}
              placeholder="Ex: FC Barcelona"
              onChange={(e) => setClubName(e.target.value)}
              className={Styles.nation_select}
            />
          </div>
        </div>

        <div className={Styles.divider} />

        {mode === "create" && (
          <>
            <div
              className={`${Styles.row} ${activeInput === "nation" ? Styles.row_active_select : ""}`}
              onClick={() => setActiveInput("nation")}
            >
              <div
                className={`${Styles.icon_wrapper} ${activeInput === "nation" ? Styles.icon_green : ""}`}
              >
                <BiWorld size={18} />
              </div>
              <div className={Styles.text_wrapper}>
                <span className={Styles.label_text}>País</span>
                <SearchableSelect
                  name="nation"
                  options={CAREER_COUNTRY_OPTIONS}
                  value={nation || ""}
                  placeholder="Selecione o país"
                  onChange={(e) => setNation?.(e.target.value)}
                  className={Styles.nation_select}
                />
              </div>
            </div>

            <div className={Styles.divider} />
          </>
        )}

        <Label htmlFor="manager" className={Styles.row}>
          <div
            className={`${Styles.icon_wrapper} ${activeInput === "manager" ? Styles.icon_green : ""}`}
          >
            <GrUserManager size={18} />
          </div>
          <div className={Styles.text_wrapper}>
            <span className={Styles.label_text}>Técnico</span>
            <Inputs.EditManagerName
              className={Styles.input}
              managerName={managerName}
              setManagerName={setManagerName}
              onFocus={() => setActiveInput("manager")}
              onBlur={() => setActiveInput(null)}
            />
          </div>
          <MdKeyboardArrowRight size={22} className={Styles.chevron} />
        </Label>

        <div className={Styles.divider} />

        <Label htmlFor="createdAt" className={Styles.row}>
          <div
            className={`${Styles.icon_wrapper} ${activeInput === "createdAt" ? Styles.icon_green : ""}`}
          >
            <MdEditCalendar size={18} />
          </div>
          <div className={Styles.text_wrapper}>
            <span className={Styles.label_text}>Data</span>
            <Input
              id="createdAt"
              name="createdAt"
              className={Styles.input}
              type="text"
              placeholder="DD/MM/AAAA"
              value={createdAt || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = formatDateInput(e.target.value);
                setCreatedAt(value);
              }}
              onFocus={() => setActiveInput("createdAt")}
              onBlur={() => setActiveInput(null)}
            />
          </div>
          <MdKeyboardArrowRight size={22} className={Styles.chevron} />
        </Label>
      </div>
    </div>
  );
};

export default EditInfoClub;
