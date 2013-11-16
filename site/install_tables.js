var pg = require('pg');
var connection_config =  {
  user: 'adamf',
  database: 'hacktx',
  host: 'localhost',
  port: 5432,
  password: 'hacktx'
};


var Q = require('q');

var client = new pg.Client(connection_config);
var query = Q.nbind(client.query, client);

console.log('connecting');

Q.ninvoke(client, "connect").then(
  function() {
    console.log('connected');
    return query('DROP TABLE rooms CASCADE').fail(function(){}).then(
      function() {
        return query('DROP TABLE files CASCADE').fail(function(){});
      }).then(
        function() {
          return query('DROP TABLE peers CASCADE').fail(function(){});
        }
      ).then(
        function() {
          return query('DROP TABLE status CASCADE').fail(function(){});
        }
      ).then(
        function() {
          return query('CREATE TABLE rooms' +
                       '(room_id SERIAL PRIMARY KEY)').fail(function(){});
        }
      ).then(function(){
        return query('CREATE TABLE files' +
                     '(file_id SERIAL PRIMARY KEY,' +
                     ' size INT, ' +
                     ' room_id INT REFERENCES rooms(room_id))');
      }).then(function() {
        return query('CREATE TABLE peers' +
                     '(peer_id varchar(16) PRIMARY KEY,' +
                     ' file_id INT REFERENCES files(file_id))');
      }).then(function() {
        return query('CREATE TABLE status' +
                     '( file_id INT REFERENCES files(file_id), ' +
                     'peer_id varchar(16),' +
                     'block_id INT,' +
                     'UNIQUE(file_id, peer_id, block_id))');
      });
  }).then(
    function() {
      console.log('Done');
    }, function(err) {
      console.error('error: ', err);
  });
