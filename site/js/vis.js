var c = document.getElementById('visCanvas');
var width = $(visCanvas).attr("width");
var height = $(visCanvas).attr("height");
var ctx = c.getContext('2d');


// set up state
var me = 'user4';

var state = {
	others: ['user1', 'user4', 'user2', 'user3'],
	other_state: {
		user1: {
			file1: [1, 2, 5, 6],
			file2: [1, 3]
		},
		user2: {
			file1 : [2, 6],
			file3: [2, 4]
		},
		user3: {
			file4: [1, 2, 3]
		},
		// me
		user4: {
			file1: [3, 4],
			file2: [2, 4],
			file4: [4, 5]
		}
	},
	files : {
		file1: {
			name: "doge.txt",
			size: 1025,
			num_blocks: 6,
			blocks: [3, 4]
		},
		file2: {
			name: "poop.gif",
			size: 69,
			num_blocks: 4,
			blocks: [2, 4]
		},
		file3: {
			name: "hack.jar",
			size: 1337,
			num_blocks: 3,
			blocks: []
		},
		file4: {
			name: "file4",
			size: 4,
			num_blocks: 4,
			blocks: [4, 5]
		}
	},
	transfers: {
		user1: {
			send_block: {
				fileid: '',
				block: -1
			},
			rec_block: {
				fileid: 'file1',
				block: 2
			}
		},
		user2: {
			send_block: {
				fileid: 'file3',
				block: 4
			},
			rec_block: {
				fileid: '',
				block: -1
			}
		}
	}
};

var deltastate = {
	others: ['user1', 'user4', 'user2', 'userQ', 'user3'],
	other_state: {
		user1: {
			file1: [1, 2, 5, 6],
			file2: [1, 3]
		},
		user2: {
			file1 : [2, 6],
			file3: [2, 4]
		},
		user3: {
			file4: [1, 2, 3]
		},
		// me
		user4: {
			file1: [3, 4],
			file2: [2, 4],
			file4: [4, 5]
		}
	},
	files : {
		file1: {
			name: "doge.txt",
			size: 1025,
			num_blocks: 6,
			blocks: [3, 4, 5, 6]
		},
		file2: {
			name: "poop.gif",
			size: 69,
			num_blocks: 4,
			blocks: [1, 2, 4]
		},
		file3: {
			name: "hack.jar",
			size: 1337,
			num_blocks: 3,
			blocks: [1]
		},
		file4: {
			name: "file4",
			size: 4,
			num_blocks: 5,
			blocks: [1, 4, 5]
		}
	},
	transfers: {
		user1: {
			send_block: {
				fileid: 'file2',
				block: 3
			},
			rec_block: {
				fileid: '',
				block: -1
			}
		},
		user2: {
			send_block: {
				fileid: 'file3',
				block: 4
			},
			rec_block: {
				fileid: '',
				block: -1
			}
		}
	}
};

// points
var userNodes = [];
var fileNodes = [];

var center = undefined;
var radius = 180;

var userNodeRadius = 20;

var fileNodeRadius = 100;
var transRadius = 12;

var transferSpeed = 4;

var currenttransfers = [];

var head = undefined;
var totalFileChunks = 0;

// ms per frame
var ms = 25;

// drawing styles
var backgroundStyle = "#FFFFFF";
var lineStyle = "#000000";
var fileStyle = "#BB4F00";
var fileProgressStyle = "#FF7F00";
var fileStrokeStyle = "#882C00";
var userStyle = "#8FBAD5";
var meStyle = "#FFFF00";
var hostStyle = "#FF0000";


// state for placing next node

//ListNode.prototype.ListNode = function(ang) {
function ListNode(ang) {
	this.angle = ang;
	this.next = undefined;
};

ListNode.prototype.split = function() {
	this.angle /= 2;
  var newnode = new ListNode(this.angle);
	newnode.next = this.next;
	this.next = newnode;
};

