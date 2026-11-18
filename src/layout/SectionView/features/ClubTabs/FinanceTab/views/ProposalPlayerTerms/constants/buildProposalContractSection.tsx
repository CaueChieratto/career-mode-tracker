import { BsCalendar2Event } from "react-icons/bs";
import { MdAttachMoney } from "react-icons/md";
import { FaMoneyBillWave } from "react-icons/fa";
import { Field } from "../../../../../../../../components/FormSection";

export const buildProposalContractSection = (options?: {
  hideAgentFee?: boolean;
  isRenewal?: boolean;
}) => {
  const secondRow: Field[] = [
    {
      id: "signingBonus",
      name: "Taxa da contratação",
      icon: <FaMoneyBillWave />,
      placeholder: "Ex: 5M, 500k",
      maxLength: 15,
    },
  ];

  if (!options?.hideAgentFee) {
    secondRow.push({
      id: "agentFee",
      name: "Taxa da agência",
      icon: <MdAttachMoney />,
      placeholder: "Ex: 2M, 500k",
      maxLength: 15,
    });
  }

  const rows: (readonly Field[])[] = [
    [
      {
        id: "salary",
        name: "Salário semanal",
        icon: <MdAttachMoney />,
        placeholder: "Ex: 500k, 1.2M",
        maxLength: 15,
      },
      {
        id: "contractTime",
        name: options?.isRenewal ? "Extensão de contrato" : "Duração do contrato",
        icon: <BsCalendar2Event />,
        placeholder: options?.isRenewal ? "Ex: 0, 1, 2 anos" : "Ex: 1, 2, 3 anos",
        maxLength: 2,
      },
    ],
    secondRow,
  ];

  return {
    title: "Informações do Contrato",
    rows,
  };
};
