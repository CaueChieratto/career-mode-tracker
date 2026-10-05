import {
  FaUser,
  FaGlobe,
  FaTshirt,
  FaSignature,
  FaHandHoldingUsd,
  FaHistory,
} from "react-icons/fa";
import { GiPodium, GiSoccerField } from "react-icons/gi";
import { MdAttachMoney, MdNumbers } from "react-icons/md";
import { BsCalendar } from "react-icons/bs";
import { RxLapTimer } from "react-icons/rx";
import { FaTrashCan } from "react-icons/fa6";
import { TbBrandElectronicArts } from "react-icons/tb";
import { FIFA_COUNTRY_CODES } from "../../../../../../../../../common/constants/FIFA_COUNTRY_CODES";
import { FIFA_NATIONALITIES } from "../../../../../../../../../common/constants/FIFA_NATIONALITIES";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import CaptainArmbandIcon from "../../../../../../../../../ui/CaptainArmbandIcon";

export const positionOptionsBySector = {
  Ataque: ["PE", "PD", "ATA"],
  Meia: ["VOL", "ME", "MC", "MD", "MEI"],
  Defesa: ["LE", "ZAG", "LD"],
  Goleiro: ["GOL"],
} as const;

export const getSquadFormFields = (
  nationValue: string = "",
  pastPlayerOptions: string[] = [],
  teamOptions: string[] = [],
) => {
  const allCountries = Object.keys(FIFA_COUNTRY_CODES);

  const filteredCountries = nationValue
    ? allCountries.filter((code) => code.includes(nationValue))
    : allCountries;

  return [
    {
      title: "Status",
      fields: [
        [
          {
            id: "isSigning",
            name: "É uma compra?",
            icon: <FaSignature />,
            checkbox: true,
            addOnly: true,
          },
          {
            id: "isLoan",
            name: "É um empréstimo?",
            icon: <FaSignature />,
            checkbox: true,
            addOnly: true,
          },
        ],
        [
          {
            id: "isCaptain",
            name: "É um dos capitães?",
            icon: <CaptainArmbandIcon />,
            checkbox: true,
            note: "Você pode selecionar até 5 capitães.",
          },
        ],
        [
          {
            id: "isKnownPlayer",
            name: "Já treinou o jogador?",
            icon: <FaHistory />,
            checkbox: true,
            showOnJoin: true,
            addOnly: true,
            disabled: pastPlayerOptions.length === 0,
            note:
              pastPlayerOptions.length === 0
                ? "Nenhum ex-jogador disponível para recontratação."
                : undefined,
          },
        ],
      ],
    },
    {
      title: "Buscar Jogador",
      addOnly: true,
      fields: [
        [
          {
            id: "selectedPastPlayer",
            name: "Selecione o Jogador",
            placeholder: "Busque pelo nome...",
            icon: <FaUser />,
            inputType: "searchable-select",
            options: pastPlayerOptions,
            isKnownPlayerOnly: true,
            addOnly: true,
          },
        ],
      ],
    },
    {
      title: "Informações do Jogador",
      fields: [
        [
          {
            id: "playerName",
            name: "Nome do Jogador",
            placeholder: "Ex: Lionel Messi",
            icon: <FaUser />,
          },
          {
            id: "overall",
            name: "Overall",
            inputType: "number",
            placeholder: "Ex: 87",
            icon: <TbBrandElectronicArts />,
            max: 99,
          },
        ],
        [
          {
            id: "sector",
            name: "Setor",
            placeholder: "Selecione...",
            icon: <GiSoccerField />,
            inputType: "custom-select",
            options: ["Ataque", "Meia", "Defesa", "Goleiro"],
          },
          {
            id: "position",
            name: "Posição",
            placeholder: "Selecione...",
            icon: <GiSoccerField />,
            inputType: "custom-select",
          },
        ],
        [
          {
            id: "age",
            name: "Idade",
            inputType: "number",
            placeholder: "Ex: 37",
            icon: <BsCalendar />,
            min: 13,
            max: 50,
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
      ],
    },
    {
      title: "Detalhes Contratuais",
      fields: [
        [
          {
            id: "fromClub",
            name: "Clube de Origem",
            inputType: "searchable-select",
            placeholder: "Ex: Barcelona",
            icon: <GiPodium />,
            options: teamOptions,
            showOnJoin: true,
            addOnly: true,
          },
        ],
        [
          {
            id: "playerValue",
            name: "Valor do Jogador",
            inputType: "text",
            placeholder: "Ex: 100M, 1.5B, 500k",
            icon: <MdNumbers />,
            maxLength: 7,
          },
          {
            id: "buyValue",
            name: "Valor da Compra",
            inputType: "text",
            placeholder: "Ex: 100M, 1.5B, 500k",
            icon: <FaHandHoldingUsd />,
            isSigningOnly: true,
            maxLength: 7,
            addOnly: true,
          },
          {
            id: "loanDuration",
            name: "Tempo do Empréstimo",
            inputType: "number",
            placeholder: "Ex: 1, 2",
            icon: <RxLapTimer />,
            isIncomingLoanOnly: true,
            addOnly: true,
          },
        ],
        [
          {
            id: "salary",
            name: "Salário (Semanal)",
            inputType: "text",
            placeholder: "Ex: 50k, 1.2M",
            icon: <MdAttachMoney />,
            maxLength: 7,
          },
          {
            id: "contractTime",
            name: "Tempo de contrato",
            inputType: "number",
            placeholder: "Ex: 4",
            icon: <RxLapTimer />,
            hideOnIncomingLoan: true,
            maxLength: 1,
          },
          {
            id: "wagePercentage",
            name: "% Salário pago",
            inputType: "number",
            placeholder: "Ex: 50, 100",
            icon: <MdAttachMoney />,
            isIncomingLoanOnly: true,
            maxLength: 3,
            addOnly: true,
          },
        ],
        [
          {
            id: "dateArrival",
            name: "Data da contratação",
            placeholder: "Ex: 11/07",
            icon: <RxLapTimer />,
            showOnJoin: true,
            maxLength: 5,
            addOnly: true,
          },
        ],
        [
          {
            id: "isKnownPlayer",
            name: "Esse jogador ja jogou conosco antes?",
            icon: <FaHistory />,
            checkbox: true,
            editOnly: true,
            disabled: pastPlayerOptions.length === 0,
            note:
              pastPlayerOptions.length === 0
                ? "Nenhum ex-jogador disponível para vincular."
                : undefined,
          },
        ],
        [
          {
            id: "selectedPastPlayer",
            name: "Selecione o Jogador",
            placeholder: "Busque pelo nome...",
            icon: <FaUser />,
            inputType: "searchable-select",
            options: pastPlayerOptions,
            editOnly: true,
            isKnownPlayerOnly: true,
          },
        ],
      ],
    },
    {
      title: "Manutenção",
      editOnly: true,
      fields: [
        [
          {
            id: "delete",
            name: "Deletar esse jogador?",
            icon: <FaTrashCan />,
            checkbox: true,
            action: ModalType.DELETE_PLAYER_CONFIRM,
          },
        ],
      ],
    },
  ];
};
