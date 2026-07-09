require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const ADMIN_EMAIL = "admin@vitusa.com";
const ADMIN_PASSWORD = "password123";

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      name: "System Admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      department: "IT",
      carrierPortal: "full",
      status: "active"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin ready: ${user.email}`);

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
