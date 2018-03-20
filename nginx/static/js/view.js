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
  toggleIcon();

  $.get('files/' + code + '/meta/' + code + '_'+page+'.json')
    .done(function(data) {
      json = data;
      //Set Viewport Size:
      if (json.x && json.y) {
         $('#viewport').outerHeight(json.y/json.x * $('#viewport').outerWidth());
      } else {
        $('#viewport').outerHeight(11.0/8.5 * $('#viewport').outerWidth())
      }
     
      
      //Fill in code data:
      $('#title').html(data.title);
      $('#org').html(data.org);
      $('#locations').html(data.locations);
      if (data.pdfurl) {
        filetype = 'pdf';
      }
      $('#documentInfo').html(documentInfo());
      
      //Fill in HTML codes
      if (filetype == "html") {
        $.get('files/' + code + '.html', function(data) {
          $('#viewport').html(data);
        });
        
      //Fill in PDF codes
      } else if (filetype == "pdf") {
        //Show the OCRed text
        if (show == 'txt') {
          displayText(json.hocr);
        } else {
        //Show pdf page as .png
          displayText(json.hocr);
          displayPDF(code, page);
        }
      }
    })
    .fail(() => {
      
    });
  
  //Back Button:
  if (query) {
    $('#backButton').html('<button class="back btn btn-link btn-sm">Back to search results</button>');
  }

  //Click handlers
  $('.next').click(function() {
    $('.next').tooltip('hide');
    page = parseInt(page)+1;
    page = next(code,page);
  });
  $('.prev').click(function() {
    $('.prev').tooltip('hide');
    page = parseInt(page)-1;
    page = prev(code,page);
  });
  $('#ocrButton').click(function() {
    $('#ocrButton').tooltip('hide');
    toggleOCR(code,page);
    toggleIcon();
  });
  $('.back').click(function() {
    window.location.href = document.referrer;
  });
  $('#search').on('submit',function(evt){
    evt.preventDefault();
    var searchTerm = $('#searchTerm').val();
    window.location.href ="search?query=" +searchTerm;
  });
  
  //Keypress handler:
  $(document).on('keydown', function(e) {
    if ($(e.target).is('input, textarea')) {
      return;
    } else {
      if ( e.which === 34 || e.which === 39 || e.which === 74 ) {
        page = parseInt(page)+1;
        page = next(code,page);
      } else if ( e.which === 33 || e.which === 37 || e.which === 75 ) {
        page = parseInt(page)-1;
        page = prev(code,page);
      } else if ( e.which === 85 ) {
        window.location.href = document.referrer;
      } else if (e.which === 84 ) {
        toggleOCR(code,page);
        toggleIcon();
      } else if (e.which === 66 || e.which === 219) {
        window.location.href = document.referrer;
      }
    }
  });
  //Enable Tooltips:
  $('[data-toggle="tooltip"]').tooltip()
  
  //Backup Picture
  $(".codepic").on("error", function(){
      $(this).attr('src', 'img/notfound.png');
  });
});

$(window).resize(function(){
  //Set Viewport Size:
  if (json.x && json.y) {
     $('#viewport').outerHeight(json.y/json.x * $('#viewport').outerWidth());
  } else {
    $('#viewport').outerHeight(11.0/8.5 * $('#viewport').outerWidth())
  }
  positionText();
});

function toggleOCR(code,page) {
  $('#viewport').html('');
  if (show=='txt') {
    window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page );
    show = "";
    displayPDF(code,page);

  } else {
    window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page + "&show=txt");
    show = "txt";

  }
  if (json) {
    displayText(json.hocr);
  }
}

function next(code,page) {
  var text='';
  if (show) {
    text = "&show=txt";
  }
  if (page<1) {
    page = 1;
  } else if (page>json.pages) {
    page = json.pages;
  }
  window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page + text);
  
  $('#viewport').html('');
  if (!show) {
    displayPDF(code,page);
  }
  $.get('files/' + code + '/meta/' + code + '_'+page+'.json', function(data) {
    json = data;
    //Set Viewport Size:
    if (json.x && json.y) {
       $('#viewport').outerHeight(json.y/json.x * $('#viewport').outerWidth());
    } else {
      $('#viewport').outerHeight(11.0/8.5 * $('#viewport').outerWidth())
    }
    if (json) {
      displayText(json.hocr);
    }
  });
  return page;
}

