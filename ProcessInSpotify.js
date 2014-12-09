var fs = require('fs');
var http = require("http");
var url = require("url");
var XMLHttpRequest = require('xhr2');

var SpotifyWebApi = require("spotify-web-api-node");



var htmlFile = "<html><body>";

var SPOTIFY_QUERY = "artist:@artist@ album:@album@";

var process_queue = [];
var found = {};

function toBaseValues(obj){
	var str = " {";  
	for(var x in obj){
		if((typeof obj[x]) != "function")
			str += x + ":" + obj[x] + "\n";
	}
	return str.replace(/\,$/,"}");
}

function next(){
	console.log("QUEUE SIZE:" + process_queue.length)
	if(process_queue.length){
		var func = process_queue.shift();
		func();
	}else{
		complete();
	}
}

function findAlbum(entry,count){
	count = count || 0;
	count++;
	console.log("Looking for album" + entry.spotify_id);
	function success(data){
		data.artist = data.artists && data.artists[0].name || entry.artist;
		// This is because Spotify is STUPID and often puts albums in the wrong year
		if(data.release_date > "2014"){			
			addToFile(data,entry);
			console.log("[ProcessMusic] SUCCESS " + entry.artist + " - " + entry.album + " | ADDED TO LIST");				
		}else{
			console.log("[ProcessMusic]   ERROR " + entry.artist + " - " + entry.album + " | WRONG YEAR");				
		}
		// TODO: Remove from notfound.json and add to found.json.
		next();
	}
	function error(err){
		if(count < 3){
			process_queue.push(function(){
				findAlbum(entry,count);
			});
		}else{
			console.log("[ProcessMusic]   ERROR " + entry.artist + " - " + entry.album + " | API ERROR ID EXISTED (" + entry.spotify_id + ") BUT COULD NOT RECEIVE DATA");
		}
		next();
	}
	spotifyApi.getAlbum(entry.spotify_id).then(success,error);
}

function findInSpotify(entry,count){
	
	var query = SPOTIFY_QUERY.replace("@artist@",entry.artist).replace("@album@",entry.album);
	count = count || 0;
	count++;
	console.log("query:" + query);
	function success(data){
		if(data.albums && data.albums.items && data.albums.items.length){			
			var found = 0;
			for(var x = 0; x < data.albums.items.length; x++){
				var album = data.albums.items[x];
				if(album.available_markets && album.available_markets.indexOf("US")){
					found++;
					entry.spotify_id = album.id;
					findAlbum(entry);
					return; // Break here.  We're trying to find the album.		
				}			
			}
			if(!found){
				console.log("[ProcessMusic]   ERROR " + entry.artist + " - " + entry.album + " | NOT IN MARKET");
			}
		}
		else{
			console.log("[ProcessMusic]   ERROR " + entry.artist + " - " + entry.album + "| NOT IN MARKET");			
		}
		next();
	}
	function error(err){			
		if(count < 3){
			process_queue.push(function(){
				findInSpotify(entry,count);
			});			
		}else{
			console.log("[ProcessMusic]   ERROR " + entry.artist + " - " + entry.album + "| NO RESPONSE FROM API");
		}
		next();
	}

	spotifyApi.searchAlbums(query).then(success,error);
}

var ANCHOR = "<div><a href=\"@uri@\">@artist@ - @name@ (@genre@) [@release_date@]</a></div>"
function addToFile(data,entry){	
	data.genre = entry.genre;
	htmlFile += ANCHOR.replace(/@(\w*)@/g,function(found,key){
		return data[key];
	});
	entry.release_date = data.release_date;
	entry.spotify_uri = data.uri;
	entry.spotify_id = data.id;
	found[entry.artist] = found[entry.artist] || {};
	found[entry.artist][entry.album] = entry;

}

function complete(){
	fs.writeFile("test.html",htmlFile + "</body></html>");
	var today = new Date();
	var e = new Date(today.getTime() - (24 * 60 * 60 * 1000) * (today.getDay() - 2));
	var fname = "spotify_" + e.toISOString().replace(/T.*/,"") + ".json";
	fs.writeFile(fname,JSON.stringify(found,null,4));
}

function _findInSpotify(entry){	
	process_queue.push(function(){
		findInSpotify(entry);
	});
}

fs.readFile("notfound.json",function(err,content){
	var str = content.toString();
	var notFoundList = JSON.parse(str);
	var queue = [];
	for(var artist in notFoundList){	
	 	for(var album in notFoundList[artist]){
	 		_findInSpotify(notFoundList[artist][album]);
	 	}
	}
	next();
});










