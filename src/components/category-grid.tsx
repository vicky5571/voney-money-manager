"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useDragControls, DragControls } from "motion/react";
import { CategoryIcon } from "@/constants/categories";
import { cn, saveCategoryOrder } from "@/lib/utils";
import { hapticLight, hapticMedium, hapticSelection } from "@/lib/capacitor";
import { Settings2 } from "lucide-react";

export interface CategoryGridItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryGridProps {
  categories: CategoryGridItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onManageCategories?: () => void;
  onReorder?: (reordered: CategoryGridItem[]) => void;
}

interface CategoryCardProps {
  cat: CategoryGridItem;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  isDragging: boolean;
  onStartHold: (
    id: string,
    e: React.PointerEvent,
    controls: DragControls,
  ) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (id: string) => void;
  onPointerCancel: () => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, point: { x: number; y: number }) => void;
  onDragEnd: () => void;
}

interface SlotRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function CategoryCard({
  cat,
  index,
  isSelected,
  isEditing,
  isDragging,
  onStartHold,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDragStart,
  onDrag,
  onDragEnd,
}: CategoryCardProps) {
  const dragControls = useDragControls();

  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 28 },
      }}
      drag={isEditing}
      dragControls={dragControls}
      dragListener={isEditing}
      dragSnapToOrigin
      dragElastic={0.12}
      whileDrag={{
        scale: 1.12,
        zIndex: 50,
      }}
      onDragStart={() => onDragStart(cat.id)}
      onDrag={(event, info) => {
        // Extract robust viewport client coordinates across mouse and touch
        let clientX = info.point.x;
        let clientY = info.point.y;

        if (event && "clientX" in event && typeof event.clientX === "number") {
          clientX = event.clientX;
          clientY = event.clientY;
        } else if (
          event &&
          "touches" in event &&
          (event as TouchEvent).touches?.length > 0
        ) {
          clientX = (event as TouchEvent).touches[0].clientX;
          clientY = (event as TouchEvent).touches[0].clientY;
        }

        onDrag(cat.id, { x: clientX, y: clientY });
      }}
      onDragEnd={onDragEnd}
      onPointerDown={(e) => onStartHold(cat.id, e, dragControls)}
      onPointerMove={onPointerMove}
      onPointerUp={() => onPointerUp(cat.id)}
      onPointerCancel={onPointerCancel}
      animate={
        isEditing && !isDragging
          ? {
              rotate: [0, -1.2, 1.2, -1.2, 0],
              y: [0, -0.6, 0.6, 0],
              transition: {
                repeat: Infinity,
                duration: 0.32,
                delay: (index % 3) * 0.05,
              },
            }
          : { rotate: 0, y: 0 }
      }
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-2xl select-none min-h-[96px] cursor-pointer touch-none transition-colors outline-none focus:outline-none focus:ring-0",
        isEditing ? "cursor-grab active:cursor-grabbing" : "active:scale-95",
        isEditing || isDragging
          ? "border-2 border-emerald-400/50 bg-white"
          : isSelected
            ? "bg-emerald-50 border-2 border-emerald-500"
            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent",
      )}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full mb-2 pointer-events-none"
        style={{ backgroundColor: `${cat.color}1A` }}
      >
        <CategoryIcon name={cat.icon} size={24} style={{ color: cat.color }} />
      </div>
      <span
        className={cn(
          "text-xs font-semibold text-center truncate max-w-[80px] pointer-events-none",
          isSelected && !isEditing
            ? "text-emerald-500 font-bold"
            : "text-gray-700",
        )}
      >
        {cat.name}
      </span>
    </motion.div>
  );
}

