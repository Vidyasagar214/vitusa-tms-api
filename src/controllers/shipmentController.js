const Shipment = require("../models/Shipment");

const formatPickupDate = (date) => {
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
};

const formatRate = (rate) => {
  return `$${rate.toLocaleString("en-US")}`;
};

const formatRateDetailed = (rate) => {
  return `$${rate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatFullDate = (date) => {
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const parseLane = (lane) => {
  const parts = lane.split("→").map((part) => part.trim());

  return {
    origin: parts[0] ?? lane,
    destination: parts[1] ?? ""
  };
};

const formatShipment = (item) => ({
  id: item.shipmentId,
  po: item.poNumber,
  customer: item.customer,
  commodity: item.commodity,
  lane: item.lane,
  mode: item.mode,
  status: item.status,
  pickup: formatPickupDate(item.pickupDate),
  carrier: item.carrier,
  rate: formatRate(item.rate),
  statusPulse: item.status === "Delayed"
});

const formatFreightCost = (item) => {
  const total = formatRateDetailed(item.rate);
  const base = item.freightCost?.base;
  const fsc = item.freightCost?.fsc;

  return {
    total,
    breakdown:
      base != null && fsc != null
        ? `Base $${base.toLocaleString("en-US")} + FSC $${fsc.toLocaleString("en-US")}`
        : null
  };
};

const formatShipmentDetail = (item) => {
  const { origin, destination } = parseLane(item.lane);

  return {
    ...formatShipment(item),
    rateDetailed: formatRateDetailed(item.rate),
    pickupDate: formatFullDate(item.pickupDate),
    deliveryDate: formatFullDate(item.deliveryDate),
    origin,
    destination,
    createdAt: formatFullDate(item.createdAt),
    laneTemplate: item.laneTemplate ?? "",
    bolStatus: item.bolStatus ?? "BOL pending",
    subtitle: `${item.commodity} · ${item.customer}`,
    meta: [item.poNumber, item.bolStatus ?? "BOL pending", item.laneTemplate ? `Lane template: ${item.laneTemplate}` : ""]
      .filter(Boolean)
      .join(" · "),
    freightCost: formatFreightCost(item),
    route: {
      pickupLocation: item.route?.pickupLocation ?? origin,
      deliveryLocation: item.route?.deliveryLocation ?? destination,
      pickupDate: formatFullDate(item.pickupDate),
      deliveryDate: formatFullDate(item.deliveryDate)
    },
    carrierInfo: item.carrierInfo ?? null,
    milestones: item.milestones ?? [],
    bulkRequirements: item.bulkRequirements ?? [],
    documents: item.documents ?? [],
    auditTrail: item.auditTrail ?? []
  };
};

const generateShipmentId = async () => {
  const year = new Date().getFullYear();
  const prefix = `VTS-${year}-`;
  const latest = await Shipment.findOne({
    shipmentId: { $regex: `^${prefix}` }
  }).sort({ shipmentId: -1 });

  let nextNumber = 1;

  if (latest?.shipmentId) {
    const currentNumber = Number(latest.shipmentId.split("-").pop());
    nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
};

exports.createShipment = async (req, res) => {
  try {
    const {
      customer,
      commodity,
      lane,
      origin,
      destination,
      mode,
      rate,
      poNumber,
      carrier,
      pickupDate,
      deliveryDate,
      laneTemplate,
      freightCost,
      bulkRequirements,
      documents,
      carrierInfo,
      status = "Draft"
    } = req.body;

    const resolvedLane =
      lane ||
      (origin && destination ? `${origin} → ${destination}` : null);

    if (!customer || !commodity || !resolvedLane || !mode || rate == null) {
      return res.status(400).json({
        message: "customer, commodity, lane, mode, and rate are required"
      });
    }

    const shipmentId = await generateShipmentId();
    const userName = req.user?.name ?? "System";
    const now = new Date().toLocaleString("en-US");
    const parsedLane = parseLane(resolvedLane);
    const pickup = origin ?? parsedLane.origin;
    const delivery = destination ?? parsedLane.destination;

    const resolvedFreightCost =
      freightCost ??
      (() => {
        const numericRate = Number(rate);
        const base = Math.round(numericRate * 0.9);
        return { base, fsc: numericRate - base };
      })();

    const auditTrail = [
      {
        action: "Shipment created",
        detail: `${userName} · ${now}`
      }
    ];

    let milestones = [];
    let resolvedCarrierInfo = carrierInfo ?? null;

    if (status === "Tendered") {
      auditTrail.unshift({
        action: "Tender sent to carrier",
        detail: `EDI 204 · ${now}`
      });

      resolvedCarrierInfo = carrierInfo ?? {
        description: carrier ? `${carrier} · Lane carrier` : "Carrier assigned",
        tenderStatus: "Pending acceptance",
        tenderDetail: `Sent ${now} via EDI 204`
      };

      milestones = [
        { title: "Delivered", detail: "Pending", complete: false, active: false },
        { title: "En Route", detail: "Pending dispatch", complete: false, active: false },
        { title: "Loaded", detail: "Pending", complete: false, active: false },
        { title: "Dispatched", detail: "Pending", complete: false, active: false },
        { title: "Tendered", detail: `${now} · EDI 204`, complete: true, active: true }
      ];
    }

    const resolvedBulkRequirements =
      mode === "Bulk"
        ? bulkRequirements?.length
          ? bulkRequirements
          : [
              { label: "Wash Type", value: "Food-grade kosher washout" },
              { label: "Kosher Status", value: "Active", highlight: true },
              { label: "Equipment", value: "Tank + transit heat + pump" }
            ]
        : [];

    const shipment = await Shipment.create({
      shipmentId,
      poNumber: poNumber ?? "",
      customer,
      commodity,
      lane: resolvedLane,
      laneTemplate: laneTemplate ?? "",
      bolStatus: "BOL pending",
      mode,
      status,
      pickupDate: pickupDate ? new Date(pickupDate) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      carrier: carrier ?? "",
      rate: Number(rate),
      freightCost: resolvedFreightCost,
      route: {
        pickupLocation: pickup,
        deliveryLocation: delivery
      },
      carrierInfo: resolvedCarrierInfo,
      milestones,
      bulkRequirements: resolvedBulkRequirements,
      documents: documents ?? [],
      auditTrail
    });

    res.status(201).json({
      shipment: formatShipmentDetail(shipment)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Shipment ID already exists"
      });
    }

    res.status(500).json({
      message: error.message
    });
  }
};

exports.getShipments = async (req, res) => {
  try {
    const {
      mode,
      status,
      carrier,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (mode) filter.mode = mode;
    if (status) filter.status = status;
    if (carrier) filter.carrier = carrier;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [shipments, total, modeCounts] = await Promise.all([
      Shipment.find(filter)
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 }),
      Shipment.countDocuments(filter),
      Shipment.aggregate([
        {
          $group: {
            _id: "$mode",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const countsByMode = {};

    modeCounts.forEach((item) => {
      countsByMode[item._id] = item.count;
    });

    res.status(200).json({
      shipments: shipments.map(formatShipment),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber) || 1
      },
      countsByMode
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      shipmentId: req.params.id
    });

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found"
      });
    }

    res.status(200).json({
      shipment: formatShipmentDetail(shipment)
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const MILESTONE_ORDER = ["Tendered", "Dispatched", "Loaded", "En Route", "Delivered"];

const defaultMilestones = () => [
  { title: "Delivered", detail: "Pending", complete: false, active: false },
  { title: "En Route", detail: "Pending dispatch", complete: false, active: false },
  { title: "Loaded", detail: "Pending", complete: false, active: false },
  { title: "Dispatched", detail: "Pending", complete: false, active: false },
  { title: "Tendered", detail: "Pending", complete: false, active: false }
];

const ensureMilestones = (shipment) =>
  shipment.milestones?.length ? [...shipment.milestones] : defaultMilestones();

const activateMilestone = (milestones, title, detail) => {
  const targetIndex = MILESTONE_ORDER.indexOf(title);

  return milestones.map((milestone) => {
    const milestoneIndex = MILESTONE_ORDER.indexOf(milestone.title);

    if (milestone.title === title) {
      return {
        ...milestone,
        detail,
        complete: title === "Delivered",
        active: title !== "Delivered"
      };
    }

    if (milestoneIndex >= 0 && milestoneIndex < targetIndex) {
      return { ...milestone, complete: true, active: false };
    }

    return { ...milestone, active: false };
  });
};

const prependAudit = (auditTrail, action, detail) => [
  { action, detail },
  ...(auditTrail ?? [])
];

const ACTION_RULES = {
  tender: {
    allowedFrom: ["Draft"],
    nextStatus: "Tendered",
    requiresCarrier: true,
    auditAction: "Tender sent to carrier",
    auditDetail: (now) => `EDI 204 · ${now}`,
    milestoneTitle: "Tendered",
    milestoneDetail: (now) => `${now} · EDI 204`
  },
  accept_tender: {
    allowedFrom: ["Tendered"],
    nextStatus: null,
    auditAction: "Carrier accepted tender",
    auditDetail: (now) => `EDI 990 · ${now}`,
    acceptTender: true
  },
  dispatch: {
    allowedFrom: ["Tendered"],
    nextStatus: "Dispatched",
    auditAction: "Status → Dispatched",
    auditDetail: (now) => `System · ${now}`,
    milestoneTitle: "Dispatched",
    milestoneDetail: (now) => `${now}`
  },
  in_transit: {
    allowedFrom: ["Dispatched", "Delayed"],
    nextStatus: "In Transit",
    auditAction: "Status → In Transit",
    auditDetail: (now) => `EDI 214 · ${now}`,
    milestoneTitle: "En Route",
    milestoneDetail: (now) => `${now} · EDI 214`
  },
  deliver: {
    allowedFrom: ["In Transit", "Delayed"],
    nextStatus: "Delivered",
    auditAction: "Status → Delivered",
    auditDetail: (now) => `POD received · ${now}`,
    milestoneTitle: "Delivered",
    milestoneDetail: (now) => `${now} · POD received`
  },
  delay: {
    allowedFrom: ["Dispatched", "In Transit"],
    nextStatus: "Delayed",
    auditAction: "Status → Delayed",
    auditDetail: (now) => `EDI 214 · ${now}`
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const { action, carrier } = req.body;

    if (!action || !ACTION_RULES[action]) {
      return res.status(400).json({
        message:
          "action is required and must be one of: tender, accept_tender, dispatch, in_transit, deliver, delay"
      });
    }

    const shipment = await Shipment.findOne({
      shipmentId: req.params.id
    });

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found"
      });
    }

    const rule = ACTION_RULES[action];

    if (!rule.allowedFrom.includes(shipment.status)) {
      return res.status(400).json({
        message: `Cannot perform "${action}" when shipment status is "${shipment.status}"`
      });
    }

    if (rule.requiresCarrier && !shipment.carrier && !carrier) {
      return res.status(400).json({
        message: "Carrier is required to tender this shipment"
      });
    }

    const userName = req.user?.name ?? "System";
    const now = new Date().toLocaleString("en-US");

    if (carrier) {
      shipment.carrier = carrier.trim();
    }

    if (rule.nextStatus) {
      shipment.status = rule.nextStatus;
    }

    shipment.auditTrail = prependAudit(
      shipment.auditTrail,
      rule.auditAction,
      rule.auditDetail(now)
    );

    if (rule.milestoneTitle) {
      shipment.milestones = activateMilestone(
        ensureMilestones(shipment),
        rule.milestoneTitle,
        rule.milestoneDetail(now)
      );
    }

    if (action === "tender") {
      shipment.carrierInfo = {
        description: shipment.carrier
          ? `${shipment.carrier} · Lane carrier`
          : "Carrier assigned",
        tenderStatus: "Pending acceptance",
        tenderDetail: `Sent ${now} via EDI 204`
      };
      shipment.milestones = activateMilestone(
        ensureMilestones(shipment),
        "Tendered",
        `${now} · EDI 204`
      );
    }

    if (rule.acceptTender) {
      shipment.carrierInfo = {
        description: shipment.carrier
          ? `${shipment.carrier} · Lane carrier`
          : shipment.carrierInfo?.description ?? "Carrier assigned",
        tenderStatus: "Accepted",
        tenderDetail: `${now} via EDI 990`
      };
    }

    if (action === "deliver") {
      shipment.bolStatus = "BOL signed";
      shipment.milestones = activateMilestone(
        ensureMilestones(shipment),
        "Delivered",
        `${now} · POD received`
      ).map((milestone) => ({ ...milestone, active: false, complete: true }));
    }

    await shipment.save();

    res.status(200).json({
      shipment: formatShipmentDetail(shipment)
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
