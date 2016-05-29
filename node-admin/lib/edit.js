$('#table').editableTableWidget();
$('#textAreaEditor').editableTableWidget({editor: $('<textarea>')});

add = function(cell) {
	var row = cell.closest("tr");
	var id = row.find("td:nth-child(0)").text()
	$.ajax({
			type: 'POST',
			url: '/api/document:' + id,
			data: {
				'id': id,
				'title': row.find("td:nth-child(1)").text(),
				'htmlurl': row.find("td:nth-child(2)").text(),
				'pdfurl': row.find("td:nth-child(3)").text()
			},
			success: function(){ console.log("data sent"); }
	});
};

update = function(cell) {
	var row = cell.closest("tr");
	var id = row.find("td:nth-child(0)").text()
	//Delete:
	$.delete('/api/document:'+id, function(err,result) {
		//Re-add:
		$.ajax({
				type: 'POST',
				url: '/api/document:' + id,
				data: {
					'id': id,
					'title': row.find("td:nth-child(1)").text(),
					'htmlurl': row.find("td:nth-child(2)").text(),
					'pdfurl': row.find("td:nth-child(3)").text()
				},
				success: function(){ console.log("data sent"); }
		});
	});
};

delete = function(cell) {
	var row = cell.closest("tr");
	var id = row.find("td:nth-child(0)").text()
	//Delete:
	$.delete('/api/document:'+id, function(err,result) {
		console.log("deleted");
	});
};

//Handlers:
$('button').on('click', function(evt){
	$('#newid').html( $('#id').val() );
	$('#newtitle').html( $('#title').val() );
	$('#newhtmlurl').html( $('#htmlurl').val() );
	$('#newpdfurl').html( $('#pdfurl').val() );
	add($(this));
});
$('deletebutton').on('click', function(evt){
	delete($(this));
});

$('table td').on('change', function (evt, newValue) {
	update($(this));
});
