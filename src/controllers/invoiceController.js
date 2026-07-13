const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");

const invoiceLookupFilter = (id) => {
  const conditions = [{ invoiceId: id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    conditions.push({ _id: id });
  }

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
};

const formatCurrency = (amount) =>
  `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const formatCurrencyDetailed = (amount) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortShipmentId = (shipmentId) => {
  const suffix = shipmentId.split("-").pop();
  return `VTS-${suffix}`;
};

const formatInvoice = (invoice) => {
  const variance = invoice.submittedAmount - invoice.expectedAmount;
  const hasVariance = variance !== 0;

  return {
    id: invoice._id.toString(),
    invoiceId: invoice.invoiceId,
    shipmentId: invoice.shipmentId,
    shipmentShort: shortShipmentId(invoice.shipmentId),
    carrier: invoice.carrier,
    expectedAmount: invoice.expectedAmount,
    submittedAmount: invoice.submittedAmount,
    expected: formatCurrency(invoice.expectedAmount),
    submitted: formatCurrency(invoice.submittedAmount),
    variance,
    hasVariance,
    status: invoice.status,
    holdReason: invoice.holdReason ?? "",
    varianceDetail: invoice.varianceDetail ?? null,
    createdAt: invoice.createdAt
  };
};

const buildSummary = (invoices) => {
  const approved = invoices.filter((invoice) => invoice.status === "Approved");
  const onHold = invoices.filter((invoice) => invoice.status === "On Hold");
  const approvedTotal = approved.reduce((sum, invoice) => sum + invoice.submittedAmount, 0);
  const matched = invoices.filter(
    (invoice) => invoice.submittedAmount === invoice.expectedAmount
  ).length;
  const matchRate = invoices.length ? (matched / invoices.length) * 100 : 0;

  return {
    approvedCount: approved.length,
    approvedTotal,
    approvedTotalFormatted: formatCurrency(approvedTotal),
    onHoldCount: onHold.length,
    matchRate: Math.round(matchRate * 10) / 10,
    totalInvoices: invoices.length
  };
};

exports.getSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.status(200).json({ stats: buildSummary(invoices) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      invoices: invoices.map(formatInvoice),
      stats: buildSummary(invoices)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne(invoiceLookupFilter(req.params.id));

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.status(200).json({ invoice: formatInvoice(invoice) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const escapeCsvValue = (value) => {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const buildApExportCsv = (invoices) => {
  const headers = [
    "Invoice ID",
    "Shipment ID",
    "Carrier",
    "Expected Amount",
    "Submitted Amount",
    "Variance",
    "Status",
    "Export Date"
  ];

  const exportDate = new Date().toISOString().split("T")[0];

  const rows = invoices.map((invoice) => [
    invoice.invoiceId,
    invoice.shipmentId,
    invoice.carrier,
    invoice.expectedAmount.toFixed(2),
    invoice.submittedAmount.toFixed(2),
    (invoice.submittedAmount - invoice.expectedAmount).toFixed(2),
    invoice.status,
    exportDate
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

exports.exportApprovedInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: "Approved" }).sort({
      createdAt: -1
    });

    const exportDate = new Date().toISOString().split("T")[0];
    const filename = `vitusa-ap-export-${exportDate}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buildApExportCsv(invoices));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { action, status } = req.body;

    const invoice = await Invoice.findOne(invoiceLookupFilter(req.params.id));

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const userName = req.user?.name ?? "System";

    if (action === "approve") {
      invoice.status = "Approved";
      invoice.holdReason = "";
    } else if (action === "reject") {
      invoice.status = "Rejected";
      invoice.holdReason = req.body.reason?.trim() || "Rejected by AP reviewer";
    } else if (action === "hold") {
      invoice.status = "On Hold";
      invoice.holdReason = req.body.reason?.trim() || "Variance requires review";
    } else if (status) {
      invoice.status = status;
    } else {
      return res.status(400).json({
        message: "Provide action (approve, reject, hold) or status"
      });
    }

    await invoice.save();

    res.status(200).json({
      invoice: formatInvoice(invoice),
      message: `Invoice ${invoice.invoiceId} updated by ${userName}`
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
};

exports.formatCurrencyDetailed = formatCurrencyDetailed;
