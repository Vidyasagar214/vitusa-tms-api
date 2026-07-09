const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./routes/authRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const swaggerDocument = require("./config/swagger");
const masterDataRoutes = require("./routes/masterDataRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.get("/api/docs.json", (req, res) => {
  res.json(swaggerDocument);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Vitusa TMS API"
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/master-data", masterDataRoutes);
app.use("/api/invoices", invoiceRoutes);

module.exports = app;
