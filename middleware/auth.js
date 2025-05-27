const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_secure_random";

module.exports = function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
