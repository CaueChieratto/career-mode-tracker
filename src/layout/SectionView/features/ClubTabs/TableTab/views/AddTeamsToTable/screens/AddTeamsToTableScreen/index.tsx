import { useRef, useEffect, useState } from "react";
import Styles from "./AddTeamsToTableScreen.module.css";
import FormSection from "../../../../../../../../../components/FormSection";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Navbar from "../../../../../../../../../ui/Navbar";
import { useTableTeamActions } from "../../hooks/useTableTeamActions";
import { useTableTeamForm } from "../../hooks/useTableTeamForm";
import { ServiceTable } from "../../services/ServiceTable";
import { useAddTeamsToTableContext } from "../../contexts/context";
import Form from "../../../../../../../../../components/Form";
import { TableRowData } from "../../../../../../../../../common/interfaces/Table";
import { getEmptyTableTeamStatFormValues } from "../../helpers/tableTeamFormStats";

export const AddTeamsToTableScreen = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [addedTeamNames, setAddedTeamNames] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchTable = async () => {
      if (career?.id && season?.id) {
        try {
          const data = await ServiceTable.getTableBySeason(
            career.id,
            season.id,
          );
          setAddedTeamNames(data.map((t) => t.name));
        } catch (error) {
          console.error("Erro ao buscar tabela: ", error);
        }
      }
    };
    fetchTable();
  }, [career?.id, season?.id]);

  useEffect(() => {
    if (teamToEdit) {
      const t = teamToEdit as TableRowData & { customZone?: string };
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
  }, [teamToEdit, setFormValues]);

  const { formFields } = useTableTeamForm({ addedTeamNames });
  const { isSaving, saveTableTeam, deleteTableTeam } = useTableTeamActions();

  const actionClick = async (action: string) => {
    if (action === "DELETE_TEAM") {
      const confirmar = window.confirm(
        "Deseja realmente excluir este time da tabela?",
      );
      if (confirmar) {
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
