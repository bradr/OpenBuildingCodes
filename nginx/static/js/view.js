var json, show;
$(document).ready(function() {
  var query;
  var referrer = document.referrer;
  if (referrer.match(/search\?query=/gi)) {
    query = getParam('query',document.referrer);
  }
  var code = getParam('code');
  var page = getParam('page');
  show = getParam('show');

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
    $('#documentInfo').html(documentInfo());
    //Fill in HTML codes
    if (filetype == "html") {
      $.get('../../files/' + code + '.html', function(data) {
        $('#viewport').html(data);
      });
    //Fill in PDF codes
    } else if (filetype == "pdf") {
      //Show the OCRed text
      if (show == 'txt') {
        displayText(json.body);
      } else {
      //Show pdf page as .png
        displayPDF(code, page);
      }
    }
  });
  
  //Back Button:
  if (query) {
    $('#backButton').html('<button class="back btn btn-link btn-sm">Back to search results</button>');
  }

  //Click handlers
  $('.next').click(function() {
    $('.next').tooltip('hide');
    page = parseInt(page)+1;
    next(code,page);
  });
  $('.prev').click(function() {
    $('.prev').tooltip('hide');
    page = parseInt(page)-1;
    prev(code,page);
  });
  $('#ocrButton').click(function() {
    $('#ocrButton').tooltip('hide');
    if (show=='txt') {
      window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page );
      show = "";
      displayPDF(code,page);
    } else {
      window.history.replaceState("Object", "", "/view?code=" + code + "&page=" + page + "&show=txt");
      show = "txt";
      displayText(json.body);
    }
  });
  $('.back').click(function() {
    window.location.href = document.referrer;
  });
  $('#search').on('submit',function(evt){
    evt.preventDefault();
    var searchTerm = $('#searchTerm').val();
    window.location.href ="/search?query=" +searchTerm;
  });
  
  //Keypress handler:
  $(document).on('keydown', function(e) {
    if ($(e.target).is('input, textarea')) {
      return;
    } else {
      if ( e.which === 34 || e.which === 39 || e.which === 74 ) {
        page = parseInt(page)+1;
        next(code,page);
      } else if ( e.which === 33 || e.which === 37 || e.which === 75 ) {
        page = parseInt(page)-1;
        prev(code,page);
      }
    }
  });
  //Enable Tooltips:
  $('[data-toggle="tooltip"]').tooltip()
});

function next(code,page) {
  window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page);
  show = "";
  displayPDF(code,page);
  $.get('../../files/' + code + '/meta/' + code + '_'+page+'.json', function(data) {
    json = data;
  });
  return page;
}

function prev(code,page) {
  window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page);
  show = "";
  displayPDF(code,page);
  $.get('../../files/' + code + '/meta/' + code + '_'+page+'.json', function(data) {
    json = data;
  });
  return page;
}

function displayText(text) {
  $('#ocrButton').html('<img src="/img/file-pdf.svg" alt="PDF">');
  $('#ocrButton').tooltip('dispose');
  $('#ocrButton').tooltip({
    title: 'View PDF Page',
    delay: { show:500 },
    placement: 'top',
    trigger: 'hover'
  });
  text = text.replace(/\n\s*\n/g, '<br>\n');
  text = text.replace(/\n/g, '<br>');
  $('#viewport').html('<div class="ml-5 mr-5 mt-5 mb-5">' + text + '</div>');
}

function displayPDF(code,page) {
  $('#ocrButton').html('<img src="/img/file-text.svg" alt="Text">');
  $('#ocrButton').tooltip('dispose');
  $('#ocrButton').tooltip({
    title: 'View Document Text',
    delay: { show:500 },
    placement: 'top',
    trigger: 'hover'
  });
  $('#viewport').html('<img src="../../files/' +code + '/img/'+ code + '_' + page + '.png" style="max-width:100%;max-height:auto" >');
}

function documentInfo() {
  
  var html = ' \
    <div class="card"> \
      <div class="ml-3 mt-3"> \
        <dl><dt>Title</dt><dd>' + json.title + '</dd><dt>Author</dt><dd>' + json.by + '</dd><dt>Language</dt><dd>' + json.language + '</dd></dl> \
      </div> \
    </div>';
  return html;
}

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