nextPoint = function() {
	var bestAngle = 0;
	if (head == undefined) {
		head = new ListNode(2 * Math.PI);
	} else {
		var maxAngle = 0;
		var bestNode = undefined;
		var cur = head;
		var totalAngle = 0;
		while (cur != undefined) {
			if (cur.angle > maxAngle) {
				maxAngle = cur.angle;
				bestNode = cur;
				bestAngle = totalAngle + cur.angle/2;
			}
			totalAngle += cur.angle;
			cur = cur.next;
		}
		bestNode.split();
	}
	bestAngle = Math.PI - bestAngle; // want 0 to be at 180 (first node is on left) and clockwise around
  // extend radius if would cause collisions
	if (4 *userNodeRadius > radius * maxAngle) {
		radius += 4 * userNodeRadius;
	}
	return new Point(center.x + radius * Math.cos(bestAngle), center.y + radius * Math.sin(bestAngle));
};

// Want to add you first, host second
addUser = function(userid, host) {
	userNodes.push(new UserNode(nextPoint(), userid, host));
};

addFile = function(name, size, fileid, numchunks, curchunks) {
	fileNodes.push(new FileNode(name, size, fileid, numchunks, curchunks));
	totalFileChunks += numchunks;
};



// this is the part used strictly for drawing the transfers, is not all of the state
function Point(x, y) {
  this.x = x;
  this.y = y;
};

function Link(a, b) {
  this.a = a;
  this.b = b;
  this.u = 0.0;
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	this.len = Math.sqrt(dx * dx + dy * dy);
};

Link.prototype.update = function(distToMove) {
	var distleft = (1 - this.u) * this.len;
	if (distleft < distToMove) {
		this.u = 1.0;
		return distToMove - distleft;
	}
	this.u += 1.0 * distToMove / this.len;
	return 0;
};

Link.prototype.getPoint = function() {
	return new Point(this.a.x * (1 - this.u) + this.b.x * this.u, this.a.y * (1 - this.u) + this.b.y * (this.u));
};

Link.prototype.reset = function() {
	this.u = 0.0;
};

addTransfer = function(userid, fileid, chunkid, downloading) {
	var unode = undefined;
	if (userid != undefined) {
		for (var i = 0; i < userNodes.length; i++) {
			if (userNodes[i].id == userid) {
				unode = userNodes[i];
				break;
			}
		}	
	}
	var fnode = undefined;
	for (var i = 0; i < fileNodes.length; i++) {
		if (fileNodes[i].id == fileid) {
			fnode = fileNodes[i];
			break;
		}
	}
	currenttransfers.push( new Transfer(unode.point, center, downloading, userid, fileid, chunkid, fnode.filledStyle) );
};

removeTransfer = function(uid, fileid, chunkid, downloading) {
  for (var i = 0; i < currenttransfers.length; i++) {
		var t = currenttransfers[i];
		if (t.id == uid && t.fid == fileid && t.chunk == chunkid && t.down == downloading) {
			currenttransfers.splice(i, 1);
      break;
    }
  }
};

// transferring file chunk of file pointfile from user a to user b
function Transfer(pointuser, pointfile, downloading, uid, fid, cid, color) {
	this.a = (downloading) ? pointuser : pointfile;
	this.b = (downloading) ? pointfile : pointuser;
	this.cur = new Link(this.a, this.b);
	// for indexing/removing transfers when the file is done
	this.uid = uid;
	this.fileid = fid;
	this.chunkid = cid;
	this.color = color;
};

Transfer.prototype.update = function(distToMove) {
	var left = this.cur.update(distToMove);
	while (left > 0) {
		this.cur.reset();
		left = this.cur.update(left);
	}
};

randomFileStyle = function(fnode) {
	// want random value between base and FF for each base color so the filled color can be darker
	var decbase = 80;
  var decFF = 255;
	var redval = Math.floor(Math.random() * (decFF - decbase + 1));
	var greenval = Math.floor(Math.random() * (decFF - decbase + 1));
	var blueval = Math.floor(Math.random() * (decFF - decbase + 1));
	fnode.filledStyle = "#" + hexDig(redval / 16) + hexDig(redval % 16) + hexDig(greenval / 16) + hexDig(greenval % 16) + hexDig(blueval / 16) + hexDig(blueval % 16);
	redval += decbase;
	greenval += decbase;
	blueval += decbase;
	fnode.clearStyle = "#" + hexDig(redval / 16) + hexDig(redval % 16) + hexDig(greenval / 16) + hexDig(greenval % 16) + hexDig(blueval / 16) + hexDig(blueval % 16);
};

