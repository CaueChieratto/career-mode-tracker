import {
  FaHandHoldingUsd,
  FaHandshake,
  FaPercentage,
  FaUndo,
} from "react-icons/fa";
import { GiPodium } from "react-icons/gi";
import { MdAttachMoney } from "react-icons/md";
import { BsCalendar, BsCalendar2Event } from "react-icons/bs";
import { RxLapTimer } from "react-icons/rx";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import CaptainArmbandIcon from "../../../../../../../../ui/CaptainArmbandIcon";
import { Field } from "../../../../../../../../components/FormSection";
import { TransferClausePrefill } from "../../../../../../config/screens";
import { ModalType } from "../../../../../../../../common/types/enums/ModalType";
import {
  buildPlayerIdentitySections,
  normalizeSector,
} from "../../shared/buildPlayerIdentitySections";

export { normalizeSector };

export interface TransferSection {
  title: string;
  fields: Field[][];
}

export const getAddTransferPlayerStep1Fields = (
  nationValue: string = "",
  transferType: "Compra" | "Empréstimo" = "Compra",
  teamOptions: string[] = [],
  booleanValues: Record<string, boolean> = {},
  pastPlayerOptions: string[] = [],
  prefill?: TransferClausePrefill,
  isEditTransfer?: boolean,
  sectorValue: string = "",
): TransferSection[] => {
  const { playerInfoSection, statusSection, searchPastPlayerSection } =
    buildPlayerIdentitySections({
      nationValue,
      sectorValue,
      pastPlayerOptions,
      includeExtendedFields: false,
      isKnownPlayerDisabled: Boolean(prefill || isEditTransfer),
      suppressEmptyPastPlayersNote: Boolean(prefill || isEditTransfer),
      pastPlayerDisabled: Boolean(prefill),
      extraStatusSameRowFields: [
        {
          id: "isCaptain",
          name: "Capitão?",
          icon: <CaptainArmbandIcon />,
          checkbox: true,
        },
      ],
    });

  const isCompra = transferType === "Compra";

  const contractSection: TransferSection = isCompra
    ? {
        title: "Detalhes Contratuais",
        fields: [
          [
            {
              id: "fromClub",
              name: "Clube de Origem",
              icon: <GiPodium />,
              placeholder: "Ex: Barcelona",
              inputType: "searchable-select",
              options: teamOptions,
              disabled: Boolean(prefill),
            },
          ],
          [
            {
              id: "playerValue",
              name: "Valor do Jogador",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 50M, 1.2M",
              maxLength: 15,
            },
            {
              id: "buyValue",
              name: "Taxa da Transferência",
              icon: <FaHandHoldingUsd />,
              placeholder: "Ex: 50M, 1.2M",
              maxLength: 15,
              disabled:
                prefill?.mode === "buyback" ||
                prefill?.mode === "loanBuyOption",
            },
          ],
          [
            {
              id: "timing",
              name: "Momento da Transferência",
              icon: <BsCalendar2Event />,
              inputType: "custom-select" as const,
              placeholder: "Selecione o momento",
              options: [
                "Imediata",
                "Próxima Janela",
                "Próxima Temporada",
              ] as const,
            },
          ],
        ],
      }
    : {
        title: "Detalhes Contratuais",
        fields: [
          [
            {
              id: "fromClub",
              name: "Clube de Origem",
              icon: <GiPodium />,
              placeholder: "Ex: Bayern München",
              inputType: "searchable-select",
              options: teamOptions,
              disabled: Boolean(prefill),
              required: true,
            },
          ],
          [
            {
              id: "playerValue",
              name: "Valor do Jogador",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 45M, 1.2M",
              maxLength: 15,
              required: false,
            },
            {
              id: "loanDuration",
              name: "Duração",
              icon: <RxLapTimer />,
              inputType: "custom-select" as const,
              placeholder: "Selecione a duração",
              options: ["Curto prazo", "1 ano", "2 anos"] as const,
              required: true,
            },
          ],
          [
            {
              id: "salary",
              name: "Salário Semanal",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 120k",
              maxLength: 15,
              required: true,
            },
            {
              id: "wagePercentage",
              name: "% Salário Pago por Nós",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 50",
              inputType: "number" as const,
              min: 0,
              max: 100,
              required: true,
            },
          ],
        ],
      };

  const buyOptionSection: TransferSection | null = !isCompra
    ? {
        title: "Opção de Compra",
        fields: [
          [
            {
              id: "hasBuyOption",
              name: "Opção de compra?",
              icon: <FaHandshake />,
              checkbox: true,
            },
          ],
          ...(booleanValues.hasBuyOption
            ? [
                [
                  {
                    id: "buyOption",
                    name: "Taxa de transferência",
                    icon: <FaHandHoldingUsd />,
                    placeholder: "Ex: 30M",
                    maxLength: 15,
                    required: true,
                  },
                  {
                    id: "sellOnPercentage",
                    name: "Cláusula de futura venda (%)",
                    icon: <FaPercentage />,
                    placeholder: "Ex: 10, 20",
                    inputType: "number" as const,
                    maxLength: 3,
                    required: false,
                  },
                ],
              ]
            : []),
        ],
      }
    : null;

  return [
    {
      title: "Tipo de Transferência",
      fields: [
        [
          {
            id: "transferType",
            name: "Qual o tipo da transferência?",
            icon: <FaMoneyBillTransfer />,
            inputType: "segmented",
            options: ["Compra", "Empréstimo"] as const,
            disabled: Boolean(prefill || isEditTransfer),
          },
        ],
      ],
    },
    playerInfoSection,
    contractSection,
    ...(buyOptionSection ? [buyOptionSection] : []),
    statusSection,
    ...(booleanValues.isKnownPlayer ? [searchPastPlayerSection] : []),
    ...(isEditTransfer
      ? [
          {
            title: "Manutenção",
            fields: [
              [
                {
                  id: "revertTransfer",
                  name: "Desfazer essa transferência?",
                  icon: <FaUndo />,
                  checkbox: true,
                  action: ModalType.REVERT_TRANSFER_CONFIRM,
                },
              ],
            ],
          },
        ]
      : []),
  ];
};

