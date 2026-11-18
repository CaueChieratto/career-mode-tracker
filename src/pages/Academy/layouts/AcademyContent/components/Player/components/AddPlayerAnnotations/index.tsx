import { useRef, useState, useEffect } from "react";
import { FaBold, FaEdit, FaSave } from "react-icons/fa";
import Styles from "./AddPlayerAnnotations.module.css";
import Button from "../../../../../../../../components/Button";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { toast } from "../../../../../../../../common/services/ToastService";

export const AddPlayerAnnotations = () => {
  const { selectedPlayer, onUpdatePlayer } = useAcademyContext();
  const hasAnnotations =
    !!selectedPlayer?.annotations &&
    selectedPlayer.annotations.trim() !== "" &&
    selectedPlayer.annotations !== "<br>";
  const isReadOnly = false;
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasAnnotations && !isReadOnly);

  useEffect(() => {
    if (editorRef.current && selectedPlayer?.annotations) {
      editorRef.current.innerHTML = selectedPlayer.annotations;
    }
  }, [selectedPlayer?.annotations]);

  if (!selectedPlayer) return null;

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleAction = async () => {
    if (!isEditing) {
      setIsEditing(true);
      setTimeout(() => editorRef.current?.focus(), 0);
      return;
    }
    if (!editorRef.current) return;
    setIsLoading(true);
    try {
      const updatedContent = editorRef.current.innerHTML;
      const updatedPlayer = {
        ...selectedPlayer,
        annotations: updatedContent,
      };
      await onUpdatePlayer(updatedPlayer, true);
      toast.success("Anotações salvas com sucesso!");
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar anotações:", error);
      toast.error("Erro ao salvar anotações. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={Styles.container}>
      {isEditing && (
        <div className={Styles.toolbar}>
          <button
            type="button"
            className={Styles.toolButton}
            onClick={() => handleFormat("bold")}
            title="Negrito (Peso da Fonte)"
          >
            <FaBold />
          </button>
          <div className={Styles.divider} />
          <select
            className={Styles.toolSelect}
            onChange={(e) => handleFormat("fontSize", e.target.value)}
            defaultValue="3"
            title="Tamanho da Fonte"
          >
            <option value="1">Muito Pequena</option>
            <option value="2">Pequena</option>
            <option value="3">Normal</option>
            <option value="4">Grande</option>
            <option value="5">Muito Grande</option>
            <option value="6">Gigante</option>
          </select>
        </div>
      )}

      <div
        ref={editorRef}
        className={`${Styles.editor} ${!isEditing ? Styles.editorReadOnly : ""}`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        data-placeholder={
          isEditing
            ? "Escreva as anotações aqui..."
            : "Nenhuma anotação registrada."
        }
      />
      {!isReadOnly && (
        <Button
          className={Styles.saveBtn}
          onClick={handleAction}
          disabled={isLoading}
        >
          {!isEditing ? (
            <>
              <FaEdit /> Editar Anotações
            </>
          ) : (
            <>
              <FaSave /> {isLoading ? "Salvando..." : "Salvar Anotações"}
            </>
          )}
        </Button>
      )}
    </div>
  );
};
