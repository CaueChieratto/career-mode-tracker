import React from "react";
import { MdOutlineClose } from "react-icons/md";
import {
  dismissToast,
  pauseToastTimer,
  resumeToastTimer,
  StandardToastItem,
} from "../../../../common/services/ToastService";
import { TOAST_VISUAL_CONFIG } from "../../constants/toastVisualConfig";
import Styles from "../../Toast.module.css";

interface ToastCardProps {
  item: StandardToastItem;
}

export const ToastCard: React.FC<ToastCardProps> = ({ item }) => {
  const config = TOAST_VISUAL_CONFIG[item.type];
  const title = item.title ?? config.defaultTitle;

  const handlePause = () => pauseToastTimer(item.id);
  const handleResume = () => resumeToastTimer(item.id);

  return (
    <article
      className={`${Styles.card} ${config.className}`}
      data-testid={`toast-${item.type}`}
      data-toast-type={item.type}
      role={config.role}
      aria-live={config.ariaLive}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <div className={Styles.iconWrapper}>{config.icon}</div>
      <div className={Styles.content}>
        <div className={Styles.header}>
          <span className={Styles.title}>{title}</span>
          {item.dismissible && (
            <button
              type="button"
              className={Styles.closeButton}
              aria-label="Fechar notificação"
              onClick={() => dismissToast(item.id)}
            >
              <MdOutlineClose aria-hidden="true" />
            </button>
          )}
        </div>
        <p className={Styles.message}>{item.message}</p>
      </div>
    </article>
  );
};

