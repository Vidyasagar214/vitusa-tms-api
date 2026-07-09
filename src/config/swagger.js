const path = require("path");
const YAML = require("yamljs");

const docsDir = path.join(process.cwd(), "docs");

const loadYaml = (relativePath) =>
  YAML.load(path.join(docsDir, relativePath));

const base = loadYaml("openapi.yaml");
const authPaths = loadYaml("paths/auth.yaml");
const shipmentPaths = loadYaml("paths/shipments.yaml");
const dashboardPaths = loadYaml("paths/dashboard.yaml");
const userPaths = loadYaml("paths/users.yaml");
const masterDataPaths = loadYaml("paths/master-data.yaml");
const invoicePaths = loadYaml("paths/invoices.yaml");

const schemas = {
  ...loadYaml("schemas/error.yaml"),
  ...loadYaml("schemas/pagination.yaml"),
  ...loadYaml("schemas/shipment.yaml"),
  ...loadYaml("schemas/user.yaml"),
  ...loadYaml("schemas/dashboard.yaml"),
  ...loadYaml("schemas/users-admin.yaml"),
  ...loadYaml("schemas/master-data.yaml"),
  ...loadYaml("schemas/invoices.yaml")
};

const swaggerDocument = {
  ...base,
  paths: {
    ...authPaths,
    ...shipmentPaths,
    ...dashboardPaths,
    ...userPaths,
    ...masterDataPaths,
    ...invoicePaths,
  },
  components: {
    ...base.components,
    schemas
  }
};

module.exports = swaggerDocument;
