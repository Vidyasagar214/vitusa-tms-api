require("dotenv").config();
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Location = require("../models/Location");
const Carrier = require("../models/Carrier");
const Commodity = require("../models/Commodity");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    Customer.deleteMany({}),
    Location.deleteMany({}),
    Carrier.deleteMany({}),
    Commodity.deleteMany({})
  ]);

  const customers = await Customer.insertMany([
    { name: "Food Mfg Chicago", code: "FMC" },
    { name: "Southern Foods Inc.", code: "SFI" },
    { name: "Auto Parts Detroit", code: "APD" },
    { name: "Midwest Nutrition", code: "MN" }
  ]);

  await Location.insertMany([
    { name: "Vitusa Newark", city: "Newark", state: "NJ", type: "shipper" },
    { name: "Food Mfg Chicago", city: "Chicago", state: "IL", type: "receiver", customerId: customers[0]._id },
    { name: "Vitusa Houston", city: "Houston", state: "TX", type: "shipper" },
    { name: "Southern Foods Atlanta", city: "Atlanta", state: "GA", type: "receiver", customerId: customers[1]._id }
  ]);

  await Carrier.insertMany([
    { name: "Midwest Tank Lines", scac: "MWTL", ediConnected: true, portalEnabled: true, modes: ["Bulk"] },
    { name: "Gulf Coast Carriers", scac: "GCC", ediConnected: true, modes: ["Bulk", "TL"] },
    { name: "National Freight Co.", scac: "NFC", modes: ["TL", "LTL"] },
    { name: "Regional Express", scac: "REX", modes: ["LTL"] }
  ]);

  await Commodity.insertMany([
    {
      name: "Refined Glycerine USP Kosher",
      mode: "Bulk",
      customerId: customers[0]._id,
      bulkRequirements: [
        { label: "Wash Type", value: "Food-grade kosher washout" },
        { label: "Kosher Status", value: "Active", highlight: true }
      ]
    },
    { name: "Refined Glycerine", mode: "Bulk", customerId: customers[1]._id },
    { name: "Auto Parts — TL", mode: "TL", customerId: customers[2]._id }
  ]);

  console.log("Master data seeded");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});