import { useEffect, useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import Titles from "../../GeneralTab.module.css";
import Card from "../../../../../../../ui/Card";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { League } from "../../../../../../../common/interfaces/League";
import Styles from "./CompetitionsCard.module.css";
import SortableLeagueItem from "./components/SortableLeagueItem";
import { getSortedLeagues } from "./helpers/getSortedLeagues";
import { reorderLeagues } from "./helpers/reorderLeagues";
import { ServiceSeasons } from "../../../../../../../common/services/ServiceSeasons";

type CompetitionsCardProps = {
  season: ClubData;
  careerId: string;
  onReorderLeagues?: (updatedLeagues: League[]) => void;
};

const CompetitionsCard = ({
  season,
  careerId,
  onReorderLeagues,
}: CompetitionsCardProps) => {
  const [leagues, setLeagues] = useState<League[]>(() =>
    getSortedLeagues(season?.leagues || []),
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLeagues(getSortedLeagues(season?.leagues || []));
  }, [season?.leagues]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const updatedLeagues = reorderLeagues(
      leagues,
      String(active.id),
      String(over.id),
    );

    setLeagues(updatedLeagues);
    onReorderLeagues?.(updatedLeagues);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await ServiceSeasons.updateSeasonLeagues(
          careerId,
          season.id,
          updatedLeagues,
        );
      } catch (error) {
        console.error("Erro ao salvar a ordem das ligas no Firebase:", error);
      }
    }, 500);
  };

  return (
    <Card className={Titles.card}>
      <div className={Titles.container_card}>
        <h1 className={Titles.h1}>Competições</h1>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <div className={`${Styles.container_leagues} swiper-no-swiping`}>
            <SortableContext
              items={leagues.map((league) => league.name)}
              strategy={verticalListSortingStrategy}
            >
              {leagues.map((league) => (
                <SortableLeagueItem key={league.name} league={league} />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </Card>
  );
};

export default CompetitionsCard;
