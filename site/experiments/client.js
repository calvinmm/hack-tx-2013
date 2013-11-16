
// TODO: fill in these global fields from server api calls
var me = "myrandomid" + Math.random();
var master = "master";

var BLOCK_SIZE = 4096;

var state = {
  others: [],
  files: {},
  other_states: {},
  transfers: {}
};
var connections = {};
// Only the master will have this
var file_handles = {};
// All peers will have this
var finished_files = {};

var message_types = {
  REQ_FILES : 0,
  RES_FILES : 1,
  REQ_BLOCK : 2,
  RES_BLOCK : 3
};

// Should be called when a file is selected
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.

  // files is a FileList of File objects. List some properties.
  var output = [];
  for (var i = 0, f; f = files[i]; i++) {
    masterAddedFile(f);
  }
}

function masterAddedFile(file) {
  var id = guid();
  var n = Math.ceil(file.size / BLOCK_SIZE);
  var blocks = [];
  for (var i = 0; i < n; i++) {
    blocks.push(i);
  }
  file_handles[id] = file;
  state.files[id] = {
    name: file.name,
    size: file.size,
    num_blocks: n,
    blocks: blocks
  }
}

// Sends a message to another user
function sendMessage(message, rec) {
  message.sender = me;
  connections[rec].message.send(message);
}

// Used for sending data to another user
function sendData(message, rec) {
  message.sender = me;
  connections[rec].data.send(message);
}

function processMessage(message) {
  var sender = message.sender;
  if (message.type == message_types.REQ_FILES) {
    sendFileDescriptors(sender);
  } else if (message.type == message_types.RES_FILES) {
    addFiles(message.data);
  } else if (message.type = message_types.REQ_BLOCK) {
    sendBlock(message.file_id, message.block_num, sender)
  } else {
    console.log("unrecognized message received", message);
  }
}

// save this chunk
function processData(message) {
  var sender = message.sender;
  if (message.type == message_types.RES_BLOCK) {
    if (hasBlock(message.file_id, message.block_num)) {
      // Already have this block fool
      return;
    }
    writeBlock(message.file_id, message.block_num, message.data, sender);
  } else {
    console.log("unrecognized data message received", message);
  }
}

function hasBlock(file_id, block_num) {
  return state.files[file_id].blocks.indexOf(block_num) != -1
}

// Asks someone for file descriptors
function reqFiles(rec) {
  var message = {
    type : message_types.REQ_FILES
  };
  sendMessage(message, rec);
}

// Sends the file descriptions we know of to rec
function sendFileDescriptors(rec) {
  var files_to_send = {};
  for (var f in state.files) {
    if (state.files.hasOwnProperty(f)) {
      files_to_send[f] = state.files[f];
      files_to_send[f].blocks = [];
    }
  }
  var message = {
    data: files_to_send,
    type: message_types.RES_FILES
  };
  sendMessage(message, rec);
}

// Updates state with the file descriptors
function addFiles(descripts) {
  for (var f in descripts) {
    if (descripts.hasOwnProperty(f)) {
      if (!state.files[f]) {
        state.files[f] = descripts;
      }
    }
  }
}

function updatePeer(peer_id) {
  if (!state.transfers[peer_id]) {
    state.transfers[peer_id] = {
      send_block: {file_id: "", block: -1},
      rec_block: {file_id: "", block: -1}
    };
  }
  if (state.transfers[peer_id].rec_block == -1) {
    var things_to_req = [];
    for (var file_id in state.files) {
      if (state.files.hasOwnProperty(file_id)) {
        var list = state.other_states[peer_id];
        for (var i = 0; i < list.length; i++) {
          if (state.files[file_id].blocks.indexOf(list[i]) == -1) {
            // We don't have it and they do
            things_to_req.push({file_id: file_id, block_num: list[i]});
          }
        }
      }
    }
    if (things_to_req.length > 0) {
      // pick one of the possible requests to make
      var obj = things_to_req[Math.floor(Math.random() * things_to_req.length)];
      reqBlock(obj.file_id, obj.block_num, peer_id);
    }
  }
}

function getFileName(file_id, block_num) {
  return file_id + '-' + block_num;
}

function addReceivedBlock(file_id, block_num) {
  if (state.files[file_id].blocks.indexOf(block_num) == -1) {
    state.files[file_id].blocks.push(block_num);
  } else {
    console.log("got same block again...", file_id, block_num);
  }
}

function checkDoneWithFile(file_id) {
  if (state.files[file_id].blocks.length == state.files[file_id].num_blocks) {
    // Done with this file!
    if (finished_files[file_id]) {
      // Already done it!
      return;
    }
    combine(file_id);
  }
}

