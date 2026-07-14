"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  Loader2,
  Package,
  CheckCircle2,
  GripVertical,
  XCircle,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { formatDA } from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ي`;
}

const COLUMNS = [
  { key: "pending", label: "بانتظار", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  { key: "printing", label: "جارٍ الطباعة", icon: Loader2, color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  { key: "ready", label: "جاهز", icon: Package, color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle2, color: "bg-neutral-50 text-neutral-600 border-neutral-200", dot: "bg-neutral-400" },
  { key: "cancelled", label: "ملغى", icon: XCircle, color: "bg-rose-50 text-rose-600 border-rose-200", dot: "bg-rose-400" },
] as const;

const SERVICE_EMOJI: Record<string, string> = {
  document: "🖨️",
  photo: "🖼️",
  binding: "📚",
  copy: "📄",
  card: "🪪",
  poster: "📜",
};

interface KanbanBoardProps {
  orders: PrintOrderLite[];
  onStatusChange: (order: PrintOrderLite, newStatus: string) => void;
  onRefresh: () => void;
}

/** بطاقة طلب قابلة للسحب */
function SortableOrderCard({
  order,
  isDragging,
}: {
  order: PrintOrderLite;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isStale =
    order.status !== "delivered" &&
    order.status !== "cancelled" &&
    Date.now() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-lg border p-3 mb-2 transition-shadow ${
        isDragging
          ? "shadow-lg ring-2 ring-primary/30 z-50 opacity-90"
          : "hover:shadow-sm"
      } ${isStale ? "border-amber-300 bg-amber-50/30" : ""}`}
    >
      <div className="flex items-start gap-2">
        {/* مقبض السحب */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          aria-label="اسحب"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold font-mono text-neutral-900">
              {order.reference}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
              {SERVICE_EMOJI[order.serviceType] || ""} {order.serviceName}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate mb-1">
            {order.customer?.name || "—"}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">
              {formatDA(order.total)}
            </span>
            <div className="flex items-center gap-1.5">
              {isStale && <AlertTriangle className="h-3 w-3 text-amber-500" />}
              <span className="text-[10px] text-muted-foreground">
                {order.copies}ن · {order.pages}ص
              </span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
            <Timer className="h-2.5 w-2.5" />
            {timeAgo(order.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** منطقة إسقاط الإلغاء */
function CancelDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-colors text-xs font-medium ${
        isOver
          ? "border-rose-400 bg-rose-50 text-rose-600 scale-[1.02]"
          : "border-rose-200 text-rose-400"
      }`}
    >
      <XCircle className="h-4 w-4" />
      <span>اسحب هنا للإلغاء</span>
    </div>
  );
}

export function KanbanBoard({
  orders,
  onStatusChange,
  onRefresh,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const columnOrders = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        orders: orders.filter((o) => o.status === col.key),
        totalRevenue: orders
          .filter((o) => o.status === col.key)
          .reduce((sum, o) => sum + o.total, 0),
      })),
    [orders],
  );

  const allOrderIds = useMemo(() => orders.map((o) => o.id), [orders]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => setActiveId(event.active.id as string),
    [],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeOrderId = active.id as string;
      const overId = over.id as string;

      // إذا أُسقط على منطقة الإلغاء
      if (overId === "cancel-drop-zone") {
        const order = orders.find((o) => o.id === activeOrderId);
        if (order && order.status !== "cancelled") {
          await onStatusChange(order, "cancelled");
        }
        return;
      }

      // إذا أُسقط على عمود (لا على بطاقة أخرى)
      const targetColumn = COLUMNS.find((c) => c.key === overId);
      if (targetColumn) {
        const order = orders.find((o) => o.id === activeOrderId);
        if (order && order.status !== targetColumn.key) {
          await onStatusChange(order, targetColumn.key);
        }
        return;
      }

      // إذا أُسقط على بطاقة أخرى في عمود مختلف
      const targetOrder = orders.find((o) => o.id === overId);
      const activeOrder = orders.find((o) => o.id === activeOrderId);
      if (
        targetOrder &&
        activeOrder &&
        targetOrder.status !== activeOrder.status
      ) {
        await onStatusChange(activeOrder, targetOrder.status);
      }
    },
    [orders, onStatusChange],
  );

  const activeOrder = activeId
    ? orders.find((o) => o.id === activeId)
    : null;

  const { setNodeRef: setCancelRef, isOver: isCancelOver } = useDroppable({
    id: "cancel-drop-zone",
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 min-h-[400px]">
        {columnOrders.map((col) => (
          <div key={col.key} className="flex flex-col">
            {/* رأس العمود */}
            <div
              className={`flex flex-col px-3 py-2 rounded-t-lg border border-b-0 ${col.color}`}
            >
              <div className="flex items-center gap-2">
                <col.icon className="h-3.5 w-3.5" />
                <span className="font-medium text-xs">{col.label}</span>
                <span className="mr-auto flex items-center gap-1">
                  <span className="text-[10px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full">
                    {col.orders.length}
                  </span>
                </span>
              </div>
              {col.orders.length > 0 && (
                <div className="text-[10px] opacity-70 mt-0.5">
                  {formatDA(col.totalRevenue)}
                </div>
              )}
            </div>
            {/* محتوى العمود */}
            <SortableContext
              items={col.orders.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="flex-1 p-1.5 border rounded-b-lg bg-muted/20 space-y-0 min-h-[150px] max-h-[60vh] overflow-y-auto"
                data-column={col.key}
              >
                {col.orders.length === 0 ? (
                  <div className="text-center text-[10px] text-muted-foreground/40 py-6">
                    <col.icon className="h-5 w-5 mx-auto mb-1 opacity-30" />
                    لا توجد طلبات
                  </div>
                ) : (
                  col.orders.map((order) => (
                    <SortableOrderCard
                      key={order.id}
                      order={order}
                      isDragging={order.id === activeId}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      {/* منطقة إسقاط الإلغاء */}
      <div ref={setCancelRef} className="mt-4">
        <CancelDropZone isOver={isCancelOver} />
      </div>

      {/* DragOverlay: نسخة متحركة أثناء السحب */}
      <DragOverlay>
        {activeOrder && (
          <SortableOrderCard order={activeOrder} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}