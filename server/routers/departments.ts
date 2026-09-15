import { asc } from "drizzle-orm";
import { departments } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";
import { defaultDepartments } from "./issues";
import { getDb } from "../db";

export const departmentsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return defaultDepartments;
    const rows = await db.select().from(departments).orderBy(asc(departments.name));
    return rows.length ? rows : defaultDepartments;
  }),
});
