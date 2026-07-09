require("dotenv").config();

const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");

const invoices = [
  {
    invoiceId: "INV-88421",
    shipmentId: "VTS-2026-04821",
    carrier: "Midwest Tank Lines",
    expectedAmount: 4280,
    submittedAmount: 4280,
    status: "Approved"
  },
  {
    invoiceId: "INV-88398",
    shipmentId: "VTS-2026-04815",
    carrier: "Gulf Coast Carriers",
    expectedAmount: 3950,
    submittedAmount: 4200,
    status: "On Hold",
    holdReason: "Transit heating charge not pre-approved on shipment.",
    varianceDetail: {
      baseRate: 3520,
      fuelSurcharge: 430,
      unauthorizedAccessorial: 250,
      variance: 250,
      reason: "Transit heating charge not pre-approved on shipment."
    }
  },
  {
    invoiceId: "INV-88312",
    shipmentId: "VTS-2026-04798",
    carrier: "National Freight Co.",
    expectedAmount: 2180,
    submittedAmount: 2180,
    status: "Approved"
  },
  {
    invoiceId: "INV-88290",
    shipmentId: "VTS-2026-04785",
    carrier: "Regional Express",
    expectedAmount: 890,
    submittedAmount: 890,
    status: "Approved"
  },
  {
    invoiceId: "INV-88245",
    shipmentId: "VTS-2026-04772",
    carrier: "West Coast Tankers",
    expectedAmount: 5120,
    submittedAmount: 5120,
    status: "Approved"
  },
  {
    invoiceId: "INV-88201",
    shipmentId: "VTS-2026-04821",
    carrier: "Midwest Tank Lines",
    expectedAmount: 4280,
    submittedAmount: 4350,
    status: "On Hold",
    holdReason: "Detention charge exceeds approved threshold.",
    varianceDetail: {
      baseRate: 3850,
      fuelSurcharge: 430,
      unauthorizedAccessorial: 70,
      variance: 70,
      reason: "Detention charge exceeds approved threshold."
    }
  },
  {
    invoiceId: "INV-88188",
    shipmentId: "VTS-2026-04798",
    carrier: "National Freight Co.",
    expectedAmount: 2180,
    submittedAmount: 2180,
    status: "Approved"
  },
  {
    invoiceId: "INV-88155",
    shipmentId: "VTS-2026-04815",
    carrier: "Gulf Coast Carriers",
    expectedAmount: 3950,
    submittedAmount: 4100,
    status: "On Hold",
    holdReason: "Fuel surcharge mismatch vs contracted schedule.",
    varianceDetail: {
      baseRate: 3520,
      fuelSurcharge: 580,
      unauthorizedAccessorial: 0,
      variance: 150,
      reason: "Fuel surcharge mismatch vs contracted schedule."
    }
  },
  {
    invoiceId: "INV-88120",
    shipmentId: "VTS-2026-04785",
    carrier: "Regional Express",
    expectedAmount: 890,
    submittedAmount: 890,
    status: "Pending"
  },
  {
    invoiceId: "INV-88098",
    shipmentId: "VTS-2026-04772",
    carrier: "West Coast Tankers",
    expectedAmount: 5120,
    submittedAmount: 5120,
    status: "Approved"
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await Invoice.deleteMany({});

  await Invoice.insertMany(invoices);

  const approved = invoices.filter((item) => item.status === "Approved").length;
  const onHold = invoices.filter((item) => item.status === "On Hold").length;

  console.log(`Invoices seeded: ${invoices.length} (${approved} approved, ${onHold} on hold)`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