export const getAddTransferPlayerStep2Fields = (
  transferType: "Compra" | "Empréstimo" = "Compra",
): TransferSection[] => {
  const isCompra = transferType === "Compra";

  if (isCompra) {
    return [
      {
        title: "Informações do Contrato",
        fields: [
          [
            {
              id: "salary",
              name: "Salário Semanal",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 500k, 1.2M",
              maxLength: 15,
            },
            {
              id: "contractUntil",
              name: "Tempo de Contrato",
              icon: <BsCalendar />,
              placeholder: "Ex: 30/06/2030",
              maxLength: 10,
            },
          ],
          [
            {
              id: "signingBonus",
              name: "Taxa de Contratação / Luvas",
              icon: <FaHandHoldingUsd />,
              placeholder: "Ex: 5M",
              maxLength: 15,
            },
            {
              id: "agentFee",
              name: "Taxa de Agência",
              icon: <MdAttachMoney />,
              placeholder: "Ex: 2M",
              maxLength: 15,
            },
          ],
        ],
      },
    ];
  }

  return [
    {
      title: "Informações do Contrato",
      fields: [
        [
          {
            id: "wagePercentage",
            name: "% Salário Pago por Nós",
            icon: <MdAttachMoney />,
            placeholder: "Ex: 50",
            inputType: "number",
            min: 0,
            max: 100,
          },
          {
            id: "salary",
            name: "Salário Semanal",
            icon: <MdAttachMoney />,
            placeholder: "Ex: 500k, 1.2M",
            maxLength: 15,
          },
        ],
        [
          {
            id: "loanDuration",
            name: "Duração do Empréstimo (Anos)",
            icon: <RxLapTimer />,
            placeholder: "Ex: 0.6, 1, 1.6, 2",
            inputType: "text",
          },
          {
            id: "buyOption",
            name: "Opção de Compra Fixada",
            icon: <FaHandHoldingUsd />,
            placeholder: "Ex: 25M, 500k",
            maxLength: 15,
          },
        ],
        [
          {
            id: "dateArrival",
            name: "Data",
            icon: <BsCalendar2Event />,
            placeholder: "Ex: 11/07",
            maxLength: 5,
          },
        ],
      ],
    },
  ];
};

export const getAddTransferPlayerFields = (
  nationValue: string = "",
  transferType: "Compra" | "Empréstimo" = "Compra",
  teamOptions: string[] = [],
  booleanValues: Record<string, boolean> = {},
  pastPlayerOptions: string[] = [],
  prefill?: TransferClausePrefill,
  isEditTransfer?: boolean,
  sectorValue: string = "",
): TransferSection[] => {
  return getAddTransferPlayerStep1Fields(
    nationValue,
    transferType,
    teamOptions,
    booleanValues,
    pastPlayerOptions,
    prefill,
    isEditTransfer,
    sectorValue,
  );
};
