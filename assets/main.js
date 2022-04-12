function selectView(v) {
	document.getElementById("dashboard--auth").style.display = (v == 'auth' ? '':'none');
	document.getElementById("dashboard--main").style.display = (v == 'main' ? '':'none');
	document.getElementById("dashboard--progress").style.display = (v == 'progress'? '':'none');
}
selectView('auth');

gapi.load("client:auth2", function() {
	gapi.auth2.init({
		client_id: "371911827634-fvc6pa5s9vmrks746al6rmqfm9u6ljig.apps.googleusercontent.com"
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
	gapi.client.setApiKey("AIzaSyCJEOlkXcaV5IHYJS8K0B18ZKIy03ZGfqs");
	return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
		.then(function() { 
			console.log("GAPI client loaded for API"); 
		},function(err) { 
			console.error("Error loading GAPI client for API", err); 
		});
}

//////////////////////////////
var videoDetails = [];
var progressText = document.getElementById('progress--text');

function getVideoDetail(youtube_video_id) {
	return gapi.client.youtube.videos.list({'resource':{
		 id: youtube_video_id,
		 part:'snippet'
	 }})
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

	if(document.getElementById("new_playlist").checked) { 
		const selectedp = document.getElementById("playlist--privacy").value
		if (selectedp == '') {
			alert("Please select a privacy");
			return;
		}



		let playlist_name =  document.getElementById("playlist--name").value
		if (playlist_name == '') {
			alert("Please enter some playlist name");
			return;
		}
	} else if(document.getElementById("modify_playlist").checked) { 
		if (document.getElementById("playlist--url").value == '') {
			alert("Please enter playlist url");
			return;
		}
	}

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
	 getVideoDetail(youtubeURLs).then( function (response) { 

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

			progressText.append(createSpan(`Please wait, reading your data it may take a while depending on input`, 'red'));
			if(document.getElementById("new_playlist").checked) { 
				//create new playlist
				createNewPlaylist().then((response) => {
					const playlist_id = response.result.id; 
					progressText.append(createSpan(`Playlist ID: ${playlist_id}`, 'green'));
					processVideoIDS(playlist_id); 
				}, (err)=> {
					console.error("Execute error: createNewPlaylist()", err); 
					progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
				});
			} else if(document.getElementById("modify_playlist").checked) { 
				const playlist_url = document.getElementById("playlist--url").value;
				const playlist_id = new URL(playlist_url).searchParams.get('list');
				processVideoIDS(playlist_id); 
			}

	}, function error(err) {
		console.error("Execute error", err); 
		progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
	});
}

function processVideoIDS(playlist_id) {
	videoDetails.forEach( function(video) {
		addItemsPlaylist(playlist_id, {
				videoId:video.id,
				kind:video.kind
		}).then( (response) => {
			progressText.append(createSpan(`Added: ${video.snippet.title} to playlist`, 'green'));
			if(updateProgression(videoDetails.length) == "100.00") {
					progressText.append(createSpan(`Processed: ${videoDetails.length} videos`, 'green'));
				} 
		}, (err) => {
			console.error("Execute error: addItemsPlaylist()", err); 
			progressText.append(createSpan(`Error: ${err.result.error.message.replace(/<[^>]*>/g, '')} `, 'red'));
			progressText.append(createSpan(`URL: https://www.youtube.com/watch?v=${video.id}`, 'red'));
			updateProgression(videoDetails.length)
		});	

		sleep(3300);
	});

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
	onChangePlaylistAction("none");
	videoDetails = [];
	document.getElementById("url--textarea").value = '';
	document.getElementById("playlist--name").value = '';
	document.getElementById("playlist--description").value = '';
	document.getElementById("playlist--url").value = '';

	document.getElementById("playlist--privacy").selectedIndex = 0;

	progressText.innerHTML = '';
	progressText.append(createSpan("New batch started", 'green'));
	document.getElementById("progress-bar--status").style.width = `${0.5}%`;
	document.getElementById("progress-bar--percentage").innerHTML = `${0}%`;

	
	document.getElementById("new_playlist").checked = false
	document.getElementById("modify_playlist").checked = false
}

function onChangePlaylistAction(action) {
	document.getElementById('ui--new_playlist').style.display =  (action === "new_playlist") ? "":"none";
	document.getElementById('ui--modify_playlist').style.display =  (action === "modify_playlist") ? "":"none";
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}
