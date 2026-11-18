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

export const ConfirmReservationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ReservationCreateDTO = z.infer<typeof ReservationCreateSchema>;

export type ConfirmReservationParams = z.infer<
  typeof ConfirmReservationParamsSchema
>;
