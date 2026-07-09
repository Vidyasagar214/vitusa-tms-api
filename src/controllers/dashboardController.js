const Shipment = require("../models/Shipment");

const PIPELINE_STAGES = [
  "Draft",
  "Tendered",
  "Dispatched",
  "In Transit",
  "Delivered",
  "Invoiced"
];

const STATUS_TO_PIPELINE = {
  Draft: "Draft",
  Tendered: "Tendered",
  Dispatched: "Dispatched",
  "In Transit": "In Transit",
  Delayed: "In Transit",
  Blind: "Tendered",
  Exception: "In Transit",
  Delivered: "Delivered"
};

const EXCEPTION_STATUSES = new Set(["Delayed", "Exception", "Blind"]);
const ACTIVE_STATUSES = new Set([
  "Draft",
  "Tendered",
  "Dispatched",
  "In Transit",
  "Delayed",
  "Blind",
  "Exception"
]);

const LOAD_PRIORITY = {
  Delayed: 0,
  Exception: 1,
  Blind: 2,
  "In Transit": 3,
  Dispatched: 4,
  Tendered: 5,
  Draft: 6,
  Delivered: 99
};

const shortShipmentId = (shipmentId) => {
  const suffix = shipmentId.split("-").pop();
  return `VTS-${suffix}`;
};

const formatLaneShort = (shipment) => {
  if (shipment.laneTemplate) return shipment.laneTemplate;
  const parts = shipment.lane.split("→").map((part) => part.trim());
  if (parts.length < 2) return shipment.lane;

  const originCity = parts[0].split(",")[0]?.trim() ?? parts[0];
  const destinationCity = parts[1].split(",")[0]?.trim() ?? parts[1];
  return `${originCity} → ${destinationCity}`;
};

