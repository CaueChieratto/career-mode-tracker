import { BsCalendar2Event } from "react-icons/bs";
import { MdAttachMoney } from "react-icons/md";
import {
  FaMoneyBillWave,
  FaFileContract,
  FaChartLine,
  FaTrophy,
  FaBullseye,
  FaPercentage,
  FaCheck,
  FaGlobe,
} from "react-icons/fa";
import { Field } from "../../../../../../../../../components/FormSection";
import {
  DEFAULT_OBJECTIVE_BONUSES,
  DEFAULT_PERFORMANCE_BONUSES,
  TransferBonus,
} from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { getAvailableLeagueNamesByNation } from "../../../../../../../../../common/utils/league";
import { RenewalFormValues } from "../../types";

export const buildRenewalContractSection = () => {
  const rows: (readonly Field[])[] = [
    [
      {
        id: "salary",
        name: "Salário semanal",
        icon: <MdAttachMoney />,
        placeholder: "Ex: 500k, 1.2M",
        maxLength: 7,
      },
      {
        id: "contractTime",
        name: "Extensão de contrato",
        icon: <BsCalendar2Event />,
        placeholder: "Ex: 1, 2, 3 anos",
        maxLength: 2,
      },
    ],
    [
      {
        id: "signingBonus",
        name: "Taxa da contratação",
        icon: <FaMoneyBillWave />,
        placeholder: "Ex: 5M, 500k",
        maxLength: 7,
      },
    ],
  ];

  return {
    title: "Informações do Contrato",
    rows,
  };
};

export const buildRenewalBonusSection = (
  bonuses: TransferBonus[],
  editingBonusIndex: number | null,
  formValues: RenewalFormValues,
  customObjectives: Record<string, string[]> = {},
  isManageMode: boolean = false,
  nation?: string,
) => {
  const hasObjectiveBonus = bonuses.some(
    (b, idx) =>
      (b.bonusCategory ? b.bonusCategory === "Objetivo atingido" : b.category === "objective") &&
      idx !== editingBonusIndex,
  );

  const availableCategories = hasObjectiveBonus
    ? ["Desempenho"]
    : ["Objetivo atingido", "Desempenho"];

  const currentCategory =
    hasObjectiveBonus && formValues.bonusCategory === "Objetivo atingido"
      ? availableCategories[0]
      : formValues.bonusCategory || availableCategories[0];

  const usedPerformanceObjectives = new Set<string>();
  (bonuses || []).forEach((b, idx) => {
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

  const performanceOptions = Array.from(
    new Set([
      ...DEFAULT_PERFORMANCE_BONUSES,
      ...(customObjectives["Desempenho"] || []),
    ]),
  ).filter((opt) => !usedPerformanceObjectives.has(opt.trim().toLowerCase()));

  const objectiveOptions =
    currentCategory === "Desempenho"
      ? performanceOptions
      : Array.from(
          new Set([
            ...DEFAULT_OBJECTIVE_BONUSES,
            ...(customObjectives["Objetivo atingido"] || []),
          ]),
        );

  const baseLeagueOptions = getAvailableLeagueNamesByNation(nation);
  const currentBonusLeague = formValues.bonusLeague?.trim();
  const availableLeagueOptions =
    currentBonusLeague && !baseLeagueOptions.includes(currentBonusLeague)
      ? [...baseLeagueOptions, currentBonusLeague]
      : baseLeagueOptions;

  const rows: (readonly Field[])[] = [
    [
      {
        id: "bonusCategory",
        name: "Opção de bônus",
        icon: <FaTrophy />,
        inputType: "custom-select",
        options: availableCategories,
        placeholder: "Selecione o tipo de bônus",
      },
    ],
    [
      {
        id: "bonusObjective",
        name: "Objetivo",
        icon: <FaBullseye />,
        inputType: "searchable-select",
        options: objectiveOptions,
        placeholder: "Selecione ou digite o objetivo",
      },
      ...(currentCategory === "Objetivo atingido"
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
    [
      {
        id: "bonusValue",
        name: "Valor do bônus",
        icon: <FaMoneyBillWave />,
        placeholder: "Ex: 5M, 500k",
        maxLength: 7,
      },
    ],
  ];

  if (isManageMode) {
    rows.push([
      {
        id: "bonusStatus",
        name: "Status do bônus",
        icon: <FaCheck />,
        inputType: "custom-select",
        options: ["Pendente", "Liquidado"],
        placeholder: "Selecione o status",
      },
    ]);
  }

  return {
    title: "Bônus & Metas",
    rows,
    availableCategories,
    objectiveOptions,
    availableLeagueOptions,
  };
};

export const buildRenewalSpecialClausesSection = (
  formValues: RenewalFormValues,
  customObjectives: Record<string, string[]> = {},
  isManageMode: boolean = false,
  nation?: string,
) => {
  const wageAdjustmentType = formValues.wageAdjustmentType || "N/D";
  const currentWageLeague = formValues.wageAdjustmentLeague || "";

  const baseLeagueOptions = getAvailableLeagueNamesByNation(nation);
  const availableLeagueOptions =
    currentWageLeague && !baseLeagueOptions.includes(currentWageLeague)
      ? [...baseLeagueOptions, currentWageLeague]
      : baseLeagueOptions;

  const objectiveOptions = Array.from(
    new Set([
      ...DEFAULT_OBJECTIVE_BONUSES,
      ...(customObjectives["Objetivo atingido"] || []),
    ]),
  );

  const rows: (readonly Field[])[] = [
    // 1ª Fileira: Multa rescisória
    [
      {
        id: "releaseClause",
        name: "Multa rescisória",
        icon: <FaFileContract />,
        placeholder: "Ex: 250M",
        maxLength: 7,
      },
    ],
    // 2ª Fileira: Ajuste automático de salário
    [
      {
        id: "wageAdjustmentType",
        name: "Ajuste automático de salário",
        icon: <FaChartLine />,
        inputType: "custom-select",
        options: ["N/D", "Aumentar", "Diminuir"],
        placeholder: "Selecione o ajuste",
      },
    ],
  ];

  // 3ª Fileira condicional: Na mesma linha, Critério de ajuste + Competição / Liga
  if (wageAdjustmentType === "Aumentar" || wageAdjustmentType === "Diminuir") {
    rows.push([
      {
        id: "wageAdjustmentObjective",
        name: "Critério de ajuste",
        icon: <FaBullseye />,
        inputType: "searchable-select",
        placeholder: "Selecione o critério...",
        options: objectiveOptions,
        isMatch: true,
      },
      {
        id: "wageAdjustmentLeague",
        name: "Competição / Liga",
        icon: <FaGlobe />,
        inputType: "custom-select" as const,
        options: availableLeagueOptions,
        placeholder: "Selecione a liga",
        isMatch: true,
      },
    ]);

    // 4ª Fileira condicional: Porcentagem de ajuste
    rows.push([
      {
        id: "wageAdjustmentPercentage",
        name: "Porcentagem de ajuste",
        icon: <FaPercentage />,
        inputType: "custom-select",
        options: ["5%", "10%", "15%", "20%", "25%"],
        placeholder: "Selecione a %",
      },
    ]);

    if (isManageMode) {
      rows.push([
        {
          id: "wageAdjustmentStatus",
          name: "Status do ajuste",
          icon: <FaCheck />,
          inputType: "custom-select",
          options: ["Pendente", "Aplicado"],
          placeholder: "Selecione o status",
        },
      ]);
    }
  }

  return {
    title: "Cláusulas Especiais",
    rows,
  };
};
