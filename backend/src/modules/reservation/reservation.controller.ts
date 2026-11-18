import type { Request, Response, NextFunction } from "express";
import { ReservationService } from "./reservation.service";
import { ConfirmReservationParamsSchema } from "./reservation.schema";

export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  public confirm = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = ConfirmReservationParamsSchema.parse(req.params);

      const updatedReservation = await this.service.confirmReservation(id);

      res.status(200).json({
        id: updatedReservation.id,
        state: updatedReservation.state,
      });
    } catch (error) {
      next(error);
    }
  };
}
