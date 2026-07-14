import { db } from "@/lib/db";

export interface AuditEntry {
  orderId?: string;
  action: "create" | "status_change" | "edit" | "delete" | "settings_change";
  field?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export async function addAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orderId: entry.orderId || null,
        action: entry.action,
        field: entry.field || null,
        oldValue: entry.oldValue || null,
        newValue: entry.newValue || null,
        details: entry.details || null,
      },
    });
  } catch {
    // لا نُفشل العملية الأساسية بسبب فشل سجل التغييرات
  }
}

export async function getOrderAuditLogs(orderId: string) {
  return db.auditLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}