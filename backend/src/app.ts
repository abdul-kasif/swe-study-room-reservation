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

app.use("/api/reservations", reservationRouter);

reservationRouter.post("/", reservationController.create);
reservationRouter.post("/:id/confirm", reservationController.confirm);
reservationRouter.post("/:id/approval", reservationController.processApproval);
reservationRouter.post("/:id/cancel", reservationController.cancel);

app.post("/api/availability", reservationController.checkAvailability);

app.use(errorHandler);

export { app };
