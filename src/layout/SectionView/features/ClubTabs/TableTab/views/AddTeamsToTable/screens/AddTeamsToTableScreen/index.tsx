import { useRef, useEffect, useState } from "react";
import Styles from "./AddTeamsToTableScreen.module.css";
import FormSection from "../../../../../../../../../components/FormSection";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Navbar from "../../../../../../../../../ui/Navbar";
import { useTableTeamActions } from "../../hooks/useTableTeamActions";
import { useTableTeamForm } from "../../hooks/useTableTeamForm";
import { ServiceTable } from "../../../../../../../../../common/services/ServiceTable";
import { useAddTeamsToTableContext } from "../../contexts/context";
import Form from "../../../../../../../../../components/Form";
import { TableRowData } from "../../../../../../../../../common/interfaces/Table";
import { getEmptyTableTeamStatFormValues } from "../../helpers/tableTeamFormStats";
import { useToast } from "../../../../../../../../../common/hooks/UseToast";

export const AddTeamsToTableScreen = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [addedTeamNames, setAddedTeamNames] = useState<string[]>([]);
  const [fetchedTeamToEdit, setFetchedTeamToEdit] = useState<
    TableRowData | undefined
  >(undefined);

  const {
    career,
    season,
    teamId,
    teamToEdit,
    onClose,
    formValues,
    setFormValues,
    handleInputChange,
    handleKeyDown,
    handleKeyUp,
    handleBooleanChange,
  } = useAddTeamsToTableContext();

  const effectiveTeamToEdit = teamToEdit ?? fetchedTeamToEdit;

  useEffect(() => {
    const fetchTable = async () => {
      if (career?.id && season?.id) {
        try {
          const data = await ServiceTable.getTableBySeason(
            career.id,
            season.id,
          );
          setAddedTeamNames(data.map((t) => t.name));
          if (teamId && !teamToEdit) {
            const found = data.find((t) => t.id === teamId);
            if (found) {
              setFetchedTeamToEdit({
                ...found,
                position: 0,
                zone: "none",
              });
            }
          }
        } catch (error) {
          console.error("Erro ao buscar tabela: ", error);
        }
      }
    };
    fetchTable();
  }, [career?.id, season?.id, teamId, teamToEdit]);

  useEffect(() => {
    if (effectiveTeamToEdit) {
      const t = effectiveTeamToEdit as TableRowData & { customZone?: string };
      const mapZoneToForm = (zone?: string) => {
        switch (zone) {
          case "first":
            return "Campeão";
          case "champions":
            return "Liga dos Campeões";
          case "europa":
            return "Liga Europeia";
          case "conference":
            return "Conference League";
          case "relegation":
            return "Rebaixamento";
          case "promotion":
            return "Acesso";
          case "promotion_playoff":
            return "Play-off para Promoção";
          case "none":
            return "Nenhuma";
          default:
            return "Padrão (Automático)";
        }
      };

      setFormValues({
        teamName: t.name,
        ...getEmptyTableTeamStatFormValues(),
        customZone: mapZoneToForm(t.customZone),
      });
    }
  }, [effectiveTeamToEdit, setFormValues]);

  const { formFields } = useTableTeamForm({
    addedTeamNames,
    resolvedTeamToEdit: fetchedTeamToEdit,
  });
  const { isSaving, saveTableTeam, deleteTableTeam } =
    useTableTeamActions(fetchedTeamToEdit);
  const { confirm } = useToast();

  const actionClick = async (action: string) => {
    if (action === "DELETE_TEAM") {
      const confirmed = await confirm(
        "Deseja realmente excluir este time da tabela?",
        { tone: "danger", confirmLabel: "Excluir" },
      );
      if (confirmed) {
        await deleteTableTeam();
      }
    }
  };

  if (isSaving) {
    return <Load />;
  }

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={onClose}
      />
      <Navbar
        save={saveTableTeam}
        options={["", "Salvar", ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />
      <div className={Styles.container}>
        <Form className={Styles.form} ref={formRef}>
          {formFields.map((section, index) => (
            <FormSection
              key={index}
              title={section.title}
              rows={section.fields}
              formValues={formValues}
              onActionClick={actionClick}
              onInputChange={handleInputChange}
              isEditing={!!teamId}
              onBooleanChange={handleBooleanChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
            />
          ))}
        </Form>
      </div>
    </>
  );
};
