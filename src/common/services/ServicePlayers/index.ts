import { PlayersCrudService } from "./PlayersCrudService";
import { PlayersContractService } from "./PlayersContractService";
import { PlayersStatsService } from "./PlayersStatsService";
import { PlayersGroupService } from "./PlayersGroupService";

export const ServicePlayers = {
  ...PlayersCrudService,
  ...PlayersContractService,
  ...PlayersStatsService,
  ...PlayersGroupService,
};
