import { useState, useEffect, FormEvent } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import { CloudinaryService } from "../../../AddBadgeClub/services/CloudinaryService";
import { convertDateToString } from "../../helpers/convertDateToString";
import { convertStringToDate } from "../../helpers/convertStringToDate";
import { SaveEditClub } from "../SaveEditClub";
import { useClubImgAndColor } from "../useClubImgAndColor";

type UseEditCareerModalProps = {
  selectedCareer: Career;
  setSelectedCareer: React.Dispatch<React.SetStateAction<Career>>;
  closeModal: () => void;
};

export const useEditCareerModal = ({
  selectedCareer,
  setSelectedCareer,
  closeModal,
}: UseEditCareerModalProps) => {
  const {
    file,
    fileDataUrl,
    pickFile,
    onFileChange,
    inputRef,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
  } = useClubImgAndColor(selectedCareer);

  const [isLoading, setIsLoading] = useState(false);
  const [clubName, setClubName] = useState(selectedCareer.clubName || "");
  const [managerName, setManagerName] = useState(
    selectedCareer.managerName || "",
  );
  const [createdAt, setCreatedAt] = useState<string>("");

  useEffect(() => {
    setClubName(selectedCareer.clubName || "");
    setManagerName(selectedCareer.managerName || "");
    setCreatedAt(convertDateToString(selectedCareer.createdAt));
  }, [selectedCareer]);

  const badge = selectedCareer?.teamBadge;

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalImageUrl = fileDataUrl ?? undefined;

      if (file) {
        finalImageUrl = await CloudinaryService.uploadImage(file);
      }

      const dateToSave = convertStringToDate(createdAt);

      const updatedCareer = await SaveEditClub(
        selectedCareer,
        primaryColor,
        secondaryColor,
        finalImageUrl,
        clubName,
        managerName,
        dateToSave,
      );

      setSelectedCareer(updatedCareer);
      closeModal();
    } catch (error) {
      console.error("Erro: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    clubName,
    setClubName,
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
    handleSave,
  };
};