const formatSpend = (amount) => {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000).toLocaleString("en-US")}K`;
  }

  return `$${amount.toLocaleString("en-US")}`;
};

const formatPercent = (value) => {
  if (value == null || Number.isNaN(value)) return null;
  return `${value.toFixed(1)}%`;
};

const timeAgo = (date) => {
  if (!date) return "Recently";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

const isCurrentMonth = (date) => {
  if (!date) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const buildPipeline = (shipments) => {
  const counts = {};

  PIPELINE_STAGES.forEach((stage) => {
    counts[stage] = { bulk: 0, tl: 0, other: 0 };
  });

  shipments.forEach((shipment) => {
    const stage = STATUS_TO_PIPELINE[shipment.status] ?? "Draft";
    const bucket = counts[stage];
    if (!bucket) return;

    if (shipment.mode === "Bulk") bucket.bulk += 1;
    else if (shipment.mode === "TL") bucket.tl += 1;
    else bucket.other += 1;
  });

  const maxCount = Math.max(
    1,
    ...PIPELINE_STAGES.flatMap((stage) => [
      counts[stage].bulk,
      counts[stage].tl,
      counts[stage].other
    ])
  );

  return PIPELINE_STAGES.map((label) => ({
    label,
    bulk: Math.round((counts[label].bulk / maxCount) * 100),
    tl: Math.round((counts[label].tl / maxCount) * 100),
    other: Math.round((counts[label].other / maxCount) * 100),
    counts: counts[label]
  }));
};

const buildExceptionFeed = (shipments) => {
  const items = [];

  shipments.forEach((shipment) => {
    if (shipment.status === "Delayed") {
      items.push({
        type: "delay",
        title: `Delay — ${shortShipmentId(shipment.shipmentId)}`,
        detail: `${formatLaneShort(shipment)} · Carrier reported delay`,
        timeAgo: timeAgo(shipment.updatedAt),
        shipmentId: shipment.shipmentId,
        sortAt: shipment.updatedAt?.getTime() ?? 0
      });
    }

    if (shipment.status === "Blind") {
      items.push({
        type: "blind",
        title: `Blind shipment — ${shortShipmentId(shipment.shipmentId)}`,
        detail: `${formatLaneShort(shipment)} · Receiver details masked`,
        timeAgo: timeAgo(shipment.updatedAt),
        shipmentId: shipment.shipmentId,
        sortAt: shipment.updatedAt?.getTime() ?? 0
      });
    }

    if (shipment.status === "Exception") {
      items.push({
        type: "exception",
        title: `Exception — ${shortShipmentId(shipment.shipmentId)}`,
        detail: `${formatLaneShort(shipment)} · Requires coordinator review`,
        timeAgo: timeAgo(shipment.updatedAt),
        shipmentId: shipment.shipmentId,
        sortAt: shipment.updatedAt?.getTime() ?? 0
      });
    }

    if (
      shipment.mode === "Bulk" &&
      (!shipment.documents || shipment.documents.length === 0) &&
      shipment.status !== "Draft" &&
      shipment.status !== "Delivered"
    ) {
      items.push({
        type: "missing-docs",
        title: "Missing required documents",
        detail: `${shortShipmentId(shipment.shipmentId)} · Bulk shipment needs inherited docs`,
        timeAgo: timeAgo(shipment.createdAt),
        shipmentId: shipment.shipmentId,
        sortAt: shipment.createdAt?.getTime() ?? 0
      });
    }

    const tenderAccepted = shipment.auditTrail?.find((entry) =>
      entry.action.toLowerCase().includes("accepted")
    );

    if (tenderAccepted) {
      items.push({
        type: "success",
        title: `Tender accepted — ${shortShipmentId(shipment.shipmentId)}`,
        detail: `${shipment.carrier || "Carrier"} · ${tenderAccepted.detail}`,
        timeAgo: timeAgo(shipment.updatedAt),
        shipmentId: shipment.shipmentId,
        sortAt: shipment.updatedAt?.getTime() ?? 0
      });
    }
  });

  return items
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 6)
    .map(({ sortAt, ...item }) => item);
};

exports.getDashboard = async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ updatedAt: -1 });

    const activeShipments = shipments.filter((shipment) =>
      ACTIVE_STATUSES.has(shipment.status)
    );

    const countsByMode = {
      Bulk: 0,
      TL: 0,
      LTL: 0,
      Intermodal: 0
    };

    activeShipments.forEach((shipment) => {
      if (countsByMode[shipment.mode] != null) {
        countsByMode[shipment.mode] += 1;
      }
    });

    const exceptionShipments = shipments.filter((shipment) =>
      EXCEPTION_STATUSES.has(shipment.status)
    );

    const missingDocsCount = shipments.filter(
      (shipment) =>
        shipment.mode === "Bulk" &&
        (!shipment.documents || shipment.documents.length === 0) &&
        shipment.status !== "Draft" &&
        shipment.status !== "Delivered"
    ).length;

    const freightSpendMtd = shipments
      .filter((shipment) => isCurrentMonth(shipment.pickupDate ?? shipment.createdAt))
      .reduce((sum, shipment) => sum + shipment.rate, 0);

    const deliveredCount = shipments.filter(
      (shipment) => shipment.status === "Delivered"
    ).length;
    const delayedCount = shipments.filter(
      (shipment) => shipment.status === "Delayed"
    ).length;
    const completedCount = deliveredCount + delayedCount;
    const onTimeDeliveryRate =
      completedCount > 0 ? (deliveredCount / completedCount) * 100 : null;

    const tenderedOrBeyond = shipments.filter((shipment) =>
      ["Tendered", "Dispatched", "In Transit", "Delivered", "Delayed"].includes(
        shipment.status
      )
    );
    const acceptedCount = tenderedOrBeyond.filter((shipment) => {
      const status = shipment.carrierInfo?.tenderStatus?.toLowerCase() ?? "";
      return status.includes("accepted") || status.includes("completed");
    }).length;
    const carrierAcceptanceRate =
      tenderedOrBeyond.length > 0
        ? (acceptedCount / tenderedOrBeyond.length) * 100
        : null;

    const activeLoads = [...activeShipments]
      .sort(
        (a, b) =>
          (LOAD_PRIORITY[a.status] ?? 50) - (LOAD_PRIORITY[b.status] ?? 50)
      )
      .slice(0, 6)
      .map((shipment) => ({
        id: shipment.shipmentId,
        commodity: shipment.commodity,
        lane: formatLaneShort(shipment),
        mode: shipment.mode,
        status: shipment.status,
        carrier: shipment.carrier,
        statusPulse: shipment.status === "Delayed"
      }));

    res.status(200).json({
      summary: {
        activeShipments: activeShipments.length,
        totalShipments: shipments.length,
        countsByMode,
        openExceptions: exceptionShipments.length + missingDocsCount,
        exceptionBreakdown: {
          delays: shipments.filter((shipment) => shipment.status === "Delayed")
            .length,
          missingDocs: missingDocsCount,
          invoiceHolds: shipments.filter(
            (shipment) => shipment.status === "Exception"
          ).length,
          other: shipments.filter((shipment) => shipment.status === "Blind")
            .length
        },
        freightSpendMtd,
        freightSpendFormatted: formatSpend(freightSpendMtd),
        onTimeDeliveryRate,
        onTimeDeliveryFormatted: formatPercent(onTimeDeliveryRate),
        carrierAcceptanceRate,
        carrierAcceptanceFormatted: formatPercent(carrierAcceptanceRate)
      },
      pipeline: buildPipeline(shipments),
      activeLoads,
      exceptions: buildExceptionFeed(shipments)
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
