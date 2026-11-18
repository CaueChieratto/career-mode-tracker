import { FaUser, FaGlobe, FaTshirt, FaHistory } from "react-icons/fa";
import { GiSoccerField } from "react-icons/gi";
import { BsCalendar } from "react-icons/bs";
import { FaRulerVertical, FaWeightScale } from "react-icons/fa6";
import { TbBrandElectronicArts } from "react-icons/tb";
import { FIFA_COUNTRY_CODES } from "../../../../../../../common/constants/FIFA_COUNTRY_CODES";
import { FIFA_NATIONALITIES } from "../../../../../../../common/constants/FIFA_NATIONALITIES";
import {
  positionOptionsBySector,
  SECTOR_OPTIONS,
} from "../../../../../../../common/types/Positions";
import { Field } from "../../../../../../../components/FormSection";

export { positionOptionsBySector, SECTOR_OPTIONS };

const LEGACY_SECTOR_MAP: Record<string, string> = {
  Atacantes: "Ataque",
  Meias: "Meia",
  Defensores: "Defesa",
  Goleiros: "Goleiro",
};

export const normalizeSector = (sec?: string): string => {
  if (!sec) return "";
  return LEGACY_SECTOR_MAP[sec] || sec;
};

export const getAvailablePositionsForSector = (sectorValue: string = ""): string[] => {
  const normalizedSec = normalizeSector(
    sectorValue,
  ) as keyof typeof positionOptionsBySector;
  return normalizedSec && positionOptionsBySector[normalizedSec]
    ? [...positionOptionsBySector[normalizedSec]]
    : [];
};

export type PlayerIdentityField = Field & {
  editOnly?: boolean;
  loanOnly?: boolean;
  isKnownPlayerOnly?: boolean;
};

export interface PlayerIdentitySection {
  title: string;
  fields: PlayerIdentityField[][];
}

export interface BuildPlayerIdentitySectionsOptions {
  nationValue?: string;
  sectorValue?: string;
  pastPlayerOptions?: string[];
  includeExtendedFields?: boolean;
  isKnownPlayerDisabled?: boolean;
  suppressEmptyPastPlayersNote?: boolean;
  extraStatusSameRowFields?: PlayerIdentityField[];
  extraStatusRows?: PlayerIdentityField[][];
  pastPlayerDisabled?: boolean;
  pastPlayerKnownOnlyFlag?: boolean;
}

export interface PlayerIdentitySectionsResult {
  playerInfoSection: PlayerIdentitySection;
  statusSection: PlayerIdentitySection;
  searchPastPlayerSection: PlayerIdentitySection;
}

export const buildPlayerIdentitySections = ({
  nationValue = "",
  sectorValue = "",
  pastPlayerOptions = [],
  includeExtendedFields = true,
  isKnownPlayerDisabled = false,
  suppressEmptyPastPlayersNote = false,
  extraStatusSameRowFields = [],
  extraStatusRows = [],
  pastPlayerDisabled = false,
  pastPlayerKnownOnlyFlag = false,
}: BuildPlayerIdentitySectionsOptions = {}): PlayerIdentitySectionsResult => {
  const allCountries = Object.keys(FIFA_COUNTRY_CODES);
  const filteredCountries = nationValue
    ? allCountries.filter((code) => code.includes(nationValue))
    : allCountries;

  const availablePositions = getAvailablePositionsForSector(sectorValue);

  const basePlayerInfoRows: PlayerIdentityField[][] = [
    [
      {
        id: "playerName",
        name: "Nome do Jogador",
        placeholder: "Ex: Lionel Messi",
        icon: <FaUser />,
      },
      {
        id: "nation",
        name: FIFA_NATIONALITIES[nationValue] || "País",
        placeholder: "Ex: ARG",
        icon: <FaGlobe />,
        inputType: "searchable-select",
        options: filteredCountries,
        maxLength: 3,
        transform: "uppercase" as const,
      },
    ],
    [
      {
        id: "sector",
        name: "Setor",
        placeholder: "Selecione...",
        icon: <GiSoccerField />,
        inputType: "custom-select",
        options: SECTOR_OPTIONS as unknown as string[],
      },
      {
        id: "position",
        name: "Posição",
        placeholder: "Selecione...",
        icon: <GiSoccerField />,
        inputType: "custom-select",
        options: availablePositions,
        disabled: !sectorValue || availablePositions.length === 0,
      },
    ],
  ];

  const extendedPlayerInfoRows: PlayerIdentityField[][] = includeExtendedFields
    ? [
        [
          {
            id: "overall",
            name: "Overall",
            inputType: "number",
            placeholder: "Ex: 93",
            icon: <TbBrandElectronicArts />,
            max: 99,
          },
          {
            id: "potential",
            name: "Potencial",
            inputType: "number",
            placeholder: "Ex: 93",
            icon: <TbBrandElectronicArts />,
            min: 1,
            max: 99,
          },
        ],
        [
          {
            id: "birthDate",
            name: "Data de Nascimento",
            placeholder: "Ex: 24/06/1987",
            icon: <BsCalendar />,
            maxLength: 10,
          },
          {
            id: "shirtNumber",
            name: "Número",
            inputType: "number",
            placeholder: "Ex: 10",
            icon: <FaTshirt />,
            min: 0,
            max: 99,
          },
        ],
        [
          {
            id: "height",
            name: "Altura (cm)",
            placeholder: "Ex: 169",
            icon: <FaRulerVertical />,
            maxLength: 3,
            inputType: "text",
          },
          {
            id: "weight",
            name: "Peso (kg)",
            placeholder: "Ex: 67",
            icon: <FaWeightScale />,
            maxLength: 3,
            inputType: "text",
          },
        ],
      ]
    : [];

  const playerInfoSection: PlayerIdentitySection = {
    title: "Informações do Jogador",
    fields: [...basePlayerInfoRows, ...extendedPlayerInfoRows],
  };

  const isKnownDisabled = isKnownPlayerDisabled || pastPlayerOptions.length === 0;
  const knownNote =
    !suppressEmptyPastPlayersNote && pastPlayerOptions.length === 0
      ? "Nenhum ex-jogador disponível para recontratação."
      : undefined;

  const statusSection: PlayerIdentitySection = {
    title: "Status",
    fields: [
      [
        {
          id: "isKnownPlayer",
          name: "Já treinou o jogador?",
          icon: <FaHistory />,
          checkbox: true,
          disabled: isKnownDisabled,
          note: knownNote,
        },
        ...extraStatusSameRowFields,
      ],
      ...extraStatusRows,
    ],
  };

  const searchPastPlayerSection: PlayerIdentitySection = {
    title: "Buscar Jogador",
    fields: [
      [
        {
          id: "selectedPastPlayer",
          name: "Selecione o Jogador",
          placeholder: "Busque pelo nome...",
          icon: <FaUser />,
          inputType: "searchable-select",
          options: pastPlayerOptions,
          ...(pastPlayerDisabled ? { disabled: true } : {}),
          ...(pastPlayerKnownOnlyFlag ? { isKnownPlayerOnly: true } : {}),
        },
      ],
    ],
  };

  return {
    playerInfoSection,
    statusSection,
    searchPastPlayerSection,
  };
};
