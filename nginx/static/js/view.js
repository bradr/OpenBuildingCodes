$(document).ready(function() {
  var code = getParam('code');
  var page = getParam('page');
  var show = getParam('show');
  
  var position = getParam('pos');
  var json;
  var filetype = "";

  //Fill in code data:
  $.get('../../files/' + code + '/meta/' + code + '_'+page+'.json', function(data) {
    json = data;
    $('#title').html(data.title);
    $('#org').html(data.org);
    $('#locations').html(data.locations);
    if (data.pdfurl) {
      filetype = 'pdf';
    }
    //Fill in HTML codes
    if (filetype == "html") {
      $.get('../../files/' + code + '.html', function(data) {
        $('#viewport').html(data);
        //scroll to position if it exists
      });
    //Fill in PDF codes
    } else if (filetype == "pdf") {
      //Show the OCRed text
      if (show == 'txt') {
        //$.get('../../files/' + code + '/' + code +  "_" + page + '.txt', function(data) {
          text = data.body.replace(/\n/g, '<br />');
          $('#viewport').html(text)
          //scroll to position if it exists
        //});
        $('#ocr').text="PDF";
      } else {
      //Show pdf page as .png
        $('#viewport').html('<img src="../../files/' + code + '/img/' + code + '_' + page + '.png" style="max-width:100%;max-hight:auto" >');
      }
    }
  });

  //Click handlers
  $('#next').click(function() {
    page = parseInt(page)+1;
    window.history.pushState("hello", "", "view?code=" + code + "&page=" + page);
    $('#viewport').html('<img src="../../files/' + code + '/'+code+'_' + page + '.png" style="max-width:100%;max-hight:auto" >');
  });
  $('#prev').click(function() {
    page = parseInt(page)-1;
    window.history.pushState("hello", "", "view?code=" + code + "&page=" + page);
    $('#viewport').html('<img src="../../files/' + code + '/' + code + '_' + page + '.png" style="max-width:100%;max-height:auto" >');
  });
  $('#ocr').click(function() {
    if (show=='txt') {
      window.history.pushState("hello", "", "view?code=" + code + "&page=" + page );
      $('#ocr').text('Text');
      $('#viewport').html('<img src="../../files/' +code + '/img/'+ code + '_' + page + '.png" style="max-width:100%;max-height:auto" >');
      show = "";
    } else {
      // $.get('../../files/'+code+ '/meta/' +code+ "_" +page+'.json', function(data) {
      //   data = data.replace(/\n/g, '<br />');
      //   window.history.pushState("hello", "", "view?code=" + code + "&page=" + page + "&show=txt");
      //   $('#ocr').text('PDF');
      //   $('#viewport').html(data);
      //   show = "txt";
      // });
      window.history.pushState("hello", "", "view?code=" + code + "&page=" + page + "&show=txt");
      $('#ocr').text('PDF');
      $('#viewport').html(json.body.replace(/\n/g, '<br />'));
      show = "txt";
    }
  });
});

//Get Parameters from URL
function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
