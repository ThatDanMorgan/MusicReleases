var fs = require('fs');
var http = require("http");
var url = require("url");
var XMLHttpRequest = require('xhr2');


var notFoundDB = {};

var skipped = 0;


var foundList = [];
var queue = [];
var htmlFile = "<html><body>";

var SPOTIFY_SEARCH = "https://api.spotify.com/v1/search?q=artist:@artist@+album:@album@&type=album";
var SPOTIFY_LOOKUP = "https://api.spotify.com/v1/albums/@href@"


function getJSON(url,success,error){ 	
 	var xmlhttp = new XMLHttpRequest();
   	xmlhttp.open("GET",url, true);
   	xmlhttp.onreadystatechange=function(){
        if ([2,4].indexOf(xmlhttp.readyState) && xmlhttp.status >= 200 && xmlhttp.status < 300){
          	var json = {};
          	try{
	          	var json = JSON.parse(xmlhttp.response || xmlhttp.responseText || xmlhttp._responseParts);	          	                    		
          	}catch(exception){
          		console.log("Failed to parse " + typeof xmlhttp.response,xmlhttp.response || xmlhttp.responseText || xmlhttp._responseParts);
          		error(xmlhttp);
          		return;
          	}
          	if(json == null){
          		console.log("JSON was null.  WTF?  ",toBaseValues(xmlhttp));
          	}
          	success(json);
        }else{
        	error(xmlhttp);
        }
   	}
   	xmlhttp.send();

}

function toBaseValues(obj){
	var str = " {";  
	for(var x in obj){
		if((typeof obj[x]) != "function")
			str += x + ":" + obj[x] + "\n";
	}
	return str.replace(/\,$/,"}");

}

function getTokens(){
	var xmlhttp = new XMLHttpRequest();
   	xmlhttp.open("POST","http://localhost:8001/getstring", true);
	grant_type
}


function findInSpotify(entry, success, error){
	var url = SPOTIFY_SEARCH.replace("@artist@",encodeURI(entry.artist)).replace("@album@",encodeURI(entry.album));
	success = success || function(){};
	error = error || function(){};	

	console.log("[ProcessMusic] requesting: " + url);
	getJSON(url,function(data){						
		try{				
			console.log("FOUND " + data.albums.items.length + " matches");
			if(data.albums && data.albums.items && data.albums.items.length){					
				for(var x = 0; x < data.albums.items.length; x++){
					var album = data.albums.items[x];
					if(album.available_markets && /US/.test(album.available_markets.join(" "))){							
						url = album.href;
						getJSON(url,function(data){
							data.artist = data.artists && data.artists[0].name || entry.artist;
							console.log("[ProcessMusic] FOUND - " + entry.artist + " - " + entry.name);
							success(data);
						},function(xmlhttp){							
							console.log("Could not open " + url); //+ " X " + toBaseValues(xmlhttp));
							error(xmlhttp);
						});
					}
					console.log("[ProcessMusic] NOT IN REGION - " + entry.artist + " - " + entry.album);
					error();
				}
				
			}			
		}catch(exception){
			console.log("[ProcessMusic] (FAILED): \"" + url + "\" || Exception:" + exception );
			error();
		}
		error();		
	},function(xmlhttp){
		console.log("Could not open " + url); // + " X " + toBaseValues(xmlhttp));
		error();
	});
}

function findAllInSpotify(queue,callback,STATUS){
	var _callback = callback || function(){};
	var STATUS = STATUS ||  {
		"found":0,
		"notfound":0,
		"skipped":0,
		"remaining":queue.length
	};
	
	while(queue.length){
		var album = queue.pop();
		if(album){
			findInSpotify(album,
				function(data){
					STATUS.found++;
					STATUS.remaining--;
					data.genre = album.genre;
					// This is because Spotify is FUCKING STUPID and often puts albums in the wrong year
					if(data.release_date > "2014"){
						addToFile(data);
					}
					if(!STATUS.remaining <= 0) _callback();
					else findAllInSpotify(queue,_callback(),STATUS);
				},
				function(){
					STATUS.remaining--;
					STATUS.notfound++;
					if(!STATUS.remaining <= 0) _callback();
					else findAllInSpotify(queue,_callback(),STATUS);
				});		
		}
	}
}

var ANCHOR = "<div><a href=\"@uri@\">@artist@ - @name@ (@genre@) [@release_date@]</a></div>"
function addToFile(data){	
	htmlFile += ANCHOR.replace(/@(\w*)@/g,function(found,key){
		return data[key];
	});	
}

fs.readFile("notfound.json",function(err,content){
	var str = content.toString();
	var notFoundList = JSON.parse(str);
	var queue = [];
	for(var artist in notFoundList){	
	 	for(var album in notFoundList[artist]){	 		
	 		queue.push(notFoundList[artist][album]);	 		
	 	}
	}
	findAllInSpotify(queue,function(queue){
		fs.writeFile("test.html",htmlFile);

	});

});










