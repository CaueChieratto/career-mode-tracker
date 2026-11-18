import { BsCalendar2Event } from "react-icons/bs";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { GiPoliceBadge, GiSoccerBall, GiSoccerField } from "react-icons/gi";
import {
  FaUserClock,
  FaFileInvoice,
  FaPercentage,
  FaTrophy,
  FaHandshake,
  FaUser,
  FaBullseye,
  FaHashtag,
  FaClock,
  FaCoins,
  FaCheck,
  FaGlobe,
  FaUndo,
} from "react-icons/fa";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import { BooleanValues, FormValues } from "../../types";
import { formatTransferValue } from "../../../../../../../../../common/utils/FormatValue";
export { formatTransferValue };
import { getAvailableLeagueNamesByNation } from "../../../../../../../../../common/utils/league";
import {
  SECTOR_OPTIONS,
  positionOptionsBySector,
} from "../../../AddSquad_Player/constants/SquadFormFields";
import {
  TransferBonus,
  DEFAULT_AWARD_BONUSES,
  DEFAULT_OBJECTIVE_BONUSES,
  DEFAULT_PERFORMANCE_BONUSES,
} from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";

export const buildTransferSections = (
  booleanValues: BooleanValues,
  teamOptions: string[] = [],
  formValues?: FormValues,
  isSellValueLocked: boolean = false,
  isToClubLocked: boolean = false,
  isTransferTypeLocked: boolean = false,
  isEditTransfer: boolean = false,
) => {
  void formValues;
  const isSpecialExit =
    booleanValues.isRetirement || booleanValues.isEndContract;

  return [
    {
      title: "Status de Saída",
      fields: [
        [
          {
            id: "isRetirement",
            name: "Aposentou?",
            icon: <FaUserClock />,
            checkbox: true,
            disabled: isTransferTypeLocked,
          },
          {
            id: "isEndContract",
            name: "Fim de Contrato?",
            icon: <FaFileInvoice />,
            checkbox: true,
            disabled: isTransferTypeLocked,
          },
        ],
        ...(!isSpecialExit
          ? [
              [
                {
                  id: "timing",
                  name: "Data de saída",
                  icon: <BsCalendar2Event />,
                  inputType: "custom-select" as const,
                  options: [
                    "Imediata",
                    "Proxima Janela",
                    "Proxima Temporada",
                  ] as const,
                  placeholder: "Selecione a data de saída",
                },
              ],
            ]
          : []),
      ],
    },
    {
      title: "Detalhes da Transferência",
      fields: [
        ...(!isSpecialExit
          ? [
              [
                {
                  id: "toClub",
                  name: "Clube de destino",
                  icon: <GiPoliceBadge />,
                  placeholder: "Ex: Barcelona",
                  inputType: "searchable-select" as const,
                  options: teamOptions,
                  disabled: isToClubLocked,
                },
              ],
            ]
          : []),
        [
          ...(!isSpecialExit
            ? [
                {
                  id: "sellValue",
                  name: "Taxa de transferência",
                  icon: <FaMoneyBillTransfer />,
                  placeholder: "Ex: 150k, 50M",
                  maxLength: 15,
                  disabled: isSellValueLocked,
                },
                ...(isEditTransfer
                  ? [
                      {
                        id: "dateExit",
                        name: "Data da saída",
                        icon: <BsCalendar2Event />,
                        placeholder: "Ex: 11/07",
                        maxLength: 5,
                      },
                    ]
                  : []),
              ]
            : [
                {
                  id: "dateExit",
                  name: booleanValues.isRetirement
                    ? "Data da aposentadoria"
                    : "Data da saída",
                  icon: <BsCalendar2Event />,
                  placeholder: "Ex: 11/07",
                  maxLength: 5,
                },
              ]),
        ],
      ].filter((row) => row.length > 0),
    },
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

export const buildSaleClausesSections = (
  booleanValues: BooleanValues,
  formValues: FormValues = {},
  customBonusOptions?: Record<string, string[]>,
  existingBonuses?: TransferBonus[],
  editingBonusIndex?: number | null,
  isArrivals?: boolean,
  clubPlayerOptions?: string[],
  isProposal: boolean = false,
  nation?: string,
  isManageMode: boolean = false,
) => {
  void booleanValues;
  const isObjectiveAtingidoBonus = (b: {
    bonusCategory?: string;
    category?: string;
  }) =>
    b.bonusCategory
      ? b.bonusCategory === "Objetivo atingido"
      : b.category === "objective";

  const hasObjectiveAtingido = (existingBonuses || []).some(
    (b, idx) => isObjectiveAtingidoBonus(b) && idx !== editingBonusIndex,
  );
  const bonusCategoryOptions = hasObjectiveAtingido
    ? (["Prêmio", "Desempenho"] as const)
    : (["Objetivo atingido", "Prêmio", "Desempenho"] as const);

  const percentageOptions = [
    "Nenhum",
    ...[20, 40, 60, 80, 100].map((p) => `${p}% do total`),
  ];

  const seasonsOptions = [
    "Nenhum",
    ...[1, 2, 3, 4, 5, 6, 7].map((num) =>
      num === 1 ? "1 Parcela" : `${num} Parcelas`,
    ),
  ];

  const rawBonusCat = formValues.bonusCategory;
  const bonusCat =
    rawBonusCat === ""
      ? ""
      : rawBonusCat === "Objetivo atingido" && hasObjectiveAtingido
        ? bonusCategoryOptions[0] || "Prêmio"
        : rawBonusCat || bonusCategoryOptions[0] || "Objetivo atingido";

  const usedPerformanceObjectives = new Set<string>();
  (existingBonuses || []).forEach((b, idx) => {
    if (idx === editingBonusIndex) return;
    const isPerf =
      b.bonusCategory === "Desempenho" ||
      b.category === "performance" ||
      Boolean(b.metric);
    if (isPerf) {
      const target = (b.bonusTarget || b.targetObjective || b.name || "")
        .trim()
        .toLowerCase();
      if (target) usedPerformanceObjectives.add(target);
    }
  });

  let objectiveOptions: string[] = [];
  if (bonusCat === "Prêmio") {
    objectiveOptions = [
      ...DEFAULT_AWARD_BONUSES,
      ...(customBonusOptions?.["Prêmio"] || []),
    ];
  } else if (bonusCat === "Desempenho") {
    const allPerformanceOptions = [
      ...DEFAULT_PERFORMANCE_BONUSES,
      ...(customBonusOptions?.["Desempenho"] || []),
    ];
    objectiveOptions = allPerformanceOptions.filter(
      (opt) => !usedPerformanceObjectives.has(opt.trim().toLowerCase()),
    );
  } else if (bonusCat === "Objetivo atingido" && !hasObjectiveAtingido) {
    objectiveOptions = [
      ...DEFAULT_OBJECTIVE_BONUSES,
      ...(customBonusOptions?.["Objetivo atingido"] || []),
    ];
  }

  const baseLeagueOptions = getAvailableLeagueNamesByNation(nation);
  const currentBonusLeague = formValues.bonusLeague?.trim();
  const availableLeagueOptions =
    currentBonusLeague && !baseLeagueOptions.includes(currentBonusLeague)
      ? [...baseLeagueOptions, currentBonusLeague]
      : baseLeagueOptions;

  const selectedYears = parseInt(formValues.installmentsYears || "2", 10) || 2;
  const paidInstallmentsOptions = Array.from(
    { length: selectedYears + 1 },
    (_, i) => {
      if (i === 0) return "0 parcelas pagas";
      if (i === selectedYears) return `${i} parcelas pagas (Quitado)`;
      return `${i} ${i === 1 ? "parcela paga" : "parcelas pagas"}`;
    },
  );

  return {
    percentageOptions,
    seasonsOptions,
    bonusCategoryOptions,
    objectiveOptions,
    availableLeagueOptions,
    paidInstallmentsOptions,
    transferDetailsSection: {
      title: !isArrivals
        ? "Data de Saída & Taxa"
        : "Momento & Taxa de Transferência",
      fields: [
        [
          {
            id: "timing",
            name: !isArrivals ? "Data de saída" : "Momento da transferência",
            icon: <BsCalendar2Event />,
            inputType: "custom-select" as const,
            options: [
              "Imediata",
              "Proxima Janela",
              "Proxima Temporada",
            ] as const,
            placeholder: "Selecione o momento",
          },
        ],
        [
          {
            id: !isArrivals ? "sellValue" : "buyValue",
            name: "Taxa de transferência",
            icon: <FaMoneyBillTransfer />,
            placeholder: "Ex: 150k, 50M",
            maxLength: 15,
          },
        ],
      ],
    },
    installmentsSection: {
      title: "Parcelas",
      fields: [
        [
          {
            id: "installmentsPercentage",
            name: "Porcentagem da taxa de transferência",
            icon: <FaPercentage />,
            inputType: "custom-select" as const,
            options: percentageOptions,
            placeholder: "Selecione a porcentagem",
          },
        ],
        [
          {
            id: "installmentsYears",
            name: "Temporadas para parcelamento",
            icon: <BsCalendar2Event />,
            inputType: "custom-select" as const,
            options: seasonsOptions,
            placeholder: "Selecione as temporadas",
          },
        ],
        ...(!isArrivals && !isProposal
          ? [
              [
                {
                  id: "paidInstallments",
                  name: "Parcelas já liquidadas / pagas",
                  icon: <FaCoins />,
                  inputType: "custom-select" as const,
                  options: paidInstallmentsOptions,
                  placeholder: "Selecione as parcelas pagas",
                },
              ],
            ]
          : []),
      ],
    },
    playerSwapSection: {
      title: isArrivals ? "Atleta do Clube para Troca" : "Informe o jogador",
      fields: isArrivals
        ? [
            [
              {
                id: "swapPlayerName",
                name: "Atleta do Clube",
                icon: <FaUser />,
                inputType: "searchable-select" as const,
                options: clubPlayerOptions || [],
                placeholder: "Selecione um atleta do elenco...",
              },
            ],
          ]
        : [
            [
              {
                id: "swapPlayerName",
                name: "Nome do jogador",
                icon: <FaUser />,
                placeholder: "Ex: Gabriel Silva",
              },
              {
                id: "swapPlayerValue",
                name: "Valor de mercado",
                icon: <FaMoneyBillTransfer />,
                placeholder: "Ex: 20M, 500k",
                maxLength: 7,
              },
            ],
            [
              {
                id: "swapPlayerSector",
                name: "Setor",
                icon: <GiSoccerField />,
                inputType: "custom-select" as const,
                options: SECTOR_OPTIONS,
                placeholder: "Selecione o setor",
              },
            ],
            [
              {
                id: "swapPlayerPosition",
                name: "Posição",
                icon: <GiSoccerBall />,
                inputType: "custom-select" as const,
                options: formValues?.swapPlayerSector
                  ? positionOptionsBySector[
                      formValues.swapPlayerSector as keyof typeof positionOptionsBySector
                    ] || []
                  : [],
                placeholder: "Selecione...",
              },
            ],
          ],
    },
    bonusSection: {
      title: "Bônus de conquistas",
      fields: [
        [
          {
            id: "bonusCategory",
            name: "Opção de bônus",
            icon: <FaTrophy />,
            inputType: "custom-select" as const,
            options: bonusCategoryOptions,
            placeholder: "Selecione o tipo de bônus",
          },
        ],
        [
          {
            id: "bonusObjective",
            name: "Objetivo",
            icon: <FaBullseye />,
            inputType: "searchable-select" as const,
            options: objectiveOptions,
            placeholder: bonusCat
              ? "Selecione ou digite o objetivo"
              : "Selecione primeiro a opção de bônus",
          },
          ...(bonusCat === "Objetivo atingido"
            ? [
                {
                  id: "bonusLeague",
                  name: "Liga do objetivo",
                  icon: <FaGlobe />,
                  inputType: "custom-select" as const,
                  options: availableLeagueOptions,
                  placeholder: "Selecione a liga",
                },
              ]
            : []),
        ],
        ...((!isArrivals || isManageMode) && !isProposal
          ? [
              [
                {
                  id: "bonusStatus",
                  name: "Status do bônus",
                  icon: <FaCheck />,
                  inputType: "custom-select" as const,
                  options: ["Pendente", "Liquidado"],
                  placeholder: "Selecione o status",
                },
              ],
            ]
          : []),
        bonusCat === "Desempenho"
          ? [
              {
                id: "bonusCount",
                name: "Contagem",
                icon: <FaHashtag />,
                placeholder: "Ex: 10, 25",
                maxLength: 3,
              },
              {
                id: "bonusValue",
                name: "Valor do bônus",
                icon: <FaMoneyBillTransfer />,
                placeholder: "Ex: 285k, 1.2M",
                maxLength: 7,
              },
            ]
          : [
              {
                id: "bonusValue",
                name: "Valor do bônus",
                icon: <FaMoneyBillTransfer />,
                placeholder: "Ex: 285k, 1.2M",
                maxLength: 7,
              },
            ],
      ],
    },
    otherClausesSection: {
      title: "Outros",
      fields: [
        [
          {
            id: "loanBackDuration",
            name: "Emprestar de volta",
            icon: <FaClock />,
            inputType: "custom-select" as const,
            options: ["Nenhum", "1 temporada", "2 temporadas"],
            placeholder: "Duração",
          },
          {
            id: "sellOnPercentage",
            name: "Taxa de venda futura",
            icon: <FaPercentage />,
            inputType: "custom-select" as const,
            options: ["Nenhum", "5%", "10%", "15%", "20%", "25%", "30%"],
            placeholder: "% de venda",
          },
        ],
        [
          {
            id: "buybackValue",
            name: "Cláusula de recompra",
            icon: <FaMoneyBillTransfer />,
            placeholder: "Ex: 40M, 15M",
            maxLength: 7,
          },
        ],
        [
          {
            id: "firstRefusal",
            name: "Direito de preferência",
            icon: <FaHandshake />,
            checkbox: true,
          },
        ],
      ],
    },
  };
};
