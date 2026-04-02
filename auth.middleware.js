const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Grab the token from the headers
    // The frontend sends it looking like: "Bearer eYJhbG..."
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // We split it to remove "Bearer "

    // 2. If there is no token, kick them out
    if (!token) {
        return res.status(401).json({ error: "Access Denied. You must be logged in!" });
    }

    try {
        // 3. Verify the token using our secret key
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Important: attach the user ID to the request so other routes can use it!
        req.user = verified; 
        
        // 5. Let them pass to the next function
        next(); 
    } catch (error) {
        res.status(403).json({ error: "Invalid Token!" });
    }
};

module.exports = verifyToken;