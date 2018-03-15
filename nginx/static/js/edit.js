var consolejam = 0;
var running = false;
var evtSource;


var numProc = 0;
var	avgTime = 0;
var startTime = 0;
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

add = function(cell) {
	var row = cell.closest("tr");
	var id = $.trim(row.find("td:nth-child(1)").text());

	$.ajax({
			type: 'PUT',
			url: '/admin/document',
			data: {
				'id': id,
				'title': row.find("td:nth-child(2)").text(),
				'by': row.find("td:nth-child(3)").text(),
				'htmlurl': row.find("td:nth-child(6)").text(),
				'pdfurl': row.find("td:nth-child(7)").text()
			},
			success: function() {
				toastr.success('Successfully added '+ id);
				setTimeout(function() {
					location.reload();
				}, 3000);
			},
			error: function(error) { toastr.error('Error: ' + error.responseText ); }
	});
};

update = function(cell) {
	var row = cell.closest("tr");
	if (/^new.*/.test(cell.attr('id'))){
		return false;
	} else 	if (cell.index()==0) {
		toastr.error('Can\' Change Index');
		location.reload();
		return false;
	}
	var id = $.trim(row.find("td:nth-child(1)").text());
	$.ajax({
		url: '/admin/document/'+id,
		type: 'DELETE',
		success: function (result) {
			toastr.success('Successfully deleted '+ id);
			$.ajax({
					type: 'PUT',
					url: '/admin/document',
					data: {
						'id': id,
						'title': row.find("td:nth-child(2)").text(),
						'htmlurl': row.find("td:nth-child(3)").text(),
						'pdfurl': row.find("td:nth-child(4)").text()
					},
					success: function() {
						toastr.success('Successfully added '+ id);

					},
					error: function(error) { toastr.error('Error: ' + error.responseText ); }
			});
		}
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
/*	
	var evtSource = new EventSource("/admin/download/" + id);

	evtSource.onmessage = function(e) {
		if (e.data == "--EOF--") {
			console("PDF File for " + id + " Successfully Downloaded");
			toastr.success("PDF File for " + id + " Successfully Downloaded");
			evtSource.close();
		} else if (e.data.match(/^PDF--none--/)){
			console("No PDF File to Download for: " +id);
			evtSource.close();
		} else if (e.data.match(/^PDF/)){
			console(e.data);
		} else if (e.data.match(/^HTML/)){
			console("Downloading: " +e.data);
		}
	};
	evtSource.onerror = function(e) {
		console("EventSource failed: " + JSON.stringify(e));
	};
*/
};

deleteIndex = function() {
	$.ajax({
		url: '/admin/index',
		type: 'DELETE',
		success: function(result) { toastr.success(result); },
		error: function(error) { toastr.error('Error: ' + JSON.stringify(error)); }
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

console = function(text) {
	$("#console").append("<br> >" + text.replace(/<br>/gi,"<br> >"));
	if (!consolejam) {
		consolejam = 1;
		$('#console').animate({scrollTop: $('#console').prop("scrollHeight")}, 500, function() {
			consolejam = 0;
			$("#console").scrollTop($("#console").prop("scrollHeight"));
		});
	} else {
		$("#console").scrollTop($("#console").prop("scrollHeight"));
	}
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
				
				getProcesses();
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

$('#button').on('click', function(evt){
	$('#newid').html( $('#id').val() );
	$('#newtitle').html( $('#title').val() );
	$('#newhtmlurl').html( $('#htmlurl').val() );
	$('#newpdfurl').html( $('#pdfurl').val() );
	add($(this));
});
$('.deleteButton').on('click', function(evt){
	//Delete:
	var id = $(this)[0].id
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
});
$('.downloadButton').on('click', function(evt){
	download($(this)[0].id);
});

$('.infoButton').on('click', function(evt){
	var id = $(this)[0].id;
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

$('.ocrButton').on('click', function(evt){
	var id = $(this)[0].id;
	var evtSource = new EventSource("/admin/ocr/" + id);
	toastr.info("OCR In Progress");
//	$('.status').append('<div id="'+id+'OcrPdf" class="alert alert-info collapse" role="alert"></div>');
//	$("#"+id+"OcrPdf").collapse("show");
	evtSource.onmessage = function(e) {
		if (e.data == "--COMPLETE--") {
			evtSource.close();
			toastr.success("OCR Successful");
		} else {
			console(e.data);
		}
	};
	evtSource.onerror = function(e) {
		console("EventSource failed: " + JSON.stringify(e));
		toastr.error("OCR Failed");
	};
});
$('.indexButton').on('click', function(evt){
	var id = $(this)[0].id;
	$.get('/admin/index/' + id, function (data) {
		if (data) {
			toastr.success('Successfully indexed ' + id);
			console(data);
		} else {
			toastr.error('Error indexing ' + id);
		}
	});
});

$('#deleteProcesses').on('click',function(evt) {
	$.ajax('/admin/deleteProcesses', {'method': 'delete'}, function() {
		toastr.success('Deleted');
		getProcesses();
	});
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
