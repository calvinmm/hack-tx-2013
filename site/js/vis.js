var c = document.getElementById('visCanvas');
var width = $(visCanvas).attr("width");
var height = $(visCanvas).attr("height");
var ctx = c.getContext('2d');

// set up state

// points
var userNodes = [];
var fileNodes = [];

var center = undefined;
var user_radius = 200;
var file_radius = 30;

var userNodeRadius = 12;

var fileNodeRadius = 20;
var transRadius = 6;

var transferSpeed = 10;

var currenttransfers = [];

var user_head = undefined;
var file_head = undefined;

// ms per frame
var ms = 25;

// drawing styles
var backgroundStyle = "#FFFFFF";
var lineStyle = "#000000";
var transStyle = "#00FF00";
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

nextPoint = function(head, is_user) {
	var bestAngle = 0;
	if (head == undefined) {
		head = new ListNode(2 * Math.PI);
		if (is_user) user_head = head;
		else file_head = head;
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
	var radius = (is_user) ? user_radius : file_radius;
	var node_rad = (is_user) ? user_radius : file_radius;
	if (2 * node_rad > radius * maxAngle) {
		radius += node_rad;
		if (is_user) user_radius = radius;
		else file_radius = radius;
	}
	return new Point(center.x + radius * Math.cos(bestAngle), center.y + radius * Math.sin(bestAngle));
};

// Want to add you first, host second
addUser = function(userid) {
	var me = true;
	var host = false;
	if (undefined != user_head) me = false;
	if (undefined != user_head && undefined != user_head.next) {
		host = false;
	}
	userNodes.push(new UserNode(nextPoint(user_head, true), userid, me, host));
};

addFile = function(fileid) {
	fileNodes.push(new FileNode(nextPoint(file_head, false), fileid, 10 /*use fileid to get number of chunks?*/));
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
	window.console.log(this.len);
	window.console.log(this.getPoint());
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

addTransfer = function(aid, bid, fileid, chunkid) {
	var anode = undefined;
	if (aid != undefined) {
		for (var i = 0; i < userNodes.length; i++) {
			if (userNodes[i].id == aid) {
				anode = userNodes[i];
				break;
			}
		}
	}
	var bnode = undefined;
	if (bid != undefined) {
		for (var i = 0; i < userNodes.length; i++) {
			if (userNodes[i].id == bid) {
				bnode = userNodes[i];
				break;
			}
		}	
	}
	var fnode = undefined;
	for (var i = 0; i < userNodes.length; i++) {
		if (fileNodes[i].id == fileid) {
			fnode = fileNodes[i];
			break;
		}
	}
	currenttransfers.push( new Transfer((anode == undefined) ? undefined : anode.point, (bnode == undefined) ? undefined : bnode.point, fnode.point, chunkid) );
};

removeTransfer = function(aid, bid, fileid, chunkid) {
  for (var i = 0; i < currenttransfers.length; i++) {
		t = currenttransfers[i];
		if (t.aid == aid && t.bid = bid && t.fid == fileid && t.chunk == chunkid) {
			currenttransfers.splice(i, 1);
      break;
    }
  }
};

// transferring file chunk of file pointfile from user a to user b
function Transfer(pointa, pointb, pointfile, aid, bid, fid, cid) {
	//this.cur = new Link(pointa, pointfile);
	//this.next = new Link(pointfile, pointb);
	this.cur = undefined;
	if (pointa == undefined) {
		this.cur = new Link(pointfile, pointb);
	} else {
		this.cur = new Link(pointa, pointfile);
	}
	this.a = pointa;
	this.b = pointb;
	this.f = pointfile;
	// for indexing/removing transfers when the file is done
	this.aid = aid;
	this.bid = bid;
	this.fileid = fid;
	this.chunkid = cid;
};

Transfer.prototype.update = function(distToMove) {
	var left = this.cur.update(distToMove);
	while (left > 0) {
		// switch and move to the new one
		this.cur.reset();
		//var temp = this.cur;
		//this.cur = this.next;
		//this.next = temp;
		left = this.cur.update(left);
	}
};

function FileNode(point, fileid, totchunks) {
	this.point = point;
	this.id = fileid;
	this.totalchunks = totchunks;
	this.curchunks = 0;
};

FileNode.prototype.progress = function() {
	return 1.0 * this.curchunks/this.totalchunks;
};

function UserNode(point, userid, me, host) {
	this.point = point;
	this.id = userid;
	this.me = me;
	this.host = host;
};




update = function() {
	// TODO if any state changed, modify it
	// update all transfers
	for (var i = 0; i < currenttransfers.length; i++) {
		currenttransfers[i].update(transferSpeed);
	}
};

draw = function() {
	// draw lines between nodes
	ctx.lineWidth = 1;
	ctx.strokeStyle = lineStyle;
	for (var i = 0; i < fileNodes.length; i++) {
		var filept = fileNodes[i].point;
		for (var j = 0; j < userNodes.length; j++) {
			userpt = userNodes[j].point;
			ctx.beginPath();
			ctx.moveTo(filept.x, filept.y);
			ctx.lineTo(userpt.x, userpt.y);
			ctx.stroke();
		}
	}
	ctx.lineWidth = 2;
	ctx.fillStyle = transStyle;
	// draw each current transfer
	for (var i = 0; i < currenttransfers.length; i++) {
		var transpt = currenttransfers[i].cur.getPoint();
		//window.console.log(transpt.x + " " + transpt.y);
		ctx.beginPath();
		ctx.arc(transpt.x, transpt.y, transRadius, 0, 2*Math.PI, false);
		ctx.fill();
		ctx.stroke();
	}
	// draw each file node
	ctx.strokeStyle = fileStrokeStyle;
	ctx.lineWidth = 3;
	for (var i = 0; i < fileNodes.length; i++) {
		var filept = fileNodes[i].point;
		ctx.fillStyle = fileStyle;
		ctx.beginPath();
    ctx.arc(filept.x, filept.y, fileNodeRadius, 0, 2 * Math.PI, false);
    ctx.fill();
		ctx.fillStyle = fileProgressStyle;
		ctx.beginPath();
		ctx.arc(filept.x, filept.y, fileNodeRadius, 0, 2 * Math.PI * fileNodes[i].progress(), false);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(filept.x, filept.y, fileNodeRadius, 0, 2 * Math.PI, false);
		ctx.stroke();
	}
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
	
		if (userNodes[i].me) {
			ctx.strokeStyle = meStyle;
			ctx.beginPath();
			ctx.arc(userpt.x, userpt.y, userNodeRadius - ctx.lineWidth, 0, 2 * Math.PI, false);
			ctx.stroke();
		}
	
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
	for (var i = 0;i < fileNodes.length; i++) {
		fileNodes[i].curchunks++;
	}
	setTimeout(testFillChunks, 5000);
}

init = function() {
	center = new Point(320, 240);
	// add some stuff for testing 
	addFile(0);
	addUser(2);
	addUser(12);	
	addTransfer(12, undefined, 0, 69);
	addTransfer(undefined, 12, 0, 69);
	setTimeout(loop, 10);
	setTimeout(testFillChunks, 5000);
};

init();