hexDig = function(i) {
	i = Math.floor(i);
	if (i < 10) return String.fromCharCode('0'.charCodeAt(0) + i);
	else return String.fromCharCode('A'.charCodeAt(0) + (i - 10));
};

function FileNode(name, size, fileid, totchunks, curchunks) {
	this.name = name;
	this.size = size;
	this.id = fileid;
	this.totalchunks = totchunks;
	this.curchunks = (undefined == curchunks) ? 0 : curchunks;
	this.filledStyle = undefined;
	this.clearStyle = undefined;
	randomFileStyle(this);
};

FileNode.prototype.progress = function() {
	return 1.0 * this.curchunks/this.totalchunks;
};

function UserNode(point, userid, host) {
	this.point = point;
	this.id = userid;
	this.host = host;
};



update = function() {
	// TODO if any state changed, modify it
	// update all transfers
	for (var i = 0; i < currenttransfers.length; i++) {
		currenttransfers[i].update(transferSpeed);
	}
};

drawArc = function(x, y, radius, arcstart, arcend) {
	var delta = Math.PI / 50;
	for (var cur = arcstart; cur < arcend; cur+=delta) {
		var nextarc = Math.min(arcend, cur + delta);
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + radius * Math.cos(cur), y + radius * Math.sin(cur));
		ctx.lineTo(x + radius * Math.cos(nextarc), y + radius * Math.sin(nextarc));
		ctx.lineTo(x, y);
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.stroke();
	}
};

draw = function() {
	// draw lines between nodes
	ctx.lineWidth = 1;
	ctx.strokeStyle = lineStyle;
	for (var j = 0; j < userNodes.length; j++) {
		userpt = userNodes[j].point;
		ctx.beginPath();
		ctx.moveTo(center.x, center.y);
		ctx.lineTo(userpt.x, userpt.y);
		ctx.stroke();
	}
	ctx.lineWidth = 1;
	// draw each current transfer
	for (var i = 0; i < currenttransfers.length; i++) {
		var transpt = currenttransfers[i].cur.getPoint();
		//window.console.log(transpt.x + " " + transpt.y);
		ctx.fillStyle = currenttransfers[i].color;
		ctx.beginPath();
		ctx.arc(transpt.x, transpt.y, transRadius, 0, 2*Math.PI, false);
		ctx.fill();
		//ctx.stroke();
	}
	// draw file node
	ctx.strokeStyle = fileStrokeStyle;
	ctx.lineWidth = 3;
	var totalArc = 0;
	for (var i = 0; i < fileNodes.length; i++) {	
		var percentChunks = fileNodes[i].totalchunks / totalFileChunks;
		var arc = Math.PI * 2 * percentChunks;
		var filledarc = arc * fileNodes[i].progress();
		ctx.fillStyle = fileNodes[i].clearStyle;
		ctx.strokeStyle = fileNodes[i].clearStyle;
		drawArc(center.x, center.y, fileNodeRadius, totalArc, totalArc + arc);
		ctx.fillStyle = fileNodes[i].filledStyle;
		ctx.strokeStyle = fileNodes[i].filledStyle;
		drawArc(center.x, center.y, fileNodeRadius, totalArc, totalArc + filledarc);
		totalArc += arc;
	}
	ctx.beginPath();
	ctx.arc(center.x, center.y, fileNodeRadius, 0, 2 * Math.PI, false);
	ctx.stroke();

	// draw each user node
	ctx.fillStyle = userStyle;
	for (var i = 0; i < userNodes.length; i++) {
		var userpt = userNodes[i].point;
		ctx.beginPath();
		ctx.arc(userpt.x, userpt.y, userNodeRadius, 0, 2 * Math.PI, false);
		ctx.fill();
		
		ctx.strokeStyle = lineStyle;
		ctx.beginPath();
		ctx.arc(userpt.x, userpt.y, userNodeRadius, 0, 2 * Math.PI, false);
		ctx.stroke();
	
		if (userNodes[i].host) {
			ctx.strokeStyle = hostStyle;
			ctx.beginPath();
			ctx.arc(userpt.x, userpt.y, userNodeRadius + ctx.lineWidth, 0, 2 * Math.PI, false);
			ctx.stroke();
		}
	}
};

