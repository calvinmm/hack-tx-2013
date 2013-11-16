Proposed API
============

* > POST /new_file
  > Data: size=Number of blocks in file
  Creates a new file object, with given number of blocks
  Returns a file_id

* > GET /file/file_id
  Returns a JSON object:
  > { size=Number of blocks
  >  peers=[Array of peer ids]
  > }

  (I assume we can encode the way to connect to the peers in an id of some sort)

* > GET /subscribe/file_id?peer_id=peerid
  Longpolling, returns a peer id when a new peer connects for the file.
  Registers this peer with the server

* > GET /status/file_id
  Returns a JSON map:
  > { peer_id => [block sequence numbers peer has] }

* > POST /update/file_id
  > Data: block_id, peer_id
  Tells server that peer_id has received block_id

// To be continued as needed
