
var fs = require('fs');
var page = require("webpage").create();
	page.viewportSize = {
      width: 1024,
      height: 1024
    }

page.open("http://www.allmusic.com/newreleases/all/",function(status){
	console.log("[ReadAllMusic] Page Received (status: " + status + ")");
	
	page.evaluate(function() {		
		var body = document.querySelector("body");
		var rows = document.querySelectorAll(".nr-table tr");
		var json = [];
		for(var x = 1; x < rows.length; x++){
			var row = rows[x];
            if(rows[x].children && rows[x].children.length > 1){
            	json.push({
            		"artist":rows[x].children[0].textContent.trim(),
            		"album":rows[x].children[1].textContent.trim(),
            		"genre":rows[x].children[3].textContent.trim()
            	});
            }
		}
		var div = document.createElement("DIV")
            div.innerHTML = JSON.stringify(json);

		while(body.children.length) body.removeChild(body.children[0]);

		body.appendChild(div);
	});
	console.log("[ReadAllMusic] Page Modified Into JSON");
	var data = JSON.parse(page.plainText);
	var notfound = fs.read("notfound.json");
	notfound = JSON.parse(notfound);

	console.log("[ReadAllMusic] Ready to process " + data.length + " records");
	for(var x = 0; x < data.length; x++){
		var n = data[x];		
		notfound[n.artist] = notfound[n.artist] || {};
		notfound[n.artist][n.album] = notfound[n.artist][n.album] || n;							
	}
	console.log("[ReadAllMusic] Processed " + data.length + " records");	

	fs.write("notfound.json",JSON.stringify(notfound,null,2), 'w');

	console.log("[ReadAllMusic] File \"not found.json\" written to disk");

	phantom.exit(1);
});
