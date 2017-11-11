var consolejam = 0;
$('#table').editableTableWidget();
$('#textAreaEditor').editableTableWidget({editor: $('<textarea>')});
$('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" type="text/css" />');

add = function(cell) {
	var row = cell.closest("tr");
	var id = $.trim(row.find("td:nth-child(1)").text());
	//if (!id) {id = 0;}

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
}

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
}

//Handlers:
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
	var id = $(this)[0].id;
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
			console("Downloading pdf file for: " +id);
		} else if (e.data.match(/^HTML/)){
			console("Downloading: " +e.data);
		}
	};
	evtSource.onerror = function(e) {
		console("EventSource failed: " + JSON.stringify(e));
	};
});
$('.jsonButton').on('click', function(evt){
	var id = $(this)[0].id;
	$.get('/admin/createJSON/' + id, function (data) {
		if (data) {
			toastr.success('Successfully created JSON file for ' + id);
		} else {
			toastr.error('Error creating JSON file for ' + id);
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
		toastr.success("OCR Successful");
	};
});

$('#importCSV').on('click', function (evt){
	importCSV();
});
$('#exportCSV').on('click', function (evt){
	exportCSV();
});
$('table td').on('change', function (evt, newValue) {
	update($(this));
});

window.onload = function () {

}
