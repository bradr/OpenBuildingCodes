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
    
    $('#search').on('submit',function(evt){
        evt.preventDefault();
        var searchTerm = $('#searchTerm').val();
        //Sanitize the search term:
        searchTerm = searchTerm.replace(/\s/g,'+');
        window.history.pushState("Object", "", "search?query=" +searchTerm);
        search(searchTerm,0);
    });
    $('#searchTerm').val(query);
});


function search(query, p) {
    var from = p*10;
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
        var newpage = parseInt(p)-1;
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
    if (p > (pages-5)) {
        start = pages-10;
    }
    for (var i=start;i<pages;i++) {
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
    if (p<(pages-1)) {
        var url = window.location.href;
        var nextpage = parseInt(p)+1;
        if (url.match('p=')) {
            url = url.replace(/p=[^&]*/,'p='+nextpage);
        } else {
            url = url+'&p='+nextpage;
        }
        searchPages += ' <a href="'+url+'"><b>\></b></a>';
    }
    $('#searchPages').html(searchPages);
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