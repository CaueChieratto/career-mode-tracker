import { useState, useRef } from "react";
import { toast } from "../../../../../common/services/ToastService";

export const useFilePicker = () => {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isClicking = useRef(false);

  const pickFile = () => {
    if (!isClicking.current) {
      isClicking.current = true;
      inputRef.current?.click();
      setTimeout(() => {
        isClicking.current = false;
      }, 500);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;

    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
    } else {
      setFile(null);
      if (selectedFile) {
        toast.warning("Por favor, selecione uma imagem válida.");
      }
    }
  };

  return { file, inputRef, pickFile, onFileChange };
};
