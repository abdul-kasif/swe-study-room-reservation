import { z } from "zod";

export const CreateReservationBodySchema = z
  .object({
    resourceId: z.string().trim().min(1, "resourceId is required"),
    userId: z.string().trim().min(1, "userId is required"),
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
  adminId: z.string().min(1),
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

export type CreateReservationBody = z.infer<typeof CreateReservationBodySchema>;
export type ConfirmReservationParams = z.infer<
  typeof ConfirmReservationParamsSchema
>;
export type ProcessApprovalBody = z.infer<typeof ProcessApprovalBodySchema>;
export type CheckAvailabilityBody = z.infer<typeof CheckAvailabilityBodySchema>;
