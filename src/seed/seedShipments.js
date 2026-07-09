require("dotenv").config();

const mongoose = require("mongoose");
const Shipment = require("../models/Shipment");

const parseLane = (lane) => {
  const parts = lane.split("→").map((part) => part.trim());
  return { origin: parts[0] ?? lane, destination: parts[1] ?? "" };
};

const defaultFreightCost = (rate) => {
  const base = Math.round(rate * 0.9);
  return { base, fsc: rate - base };
};

const defaultBulkRequirements = () => [
  { label: "Wash Type", value: "Food-grade kosher washout" },
  { label: "Kosher Status", value: "Active", highlight: true },
  { label: "Equipment", value: "Tank + transit heat + pump" },
  { label: "Temperature", value: "Maintain 120–140°F in transit" }
];

const shipments = [
  {
    shipmentId: "VTS-2026-04821",
    poNumber: "PO-88421",
    customer: "Food Mfg Chicago",
    commodity: "Refined Glycerine USP Kosher",
    lane: "Newark, NJ → Chicago, IL",
    laneTemplate: "NJ → CHI",
    bolStatus: "BOL pending",
    mode: "Bulk",
    status: "In Transit",
    pickupDate: new Date("2026-06-15"),
    deliveryDate: new Date("2026-06-18"),
    carrier: "Midwest Tank Lines",
    rate: 4280,
    freightCost: { base: 3850, fsc: 430 },
    route: {
      pickupLocation: "Vitusa Newark, NJ",
      deliveryLocation: "Food Mfg Chicago, IL"
    },
    carrierInfo: {
      description: "EDI connected · Primary lane carrier",
      tenderStatus: "Accepted",
      tenderDetail: "Jun 15, 4:12 PM via EDI 990"
    },
    milestones: [
      { title: "Delivered", detail: "Pending · Est. Jun 18, 2:00 PM", complete: false, active: false },
      { title: "En Route", detail: "Jun 17, 8:42 AM · EDI 214", complete: false, active: true },
      { title: "Loaded", detail: "Jun 16, 3:15 PM · Carrier portal", complete: true, active: false },
      { title: "Dispatched", detail: "Jun 16, 10:00 AM · EDI 990 accepted", complete: true, active: false },
      { title: "Tendered", detail: "Jun 15, 2:30 PM · EDI 204", complete: true, active: false }
    ],
    bulkRequirements: [
      { label: "Wash Type", value: "Food-grade kosher washout" },
      { label: "Kosher Status", value: "Active", highlight: true },
      { label: "Equipment", value: "Tank + transit heat + pump" },
      { label: "Temperature", value: "Maintain 120–140°F in transit" }
    ],
    documents: [
      {
        abbr: "SDS",
        abbrClass: "bg-red-100 dark:bg-red-900/40 text-red-600",
        title: "Safety Data Sheet — Glycerine USP",
        source: "From commodity profile · Included in tender"
      },
      {
        abbr: "CERT",
        abbrClass: "bg-brand-100 dark:bg-brand-900/40 text-brand-600",
        title: "Kosher Certificate — Newark Facility",
        source: "From facility profile · Included in tender"
      },
      {
        abbr: "INST",
        abbrClass: "bg-blue-100 dark:bg-blue-900/40 text-blue-600",
        title: "Unloading Instructions — Chicago Receiver",
        source: "From receiver profile · Included in tender"
      }
    ],
    auditTrail: [
      { action: "Status → In Transit", detail: "EDI 214 · Jun 17, 8:42 AM" },
      { action: "Carrier accepted tender", detail: "EDI 990 · Jun 15, 4:12 PM" },
      { action: "Documents inherited (3)", detail: "System · Jun 15, 2:28 PM" },
      { action: "Shipment created from template", detail: "Sarah Chen · Jun 15, 2:15 PM" }
    ]
  },
  {
    shipmentId: "VTS-2026-04815",
    poNumber: "PO-88398",
    customer: "Southern Foods Inc.",
    commodity: "Refined Glycerine",
    lane: "Houston, TX → Atlanta, GA",
    laneTemplate: "HOU → ATL",
    bolStatus: "BOL issued",
    mode: "Bulk",
    status: "Delayed",
    pickupDate: new Date("2026-06-14"),
    deliveryDate: new Date("2026-06-17"),
    carrier: "Gulf Coast Carriers",
    rate: 3950,
    freightCost: defaultFreightCost(3950),
    route: {
      pickupLocation: "Vitusa Houston, TX",
      deliveryLocation: "Southern Foods Atlanta, GA"
    },
    carrierInfo: {
      description: "EDI connected · Regional bulk carrier",
      tenderStatus: "Accepted",
      tenderDetail: "Jun 14, 9:05 AM via EDI 990"
    },
    milestones: [
      { title: "Delivered", detail: "Delayed · Est. Jun 19", complete: false, active: false },
      { title: "En Route", detail: "Jun 15, 6:20 AM · Weather delay", complete: false, active: true },
      { title: "Loaded", detail: "Jun 14, 4:45 PM · Carrier portal", complete: true, active: false },
      { title: "Dispatched", detail: "Jun 14, 11:30 AM", complete: true, active: false },
      { title: "Tendered", detail: "Jun 13, 3:00 PM · EDI 204", complete: true, active: false }
    ],
    bulkRequirements: defaultBulkRequirements(),
    documents: [
      {
        abbr: "SDS",
        abbrClass: "bg-red-100 dark:bg-red-900/40 text-red-600",
        title: "Safety Data Sheet — Refined Glycerine",
        source: "From commodity profile · Included in tender"
      }
    ],
    auditTrail: [
      { action: "Status → Delayed", detail: "EDI 214 · Jun 16, 7:15 AM" },
      { action: "Carrier accepted tender", detail: "EDI 990 · Jun 14, 9:05 AM" },
      { action: "Shipment created", detail: "Mike Torres · Jun 13, 2:45 PM" }
    ]
  },
  {
    shipmentId: "VTS-2026-04798",
    poNumber: "PO-88312",
    customer: "Auto Parts Detroit",
    commodity: "Industrial Chemicals",
    lane: "Memphis, TN → Detroit, MI",
    laneTemplate: "MEM → DET",
    bolStatus: "BOL signed",
    mode: "TL",
    status: "Delivered",
    pickupDate: new Date("2026-06-12"),
    deliveryDate: new Date("2026-06-14"),
    carrier: "National Freight Co.",
    rate: 2180,
    freightCost: defaultFreightCost(2180),
    route: {
      pickupLocation: "Memphis Distribution Center, TN",
      deliveryLocation: "Auto Parts Detroit, MI"
    },
    carrierInfo: {
      description: "TL carrier · National network",
      tenderStatus: "Completed",
      tenderDetail: "Jun 12, 8:00 AM via EDI 990"
    },
    milestones: [
      { title: "Delivered", detail: "Jun 14, 11:30 AM · POD received", complete: true, active: false },
      { title: "En Route", detail: "Jun 13, 7:00 AM · EDI 214", complete: true, active: false },
      { title: "Loaded", detail: "Jun 12, 2:00 PM", complete: true, active: false },
      { title: "Dispatched", detail: "Jun 12, 9:30 AM", complete: true, active: false },
      { title: "Tendered", detail: "Jun 11, 4:00 PM · EDI 204", complete: true, active: false }
    ],
    bulkRequirements: [],
    documents: [
      {
        abbr: "BOL",
        abbrClass: "bg-slate-100 dark:bg-slate-800 text-slate-600",
        title: "Bill of Lading — Signed",
        source: "Carrier upload · Jun 14"
      }
    ],
    auditTrail: [
      { action: "Status → Delivered", detail: "POD · Jun 14, 11:30 AM" },
      { action: "Carrier accepted tender", detail: "EDI 990 · Jun 12, 8:00 AM" },
      { action: "Shipment created", detail: "Sarah Chen · Jun 11, 3:20 PM" }
    ]
  },
  {
    shipmentId: "VTS-2026-04785",
    poNumber: "PO-88290",
    customer: "Midwest Nutrition",
    commodity: "Food-grade Oleochemicals",
    lane: "Cincinnati, OH → Minneapolis, MN",
    laneTemplate: "CIN → MSP",
    bolStatus: "BOL pending",
    mode: "LTL",
    status: "Tendered",
    pickupDate: new Date("2026-06-18"),
    deliveryDate: new Date("2026-06-21"),
    carrier: "Regional Express",
    rate: 890,
    freightCost: defaultFreightCost(890),
    route: {
      pickupLocation: "Cincinnati Warehouse, OH",
      deliveryLocation: "Midwest Nutrition Minneapolis, MN"
    },
    carrierInfo: {
      description: "LTL carrier · Regional network",
      tenderStatus: "Pending acceptance",
      tenderDetail: "Sent Jun 17, 10:00 AM via EDI 204"
    },
    milestones: [
      { title: "Delivered", detail: "Pending · Est. Jun 21", complete: false, active: false },
      { title: "En Route", detail: "Pending dispatch", complete: false, active: false },
      { title: "Loaded", detail: "Pending", complete: false, active: false },
      { title: "Dispatched", detail: "Pending", complete: false, active: false },
      { title: "Tendered", detail: "Jun 17, 10:00 AM · EDI 204", complete: true, active: true }
    ],
    bulkRequirements: [],
    documents: [],
    auditTrail: [
      { action: "Tender sent to carrier", detail: "EDI 204 · Jun 17, 10:00 AM" },
      { action: "Shipment created", detail: "Alex Kim · Jun 17, 9:45 AM" }
    ]
  },
  {
    shipmentId: "VTS-2026-04772",
    poNumber: "PO-88245",
    customer: "Pacific Commodities",
    commodity: "Liquid Bulk — Blind",
    lane: "Los Angeles, CA → Seattle, WA",
    laneTemplate: "LAX → SEA",
    bolStatus: "Blind shipment",
    mode: "Bulk",
    status: "Blind",
    pickupDate: new Date("2026-06-19"),
    deliveryDate: new Date("2026-06-22"),
    carrier: "West Coast Tankers",
    rate: 5120,
    freightCost: defaultFreightCost(5120),
    route: {
      pickupLocation: "Los Angeles Terminal, CA",
      deliveryLocation: "Seattle Receiver (blind)"
    },
    carrierInfo: {
      description: "Bulk tanker · West coast lanes",
      tenderStatus: "Accepted",
      tenderDetail: "Jun 18, 1:30 PM via EDI 990"
    },
    milestones: [
      { title: "Delivered", detail: "Pending · Est. Jun 22", complete: false, active: false },
      { title: "En Route", detail: "Pending", complete: false, active: false },
      { title: "Loaded", detail: "Pending", complete: false, active: false },
      { title: "Dispatched", detail: "Pending", complete: false, active: false },
      { title: "Tendered", detail: "Jun 18, 12:00 PM · Blind tender", complete: true, active: true }
    ],
    bulkRequirements: [
      { label: "Wash Type", value: "Standard food-grade washout" },
      { label: "Blind Shipment", value: "Active", highlight: true },
      { label: "Equipment", value: "Insulated tank" },
      { label: "Temperature", value: "Ambient" }
    ],
    documents: [
      {
        abbr: "BLIND",
        abbrClass: "bg-violet-100 dark:bg-violet-900/40 text-violet-600",
        title: "Blind Shipment Authorization",
        source: "Customer request · Included in tender"
      }
    ],
    auditTrail: [
      { action: "Blind shipment flagged", detail: "System · Jun 18, 11:55 AM" },
      { action: "Carrier accepted tender", detail: "EDI 990 · Jun 18, 1:30 PM" },
      { action: "Shipment created", detail: "Sarah Chen · Jun 18, 11:30 AM" }
    ]
  }
].map((shipment) => {
  if (!shipment.route) {
    const { origin, destination } = parseLane(shipment.lane);
    shipment.route = {
      pickupLocation: origin,
      deliveryLocation: destination
    };
  }

  return shipment;
});

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await Shipment.deleteMany();
  await Shipment.insertMany(shipments);

  console.log(`Shipments seeded: ${shipments.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
