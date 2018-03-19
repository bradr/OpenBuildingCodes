var consolejam = 0;
var running = false;
var evtSource;


var numProc = 0;
var	avgTime = 0;
var startTime = 0;
var refreshTime = 0;
var remaining = 0;

//$('#table').editableTableWidget();
//$('#textAreaEditor').editableTableWidget({editor: $('<textarea>')});
$('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" type="text/css" />');

deleteProcess = function(event) {
	var process = event.text().replace(/\sDELETE/i,'');
	$.ajax({
		type: 'DELETE',
		url: '/admin/deleteProcess',
		data: {
			'process': process
		},
		success: function() {
			getProcesses();
			toastr.success('Deleted');
		},
		error: function(error) {
			toastr.error('Error: '+JSON.stringify(error));
		}
	});
};

addDocument = function(url) {
	var pdfurl, htmlurl;
	if (url.match(/.pdf$/i)) {
		pdfurl = url;
	} else if (url.match(/.html$/i)) {
		htmlurl = url;
	}
	$.ajax({
			type: 'PUT',
			url: '/admin/document',
			data: {
				'htmlurl': htmlurl,
				'pdfurl': pdfurl
			},
			success: function() {
				toastr.success('Successfully added');
			},
			error: function(error) { toastr.error('Error: ' + error.responseText ); }
	});
};

updateDoc = function(id) {
	var docid = id.replace(/\./g,'\\.');
	
	var test = document.getElementById('by-'+id).value; // $('#by-'+id)[0].val();
	toastr.info(test);
	
	$.ajax({
			type: 'PUT',
			url: '/admin/document',
			data: {
				'id': id,
				'title': $('#title-'+docid).text(),
				'by': document.getElementById('by-'+id).value,
				'language': document.getElementById('language-'+id).value,
				'htmlurl': document.getElementById('htmlurl-'+id).value,
				'pdfurl': document.getElementById('pdfurl-'+id).value,
				'usage': document.getElementById('usage-'+id).value,
				'pubdate': document.getElementById('pubdate-'+id).value,
				'topics': document.getElementById('topics-'+id).value,
				'collection': document.getElementById('collection-'+id).value,
				'location': document.getElementById('location-'+id).value,
				'description': document.getElementById('description-'+id).value
			},
			success: function() {
				toastr.success('Successfully updated '+ id);
			},
			error: function(error) { toastr.error('Error: ' + error.responseText ); }
	});	
};

download = function(id) {
	$.ajax({
		url: '/admin/download/'+id,
		type: 'GET',
		success: function(results) {
			getInfo(id);
			getProcesses();
			toastr.success('Added to queue');
		},
		error: function(error) { toastr.error(error); }
	});
};

deleteIndex = function() {
	$.ajax({
		url: '/admin/index',
		type: 'DELETE',
		success: function(result) { toastr.success(result); },
		error: function(error) { toastr.error('Error: ' + JSON.stringify(error)); }
	});
}

deleteDoc = function(id) {
	$.ajax({
		url: '/admin/document/'+id,
		type: 'DELETE',
		success: function (result) {
			toastr.success('Successfully deleted '+ id);
			setTimeout(function() {
				location.reload();
			}, 3000);
		}
	});
}

importCSV = function() {
	$.ajax({
		url: '/admin/importCSV',
		type: 'GET',
		success: function() { location.reload(); },
		error: function(error) { toastr.error(error); }
	});
}

exportCSV = function() {
	$.ajax({
		url: '/admin/exportCSV',
		type: 'GET',
		success: function() { location.reload(); },
		error: function(error) { toastr.error(error); }
	});
};

showProcesses = function(processes) {
	$("#process").html('');
	for (var i=0;i<processes.length;i++) {
		if (i < 20) {
			$("#process").append('<li>'+processes[i]+' <button class="cancel" onClick=\'deleteProcess($(this).parent());\'>Delete</button></li>');
		} else {
			remaining = processes.length;
			$("#process").append('<br>...' + processes.length + ' Processes remaining');
			i = processes.length;
		}
	}
};

getProcesses = function() {
	$.ajax({
		url: '/admin/getProcesses',
		type: 'GET',
		success: function(result) {
			showProcesses(result.processes);
		},
		error: function(error) { toastr.error(error); }
	});
};

