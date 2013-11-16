var pg = require('pg');
var conString = "postgres://postgres@localhost/hacktx";
var Q = require('q');

var client = new pg.Client(conString);
var query = Q.nbind(client.query, client);

console.log('connecting');

Q.ninvoke(client, "connect").then(
  function() {
    console.log('connected');
    return query('CREATE TABLE files' +
                 '(file_id SERIAL PRIMARY KEY,' +
                 ' size INT)');
    }
  ).then(
    function() {
      return query('CREATE TABLE peers' +
                   '(peer_id INT PRIMARY KEY,' +
                   ' file_id INT REFERENCES files(file_id))');
    }
  ).then(
    function() {
      return query('CREATE TABLE status' +
                   '( file_id INT REFERENCES files(file_id), ' +
                   'peer_id INT REFERENCES peers(peer_id),' +
                   'block_id INT)');
    }
  ).then(
    function() {
      console.log('Done');
    }, function(err) {
      console.error('error: ', err);
  });
