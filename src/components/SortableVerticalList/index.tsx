import React, { useEffect, useRef, useState } from "react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { TbMenuOrder } from "react-icons/tb";
import Card from "../../ui/Card";
import Styles from "./SortableVerticalList.module.css";

export type SortableVerticalListProps<T> = {
  title: string;
  items: T[];
  getItemId: (item: T) => string;
  renderItemContent: (item: T, index: number) => React.ReactNode;
  onReorderPersist: (newItems: T[]) => Promise<void>;
  readOnly?: boolean;
  className?: string;
  onReorderOptimistic?: (newItems: T[]) => void;
  reorderItems?: (items: T[], activeId: string, overId: string) => T[];
  getDragHandleAriaLabel?: (item: T, index: number) => string | undefined;
  listClassName?: string;
  itemClassName?: string;
  dragHandleSize?: number;
};

type SortableRowProps<T> = {
  id: string;
  item: T;
  index: number;
  readOnly: boolean;
  itemClassName?: string;
  dragHandleSize: number;
  ariaLabel?: string;
  renderItemContent: (item: T, index: number) => React.ReactNode;
};

function SortableRow<T>({
  id,
  item,
  index,
  readOnly,
  itemClassName,
  dragHandleSize,
  ariaLabel,
  renderItemContent,
}: SortableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: readOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    zIndex: isDragging ? 99 : "auto",
    position: isDragging ? "relative" : "static",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={itemClassName ? `${Styles.item} ${itemClassName}` : Styles.item}
    >
      {renderItemContent(item, index)}

      {!readOnly && (
        <div
          {...attributes}
          {...listeners}
          className={Styles.drag_handle}
          aria-label={ariaLabel}
        >
          <TbMenuOrder size={dragHandleSize} />
        </div>
      )}
    </div>
  );
}

export function SortableVerticalList<T>({
  title,
  items,
  getItemId,
  renderItemContent,
  onReorderPersist,
  readOnly = false,
  className,
  onReorderOptimistic,
  reorderItems,
  getDragHandleAriaLabel,
  listClassName,
  itemClassName,
  dragHandleSize = 20,
}: SortableVerticalListProps<T>) {
  const [localItems, setLocalItems] = useState<T[]>(items);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemsRef = useRef<T[] | null>(null);
  const persistRef = useRef(onReorderPersist);

  useEffect(() => {
    persistRef.current = onReorderPersist;
  }, [onReorderPersist]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (pendingItemsRef.current) {
        const toSave = pendingItemsRef.current;
        pendingItemsRef.current = null;
        void Promise.resolve(persistRef.current(toSave)).catch((error) => {
          console.error("Erro ao persistir ordenação ao desmontar:", error);
        });
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
    if (readOnly) return;
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    let updatedItems: T[];
    if (reorderItems) {
      updatedItems = reorderItems(localItems, activeId, overId);
    } else {
      const oldIndex = localItems.findIndex(
        (item) => getItemId(item) === activeId,
      );
      const newIndex = localItems.findIndex(
        (item) => getItemId(item) === overId,
      );
      if (oldIndex === -1 || newIndex === -1) return;
      updatedItems = arrayMove(localItems, oldIndex, newIndex);
    }

    setLocalItems(updatedItems);
    onReorderOptimistic?.(updatedItems);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    pendingItemsRef.current = updatedItems;

    saveTimeoutRef.current = setTimeout(async () => {
      pendingItemsRef.current = null;
      try {
        await persistRef.current(updatedItems);
      } catch (error) {
        console.error("Erro ao salvar ordenação:", error);
      }
    }, 500);
  };

  const combinedListClass = `${listClassName ?? Styles.list} swiper-no-swiping`;

  return (
    <Card className={className ?? Styles.card}>
      <div className={Styles.container_card}>
        <h1 className={Styles.h1}>{title}</h1>
        {readOnly ? (
          <div className={combinedListClass}>
            {localItems.map((item, index) => (
              <div
                key={getItemId(item)}
                className={
                  itemClassName
                    ? `${Styles.item} ${itemClassName}`
                    : Styles.item
                }
              >
                {renderItemContent(item, index)}
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <div className={combinedListClass}>
              <SortableContext
                items={localItems.map((item) => getItemId(item))}
                strategy={verticalListSortingStrategy}
              >
                {localItems.map((item, index) => {
                  const id = getItemId(item);
                  return (
                    <SortableRow
                      key={id}
                      id={id}
                      item={item}
                      index={index}
                      readOnly={false}
                      itemClassName={itemClassName}
                      dragHandleSize={dragHandleSize}
                      ariaLabel={getDragHandleAriaLabel?.(item, index)}
                      renderItemContent={renderItemContent}
                    />
                  );
                })}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </div>
    </Card>
  );
}

export default SortableVerticalList;
