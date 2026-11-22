import type { Request, Response, NextFunction } from "express";
import { ReservationService } from "./reservation.service";
import {
  ConfirmReservationParamsSchema,
  CreateReservationBodySchema,
  ProcessApprovalBodySchema,
} from "./reservation.schema";

export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = CreateReservationBodySchema.parse(req.body);
      const created = await this.service.createReservation(dto);

      res.status(201).json({
        id: created.id,
        resourceId: created.resourceId,
        startTime: created.startTime,
        endTime: created.endTime,
        state: created.state,
      });
    } catch (error) {
      next(error);
    }
  };

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

  public processApproval = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = ConfirmReservationParamsSchema.parse(req.params);
      const { adminId, decision } = ProcessApprovalBodySchema.parse(req.body);

      const updatedReservation = await this.service.processApproval(
        id,
        adminId,
        decision,
      );

      res.status(200).json({
        id: updatedReservation.id,
        state: updatedReservation.state,
      });
    } catch (error) {
      next(error);
    }
  };
}
