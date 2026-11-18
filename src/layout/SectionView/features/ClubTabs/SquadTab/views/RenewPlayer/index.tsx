import React from "react";
import { RenewPlayerProps } from "./types";
import { RenewPlayerProvider } from "./contexts/RenewPlayerProvider";
import RenewPlayerScreen from "./screens/RenewPlayerScreen";

export const RenewPlayer: React.FC<RenewPlayerProps> = (props) => {
  return (
    <RenewPlayerProvider {...props}>
      <RenewPlayerScreen
        career={props.career}
        season={props.season}
        onClose={props.onClose}
      />
    </RenewPlayerProvider>
  );
};

export default RenewPlayer;

