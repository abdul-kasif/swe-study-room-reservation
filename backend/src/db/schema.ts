import { pgTable, serial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const resources = pgTable("resources", {
  resourceId: varchar("resource_id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  resourceId: varchar("resource_id", { length: 255 })
    .notNull()
    .references(() => resources.resourceId),
  userId: varchar("user_id", { length: 255 }).notNull(),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }).notNull(),
  state: varchar("state", { length: 50 }).default("DRAFT").notNull(),
});

export type Resource = InferSelectModel<typeof resources>;
export type Reservation = InferSelectModel<typeof reservations>;
export type NewReservation = InferInsertModel<typeof reservations>;
