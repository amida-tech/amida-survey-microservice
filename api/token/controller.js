const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
  create: function(req, res) {
    const token = createUserJWT(req.user);
    if (token) {
      res.status(200).json({token});
    } else {
      console.log("Error producing JWT: ", token);
      res.status(400);
    }
  }
};

function createJWT(payload) {
  const options = { expiresIn: "30d" };
  // replace 'development' with process ENV.
  return jwt.sign(payload, config['development'].jwt.secret, options);
}

function createUserJWT(user) {
  const payload = {
    id: user.id,
    email: user.email,
    admin: user.admin
  };
  return createJWT(payload);
}