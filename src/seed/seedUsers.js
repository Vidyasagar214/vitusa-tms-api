require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const DEFAULT_PASSWORD = "password123";

const users = [
  {
    name: "System Admin",
    email: "admin@vitusa.com",
    role: "admin",
    department: "IT",
    carrierPortal: "full"
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@vitusa.com",
    role: "coordinator",
    department: "Logistics",
    carrierPortal: "none"
  },
  {
    name: "James Park",
    email: "james.park@vitusa.com",
    role: "finance",
    department: "Accounting",
    carrierPortal: "none"
  },
  {
    name: "Rachel Kim",
    email: "r.kim@midwesttank.com",
    role: "carrier",
    department: "Midwest Tank Lines",
    carrierPortal: "enabled"
  }
];

async function seedUsers() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const userData of users) {
    await User.findOneAndUpdate(
      { email: userData.email },
      {
        ...userData,
        password: hashedPassword,
        status: "active"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Users seeded: ${users.length}`);
  console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
