function selectView(v) {
	document.getElementById("dashboard--auth").style.display = (v == 'auth' ? '':'none');
	document.getElementById("dashboard--main").style.display = (v == 'main' ? '':'none');
	document.getElementById("dashboard--progress").style.display = (v == 'progress'? '':'none');
}
selectView('auth');

gapi.load("client:auth2", function() {
	gapi.auth2.init({
		client_id: "384940529955-beh379sk7u8g0plbqv7njpdfcj7rm87g.apps.googleusercontent.com"
	});
});
		
function authenticate() {
	const auth_status = document.getElementById("auth--status")
	auth_status.innerHTML = '';

	return gapi.auth2.getAuthInstance().signIn({
			scope: "https://www.googleapis.com/auth/youtube.force-ssl"
		}).then(function() { 
			console.log("Sign-in successful");
			auth_status.append(createSpan("Sign-in successful", "green"));
			loadClient(); 

			setTimeout( () => selectView('main'), 1700);

		}, function(err) { 
			console.error("Error signing in", err); 
			auth_status.append(createSpan("Error signing in", "red"));
		});
}

function loadClient() {
	gapi.client.setApiKey("AIzaSyCxQFmiQK8ktCQajO-uNCl-rWOfMos6OgY");
	return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
		.then(function() { 
			console.log("GAPI client loaded for API"); 
		//	loadCategories();
		},function(err) { 
			console.error("Error loading GAPI client for API", err); 
		});
}

function loadCategories() {
	const categorySelector = document.getElementById("select--cat");
	gapi.client.youtube.videoCategories.list({
		  "regionCode": "IN"//"US"
		}).then(function(response) {
                // Handle the results here (response.result has the parsed body).
                response.result['items'].map((cat) => {
					if (cat.snippet.assignable == true ) {
						const new_element = document.createElement("option");
						new_element.innerText = `${cat.snippet.title} (${cat.id})`;
						new_element.value = cat.id;
						new_element.className = 'option--cat';
						categorySelector.append(new_element);
					}
				});

				progressText.append(createSpan(`Success: Categories loaded from YouTube Server`, 'green'));
              },function(err) { 
				console.error("Execute error", err); 
				progressText.append(createSpan(`Faliure: Unable to load categories from YouTube Server`, 'red'));
		});
}
//////////////////////////////
var videoDetails = [];
var progressText = document.getElementById('progress--text');

function updateCategoryId(res, pcount) {
	 return gapi.client.youtube.videos.update({
	   "part": [
		 "snippet"
	   ],
	   "resource": res 
	 }).then(function(response) {
		 // Handle the results here (response.result has the parsed body).
		progressText.append(createSpan(`Updated: ${res.snippet.title}`, 'green'));
		if(updateProgression(videoDetails.length) == "100.00") {
			progressText.append(createSpan(`Processed: ${videoDetails.length} videos`, 'green'));
		} 
     }, function(err) { 
		console.error("Execute error", err.result.error.message); 

		progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
	});
}

function getVideoDetail(youtube_video_id) {
	return gapi.client.youtube.videos.list({'resource':{
		 id: youtube_video_id,
		 part:'snippet'
	 }})
/*
		.then(function(response) {
		// Handle the results here (response.result has the parsed body).
		console.log("Response", response);

		response.result["items"].forEach((v) => {
				videoDetails.push({
					id:v.id,
					snippet: {
						title:v.snippet.title,
					}
				});
			//	progressText.append(createSpan(`Found: ${v.snippet.title} (category id: ${v.snippet.categoryId})`, 'green'));
			//	updateProgression(response.result["items"].length);
		});

		progressText.append(createSpan(`---Update started---`, 'red'));

	//	select_category = document.getElementById("select--cat")
	//	select_category = select_category.options[select_category.selectedIndex].text;
	//	progressText.append(createSpan(`New category: ${select_category} `, 'green'));

		videoDetails.forEach( v => {
			updateCategoryId(v);
		});	

		createNewPlaylist().then((response) => {
			console.log("play list created");
		}, (err)=> {
			console.error("Execute error: createNewPlaylist()", err); 
			progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
		});

	   },function(err) { 
		console.error("Execute error", err); 
		progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
	});
*/
 }

