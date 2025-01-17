import express from 'express' 
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/authAPI'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  name: {
    type: String,
    minlength:3,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header('Authorization')})

    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ loggedOut: true, message: 'Please try logging in again' })
    }
  } catch (err) {
    res.status(403).json({ message: 'Access token is missing or wrong', errors: err })
  }
}

const port = process.env.PORT || 8080
const app = express()

app.use(cors())
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Welcome!')
})

app.post('/users', async (req, res) => { 
  try { 
    const { name, password } = req.body
    const SALT = bcrypt.genSaltSync(10)
    const user = await new User({ name, password: bcrypt.hashSync(password, SALT)}).save()
    res.status(201).json({id: user._id, accessToken: user.accessToken})
  } catch (err) {
    res.status(400).json({message: "Could not create user", errors:err.errors})
  }
})

app.get('/users/:id', authenticateUser)
app.get('/users/:id', (req, res) => {
  res.status(401).send()
})

app.post('/sessions', async (req, res) => {
  try {
    const { name, password } = req.body
    const user = await User.findOne({ name })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({ userId: user._id, accessToken: user.accessToken })
    } else {
      res.status(404).json({ notFound: true, message: "Check if username and/or password is correct" })
    }
  } catch (err) {
    res.status(404).json({ notFound: true, message: "Check if username and/or password is correct"})
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})