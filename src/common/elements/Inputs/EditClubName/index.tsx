import { Dispatch, SetStateAction } from "react";
import Input from "../../../../components/Input";

type EditClubNameProps = {
  clubName: string;
  className: string;
  setClubName: Dispatch<SetStateAction<string>>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

export const EditClubName = ({
  clubName,
  setClubName,
  className,
  onFocus,
  onBlur,
}: EditClubNameProps) => (
  <Input
    className={className}
    name="club"
    id="club"
    value={clubName}
    onChange={(e) => setClubName(e.target.value)}
    placeholder={clubName || "Ex: FC Barcelona"}
    onFocus={onFocus}
    onBlur={onBlur}
  />
);