function createNewPlaylist() {
	const playlist_name = document.getElementById("playlist--name").value;
	const playlist_description = document.getElementById("playlist--description").value;
	const playlist_privacy = document.getElementById("playlist--privacy").value;

	progressText.append(createSpan(`Building playlist ${playlist_name} (${playlist_privacy})`, 'green'));

    return gapi.client.youtube.playlists.insert({
      "part": [
        "snippet",
        "status"
      ],
      "resource": {
        "snippet": {
          "title": playlist_name,
          "description": playlist_description
        },
        "status": {
          "privacyStatus": playlist_privacy
        }
      }
    });
}

function triggerUpdate() {
//	const selectedCategoryId = document.getElementById("select--cat").value
//	if (selectedCategoryId == '') {
//		alert("Please select a category");
//		return;
//	}


	let youtubeURLs =  document.getElementById("url--textarea").value
	if (youtubeURLs == '') {
		alert("Please enter some YouTube video URLs.");
		return;
	}
	
	//parsing url
	youtubeURLs = youtubeURLs.replace(/,|\n/g, ' ' ).split(" ").filter( e => e != '');
	youtubeURLs = youtubeURLs.map( u => {
		const parse_url = new URL(u);
		return parse_url.searchParams.get('v');
	}).filter(u => u != '' && u != null);

	selectView('progress');
	 getVideoDetail(youtubeURLs).then( (response) => { 

		//filter the video details
		response.result["items"].forEach((v) => {
				videoDetails.push({
					id:v.id,
					kind:v.kind,
					snippet: {
						title:v.snippet.title,
					}
				});
		});

		//create new playlist
		createNewPlaylist().then((response) => {
			const playlist_id = response.result.id; 
			progressText.append(createSpan(`Playlist ID: ${playlist_id}`, 'green'));

			videoDetails.forEach( video => {
				addItemsPlaylist(playlist_id, {
						videoId:video.id,
						kind:video.kind
				}).then( (response) => {
					progressText.append(createSpan(`Added: ${video.snippet.title} to playlist`, 'green'));
					updateProgression(videoDetails.length)
				}, (err) => {
					console.error("Execute error: addItemsPlaylist()", err); 
					progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
					updateProgression(videoDetails.length)
				});	
			});

		}, (err)=> {
			console.error("Execute error: createNewPlaylist()", err); 
			progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
		});

	}, function error(err) {
		console.error("Execute error", err); 
		progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
	});
	console.log("get video 2");
}

function addItemsPlaylist(id, resource) {
	return gapi.client.youtube.playlistItems.insert({
      "part": [
        "snippet"
      ],
      "resource": {
        "snippet": {
          "playlistId": id,
          "resourceId": resource 
        }
      }
    });	
}

function createSpan(text, className) {
	const span = document.createElement("span")
	span.innerText = text;
	span.className = className;
	return span;
}

function updateProgression(v_count) {
	width = Number(document.getElementById("progress-bar--percentage").innerText.replace("%",''));
	let	percentage = ((((width * v_count)/100)+1) /(v_count)) * 100;

	document.getElementById("progress-bar--status").style.width = `${percentage}%`;

	document.getElementById("progress-bar--percentage").innerHTML = `${percentage.toFixed(1)}%`;
	return percentage.toFixed(2);
}

function newBatch() {
	selectView('main');
	videoDetails = [];
	document.getElementById("url--textarea").value = '';
	document.getElementById("playlist--name").value = '';
	document.getElementById("playlist--description").value = '';

	document.getElementById("playlist--privacy").selectedIndex = 0;

	progressText.innerHTML = '';
	progressText.append(createSpan("New batch started", 'green'));
	document.getElementById("progress-bar--status").style.width = `${0.5}%`;
	document.getElementById("progress-bar--percentage").innerHTML = `${0}%`;
}
