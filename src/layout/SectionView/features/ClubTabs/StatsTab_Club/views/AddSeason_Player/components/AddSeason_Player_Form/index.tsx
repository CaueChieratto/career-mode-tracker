import { forwardRef, useRef } from "react";
import Form from "../../../../../../../../../components/Form";
import FormSection from "../../../../../../../../../components/FormSection";
import AddOrEditLeagueButton from "../../../../../../../../../common/elements/Buttons/AddOrEditLeagueButton";
import Load from "../../../../../../../../../components/Load";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { useSeasonTheme } from "../../../../../../../../../common/hooks/Seasons/UseSeasonTheme";
import { usePlayerSeasonStats } from "../../../../../../../../../common/hooks/Players/UsePlayerSeasonStats";
import Styles from "../../screens/AddSeason_PlayerScreen/AddSeason_PlayerScreen.module.css";
import StatsLeagues_Form from "../StatsLeagues_Form";

type AddSeason_Player_FormProps = {
  player?: Players;
  career: Career;
  season: ClubData;
};

const AddSeason_Player_Form = forwardRef<
  HTMLFormElement,
  AddSeason_Player_FormProps
>(({ career, season, player }, ref) => {
  const { clubColor } = useSeasonTheme();
  const leagueFormRef = useRef<HTMLDivElement>(null);

  const {
    mergedFormValues,
    leagues,
    isGoalkeeper,
    originalLeagueNameToEdit,
    finalFormItems,
    handleInputChange,
    handleBooleanChange,
    handleLeagueClick,
    handleAddOrEditLeague,
    isLoading,
  } = usePlayerSeasonStats({ career, season, player, leagueFormRef });

  return (
    <>
      <Form className={Styles.form} ref={ref}>
        <input
          type="hidden"
          name="draftedLeagues"
          value={JSON.stringify(leagues)}
        />

        {finalFormItems.map((item, index) => (
          <div key={index}>
            <FormSection
              ref={item.title === "Selecione a Liga" ? leagueFormRef : null}
              title={item.title}
              rows={item.fields}
              isGoalkeeper={isGoalkeeper}
              formValues={mergedFormValues}
              onInputChange={handleInputChange}
              onBooleanChange={handleBooleanChange}
            />

            {item.title === "Selecione a Liga" && (
              <AddOrEditLeagueButton
                isEditing={!!originalLeagueNameToEdit}
                onClick={handleAddOrEditLeague}
              />
            )}
          </div>
        ))}

        <StatsLeagues_Form
          isGoalkeeper={isGoalkeeper}
          leagues={leagues}
          clubColor={clubColor}
          onLeagueClick={handleLeagueClick}
          originalLeagueNameToEdit={originalLeagueNameToEdit}
        />
      </Form>
      {isLoading && <Load />}
    </>
  );
});

AddSeason_Player_Form.displayName = "AddSeason_Player_Form";
export default AddSeason_Player_Form;
