const jwt = require("jsonwebtoken")

const isAuthenticated = (req, res, next) => {
    // const username = req.body.name
    // const user ={name:username}
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(404).json("no token found")
    }
    // console.log(authHeader)
    const token =authHeader.split(" ")[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        res.status(401).json("not authorised")
        
    }
}

module.exports =isAuthenticated