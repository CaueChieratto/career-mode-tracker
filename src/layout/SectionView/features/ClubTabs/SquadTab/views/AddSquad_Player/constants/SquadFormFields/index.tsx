import { FaUndo, FaHandHoldingUsd } from "react-icons/fa";
import { BsCalendar2Event } from "react-icons/bs";
import { FaTrashCan } from "react-icons/fa6";
import { MdAttachMoney } from "react-icons/md";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import CaptainArmbandIcon from "../../../../../../../../../ui/CaptainArmbandIcon";
import {
  buildPlayerIdentitySections,
  normalizeSector,
  positionOptionsBySector,
  SECTOR_OPTIONS,
} from "../../../shared/buildPlayerIdentitySections";

export { normalizeSector, positionOptionsBySector, SECTOR_OPTIONS };

export const getSquadFormFields = (
  nationValue: string = "",
  pastPlayerOptions: string[] = [],
  _teamOptions: string[] = [],
  sectorValue: string = "",
) => {
  void _teamOptions;
  const { playerInfoSection, statusSection, searchPastPlayerSection } =
    buildPlayerIdentitySections({
      nationValue,
      sectorValue,
      pastPlayerOptions,
      includeExtendedFields: true,
      pastPlayerKnownOnlyFlag: true,
      extraStatusRows: [
        [
          {
            id: "returnLoan",
            name: "Retornar do empréstimo?",
            icon: <FaUndo />,
            checkbox: true,
            action: ModalType.RETURN_LOAN_CONFIRM,
            editOnly: true,
            loanOnly: true,
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
      ],
    });

  return [
    playerInfoSection,
    {
      title: "Informações do Contrato",
      fields: [
        [
          {
            id: "playerValue",
            name: "Valor de mercado",
            placeholder: "Ex: 50M, 1.2M",
            icon: <FaHandHoldingUsd />,
            maxLength: 7,
          },
          {
            id: "salary",
            name: "Salário semanal",
            placeholder: "Ex: 500k, 1.2M",
            icon: <MdAttachMoney />,
            maxLength: 7,
          },
        ],
        [
          {
            id: "contractUntil",
            name: "Contrato até",
            placeholder: "Ex: 31/07/2031",
            icon: <BsCalendar2Event />,
            maxLength: 10,
          },
        ],
      ],
    },
    statusSection,
    searchPastPlayerSection,
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
