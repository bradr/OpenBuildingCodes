var query = getParam('query');
var p = getParam('p');
$(document).ready(function() {
    if (!query) {
        window.location.href = '/';
    }
    if (!p) {
        p = 1;
    }
    search(query,p);
    
    //Click Handler:
    $('#search').on('submit',function(evt){
        evt.preventDefault();
        var searchTerm = $('#searchTerm').val();
        //Sanitize the search term:
        searchTerm = searchTerm.replace(/\s/g,'+');
        window.history.pushState("Object", "", "search?query=" +searchTerm);
        $('#searchTerm').blur();
        $('.btn').blur();
        search(searchTerm,0);
    });
    //Keypress handler:
    $(document).on('keydown', function(e) {
        keys(e);
    });
    $('#searchTerm').val(query);
    
    //Handlebar helpers:
    Handlebars.registerHelper("inc", function(value, options)
    {
        return parseInt(value) + 1;
    });
});


function search(query, p) {
    var from = (p-1)*10;
    var postdata = {
        from: from,
        size: 10,
        query:{
            match:query
        },
        highlight: {
            fields: ['body']
        },
        fields: ["id", "fragments", "title", "by", "page"]
    };
    $.ajax({
        url: 'api/index.bleve/_search',
        method: 'POST',
        dataType:'json',
        data: JSON.stringify(postdata),
        success: function(results) {
            displayResults(results);
        }
    });
}

function displayResults(results) {
    var outputs = [];
    var pageOf = '';
    if (p>1) {
        pageOf = 'Page '+p+' of ';
    }
    $('#resultCount').html(pageOf + results.total_hits + ' Results');
    results.hits.forEach(function(i) {
        outputs.push({title:i.id, fragment:i.fragments.body[0], fields:i.fields });
    });
    var template = $("#search-template").html();
    var template_output = Handlebars.compile(template);

    $('#search_results').html(template_output(outputs));
    
    displayPages(results.total_hits);
}

function displayPages(hits) {
    var pages = Math.ceil(hits/10);
    var searchPages = '';
    if (p>1) {
        var url = window.location.href;
        var newpage = parseInt(p,10)-1;
        if (url.match('p=')) {
            url = url.replace(/p=[^&]*/,'p='+newpage);
        } else {
            url = url+'&p='+newpage;
        }
        searchPages += '&nbsp;<a href="'+url+'"><b>\<</b></a>&nbsp;';
    }
    var start = 1;
    if (p > 5) {
        start = p-5;
    }
    if (p > (pages-5) && pages > 10) {
        start = pages-9;
    }
    for (var i=start;i<=pages;i++) {
        if (i == p) {
            searchPages += '&nbsp;' + i + '&nbsp;';
        } else if (i < (start+10)) {
            url = window.location.href;
            if (url.match('p=')) {
                url = url.replace(/p=[^&]*/,'p='+i);
            } else {
                url = url+'&p='+i;
            }
            searchPages += '&nbsp;<a href="' + url + '">' + i + '</a>&nbsp;';
        }
    }
    if (p<pages) {
        url = window.location.href;
        var nextpage = parseInt(p,10)+1;
        if (url.match('p=')) {
            url = url.replace(/p=[^&]*/,'p='+nextpage);
        } else {
            url = url+'&p='+nextpage;
        }
        searchPages += ' <a href="'+url+'"><b>\></b></a>';
    }
    $('#searchPages').html(searchPages);
}

function keys(e) {
    if ($(e.target).is('input, textarea')) {
      return;
    } else {
        if ( e.which === 34 || e.which === 74 || e.which === 40 ) {
            //Next
            var next;
            if (!parseInt($(':focus').attr('tabindex'),10)) {
                next = 1;
            } else {
                next = parseInt($(':focus').attr('tabindex'),10)+1;
            }
            $('[tabindex='+next+']').focus();
        } else if ( e.which === 33 || e.which === 75 || e.which === 38 ) {
        //Prev
            var prev = parseInt($(':focus').attr('tabindex'),10)-1;
            $('[tabindex='+prev+']').focus();
        } else if ( e.which === 79 || e.which === 13 ) {
            if ($(':focus').attr('href')) {
                window.location.href = $(':focus').attr('href');
            }
        }
    }
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