getInfo = function(id) {
	$.get('/admin/getInfo/' + id, function (data) {
		if (data) {
			toastr.success('Successfully filled in data for ' + id);
		} else {
			toastr.error('Error filling in document data for ' + id);
		}
	});
};


//Handlers:
$('#stop').on('click', function (evt) {
	$.get('/admin/stop',function() {
		toastr.info("Stop");
	});
	if (running) {
		running = false;
		evtSource.close();
	}
});

$('#run').on('click', function (evt) {
	if (running) {
		toastr.info("Pause");
		running = false;
		evtSource.close();
	} else {
		toastr.info("Running");
		evtSource = new EventSource("/admin/run");
	
		evtSource.onmessage = function(e) {
			if (e.data=='Completed') {
				evtSource.close();
				toastr.success('Completed')
				running = false;
				$("#currentprocess").html('');
			}
			else if (e.data.match(/^CPU/i)) {
				$('#cpu').html(e.data);
			} else {
				if (startTime < Date.now()-100000) {
					startTime = Date.now();
				}
				avgTime = (avgTime*numProc + (Date.now()-startTime))/(numProc+1);
				numProc++;
				startTime = Date.now();
				if (Date.now() > (refreshTime+200)) {
					getProcesses();
					refreshTime = Date.now();
				}
				
				var out = e.data.replace(/,/g, "<br>");
				var min = Math.floor(avgTime*remaining/1000/60);
				var sec = Math.round((avgTime*remaining/1000/60 - min)*60);
				var stats = 'Avg Time per process: '+Math.round(avgTime) + 'ms, Time Remaining: ' + min + 'min '+ sec + 's';
				$('#stats').html(stats);
				$("#currentprocess").html(out);
			}
		};
		evtSource.onerror = function(e) {
			evtSource.close();
		};
	}
});

$('#addDocButton').on('click', function(evt){
	var url = $('#newDocurl').val();
	//Delete:
	addDocument(url)
});

$('.deleteButton').on('click', function(evt){
	//Delete:
	var id = $(this)[0].id
	deleteDoc(id);
});

$('.downloadButton').on('click', function(evt){
	download($(this)[0].id);
});

$('.updateDoc').on('click', function(evt){
	var id = $(this)[0].id;
	updateDoc(id);
});

$('.infoButton').on('click', function(evt){
	var id = $(this)[0].id;
	toastr.info(id);
	$.get('/admin/getInfo/' + id, function (data) {
		if (data) {
			toastr.success('Successfully filled in data for ' + id);
		} else {
			toastr.error('Error filling in document data for ' + id);
		}
	});
});

$('.statusButton').on('click', function (evt) {
	var id = $(this)[0].id;
	
	$.get("/admin/getStatus/"+id, function (data) {
		console(data);
		toastr.info("Document Status in console");
	});
});

$('.processButton').on('click', function (evt) {
	var id = $(this)[0].id;
	
	$.get("/admin/process/"+id, function (data) {
		console(data);
		toastr.info("Process Document");
		getProcesses();
	});
});

$('.indexButton').on('click', function(evt){
	var id = $(this)[0].id;
	var evtSource = new EventSource("/admin/index/" + id);

	$.get('/admin/index/' + id, function (data) {
		if (!data) {
			toastr.success('Successfully indexed ' + id);
		} else {
			toastr.error('Error indexing ' + data);
		}
	});

});

$('#deleteProcesses').on('click',function(evt) {
	$.ajax('/admin/deleteProcesses',
	{
		'method': 'delete',
		'success': function(data) {
			toastr.success('Deleted');
			getProcesses();
		}
	});
});

$('#processAll').on('click',function(evt) {
	$.get('/admin/processAll', function(result) {
		toastr.success('Added all processes: '+result);
		getProcesses();
	});
});
$('#refresh').on('click', function (evt){
	getProcesses();
});

$('#importCSV').on('click', function (evt){
	importCSV();
});
$('#exportCSV').on('click', function (evt){
	exportCSV();
});
$('#deleteIndex').on('click', function (evt){
	deleteIndex();
});
$('table td').on('change', function (evt, newValue) {
	update($(this));
});

function loop() {
	if (running) {
		getProcesses();
		var timeout = setTimeout(function() { loop(); },2000);
	}
}

window.onload = function () {
	getProcesses();
};
