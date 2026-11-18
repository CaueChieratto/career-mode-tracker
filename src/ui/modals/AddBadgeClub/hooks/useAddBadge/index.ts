import { useState, ChangeEvent, FormEvent } from "react";
import { CloudinaryService } from "../../../../../common/services/CloudinaryService";
import { CareerBadgeService } from "../../services/CareerBadgeService";
import { toast } from "../../../../../common/services/ToastService";

type UseAddBadgeProps = {
  careerId: string;
  seasonId: string;
  teamName: string;
  onSuccess?: () => void;
  closeModal: () => void;
};

export const useAddBadge = ({
  careerId,
  seasonId,
  teamName,
  onSuccess,
  closeModal,
}: UseAddBadgeProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Por favor, selecione uma imagem.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const imageUrl = await CloudinaryService.uploadImage(file);

      await CareerBadgeService.updateTeamBadge({
        careerId,
        seasonId,
        teamName,
        imageUrl,
      });

      toast.success("Escudo atualizado com sucesso!");
      if (onSuccess) onSuccess();
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao salvar o escudo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    file,
    preview,
    isLoading,
    error,
    handleFileChange,
    handleSubmit,
  };
};