function prev(code,page) {
  var text='';
  if (show) {
    text = "&show=txt";
  }
  if (page<1) {
    page = 1;
  } else if (page>json.pages) {
    page = json.pages;
  }
  window.history.replaceState("Object", "", "view?code=" + code + "&page=" + page + text);
  
  $('#viewport').html('');
  if (!show) {
    displayPDF(code,page);
  }
  $.get('files/' + code + '/meta/' + code + '_'+page+'.json', function(data) {
    json = data;
    //Set Viewport Size:
    if (json.x && json.y) {
       $('#viewport').outerHeight(json.y/json.x * $('#viewport').outerWidth());
    } else {
      $('#viewport').outerHeight(11.0/8.5 * $('#viewport').outerWidth())
    }
    if (json) {
      displayText(json.hocr);
    }
  });
  return page;
}

function toggleIcon() {
  if (show=='txt') {
    $('#ocrButton').html('<img src="img/file-pdf.svg" alt="PDF">');
    $('#ocrButton').tooltip('dispose');
    $('#ocrButton').tooltip({
      title: 'View PDF Page',
      delay: { show:500 },
      placement: 'top',
      trigger: 'hover'
    });
  } else {
    $('#ocrButton').html('<img src="img/file-text.svg" alt="Text">');
    $('#ocrButton').tooltip('dispose');
    $('#ocrButton').tooltip({
      title: 'View Document Text',
      delay: { show:500 },
      placement: 'top',
      trigger: 'hover'
    });
  }
}

function displayText(text) {
  if (text) {
    $('#viewport').append('<div class="codeText">' + text + '</div>');
  }
  if (show == 'txt') {
    $('.ocr_line').css('color','rgba(0, 0, 0, 1)');
  } else {
    $('.ocr_line').css('color','rgba(0, 0, 0, 0)');
  }
  positionText();
}

function displayPDF(code,page) {
  $('#viewport').append('<img class="codepic" src="files/' +code + '/img/'+ code + '_' + page + '.png" style="max-width:100%;max-height:auto;position:absolute;z-index:0;" >');
}

function documentInfo() {
  
  var html = ' \
    <div class="card"> \
      <div class="ml-3 mt-3"> \
        <dl><dt>Title</dt><dd>' + json.title + '</dd> \
        <dt>Author</dt><dd> ' + json.by + '</dd> \
        <dt>Language</dt><dd>' + json.language + '</dd> \
        <dt>'+ json.pages + ' Pages</dt></dl> \
      </div> \
    </div>';
  return html;
}

function positionText() {
  if ($(window).width() > 768) {
    hocrPosition();
  } else {
    hocrPosition();
  }
}

function hocrPosition() {
  var containerTop = $('#viewport').offset().top;
  var containerLeft = $('#viewport').offset().left;
  
  var bbox_re = /bbox (\d+) (\d+) (\d+) (\d+)/i;
  var text_re = /x_size ([^;]*)/i;
  
  var docBox = $('.ocr_page').attr('title').match(bbox_re);
  var docWidth = docBox[3] - docBox[1];
  var docHeight = docBox[4] - docBox[2];
  
  var xscale = $('#viewport').outerWidth()/docWidth;
  var yscale = $('#viewport').outerHeight()/docHeight;
  
  var posr = function(i) {
    var t = $(this).attr('title');
    var result = t.match(bbox_re);
    if ( result ) {
      var top = containerTop + result[2] * yscale;
      var left = containerLeft + result[1] * xscale;
      var bottom = containerTop + result[4] * yscale;
      var right = containerLeft + result[3] * xscale;
    
      $(this).offset({top: top, left: left}); 
      $(this).outerWidth( right - left );
      $(this).outerHeight( bottom - top );
      
      var size = t.match(text_re)[1];
      if (size > 68) {
        size = 16;
      } else if (size > 40) {
        size = 13;
      } else if (size > 32) {
        size = 11;
      } else {
        size = 8;
      }

      if ($(window).width() < 420) {
        size = size*.4;
      } else if ($(window).width() < 576) {
        size = size*.60;
      } else if ($(window).width() < 768) {
        size = size*.75;
      } else if ($(window).width() > 1200) {
        size = size*1.1;
      }
      
      $(this).css('font-size',size+'px');
      $(this).css('line-height',(bottom-top)+'px');
    }
  };
  $('.ocr_line').each(posr);
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