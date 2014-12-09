$(function(){
	var currhash = "";
	window.setInterval(function(){
		var hash = window.location.hash;
		if(currhash != hash){
			console.log("Change occurred hash is now: " + hash)
			App.hashChange(hash);
			currhash = hash;
		}
	},300);

	$("button[name=gobutton]").on('click',function(){
		var date = $("select[name=date_select]").val();
		if(date.length == 1) date = date[0];
		App.requestDate(date);
	});

	var App = {
		"mainArea":$(".main"),
		"hashChange":function(hash){
			var split = hash.substring(1).split("&");
			var obj = {};
			for(var x = 0; x < split.length; x++){
				var s = split[x].split("=");
				obj[s[0]] = s[1];
			}
			this.selected = obj.id;
			if(obj.date != this.date){
				this.date = obj.date;
				this.loadFile();
			}else{
				this.loadRecord();
			}

		},
		"requestDate":function(date){
			window.location.hash=this.getHash(date);
		},
		"loadFile":function(){
			var filename = "spotify_" + this.date + ".json";
			var _self = this;
			this.data = {};
			this.mainArea.html("<div class='loading'>Retrieving Music</div>");
			this.list = $("<div>");
			this.content = $("<div>");
			$.ajax({
				"url":filename,
				"success":function(data){
					_self.readData(data);
					_self.appendComponents();
					_self.loadFirstRecord();
				}
			});
		},
		"appendComponents":function(){
			var c = this.mainArea.empty();
			c.append(this.list);
			c.append(this.content);
		},
		"loadFirstRecord":function(){
			if(!this.selected){
				this.selected = Object.keys(this.data)[0];
				this.window.location.hash +="id=" + this.selected;
			}
			this.loadRecord();
		},
		"loadRecord":function(){

		},
		"getHash":function(date, id){
			return "#date=" + date + (id?("&id=" + id):"");
		},
		"readData":function(data){
			for(var artist in data){
				for(var album in data[artist]){
					var record = data[artist][album];
					this.data[record.id] = record;
					var a = $("<a>",{"href":this.getHash(this.date,record.spotify_id),"text":record.artist + " - " + record.album});
					this.list.append(a);					
				}
			}
		}

	};



});