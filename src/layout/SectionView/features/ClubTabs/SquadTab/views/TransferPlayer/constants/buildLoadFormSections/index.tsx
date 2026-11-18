import { BsCalendar2Event } from "react-icons/bs";
import { FaHandshake, FaPercentage, FaUndo } from "react-icons/fa";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { GiPoliceBadge } from "react-icons/gi";
import { MdAttachMoney } from "react-icons/md";
import { RxLapTimer } from "react-icons/rx";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { BooleanValues } from "../../types";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";

export const buildLoanSections = (
  booleanValues: BooleanValues,
  player: Players,
  teamOptions: string[] = [],
  isProposal = false,
  isEditTransfer = false,
) => {
  return [
    ...(player.loan && !isProposal
      ? [
          {
            title: "Status do Empréstimo",
            fields: [
              [
                {
                  id: "isReturnLoan",
                  name: "Encerrou o empréstimo?",
                  icon: <FaUndo />,
                  checkbox: true,
                },
              ],
            ],
          },
        ]
      : []),
    {
      title: "Detalhes do Empréstimo",
      fields: [
        ...(!booleanValues.isReturnLoan
          ? [
              [
                {
                  id: "toClub",
                  name: "Clube de destino",
                  icon: <GiPoliceBadge />,
                  placeholder: "Ex: Barcelona",
                  inputType: "searchable-select",
                  options: teamOptions,
                },
              ],
              [
                {
                  id: "loanDuration",
                  name: "Duração (Anos)",
                  icon: <RxLapTimer />,
                  placeholder: "Ex: 1, 2",
                  inputType: "number",
                },
                {
                  id: "wagePercentage",
                  name: "% Salário (destino)",
                  icon: <MdAttachMoney />,
                  placeholder: "Ex: 40, 45",
                  inputType: "number",
                  maxLength: 3,
                },
              ],
              ...(isEditTransfer
                ? [
                    [
                      {
                        id: "dateExit",
                        name: "Data da saída",
                        icon: <BsCalendar2Event />,
                        placeholder: "Ex: 11/07",
                        maxLength: 5,
                      },
                    ],
                  ]
                : []),
            ]
          : []),
        ...(booleanValues.isReturnLoan
          ? [
              [
                {
                  id: "dateExit",
                  name: "Data de retorno",
                  icon: <BsCalendar2Event />,
                  placeholder: "Ex: 11/07",
                  maxLength: 5,
                },
              ],
            ]
          : []),
      ].filter((row) => row.length > 0),
    },
    ...(!booleanValues.isReturnLoan
      ? [
          {
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
                        icon: <FaMoneyBillTransfer />,
                        placeholder: "Ex: 150k, 50M",
                        maxLength: 15,
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
          },
        ]
      : []),
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
