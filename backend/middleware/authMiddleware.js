const jwt = require("jsonwebtoken");

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Kein Token übergeben" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // z. B. { userId, email }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Ungültiger Token" });
  }
}

module.exports = authenticateUser;
