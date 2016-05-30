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
	$('.status').append('<div id="'+id+'DownloadPdf" class="alert alert-info collapse" role="alert"></div>');
	$('.status').append('<div id="'+id+'DownloadHtml" class="alert alert-info collapse" role="alert"></div>');
	$("#"+id+"DownloadPdf").collapse("show");
	console.log('Messages');

	evtSource.onmessage = function(e) {
		console.log("Received: " + e.data);
		if (e.data == "--EOF--") {
			console.log('CLOSE');
			$('#'+id+'DownloadPdf').html("PDF File for " + id + " Successfully Downloaded");
			setTimeout(function() {
				$('#'+id+'DownloadPdf').collapse("hide");
			},3000);
			evtSource.close();
		} else if (e.data.match(/^PDF--none--/)){
			$('#'+id+'DownloadPdf').html("No PDF File to Download for: " +id);
			setTimeout(function() {
				$('#'+id+'DownloadPdf').collapse("hide");
			},3000);
			evtSource.close();
		} else if (e.data.match(/^PDF/)){
			$('#'+id+'DownloadPdf').html("Downloading pdf file for: " +id);
		}
	};
	evtSource.onerror = function(e) {
		console.log("EventSource failed: " + JSON.stringify(e));
	};
});
$('.jsonButton').on('click', function(evt){
	var id = $(this)[0].id;
	$.get('/admin/createJSON/' + id, function (data) {
		console.log(data);
		if (data) {
			console.log('created json');
			toastr.success('Successfully created JSON file for ' + id);
		} else {
			toastr.error('Error creating JSON file for ' + id);
		}
	});
});

$('.statusButton').on('click', function (evt) {
	var id = $(this)[0].id;
	$('.statusButton#'+id).popover("destroy");
	$.get("/admin/getStatus/"+id, function (data) {
		$('.statusButton#'+id).popover({
			trigger: 'manual',
			placement: 'left',
			content: data
		});
		$('.statusButton#'+id).popover("show");
		setTimeout(function() {
			$('.statusButton#'+id).popover("hide");
		},2000);
	});
});

$('.ocrButton').on('click', function(evt){
	var id = $(this)[0].id;
	var evtSource = new EventSource("/admin/ocr/" + id);
	$('.status').append('<div id="'+id+'OcrPdf" class="alert alert-info collapse" role="alert"></div>');
	$("#"+id+"OcrPdf").collapse("show");
	evtSource.onmessage = function(e) {
		console.log("Received: " + e.data);
		if (e.data == "--COMPLETE--") {
			console.log('CLOSE');
			setTimeout(function() {
				$('#'+id+'OcrPdf').collapse("hide");
			},3000);
			evtSource.close();
		} else {
			$('#'+id+'OcrPdf').html(e.data);
		}
	};
	evtSource.onerror = function(e) {
		console.log("EventSource failed: " + JSON.stringify(e));
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
