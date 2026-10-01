import Styles from "./Images.module.css";

type ImagesProps = {
  trophyImage: string;
};

export const Images = ({ trophyImage }: ImagesProps) => {
  return (
    <div className={Styles.imgWrapper}>
      <img
        className={Styles.img}
        src={
          trophyImage === "/images/leagues/default.png"
            ? "/base.png"
            : trophyImage
        }
        alt="Troféu"
      />
    </div>
  );
};
