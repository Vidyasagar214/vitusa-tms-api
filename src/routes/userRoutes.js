const express = require("express");

const router = express.Router();

const {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require("../controllers/userController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect, authorize("admin"));

router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
