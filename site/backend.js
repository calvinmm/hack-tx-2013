var pg = require('pg');
var express = require('express');
var connect = require('connect');
var app = express();
var Q = require('q');

app.use(connect.urlencoded());
app.use(connect.json());

var conString = "postgres://postgres@localhost/hacktx";
var client = new pg.Client(conString);
var query = Q.nbind(client.query, client);

// function get_max_fileid() {
//   return query('SELECT MAX(file_id) as id FROM files');
// }

Q.ninvoke(client, "connect").then(
  function() {
    app.post('/new_file', function(req, res) {
      var size = parseInt(req.body.size);
      query('INSERT INTO files (size) VALUES ($1) RETURNING file_id', [size])
        .then(
          function(result) {
            var file_id = result.rows[0].file_id;
            res.send(file_id.toString());
          }
      ).catch(
        function(err) {
          console.err('Error creating file', err);
          res.send('errror: ' + err);
        }
      );
    });

    app.get('/file/:file_id', function(req, res) {
      var file_id = req.params.file_id;
      res.send('NOT IMPLEMENTED');
    });

    app.get('/subscribe/:file_id', function(req, res) {
      setTimeout(20000, function() {
        res.send('NOT IMPLEMENTED');
      });
    });

    app.get('/status/:file_id', function(req, res) {
      var file_id = req.params.file_id;
      res.send('NOT IMPLEMENTED');
    });

    console.log('Listening on 3000');
    app.listen(3000);
  });
