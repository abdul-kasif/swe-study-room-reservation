import { z } from "zod";

export const CreateReservationBodySchema = z
  .object({
    resourceId: z.string().trim().min(1, "resourceId is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Invalid interval: startTime must be strictly before endTime",
    path: ["endTime"],
  });

export const ConfirmReservationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ProcessApprovalBodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export const CheckAvailabilityBodySchema = z
  .object({
    resourceId: z.string().trim().min(1, "resourceId is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Invalid interval: startTime must be strictly before endTime",
    path: ["endTime"],
  });

export const ListReservationsQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  state: z
    .enum(["DRAFT", "PENDING_APPROVAL", "CONFIRMED", "CANCELLED"])
    .optional(),
});

export const RoomScheduleParamsSchema = z.object({
  resourceId: z.string().trim().min(1, "resourceId is required"),
});

export const RoomScheduleQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
});

export type CreateReservationBody = z.infer<typeof CreateReservationBodySchema>;
export type ConfirmReservationParams = z.infer<
  typeof ConfirmReservationParamsSchema
>;
export type ProcessApprovalBody = z.infer<typeof ProcessApprovalBodySchema>;
export type CheckAvailabilityBody = z.infer<typeof CheckAvailabilityBodySchema>;
export type ListReservationsQuery = z.infer<typeof ListReservationsQuerySchema>;
