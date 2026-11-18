import { Dispatch, SetStateAction } from "react";
import Input from "../../../../components/Input";

type EditManagerNameProps = {
  managerName: string;
  className: string;
  setManagerName: Dispatch<SetStateAction<string>>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

export const EditManagerName = ({
  managerName,
  className,
  setManagerName,
  onFocus,
  onBlur,
}: EditManagerNameProps) => (
  <Input
    className={className}
    name="manager"
    id="manager"
    value={managerName}
    onChange={(e) => setManagerName(e.target.value)}
    placeholder={managerName || "Ex: Hansi Flick"}
    onFocus={onFocus}
    onBlur={onBlur}
  />
);
