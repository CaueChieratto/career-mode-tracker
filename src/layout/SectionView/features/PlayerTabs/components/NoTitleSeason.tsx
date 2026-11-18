import Styles from "../PlayerTabs.module.css";

type NoTitleSeasonProps = {
  text: string;
  leagueName: string;
};

const NoTitleSeason = ({ text, leagueName }: NoTitleSeasonProps) => {
  return (
    <section className={Styles.container}>
      <h1 className={Styles.leagueName_noTitle}>
        {text} {leagueName}
      </h1>
    </section>
  );
};

export default NoTitleSeason;
