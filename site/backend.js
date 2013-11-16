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

function get_peers_for_fileid(file_id) {
  return query('SELECT peer_id FROM peers WHERE file_id=$1', [file_id]).
    then(function(result) {
      var retval = result.rows.map(function(row) { return row.peer_id; });
      return retval;
    })
    .catch(function(err) {
      console.log('Error getting peers:' , err);
    });
}

function get_file_size(file_id) {
  return query('SELECT size FROM files WHERE file_id=$1', [file_id])
    .then(
      function(result) {
        return result.rows[0].size;
      });
}

Q.ninvoke(client, "connect").then(
  function() {

    // Maps from file_ids to a object of this form
    // {
    //   watchers => { peer_id: true if already notified }
    //   responses => [ response objects ]
    // }
    var subscribers = {};

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
      var size_query = get_file_size(file_id);
      var peers_query = get_peers_for_fileid(file_id);
      Q.all([size_query, peers_query]).then(function(results) {
        var size = results[0];
        var peers = results[1];
        res.send({size: size,
                  peers: peers});
      });
    });

    app.get('/subscribe/:file_id', function(req, res) {
      var file_id = req.params.file_id;
      var peer_id = req.query.peer_id;

      var file_subscriptions = subscribers[file_id];
      if (!file_subscriptions) {
        file_subscriptions = { watchers: {}, responses: [] };
        subscribers[file_id] = file_subscriptions;
      }

      var is_new = !(file_subscriptions.watchers[peer_id]);
      if (is_new) {
        var to_notify = file_subscriptions.responses || [];
        to_notify.forEach(function(notify_res) {
          notify_res.send(peer_id);
        });
        file_subscriptions.responses = [res];
        file_subscriptions.watchers[peer_id] = true;
      } else {
        file_subscriptions.responses.push(res);
      }
    });

    app.get('/status/:file_id', function(req, res) {
      var file_id = req.params.file_id;
      res.send('NOT IMPLEMENTED');
    });

    console.log('Listening on 3000');
    app.listen(3000);
  });
