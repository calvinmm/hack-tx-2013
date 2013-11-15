Proposed API
============

* POST /new_file
  Data: blocks=DEADBEEFCAFE+0123456+...
  Creates a new file object, with given block hashes
  Returns a file_id

* GET /file/file_id
  Returns a JSON object:
  { blocks=[Array of block ids],
    peers=[Array of peer ids]
  }

  (I assume we can encode the way to connect to the peers in an id)

* GET /subscribe/file_id
  Longpolling, returns a peer id when a new peer connects for the file.

* GET /status/file_id
  Returns a JSON map:
  { peer_id => [block ids peer has] }

// To be continued as needed
