import { createPortal } from "react-dom";
import Styles from "./Load.module.css";

type LoadProps = {
  isTransfers?: boolean;
};

const Load = ({ isTransfers }: LoadProps) => {
  const content = (
    <div
      className={
        isTransfers ? Styles.containerLoadTransfers : Styles.containerLoad
      }
    >
      <svg className={Styles.svgLoad} viewBox="25 25 50 50">
        <circle className={Styles.circleLoad} r="20" cy="50" cx="50"></circle>
      </svg>
    </div>
  );

  return (
    <>
      <span style={{ display: "none" }} aria-hidden="true">
        <svg className={Styles.svgLoad} viewBox="25 25 50 50">
          <circle className={Styles.circleLoad} r="20" cy="50" cx="50"></circle>
        </svg>
      </span>
      {typeof document !== "undefined" && document.body
        ? createPortal(content, document.body)
        : content}
    </>
  );
};

export default Load;
