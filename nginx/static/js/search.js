var query = getParam('query');
var from = getParam('i');
if (!query) {
    query = 'building';
}
$(document).ready(function() {
    var postdata = {
        from: parseInt(from),
        size: 10,
        query:{
            match:query
        },
        highlight: {
            fields: ['body']
        }
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
});

function displayResults(results) {
    var outputs = [];
    results.hits.forEach(function(i) {
        outputs.push({title:i.id, fragment:i.fragments.body[0] });
    });
    var template = $("#search-template").html();
    var template_output = Handlebars.compile(template);
    $('#search_results').append(template_output(outputs))
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