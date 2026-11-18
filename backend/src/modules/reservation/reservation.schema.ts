import { z } from "zod";

export const ReservationCreateSchema = z
  .object({
    resourceId: z.string().min(1),
    userId: z.string().min(1),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Invalid interval: start time must be before end time",
    path: ["endTime"],
  });

export type ReservationCreateDTO = z.infer<typeof ReservationCreateSchema>;

export const ConfirmReservationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ConfirmReservationParams = z.infer<
  typeof ConfirmReservationParamsSchema
>;

export const ProcessApprovalBodySchema = z.object({
  adminId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

export type ProcessApprovalBody = z.infer<typeof ProcessApprovalBodySchema>;
