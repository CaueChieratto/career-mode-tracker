import { FaPlus } from "react-icons/fa6";
import Label from "../../../../../components/Label";
import Styles from "./AddClubImg.module.css";
import { ChangeEventHandler, RefObject, useEffect, useState } from "react";
import { Inputs } from "../../../../../common/elements/Inputs";
import { TbShirtSport } from "react-icons/tb";

type AddClubImgProps = {
  file: File | null;
  initialPreview?: string | null;
  inputRef: RefObject<HTMLInputElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  pickFile?: () => void;
};

const AddClubImg = ({
  file,
  initialPreview,
  inputRef,
  onFileChange,
}: AddClubImgProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const previewUrl = objectUrl || initialPreview || null;

  return (
    <div className={Styles.container_p__label_img}>
      <Label htmlFor="img" className={Styles.label_img}>
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className={Styles.previewImage} />
        ) : (
          <TbShirtSport size={32} />
        )}

        <div className={Styles.plus_badge}>
          <FaPlus size={12} />
        </div>

        <Inputs.AddClubImg
          ref={inputRef}
          onChange={onFileChange}
          className={Styles.hiddenInput}
        />
      </Label>
      <span className={Styles.span}>Toque para adicionar o escudo</span>
    </div>
  );
};

export default AddClubImg;
