import React from "react";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../../ui/Navbar";
import Form from "../../../../../../../../../components/Form";
import FormSection from "../../../../../../../../../components/FormSection";
import Modal from "../../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../../ui/modals/DeleteConfirmModal";
import { FinancialEntriesList } from "../../components/FinancialEntriesList";
import { useAddFinancialEntryContext } from "../../contexts/context";
import Styles from "../../AddFinancialEntry.module.css";

export const AddFinancialEntryScreen: React.FC = () => {
  const {
    career,
    onClose,
    errorMessage,
    formSections,
    formValues,
    handleInputChange,
    handleSave,
    formRef,
    isEditing,
    editingEntry,
    handleCancelEdit,
    type,
    entries,
    currency,
    loadEntryForEdit,
    deleteConfirmId,
    setDeleteConfirmId,
    handleDeleteEntry,
    handleRedirectToSource,
    highlightedCategory,
    handleSelectCategoryOption,
  } = useAddFinancialEntryContext();

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        titleText={
          isEditing
            ? "Editar Lançamento Financeiro"
            : "Novo Lançamento Financeiro"
        }
        backSeasons={() => onClose()}
      />

      <Navbar
        save={handleSave}
        options={["", isEditing ? "Salvar Alterações" : "Salvar", ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />

      <div className={Styles.container}>
        <Form className={Styles.form} ref={formRef}>
          {errorMessage && (
            <div className={Styles.errorMessage} role="alert">
              {errorMessage}
            </div>
          )}

          {formSections.map((section, index) => (
            <FormSection
              key={index}
              title={section.title}
              rows={section.fields}
              formValues={formValues}
              onInputChange={handleInputChange}
              onSelectOption={handleSelectCategoryOption}
              isEditing={isEditing}
              onActionClick={(action) => {
                if (action === "cancel_edit") {
                  handleCancelEdit();
                }
              }}
            />
          ))}
        </Form>

        <FinancialEntriesList
          entries={entries}
          currency={currency}
          currentType={type}
          editingEntryId={editingEntry?.id}
          highlightedCategory={highlightedCategory}
          onEdit={loadEntryForEdit}
          onDelete={(id) => setDeleteConfirmId(id)}
          onRedirect={handleRedirectToSource}
        />
      </div>

      <Modal
        isOpen={Boolean(deleteConfirmId)}
        closeModal={() => setDeleteConfirmId(null)}
        animationContainer="grow"
        text="Excluir Lançamento Financeiro?"
      >
        <DeleteConfirmModal
          onConfirm={async () => {
            if (deleteConfirmId) {
              await handleDeleteEntry(deleteConfirmId);
              setDeleteConfirmId(null);
            }
          }}
          closeModal={() => setDeleteConfirmId(null)}
        />
      </Modal>
    </>
  );
};

export default AddFinancialEntryScreen;
