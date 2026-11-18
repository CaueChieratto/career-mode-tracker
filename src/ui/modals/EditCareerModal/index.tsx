import { Dispatch, SetStateAction } from "react";
import { Career } from "../../../common/interfaces/Career";
import Button from "../../../components/Button";
import Form from "../../../components/Form";
import Load from "../../../components/Load";
import AddClubColors from "./components/AddClubColors";
import AddClubImg from "./components/AddClubImg";
import EditInfoClub from "./components/EditInfoClub";
import { useEditCareerModal } from "./hooks/useEditCareerModal";
import { CareerModalMode } from "./hooks/useClubImgAndColor";
import Styles from "./EditCareerModal.module.css";

export type { CareerModalMode };

type EditCareerModalProps = {
  closeModal: () => void;
  mode: CareerModalMode;
  selectedCareer?: Career;
  setSelectedCareer?: Dispatch<SetStateAction<Career>>;
};

export const EditCareerModal = ({
  closeModal,
  selectedCareer,
  setSelectedCareer,
  mode,
}: EditCareerModalProps) => {
  const {
    isLoading,
    clubName,
    setClubName,
    nation,
    setNation,
    managerName,
    setManagerName,
    createdAt,
    setCreatedAt,
    badge,
    file,
    pickFile,
    onFileChange,
    inputRef,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    availableClubs,
    handleSave,
  } = useEditCareerModal({
    mode,
    selectedCareer,
    setSelectedCareer,
    closeModal,
  });

  return (
    <Form onSubmit={handleSave} className={Styles.form}>
      <div className={Styles.form_container}>
        {mode !== "create" && (
          <AddClubImg
            file={file}
            initialPreview={badge || null}
            pickFile={pickFile}
            onFileChange={onFileChange}
            inputRef={inputRef}
          />
        )}

        {(mode === "create" || mode === "edit") && (
          <EditInfoClub
            mode={mode}
            clubName={clubName}
            setClubName={setClubName}
            clubOptions={availableClubs}
            nation={nation}
            setNation={setNation}
            managerName={managerName}
            setManagerName={setManagerName}
            createdAt={createdAt}
            setCreatedAt={setCreatedAt}
          />
        )}

        <AddClubColors
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          secondaryColor={secondaryColor}
          setSecondaryColor={setSecondaryColor}
        />

        <Button
          width="big"
          fontWeight="bold"
          fontSize="large"
          isActive
          type="submit"
          style={{ width: "100%" }}
        >
          Salvar
        </Button>

        {isLoading && <Load />}
      </div>
    </Form>
  );
};
