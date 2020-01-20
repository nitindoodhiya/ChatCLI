const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors');
const Chatkit = require('@pusher/chatkit-server')
var mysql = require('mysql');
const app = express()
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chatCLI"
});

const chatkit = new Chatkit.default({
  instanceLocator: 'v1:us1:34da0fdb-580d-4e02-b380-20a6311a9bc4',
  key:
    'b57edd25-8da4-4a07-a905-8b239a23ad29:y2cgoxKHMTYLpz26KM+e/JZgn2Hl7/+fU4hTr1LQ0Hg='
})

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

app.post('/users', (req, res) => {
  const { username } = req.body
  chatkit
    .createUser({
      id: username,
      name: username
    })
    .then(() => {
      console.log(`User created: ${username}`)
      res.sendStatus(201)
    })
    .catch(err => {
      if (err.error === 'services/chatkit/user_already_exists') {
        console.log(`User already exists: ${username}`)
        res.sendStatus(200)
      } else {
        res.status(err.status).json(err)
      }
    })
  });


app.post('/checkuser', (req, res) => {
  const { username,password } = req.body
  con.connect(function(err) {
      con.query("SELECT * FROM users WHERE username = '"+username+"' AND password='"+password+"'", function (err, result, fields) {
      if (err) throw err;
      else if(result.length==0)
        res.sendStatus(401);
      else{
        res.sendStatus(200);
      }
    });
  });

})

app.post('/authenticate', (req, res) => {
  const authData = chatkit.authenticate({ userId: req.query.user_id })
  res.status(authData.status).send(authData.body)
})

const port = 3001
app.listen(port, err => {
  if (err) {
    console.log(err)
  } else {
    console.log(`Running on port ${port}`)
  }
})