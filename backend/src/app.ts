import express from "express";
import { errorHandler } from "./core/errors";

const app = express();
app.use(express.json());

// Mount global error handler (must be last)
app.use(errorHandler);

export { app };
