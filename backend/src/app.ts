import express from "express";
import cors from "cors";
import { errorHandler } from "./core/errors";
import { ReservationController } from "./modules/reservation/reservation.controller";
import { ReservationService } from "./modules/reservation/reservation.service";
import { ReservationRepository } from "./modules/reservation/reservation.repository";
import { AuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { requireAuth, requireRole } from "./core/auth";

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

// Reservation routes (all require a valid JWT)
const reservationRouter = express.Router();
reservationRouter.use(requireAuth);
reservationRouter.get("/", reservationController.listReservations);
reservationRouter.post("/", reservationController.create);
reservationRouter.post("/:id/confirm", reservationController.confirm);
reservationRouter.post("/:id/cancel", reservationController.cancel);
reservationRouter.post(
  "/:id/approval",
  requireRole("ADMIN"),
  reservationController.processApproval,
);

app.use("/api/reservations", reservationRouter);
app.get("/api/resources", requireAuth, reservationController.listResources);
app.post(
  "/api/availability",
  requireAuth,
  reservationController.checkAvailability,
);
app.post(
  "/api/admin/cleanup-expired",
  requireAuth,
  requireRole("ADMIN"),
  reservationController.cleanupExpired,
);

app.get(
  "/api/resources/:resourceId/schedule",
  requireAuth,
  reservationController.getRoomSchedule,
);

app.use(errorHandler);

export { app };
