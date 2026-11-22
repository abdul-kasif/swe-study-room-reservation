import express from "express";
import cors from "cors";
import { errorHandler } from "./core/errors";
import { ReservationController } from "./modules/reservation/reservation.controller";
import { ReservationService } from "./modules/reservation/reservation.service";
import { ReservationRepository } from "./modules/reservation/reservation.repository";
import { AuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { requireAdminAuth } from "./core/auth";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

const authRepo = new AuthRepository();
const authService = new AuthService(authRepo);
const authController = new AuthController(authService);

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/register", authController.register);

app.use("/api/auth", authRouter);

const reservationRepo = new ReservationRepository();
const reservationService = new ReservationService(reservationRepo);
const reservationController = new ReservationController(reservationService);

const reservationRouter = express.Router();

app.use("/api/reservations", reservationRouter);

reservationRouter.post("/", reservationController.create);
reservationRouter.post("/:id/confirm", reservationController.confirm);
reservationRouter.post("/:id/cancel", reservationController.cancel);
reservationRouter.get("/", reservationController.listReservations);

// Protect VIP approval with admin auth
reservationRouter.post(
  "/:id/approval",
  requireAdminAuth,
  reservationController.processApproval,
);

app.post("/api/availability", reservationController.checkAvailability);

app.post(
  "/api/admin/cleanup-expired",
  requireAdminAuth,
  reservationController.cleanupExpired,
);

app.get("/api/resources", reservationController.listResources);

app.use(errorHandler);

export { app };
