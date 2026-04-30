const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7).trim() 
      : authHeader.trim();
    
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed: ' + err.message });
  }
};

module.exports = authenticate;