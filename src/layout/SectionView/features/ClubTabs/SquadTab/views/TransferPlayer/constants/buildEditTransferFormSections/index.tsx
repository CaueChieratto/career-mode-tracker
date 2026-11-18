import { BsCalendar2Event } from "react-icons/bs";
import { FaHandHoldingUsd, FaHandshake, FaPercentage, FaUndo } from "react-icons/fa";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { GiPoliceBadge, GiPodium } from "react-icons/gi";
import { MdAttachMoney } from "react-icons/md";
import { RxLapTimer } from "react-icons/rx";
import { Field } from "../../../../../../../../../components/FormSection";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import { checkIsIncomingLoanExit } from "../../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import { BooleanValues } from "../../types";

export { checkIsIncomingLoanExit };

export interface EditTransferSection {
  title: string;
  fields: Field[][];
}

export const checkIsSpecialTransfer = (
  contract?: NonNullable<Players["contract"]>[number],
  direction: "arrivals" | "exit" = "exit",
): boolean => {
  if (!contract) return false;
  if (direction === "arrivals") {
    return contract.fromClub === "Base";
  } else {
    return (
      contract.leftClub === "Aposentou" ||
      contract.leftClub === "Aposentadoria" ||
      contract.leftClub === "Fim de Contrato"
    );
  }
};

export const checkIsPromotedFromAcademy = (
  contract?: NonNullable<Players["contract"]>[number],
  direction: "arrivals" | "exit" = "arrivals",
): boolean => {
  return direction === "arrivals" && contract?.fromClub === "Base";
};