export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  onManageCategories,
  onReorder,
}: CategoryGridProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [items, setItems] = useState<CategoryGridItem[]>(categories);

  const containerRef = useRef<HTMLDivElement>(null);
  const slotRectsRef = useRef<SlotRect[]>([]);
  const reorderedItemsRef = useRef<CategoryGridItem[] | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const lastDragEndTimeRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number; id: string } | null>(
    null,
  );
  const [prevCategories, setPrevCategories] =
    useState<CategoryGridItem[]>(categories);

  // Sync internal items whenever categories prop changes (React 19 render adjustment pattern)
  if (categories !== prevCategories) {
    setPrevCategories(categories);
    setItems(categories);
    setIsEditing(false);
    setActiveDragId(null);
  }

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsEditing(false);
    setActiveDragId(null);
    wasDraggingRef.current = true;
    lastDragEndTimeRef.current = Date.now() + 600;
    hapticLight();
    const finalItems = reorderedItemsRef.current ?? items;
    if (reorderedItemsRef.current) {
      saveCategoryOrder(finalItems.map((c) => c.id));
      if (onReorder) {
        onReorder(finalItems);
      }
      reorderedItemsRef.current = null;
    }
  }, [items, onReorder]);

  // Global pointerup safety net to ensure editing/dragging is always cleared on release
  useEffect(() => {
    if (!activeDragId && !isEditing) return;

    const handleGlobalPointerUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      handleDragEnd();
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    window.addEventListener("touchend", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      window.removeEventListener("touchend", handleGlobalPointerUp);
    };
  }, [activeDragId, isEditing, handleDragEnd]);

  // Snapshot physical grid slot bounding boxes before items move
  const measureSlotRects = useCallback(() => {
    if (!containerRef.current) return;
    const children = Array.from(containerRef.current.children).filter(
      (child) => !child.classList.contains("manage-category-button"),
    );
    slotRectsRef.current = children.map((child) => {
      const rect = child.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    });
  }, []);

  const handleStartHold = useCallback(
    (id: string, e: React.PointerEvent, controls: DragControls) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, id };
      isLongPressTriggeredRef.current = false;
      wasDraggingRef.current = false;

      if (isEditing) {
        wasDraggingRef.current = true;
        lastDragEndTimeRef.current = Date.now() + 1000;
        measureSlotRects();
        controls.start(e);
        setActiveDragId(id);
        hapticLight();
        return;
      }

      // Start long press timer for hold-and-drag in a single touch
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        wasDraggingRef.current = true;
        lastDragEndTimeRef.current = Date.now() + 1000;
        setIsEditing(true);
        setActiveDragId(id);
        measureSlotRects();
        hapticMedium();
        // Immediately connect dragging to the active touch gesture
        controls.start(e);
      }, 350);
    },
    [isEditing, measureSlotRects],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerStartRef.current.x,
        e.clientY - pointerStartRef.current.y,
      );
      // If user moved more than 8px before 350ms, they are scrolling — cancel long press
      if (dist > 8 && !isLongPressTriggeredRef.current) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback(
    (id: string) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPressTriggeredRef.current || activeDragId) {
        handleDragEnd();
        pointerStartRef.current = null;
        return;
      }

      const isLockedByDrag = Date.now() < lastDragEndTimeRef.current;
      const didDragOrLongPress = wasDraggingRef.current || isLockedByDrag;

      if (!didDragOrLongPress && !isEditing) {
        onSelect(id);
        hapticLight();
      }

      pointerStartRef.current = null;
    },
    [activeDragId, handleDragEnd, isEditing, onSelect],
  );

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (activeDragId || isEditing) {
      handleDragEnd();
    }
    pointerStartRef.current = null;
  }, [activeDragId, isEditing, handleDragEnd]);

  const handleDragStart = useCallback(
    (id: string) => {
      wasDraggingRef.current = true;
      lastDragEndTimeRef.current = Date.now() + 1000;
      setActiveDragId(id);
      measureSlotRects();
    },
    [measureSlotRects],
  );

  const handleDrag = useCallback(
    (draggedId: string, point: { x: number; y: number }) => {
      wasDraggingRef.current = true;
      lastDragEndTimeRef.current = Date.now() + 1000;
      const slotRects = slotRectsRef.current;
      if (!slotRects.length) return;

      // 1. Direct bounding box collision check
      let targetIndex = -1;
      for (let i = 0; i < slotRects.length; i++) {
        const slot = slotRects[i];
        if (
          point.x >= slot.left &&
          point.x <= slot.right &&
          point.y >= slot.top &&
          point.y <= slot.bottom
        ) {
          targetIndex = i;
          break;
        }
      }

      // 2. Proximity fallback (if pointer is slightly outside bounding box or in grid gap)
      if (targetIndex === -1) {
        let minDistance = Infinity;
        for (let i = 0; i < slotRects.length; i++) {
          const slot = slotRects[i];
          const dist = Math.hypot(
            point.x - slot.centerX,
            point.y - slot.centerY,
          );
          if (dist < minDistance && dist < 120) {
            minDistance = dist;
            targetIndex = i;
          }
        }
      }

      if (targetIndex === -1) return;

      // 3. Swap when dragged item enters a new slot via functional update
      setItems((currentList) => {
        const draggedIndex = currentList.findIndex((c) => c.id === draggedId);
        if (draggedIndex === -1 || draggedIndex === targetIndex)
          return currentList;

        const reordered = [...currentList];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, moved);

        reorderedItemsRef.current = reordered;
        hapticSelection();
        return reordered;
      });
    },
    [],
  );

  return (
    <div className="space-y-3">
      {/* 2D Categories Grid */}
      <div ref={containerRef} className="grid grid-cols-3 gap-3 relative">
        {items.map((cat, index) => {
          const isSelected = selectedId === cat.id;
          const isDragging = activeDragId === cat.id;

          return (
            <CategoryCard
              key={cat.id}
              cat={cat}
              index={index}
              isSelected={isSelected}
              isEditing={isEditing}
              isDragging={isDragging}
              onStartHold={handleStartHold}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
            />
          );
        })}

        {/* Manage / Add Custom Category Card */}
        {onManageCategories && (
          <button
            type="button"
            onClick={onManageCategories}
            className="manage-category-button flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/60 border border-dashed border-emerald-200 transition-all min-h-[96px] active:scale-95 text-emerald-500 cursor-pointer"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-emerald-100 text-emerald-500">
              <Settings2 size={22} />
            </div>
            <span className="text-xs font-bold text-center text-emerald-500">
              Manage
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
