// require('events').EventEmitter.defaultMaxListeners = 0
var express = require("express");
var app     = express();
var path    = require("path");
var storage = require('node-persist');
var WebTorrent = require('webtorrent-hybrid')
var client = new WebTorrent()
storage.initSync();

app.use(express.static('public'));

// Allow Cross-Origin requests
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
var buildMagnetURI = function(infoHash) {
    return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp://tracker.coppersurfer.tk/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969/announce&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.ilibr.org:6969/announce&tr=http://tracker.mininova.org/announce&tr=http://tracker.frostwire.com:6969/announce&tr=udp://tracker.openbittorrent.com:80';
};
var getLargestFile = function (torrent) {
    var file;
    for(i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
};
// Home
///////////////////////////////
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/index.html'));
});
// Debug part, can be removed
///////////////////////////////
app.get('/clear/:infoHash',function(req,res){
  storage.clear()
  client.remove(req.params.infoHash);
  res.status(200).send('clear!');
});
// Debug part, can be removed
///////////////////////////////
app.get('/clear',function(req,res){
  // client.destroy();
  storage.clear()
  res.status(200).send('clear!');
}); 
// Debug part, can be removed
///////////////////////////////
app.get('/info',function(req,res){
	storage.forEach(function(key, value) {
	console.log('key:', key) 
	console.log('value:', value)
 
	});
	res.status(200).send('info!');
}); 

// Add torrent
///////////////////////////////
app.get('/add/:infoHash', function(req, res) {
var add = new Object();
 
// Check if torrent exist 
var exist = false;
storage.forEach(function(key, value) {
	if(req.params.infoHash === key) {
		exist = true;
		res.status(200).send('Torrent exist!'); return;
	} 
});
if(exist === false) {
var magnetURI = buildMagnetURI(req.params.infoHash);
    try {
		client.add(magnetURI, function (torrent) {
		  console.log('Client is downloading:', torrent.infoHash) 
		  torrent.files.forEach(function (file) {
  			console.log('name', file.name) 
		  })
		  storage.setItemSync(req.params.infoHash,'true');
		  res.status(200).send('Torrent added');
		})
    } catch (err) {
        res.status(200).send(err.toString());
    } 
  }  
});
// Statistic torrent
///////////////////////////////
app.get('/stats/:infoHash', function(req, res) {
 
	var torrent = req.params.infoHash
    var torrent = client.get(torrent);
	var stats = new Object();
	stats.downloaded = torrent.downloaded
	stats.downloadSpeed = torrent.downloadSpeed
	stats.progress = torrent.progress
	stats.numPeers = torrent.numPeers
	 
    res.status(200).send(JSON.stringify(stats));
});
// The stream torrent
///////////////////////////////
app.get('/stream/:infoHash.mp4', function(req, res, next) {
 
    var torrent = req.params.infoHash

    try {
        var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
        var total = file.length;

        if(typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
            var test = total / 2;
 
        } else {
            var start = 0; var end = total; 
        }
        var stream = file.createReadStream({start: start, end: end});
        res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });        
        stream.pipe(res);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
app.listen(3000);
console.log("Running at Port 3000");
