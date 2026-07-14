// وظائف الصيانة التلقائية - حذف الطلبات القديمة
import { db } from "@/lib/db";

/// حذف الطلبات التي مرّ عليها أكثر من 10 أيام
export async function cleanupOldOrders(daysOld = 10): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  try {
    const result = await db.printOrder.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  } catch {
    return 0;
  }
}

/// استدعاء الصيانة في بداية كل طلب API (lazy cleanup)
export async function runAutoCleanup(): Promise<void> {
  // تشغيل مرة كل ساعة على الأكثر باستخدام متغير عام
  const globalForCleanup = globalThis as unknown as {
    lastCleanup?: number;
  };
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  if (globalForCleanup.lastCleanup && now - globalForCleanup.lastCleanup < ONE_HOUR) {
    return;
  }
  globalForCleanup.lastCleanup = now;
  await cleanupOldOrders(10);
}
