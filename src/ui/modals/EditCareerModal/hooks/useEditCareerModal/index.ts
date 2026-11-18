import { useState, useEffect } from "react";
import { Career } from "../../../../../common/interfaces/Career";
import {
  ClubCatalogItem,
  ServiceClubBadges,
  normalizeClubKey,
} from "../../../../../common/services/ServiceClubBadges";
import { convertDateToString } from "../../helpers/convertDateToString";
import {
  CareerModalMode,
  normalizeHex,
  useClubImgAndColor,
} from "../useClubImgAndColor";
import { useCareerModalActions } from "../useCareerModalActions";

type UseEditCareerModalProps = {
  mode: CareerModalMode;
  selectedCareer?: Career;
  setSelectedCareer?: React.Dispatch<React.SetStateAction<Career>>;
  closeModal: () => void;
};

export const useEditCareerModal = ({
  mode,
  selectedCareer,
  setSelectedCareer,
  closeModal,
}: UseEditCareerModalProps) => {
  const {
    file,
    pickFile,
    onFileChange,
    inputRef,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
  } = useClubImgAndColor(mode, selectedCareer);

  const [isLoading, setIsLoading] = useState(false);
  const [clubName, setClubName] = useState(() =>
    mode !== "create" && selectedCareer?.clubName
      ? selectedCareer.clubName
      : "",
  );
  const [managerName, setManagerName] = useState(() =>
    mode !== "create" && selectedCareer?.managerName
      ? selectedCareer.managerName
      : "",
  );
  const [nation, setNation] = useState(() =>
    mode !== "create" && selectedCareer?.nation ? selectedCareer.nation : "",
  );
  const [createdAt, setCreatedAt] = useState<string>(() =>
    mode !== "create" && selectedCareer?.createdAt
      ? convertDateToString(selectedCareer.createdAt)
      : "",
  );
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [clubsCatalog, setClubsCatalog] = useState<
    Record<string, ClubCatalogItem>
  >({});

  useEffect(() => {
    let isMounted = true;
    ServiceClubBadges.getAvailableClubsCatalog()
      .then((catalog) => {
        if (!isMounted) return;
        setClubsCatalog(catalog);
        const names = Object.values(catalog)
          .filter((c) => Boolean(c.badge?.trim() || c.colors?.length))
          .map((c) => c.name)
          .sort((a, b) => a.localeCompare(b, "pt-BR"));
        setAvailableClubs(names);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode === "create") {
      setClubName("");
      setManagerName("");
      setNation("");
      setCreatedAt("");
    } else if (selectedCareer) {
      setClubName(selectedCareer.clubName || "");
      setManagerName(selectedCareer.managerName || "");
      setNation(selectedCareer.nation || "");
      setCreatedAt(convertDateToString(selectedCareer.createdAt));
    }
  }, [mode, selectedCareer]);

  // Quando o usuário escolhe um time existente no modo "create",
  // associa automaticamente as cores desse clube aos seletores.
  useEffect(() => {
    if (mode !== "create") return;
    const trimmed = clubName.trim();
    if (!trimmed) return;
    const key = normalizeClubKey(trimmed);
    const item = clubsCatalog[key];
    if (item?.colors && item.colors.length >= 2) {
      setPrimaryColor(normalizeHex(item.colors[0], "#52a383"));
      setSecondaryColor(normalizeHex(item.colors[1], "#ffffff"));
    }
  }, [clubName, clubsCatalog, mode, setPrimaryColor, setSecondaryColor]);

  const badge = mode !== "create" ? selectedCareer?.teamBadge : undefined;

  const { handleSave } = useCareerModalActions({
    mode,
    selectedCareer,
    setSelectedCareer,
    closeModal,
    setIsLoading,
    clubName,
    nation,
    managerName,
    createdAt,
    primaryColor,
    secondaryColor,
    file,
  });

  return {
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
  };
};
