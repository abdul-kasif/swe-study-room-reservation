import express from "express";
import { errorHandler } from "./core/errors";
import { ReservationController } from "./modules/reservation/reservation.controller";
import { ReservationService } from "./modules/reservation/reservation.service";
import { ReservationRepository } from "./modules/reservation/reservation.repository";

const app = express();
app.use(express.json());

const reservationRepo = new ReservationRepository();
const reservationService = new ReservationService(reservationRepo);
const reservationController = new ReservationController(reservationService);

const reservationRouter = express.Router();

reservationRouter.post("/:id/confirm", reservationController.confirm);
reservationRouter.post("/:id/approval", reservationController.processApproval);

app.use("/api/reservations", reservationRouter);

app.use(errorHandler);

export { app };