// Called by the client to write the files to the filesystem
function writeBlock(file_id, block_num, data, sender) {
  var filename = getFileName(file_id, block_num);
  fs.root.getFile(filename, {create: true}, function(fileEntry) {
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = function(e) {
        addReceivedBlock(file_id, block_num);
        updateBlockReceiving("", -1, sender);
        checkDoneWithFile(file_id);
      };
      fileWriter.onerror = function(e) {
        console.log("File:", filename, "failed to write to combined file", e);
      };
      fileWriter.write(data);
    });
  });
}

function readBlockDeferred(file_id, block_num) {
  var deferred = $.Deferred();
  var filename = getFileName(file_id, block_num);
  fs.root.getFile(filename, {}, function(fileEntry) {
    fileEntry.file(function(file) {
      var reader = new FileReader();
      reader.onloadend = function(evt) {
        finished_files[file_id][block_num] =
          new Blob([evt.target.result]);
        deferred.resolve();
      };
      reader.readAsArrayBuffer(file);
    });
  });
  return deferred;
}

// Combine peer file part handles into full file
function combine(file_id) {
  finished_files[file_id] = {};
  var reads = [];
  for (var b = 0; b < state.files[file_id].num_blocks; b++) {
    reads.push(readBlockDeferred(file_id, b));
  }
  $.when.apply($, reads).done(function() {
    var fullFile = [];
    for (var i = 0; i < state.files[file_id].num_blocks; i++) {
      fullFile.push(finished_files[file_id][i]);
      delete finished_files[file_id][i];
    }
    finished_files[file_id] = true;
    saveAs(fullFile, state.files[file_id].name);
    fullFile.length = 0;
  }, function(err) {
    console.log("Uh oh, ran into error loading a block", err);
  });
}

function reqBlock(file_id, block_num, rec) {
  var message = {
    type: message_types.REQ_BLOCK,
    file_id: file_id,
    block_num: block_num
  };
  updateBlockReceiving(file_id, block_num, rec);
  sendMessage(message, rec);
}

function updateBlockReceiving(file_id, block_num, peer_id) {
  if (!state.transfers[peer_id]) {
    state.transfers[peer_id] = {
      send_block: {file_id: "", block: -1},
      rec_block: {file_id: "", block: -1}
    };
  }
  state.transfers[peer_id].rec_block.file_id = file_id;
  state.transfers[peer_id].rec_block.block_num = block_num;
}

function updateBlockSending(file_id, block_num, peer_id) {
  if (!state.transfers[peer_id]) {
    state.transfers[peer_id] = {
      send_block: {file_id: "", block: -1},
      rec_block: {file_id: "", block: -1}
    };
  }
  state.transfers[peer_id].send_block.file_id = file_id;
  state.transfers[peer_id].send_block.block_num = block_num;
}

function sendBlock(file_id, block_num, rec) {
  var isMaster = me == master;
  updateBlockSending(file_id, block_num, rec);
  if (isMaster) {
    sendSlicedBlock(file_id, block_num, rec);
  } else {
    sendFSBlock(file_id, block_num, rec);
  }
}

function sendSlicedBlock(file_id, block_num, rec) {
  var file = file_handles[file_id];
  var reader = new FileReader();
  reader.onloadend = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      var newBlob = new Blob([evt.target.result], {type: "audio/wav"});
      var m = {
        file_id: file_id,
        type: message_types.RES_BLOCK,
        block_num: block_num,
        data: newBlob
      };
      sendData(m, rec);
      updateBlockSending("", -1, rec);
    }
  };
  var lim = Math.min((block_num + 1) * BLOCK_SIZE, state.files[file_id].size);
  var blob = file.slice(block_num * BLOCK_SIZE, lim);
  reader.readAsArrayBuffer(blob);
}

function sendFSBlock(file_id, block_num , rec) {
  var filename = getFileName(file_id, block_num);   // this is just a string
  fs.root.getFile(filename, {}, function(fileEntry) {
    fileEntry.file(function(file) {
      var reader = new FileReader();
      reader.onloadend = function(evt) {
        var newBlob = new Blob([evt.target.result], {type: "audio/wav"});
        var m = {
          file_id: file_id,
          type: message_types.RES_BLOCK,
          block_num: block_num,
          data: newBlob
        };
        sendData(m, rec);
        updateBlockSending("", -1, rec);
      };
      reader.readAsArrayBuffer(file);
    });
  });
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
