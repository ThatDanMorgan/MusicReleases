var fs = require('fs');
var page = require("webpage").create();

var notFoundList = fs.read("notfound.json");
notFoundList = JSON.parse(notFoundList);

var database = fs.read("found.json");
database = JSON.parse(database);

var notFoundDB = {};

var skipped = 0;
var STATUS = {
	"found":0,
	"notfound":0,
	"skipped":0,
	"added":0
};

var foundList = [];
var queue = [];
var htmlFile = "<html><body>";

var SPOTIFY_SEARCH = "https://api.spotify.com/v1/search?q=artist:@artist@+album:@album@&type=album";
var SPOTIFY_LOOKUP = "https://api.spotify.com/v1/albums/@href@"



function findInSpotify(entry, callback){
	var url = SPOTIFY_SEARCH.replace("@artist@",encodeURI(entry.artist)).replace("@album@",encodeURI(entry.album));
	var _callback = callback || function(){};
	page.customHeaders = {
  		"Accept":"application/json"
	};
	page.open(url,function(status){		
		console.log("[ProcessMusic] opened: " + url);
		if(page.plainText){
			try{				
				var data = JSON.parse(page.plainText);	
				console.log("FOUND " + data.albums.items.length + " matches");
				if(data.albums && data.albums.items && data.albums.items.length){					
					for(var x = 0; x < data.albums.items.length; x++){
						var album = data.albums.items[x];
						if(album.available_markets && /US/.test(album.available_markets.join(" "))){							
							url = album.href;
							page.open(url,function(){
								var data = JSON.parse(page.plainText);
								data.artist = data.artists && data.artists[0].name || entry.artist;
								console.log("[ProcessMusic] FOUND - " + entry.artist + " - " + entry.name);
								_callback(true,data);
							});
							return;
						}
					}
					console.log("[ProcessMusic] NOT IN REGION - " + entry.artist + " - " + entry.album);
				}			
			}catch(exception){
				console.log("[ProcessMusic] (FAILED): \"" + url + "\" || Exception:" + exception + " || Content " + page.plainText);
			}
		}
		console.log("[ProcessMusic] failed: ", JSON.stringify(page));
		_callback(false);
	});
}

function findAllInSpotify(callback){
	var _callback = callback || function(){};
	var album = queue.pop();
	
	if(album){
		findInSpotify(album,function(found,data){		
			if(found){
				STATUS.found++;
				data.genre = album.genre;
				database[album.artist] = database[album.artist] || {};
				database[album.artist][album.album] = data;
				// This is because Spotify is FUCKING STUPID and often puts albums in the wrong year
				if(data.release_date > "2014"){
					addToFile(data);	
				}
			}else{
				STATUS.notfound++;
				notFoundDB[album.artist] = notFoundDB[album.artist] || [];
				notFoundDB[album.artist][album.album] = album;
			}

			findAllInSpotify(_callback);
		});		
	}else{
		_callback();
	}
}

var ANCHOR = "<div><a href=\"@uri@\">@artist@ - @name@ (@genre@) [@release_date@]</a></div>"
function addToFile(data){	
	htmlFile += ANCHOR.replace(/@(\w*)@/g,function(found,key){
		return data[key];
	});
	STATUS.added++;
}

// See if we've processed this before
for(var artist in notFoundList){	
	for(var album in notFoundList[artist]){		
		if(database[artist] && database[artist][album]){
			delete notFoundList[artist][album];
			STATUS.skipped++;
		}else{
			queue.push(notFoundList[artist][album]);
		}
	}
}

// Reset notFoundList
notFoundList = {};


findAllInSpotify(function(){
	fs.write("test.html",htmlFile);
	phantom.exit(1);
});







