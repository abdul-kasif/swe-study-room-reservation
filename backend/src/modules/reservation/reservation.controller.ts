import type { Request, Response, NextFunction } from "express";
import { ReservationService } from "./reservation.service";
import {
  CheckAvailabilityBodySchema,
  ConfirmReservationParamsSchema,
  CreateReservationBodySchema,
  ListReservationsQuerySchema,
  ProcessApprovalBodySchema,
  RoomScheduleParamsSchema,
  RoomScheduleQuerySchema,
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
      const created = await this.service.createReservation({
        ...dto,
        userId: req.user!.sub,
      });

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

  public processApproval = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = ConfirmReservationParamsSchema.parse(req.params);
      const { decision } = ProcessApprovalBodySchema.parse(req.body);

      const updatedReservation = await this.service.processApproval(
        id,
        req.user!.sub,
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

  public cancel = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = ConfirmReservationParamsSchema.parse(req.params);
      const cancelled = await this.service.cancelReservation(id);

      res.status(200).json({
        id: cancelled.id,
        state: cancelled.state,
      });
    } catch (error) {
      next(error);
    }
  };

  public checkAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = CheckAvailabilityBodySchema.parse(req.body);
      const status = await this.service.checkAvailability(dto);

      res.status(200).json({ status });
    } catch (error) {
      next(error);
    }
  };

  public cleanupExpired = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const cancelledCount = await this.service.cleanupExpiredReservations();
      res.status(200).json({ cancelledCount });
    } catch (error) {
      next(error);
    }
  };

  public listResources = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const activeResources = await this.service.listResources();
      res.status(200).json({ resources: activeResources });
    } catch (error) {
      next(error);
    }
  };

  public listReservations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filters = ListReservationsQuerySchema.parse(req.query);

      const scopedFilters =
        req.user!.role === "STUDENT"
          ? { ...filters, userId: req.user!.sub }
          : filters;

      const items = await this.service.listReservations(scopedFilters);
      res.status(200).json({ reservations: items });
    } catch (error) {
      next(error);
    }
  };

  public getRoomSchedule = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { resourceId } = RoomScheduleParamsSchema.parse(req.params);
      const { date } = RoomScheduleQuerySchema.parse(req.query);

      const bookedSlots = await this.service.getRoomSchedule(resourceId, date);
      res.status(200).json({ resourceId, date, bookedSlots });
    } catch (error) {
      next(error);
    }
  };
}