export const buildEditTransferFormSections = (
  direction: "arrivals" | "exit",
  transferType: string,
  teamOptions: string[] = [],
  contract?: NonNullable<Players["contract"]>[number],
  player?: Players,
  booleanValues?: Partial<BooleanValues>,
): EditTransferSection[] => {
  const isArrival = direction === "arrivals";
  const isSpecial = checkIsSpecialTransfer(contract, direction);
  const isAcademy = checkIsPromotedFromAcademy(contract, direction);
  const isIncomingLoanReturnExit = checkIsIncomingLoanExit(
    player,
    contract,
    direction,
  );

  const revertSection: EditTransferSection = {
    title: "Manutenção",
    fields: [
      [
        {
          id: "revertTransfer",
          name: "Reverter essa transferência?",
          icon: <FaUndo />,
          checkbox: true,
          action: ModalType.REVERT_TRANSFER_CONFIRM,
        },
      ],
    ],
  };

  if (isIncomingLoanReturnExit) {
    const loanReturnDetailsSection: EditTransferSection = {
      title: "Detalhes da Transferência",
      fields: [
        [
          {
            id: "toClub",
            name: "Clube de retorno",
            icon: <GiPoliceBadge />,
            placeholder: "Ex: Barcelona",
            inputType: "searchable-select",
            options: teamOptions,
          },
        ],
        [
          {
            id: "dateExit",
            name: "Data da saída",
            icon: <BsCalendar2Event />,
            placeholder: "Ex: 11/07",
            maxLength: 5,
          },
        ],
      ],
    };

    return [loanReturnDetailsSection, revertSection];
  }

  if (isSpecial) {
    let dateLabel = isArrival ? "Data da contratação" : "Data da saída";
    const dateId = isArrival ? "dateArrival" : "dateExit";

    if (isArrival) {
      if (contract?.fromClub === "Base") {
        dateLabel = "Data da promoção";
      }
    } else {
      if (
        contract?.leftClub === "Aposentou" ||
        contract?.leftClub === "Aposentadoria"
      ) {
        dateLabel = "Data da aposentadoria";
      } else if (contract?.leftClub === "Fim de Contrato") {
        dateLabel = "Data do término de contrato";
      }
    }

    const specialDetailsSection: EditTransferSection = {
      title: "Detalhes da Transferência",
      fields: [
        [
          {
            id: dateId,
            name: dateLabel,
            icon: <BsCalendar2Event />,
            placeholder: "Ex: 11/07",
            maxLength: 5,
          },
        ],
      ],
    };

    return isAcademy
      ? [specialDetailsSection]
      : [specialDetailsSection, revertSection];
  }

  const typeOptions = isArrival
    ? (["Compra", "Empréstimo"] as const)
    : (["Venda", "Emprestar"] as const);

  const isLoan = transferType === "Emprestar" || transferType === "Empréstimo";

  const typeSection: EditTransferSection = {
    title: "Tipo de Transferência",
    fields: [
      [
        {
          id: "transferType",
          name: "Qual o tipo da transferencia?",
          icon: <FaMoneyBillTransfer />,
          inputType: "segmented",
          options: typeOptions,
        },
      ],
    ],
  };

  const detailsFields: Field[][] = [];

  if (isArrival) {
    detailsFields.push([
      {
        id: "fromClub",
        name: "Clube de Origem",
        icon: <GiPodium />,
        placeholder: "Ex: Barcelona",
        inputType: "searchable-select",
        options: teamOptions,
      },
    ]);

    if (!isLoan) {
      detailsFields.push([
        {
          id: "buyValue",
          name: "Valor da compra",
          icon: <FaHandHoldingUsd />,
          placeholder: "Ex: 100M, 1.5B, 500k",
          maxLength: 15,
        },
        {
          id: "dateArrival",
          name: "Data da contratação",
          icon: <BsCalendar2Event />,
          placeholder: "Ex: 11/07",
          maxLength: 5,
        },
      ]);
    } else {
      detailsFields.push([
        {
          id: "loanDuration",
          name: "Tempo de empréstimo",
          icon: <RxLapTimer />,
          placeholder: "Ex: 0.6, 1, 1.6, 2",
          inputType: "number",
        },
        {
          id: "wagePercentage",
          name: "% Salário pago",
          icon: <MdAttachMoney />,
          placeholder: "Ex: 50, 100",
          inputType: "number",
          maxLength: 3,
        },
      ]);
      detailsFields.push([
        {
          id: "dateArrival",
          name: "Data da contratação",
          icon: <BsCalendar2Event />,
          placeholder: "Ex: 11/07",
          maxLength: 5,
        },
      ]);
    }

    detailsFields.push([
      {
        id: "timing",
        name: "Momento da Transferência",
        icon: <BsCalendar2Event />,
        inputType: "custom-select",
        options: ["Imediata", "Próxima Janela", "Próxima Temporada"],
      },
    ]);
  } else {
    if (!isLoan) {
      detailsFields.push([
        {
          id: "timing",
          name: "Data de saída",
          icon: <BsCalendar2Event />,
          inputType: "custom-select",
          options: ["Imediato", "Próxima Janela", "Próxima Temporada"],
        },
      ]);
    }

    detailsFields.push([
      {
        id: "toClub",
        name: "Clube de destino",
        icon: <GiPoliceBadge />,
        placeholder: "Ex: Barcelona",
        inputType: "searchable-select",
        options: teamOptions,
      },
    ]);

    if (!isLoan) {
      detailsFields.push([
        {
          id: "sellValue",
          name: "Valor da transferência",
          icon: <FaMoneyBillTransfer />,
          placeholder: "Ex: 150k, 50M",
          maxLength: 15,
        },
        {
          id: "dateExit",
          name: "Data da saída",
          icon: <BsCalendar2Event />,
          placeholder: "Ex: 11/07",
          maxLength: 5,
        },
      ]);
    } else {
      detailsFields.push([
        {
          id: "loanDuration",
          name: isArrival ? "Tempo de empréstimo" : "Duração (Anos)",
          icon: <RxLapTimer />,
          placeholder: isArrival ? "Ex: 0.6, 1, 1.6, 2" : "Ex: 1, 2",
          inputType: "number",
        },
        {
          id: "wagePercentage",
          name: isArrival ? "% Salário pago" : "% Salário (destino)",
          icon: <MdAttachMoney />,
          placeholder: isArrival ? "Ex: 50, 100" : "Ex: 40, 45",
          inputType: "number",
          maxLength: 3,
        },
      ]);
      detailsFields.push([
        {
          id: "dateExit",
          name: "Data da saída",
          icon: <BsCalendar2Event />,
          placeholder: "Ex: 11/07",
          maxLength: 5,
        },
      ]);
    }
  }

  const detailsSection: EditTransferSection = {
    title: isLoan ? "Detalhes do Empréstimo" : "Detalhes da Transferência",
    fields: detailsFields,
  };

  const buyOptionSection: EditTransferSection | null =
    isLoan
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
            ...(booleanValues?.hasBuyOption
              ? [
                  [
                    {
                      id: "buyOption",
                      name: "Taxa de transferência",
                      icon: <FaMoneyBillTransfer />,
                      placeholder: "Ex: 150k, 50M",
                      maxLength: 7,
                    },
                    {
                      id: "sellOnPercentage",
                      name: "Cláusula de futura venda (%)",
                      icon: <FaPercentage />,
                      placeholder: "Ex: 10, 20",
                      inputType: "number" as const,
                      maxLength: 3,
                    },
                  ],
                ]
              : []),
          ],
        }
      : null;

  return [
    typeSection,
    detailsSection,
    ...(buyOptionSection ? [buyOptionSection] : []),
    revertSection,
  ];
};

