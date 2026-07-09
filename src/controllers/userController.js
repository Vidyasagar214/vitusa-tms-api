const bcrypt = require("bcryptjs");
const User = require("../models/User");

const ALLOWED_ROLES = ["admin", "coordinator", "finance", "carrier"];

const formatLastLogin = (date) => {
  if (!date) return "Never";

  const now = new Date();
  const loginDate = new Date(date);
  const isToday =
    loginDate.getDate() === now.getDate() &&
    loginDate.getMonth() === now.getMonth() &&
    loginDate.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    loginDate.getDate() === yesterday.getDate() &&
    loginDate.getMonth() === yesterday.getMonth() &&
    loginDate.getFullYear() === yesterday.getFullYear();

  const time = loginDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;

  return loginDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department ?? "",
  carrierPortal: user.carrierPortal ?? "none",
  status: user.status ?? "active",
  lastLogin: formatLastLogin(user.lastLogin),
  createdAt: user.createdAt
});

const buildStats = (users) => {
  const activeUsers = users.filter((user) => user.status === "active");
  const roles = new Set(users.map((user) => user.role));
  const carrierPortalAccounts = users.filter(
    (user) => user.carrierPortal !== "none"
  ).length;

  return {
    activeUsers: activeUsers.length,
    totalUsers: users.length,
    roleCount: roles.size,
    carrierPortalAccounts
  };
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      users: users.map(formatUser),
      stats: buildStats(users)
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, carrierPortal, status } =
      req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "name, email, password, and role are required"
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `role must be one of: ${ALLOWED_ROLES.join(", ")}`
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      department: department?.trim() ?? "",
      carrierPortal: carrierPortal ?? "none",
      status: status ?? "active"
    });

    res.status(201).json({
      user: formatUser(user)
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    res.status(500).json({
      message: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, role, department, carrierPortal, status, password } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (req.user._id.equals(user._id) && status === "inactive") {
      return res.status(400).json({
        message: "You cannot deactivate your own account"
      });
    }

    if (role != null && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: `role must be one of: ${ALLOWED_ROLES.join(", ")}`
      });
    }

    if (name != null) user.name = name.trim();
    if (role != null) user.role = role;
    if (department != null) user.department = department.trim();
    if (carrierPortal != null) user.carrierPortal = carrierPortal;
    if (status != null) user.status = status;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.status(200).json({
      user: formatUser(user)
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    res.status(500).json({
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (req.user._id.equals(user._id)) {
      return res.status(400).json({
        message: "You cannot delete your own account"
      });
    }

    user.status = "inactive";
    await user.save();

    res.status(200).json({
      message: "User deactivated",
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
