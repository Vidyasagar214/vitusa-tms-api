const Customer = require("../models/Customer");
const Location = require("../models/Location");
const Carrier = require("../models/Carrier");
const Commodity = require("../models/Commodity");

const formatCustomer = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  code: doc.code,
  contactEmail: doc.contactEmail,
  status: doc.status
});

const formatLocation = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  type: doc.type,
  city: doc.city,
  state: doc.state,
  address: doc.address,
  label: `${doc.name}, ${doc.state}`,
  customerId: doc.customerId,
  status: doc.status
});

const formatCarrier = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  scac: doc.scac,
  ediConnected: doc.ediConnected,
  portalEnabled: doc.portalEnabled,
  modes: doc.modes,
  status: doc.status
});

const formatCommodity = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  mode: doc.mode,
  customerId: doc.customerId,
  bulkRequirements: doc.bulkRequirements ?? [],
  status: doc.status
});

const buildLocationFilter = (type) => {
  const filter = { status: "active" };
  if (!type) return filter;

  if (type === "shipper") {
    filter.type = { $in: ["shipper", "both"] };
  } else if (type === "receiver") {
    filter.type = { $in: ["receiver", "both"] };
  } else {
    filter.type = type;
  }

  return filter;
};

exports.getSummary = async (req, res) => {
  try {
    const [customers, locations, carriers, commodities] = await Promise.all([
      Customer.countDocuments({ status: "active" }),
      Location.countDocuments({ status: "active" }),
      Carrier.countDocuments({ status: "active" }),
      Commodity.countDocuments({ status: "active" })
    ]);

    res.status(200).json({
      counts: { customers, locations, carriers, commodities }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ status: "active" }).sort({ name: 1 });
    res.status(200).json({ customers: customers.map(formatCustomer) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, code, contactEmail } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const customer = await Customer.create({
      name: name.trim(),
      code: code?.trim() ?? "",
      contactEmail: contactEmail?.trim() ?? ""
    });

    res.status(201).json({ customer: formatCustomer(customer) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Customer already exists" });
    }

    res.status(500).json({ message: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find(buildLocationFilter(req.query.type)).sort({
      name: 1
    });

    res.status(200).json({ locations: locations.map(formatLocation) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const { name, type, city, state, address, customerId } = req.body;

    if (!name?.trim() || !city?.trim() || !state?.trim()) {
      return res.status(400).json({
        message: "name, city, and state are required"
      });
    }

    const location = await Location.create({
      name: name.trim(),
      type: type ?? "both",
      city: city.trim(),
      state: state.trim(),
      address: address?.trim() ?? "",
      customerId: customerId ?? undefined
    });

    res.status(201).json({ location: formatLocation(location) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCarriers = async (req, res) => {
  try {
    const carriers = await Carrier.find({ status: "active" }).sort({ name: 1 });
    res.status(200).json({ carriers: carriers.map(formatCarrier) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCarrier = async (req, res) => {
  try {
    const { name, scac, ediConnected, portalEnabled, modes } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const carrier = await Carrier.create({
      name: name.trim(),
      scac: scac?.trim() ?? "",
      ediConnected: ediConnected ?? false,
      portalEnabled: portalEnabled ?? false,
      modes: modes ?? ["TL"]
    });

    res.status(201).json({ carrier: formatCarrier(carrier) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Carrier already exists" });
    }

    res.status(500).json({ message: error.message });
  }
};

exports.getCommodities = async (req, res) => {
  try {
    const filter = { status: "active" };
    if (req.query.mode) filter.mode = req.query.mode;

    const commodities = await Commodity.find(filter).sort({ name: 1 });
    res.status(200).json({ commodities: commodities.map(formatCommodity) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCommodity = async (req, res) => {
  try {
    const { name, mode, customerId, bulkRequirements } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const commodity = await Commodity.create({
      name: name.trim(),
      mode: mode ?? "Bulk",
      customerId: customerId ?? undefined,
      bulkRequirements: bulkRequirements ?? []
    });

    res.status(201).json({ commodity: formatCommodity(commodity) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Commodity already exists" });
    }

    res.status(500).json({ message: error.message });
  }
};