export const buildEditTransferStep1Sections = buildEditTransferFormSections;

export const buildEditTransferStep2Sections = (
  direction: "arrivals" | "exit",
  transferType: string,
): EditTransferSection[] => {
  const isArrival = direction === "arrivals";
  const isLoan = transferType === "Emprestar" || transferType === "Empréstimo";

  if (isArrival) {
    if (!isLoan) {
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
                maxLength: 7,
              },
              {
                id: "contractUntil",
                name: "Tempo de Contrato",
                icon: <BsCalendar2Event />,
                placeholder: "Ex: 30/06/2030",
                maxLength: 10,
              },
            ],
            [
              {
                id: "signingBonus",
                name: "Taxa da Contratação / Luvas",
                icon: <FaHandHoldingUsd />,
                placeholder: "Ex: 5M",
                maxLength: 7,
              },
              {
                id: "agentFee",
                name: "Taxa de Agência",
                icon: <MdAttachMoney />,
                placeholder: "Ex: 2M",
                maxLength: 7,
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
              maxLength: 7,
            },
          ],
          [
            {
              id: "loanDuration",
              name: "Duração do Empréstimo (Anos)",
              icon: <RxLapTimer />,
              placeholder: "Ex: 0.6, 1, 1.6, 2",
              inputType: "number",
              min: 1,
              max: 2,
            },
            {
              id: "buyOption",
              name: "Opção de Compra Fixada",
              icon: <FaHandHoldingUsd />,
              placeholder: "Ex: 25M, 500k",
              maxLength: 7,
            },
          ],
        ],
      },
    ];
  }

  // Saída (exit)
  if (!isLoan) {
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
              maxLength: 7,
            },
            {
              id: "contractTime",
              name: "Duração do Contrato (Anos)",
              icon: <RxLapTimer />,
              placeholder: "Ex: 3",
              inputType: "number",
              min: 1,
              max: 7,
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
            name: "% Salário Pago",
            icon: <MdAttachMoney />,
            placeholder: "Ex: 50",
            inputType: "number",
            min: 0,
            max: 100,
          },
          {
            id: "loanDuration",
            name: "Duração do Empréstimo (Anos)",
            icon: <RxLapTimer />,
            placeholder: "Ex: 0.6, 1, 1.6, 2",
            inputType: "text",
          },
        ],
      ],
    },
  ];
};
