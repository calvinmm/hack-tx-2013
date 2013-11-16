Proposed API
============

* > POST /new_room
  Creates a new room.
  Returns room_id

* > POST /new_file
  > Data: size=Number of blocks in file, room_id
  Creates a new file object in the given room, with given number of blocks
  Returns a file_id

* > GET /files/room_id
  Returns a JSON list of file_ids

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
