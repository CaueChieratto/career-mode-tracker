import { CSSProperties, FormEvent, ReactNode, RefObject } from "react";
import { Career } from "../../../../common/interfaces/Career";
import { Match } from "../../../../common/interfaces/Match";
import ContainerForm from "../../../../components/ContainerForm";
import Form from "../../../../components/Form";
import HeaderSeason from "../../../../components/HeaderSeason";
import Load from "../../../../components/Load";
import Navbar from "../../../../ui/Navbar";
import Styles from "./MatchFormSubScreen.module.css";

export type MatchFormSubScreenProps = {
  career: Career;
  match?: Match;
  titleText: string;
  onClose: () => void;
  onSave: () => void;
  isLoading?: boolean;
  saveLabel?: string;
  containerStyle?: CSSProperties;
  formRef?: RefObject<HTMLFormElement>;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

export const MatchFormSubScreen = ({
  career,
  match,
  titleText,
  onClose,
  onSave,
  isLoading = false,
  saveLabel = "Salvar",
  containerStyle,
  formRef,
  onSubmit,
  children,
}: MatchFormSubScreenProps) => {
  if (isLoading) {
    return <Load />;
  }

  return (
    <>
      <HeaderSeason
        match={match}
        careerId={career.id}
        career={career}
        backSeasons={onClose}
        titleText={titleText}
      />

      <Navbar
        save={onSave}
        options={["", saveLabel, ""]}
        activeOption={1}
        onOptionClick={() => {}}
      />

      <ContainerForm className={Styles.container} style={containerStyle}>
        <Form className={Styles.form} ref={formRef} onSubmit={onSubmit}>
          {children}
        </Form>
      </ContainerForm>
    </>
  );
};

export default MatchFormSubScreen;
