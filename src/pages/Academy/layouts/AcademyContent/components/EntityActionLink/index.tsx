import Styles from "./EntityActionLink.module.css";

export type EntityAction = {
  id: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

type EntityActionLinkProps = {
  activeComponent: string | null;
  setActiveComponent: (component: string | null) => void;
  actions: EntityAction[];
  customBack?: {
    target: string | null;
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
  } | null;
};

export const EntityActionLink = ({
  activeComponent,
  setActiveComponent,
  actions,
  customBack,
}: EntityActionLinkProps) => {
  if (activeComponent) {
    const currentAction = actions.find((a) => a.id === activeComponent);
    return (
      <div className={Styles.listContainer}>
        <div
          onClick={() =>
            setActiveComponent(customBack ? customBack.target : null)
          }
          className={`${Styles.actionCard} ${Styles.backCard}`}
        >
          <div className={Styles.iconContainer}>
            {customBack?.icon || currentAction?.icon}
          </div>
          <div className={Styles.content}>
            <span className={Styles.title}>
              {customBack ? customBack.title : "Voltar para opções"}
            </span>
            <span className={Styles.subtitle}>
              {customBack ? customBack.subtitle : "Escolha outra ação"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={Styles.listContainer}>
      {actions.map((action) => (
        <div
          key={action.id}
          onClick={() => {
            if (action.onClick) {
              action.onClick();
            } else {
              setActiveComponent(action.id);
            }
          }}
          className={Styles.actionCard}
        >
          <div className={Styles.iconContainer}>{action.icon}</div>
          <div className={Styles.content}>
            <span className={Styles.title}>{action.label}</span>
            <span className={Styles.subtitle}>
              {action.subtitle || "Toque para abrir"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
