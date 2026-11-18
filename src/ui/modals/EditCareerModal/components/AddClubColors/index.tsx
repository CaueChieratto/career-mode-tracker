import { Dispatch, SetStateAction } from "react";
import Input from "../../../../../components/Input";
import { getContrastTextColor } from "../../../../../common/hooks/Colors/UseClubColors";
import Styles from "./AddClubColors.module.css";

type AddClubColorsProps = {
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: Dispatch<SetStateAction<string>>;
  setSecondaryColor: Dispatch<SetStateAction<string>>;
};

const AddClubColors = ({
  primaryColor,
  secondaryColor,
  setPrimaryColor,
  setSecondaryColor,
}: AddClubColorsProps) => {
  return (
    <div className={Styles.container}>
      <p className={Styles.section_title}>CORES DO CLUBE</p>

      <div className={Styles.container_colors}>
        <div className={Styles.color_item}>
          <span className={Styles.label_text}>Cor primária</span>
          <div
            className={Styles.color_picker_wrapper}
            style={{ backgroundColor: primaryColor }}
          >
            <span
              className={Styles.hex_value}
              style={{ color: getContrastTextColor(primaryColor) }}
            >
              {primaryColor.toUpperCase()}
            </span>
            <Input
              className={Styles.color_input}
              type="color"
              id="primaryColor"
              name="primaryColor"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
          </div>
        </div>

        <div className={Styles.color_item}>
          <span className={Styles.label_text}>Cor secundária</span>
          <div
            className={Styles.color_picker_wrapper}
            style={{ backgroundColor: secondaryColor }}
          >
            <span
              className={Styles.hex_value}
              style={{ color: getContrastTextColor(secondaryColor) }}
            >
              {secondaryColor.toUpperCase()}
            </span>
            <Input
              className={Styles.color_input}
              type="color"
              id="secondaryColor"
              name="secondaryColor"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddClubColors;