loop = function() {
	var time = -new Date().getTime();
  update();
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0,width, height);
	draw();
  time += new Date().getTime();
  setTimeout(loop, Math.max(ms - time,0));
};


testFillChunks = function() {
	var i = Math.floor(Math.random() * fileNodes.length);
	if (fileNodes[i].curchunks < fileNodes[i].totalchunks) {
		fileNodes[i].curchunks++;
		setTimeout(testFillChunks, 200 + Math.floor(Math.random() * 600));
	} else {
		setTimeout(testFillChunks, 5);
	}
};

testuserid = 15;
testAddUser = function() {
	addUser(testuserid++);
	setTimeout(testAddUser, 800);
};

testfileid = 3;
testAddFile = function() {
	addFile(testfileid++);
	if (testfileid < 8) {
		setTimeout(testAddFile);
	}
};

updateState = function() {
	// go through users to see if need to add any of users
	var user_list = state.others;
	for (var i = 0; i < user_list.length; i++) {
		var userid = user_list[i];
		if (userid == me) continue;
		var found = false;
		for (var j = 0; j < userNodes.length; j++) {
			if(userNodes[j].id == userid) {
				found = true;
				break;	
			}
		}
		if (!found) {
			// TODO how to determine host?
			addUser(userid, false);
		}
	}
	// don't need the info on each user in other_state
	
	// parse files to see how much of each file you have
	for (var fileid in state.files) {
		var file = state.files[fileid];
		var found = false;	
		for (var i = 0; i < fileNodes.length; i++) {
			if (fileNodes[i].id == fileid) {
				// update this dude
				fileNodes[i].curchunks = file.blocks.length;
				found = true;
				break;
			}
		}
		if(!found) {
			addFile(file.name, file.size, fileid, file.num_blocks, file.blocks.length);
		}
	}
	// tricky part: remove all old transfers that are not in the new state, then add all new ones that are not in the old state
  var newtransfers = [];
	for(var i = 0; i < currenttransfers.length; i++) {
		var t = currenttransfers[i];
		var found = false;
		for (var userid in state.transfers) {
			var trans = state.transfers[userid].send_block;
			if (t.id == userid && t.fileid == trans.fileid && t.chunk == trans.block && !t.down) {
				found = true;
				break;
			}
			trans = state.transfers[userid].rec_block;
			if (t.id == userid && t.fileid == trans.fileid && t.chunk == trans.block && t.down) {
				found = true;
				break;
			}
		}
		if (found) {
			newtransfers.push(t);
		}
	}
	currenttransfers = newtransfers;
	var length = currenttransfers.length; // don't need to check ones we add in here
	for(var userid in state.transfers) {
    var found = false;
    var trans = state.transfers[userid].send_block;
		if (trans.fileid!= '') {
    	for (var i = 0; i < length; i++) {
    		var t = currenttransfers[i];
    	  if (t.id == userid && t.fileid == trans.fileid && t.chunk == trans.block && !t.down) {
    	    found = true;
    	    break;
    	  }
			}
			if (!found) addTransfer(userid, trans.fileid, trans.chunkid, false);
		}
    trans = state.transfers[userid].rec_block;
		found = false;
		if (trans.fileid != '') {
			for (var i = 0; i < length; i++) {
				var t = currenttransfers[i];
    	  if (t.id == userid && t.fileid == trans.fileid && t.chunk == trans.block && t.down) {
    	    found = true;
    	    break;
    	  }
    	}
    	if (!found) addTransfer(userid, trans.fileid, trans.block, true);
		}
  }
	// call calvin's function to update progress bars
	//displayProgress(fileNodes);
};

testDeltaState = function() {
	state = deltastate;
	updateState();
}

init = function() {
	center = new Point(width / 2, height / 2);
	// add some stuff for testing 
	/*addFile(0);
	addUser(2);
	addUser(12);	
	addTransfer(2, 0, 69, false);
	setTimeout(testFillChunks, 2000);
	setTimeout(testAddUser, 800);
	setTimeout(testAddFile, 1);*/
	updateState();
	// have state from the server or whatever
	
	
	setTimeout(loop, 10);
	
	//setTimeout(testDeltaState, 12000);
};

poll = function() {
	updateState();
}; //poll server, update state based on that

init();
