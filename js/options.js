$(function() {
    var user="";
    var startdate = 0;
    var enddate = 0;
    var totaltime = 0;
    var issueshandled = 0;
    $("#submit").attr("disabled","disabled");
    $( "#startdate" ).datepicker({dateFormat: "yy-mm-dd", maxDate: "0"});
    $( "#enddate" ).datepicker({dateFormat: "yy-mm-dd", maxDate: "0"});
    $.get("https://jira.dev.global-intra.net:8443/rest/api/2/myself", function(data) {
        $("#submit").removeAttr("disabled");
        $("#userid").html("Logged in as " + data.key);
        user=data.key;
    }).fail(function(data, textStatus, xhr) {
        console.warn('options.js: JIRA request failed');
        if (data.status == 401) {
            $("#userid").html("Please log into your JIRA account");
        } else {
            $("#userid").html("Error connecting to JIRA");
            console.warn(data);
        }
    });
    
    var button = document.getElementById('submit');
    button.onclick = function() {
        $( "#response" ).html( "Please wait while downloading your issues" );
        totaltime = 0;
        issueshandled = 0;
        $.ajax( {
            type: "POST",
            url: "https://jira.dev.global-intra.net:8443/rest/api/2/search",
            data: "{\"jql\":\"worklogDate >= " + $("#startdate").val() + " AND worklogDate <= " + $("#enddate").val() + " AND worklogAuthor = " + user + "\",\"startAt\":0,\"maxResults\":1000}",
            dataType: "json",
            contentType: "application/json"
        }).done(function( data ){
            console.log(data);
            if (data.issues.length > 0) {
                $( "#response" ).html( "Analyzing " + data.issues.length + " JIRA issue(s)<br>" );
                startdate = new Date(new Date($("#startdate").val()).toUTCString()).getTime();
                enddate = new Date(new Date(new Date($("#enddate").val()).getTime() + 86399000).toUTCString()).getTime();
                console.log("Startdate: " + startdate);
                console.log("Enddate: " + enddate);
                for (var i=0; i < data.issues.length; i++) {
                    if (data.issues[i].fields.parent) {
                        getWorklog(data.issues[i].key, data.issues[i].fields.parent.key, data.issues.length);
                    } else {
                        getWorklog(data.issues[i].key, data.issues[i].key, data.issues.length);
                    }
                }
            }
            else {
                $( "#response" ).html( "No JIRA issues found for " + user + "<br>" );
            }
        });
    };
    
    var getWorklog = function(key, parentKey, length) {
        $.ajax({
            type: "GET",
            url: "https://jira.dev.global-intra.net:8443/rest/api/2/issue/" + key + "/worklog",
            dataType: "json",
            success: function(data) {
                console.log(data);
                append(data, parentKey, length);
            }
        });
    }
    
    var append = function(data, key, length) {
        var time = 0;
        var Alltime = 0;
        for (var i=0; i < data.worklogs.length; i++) {
            if (data.worklogs[i].author.name == user) {
                var worklogdate = new Date(new Date(data.worklogs[i].started).toUTCString()).getTime();
                console.log("Worklogdate: " + worklogdate);
                Alltime += data.worklogs[i].timeSpentSeconds;
                if (worklogdate >= startdate && worklogdate <= enddate)
                {
                    totaltime += data.worklogs[i].timeSpentSeconds;
                    time += data.worklogs[i].timeSpentSeconds;
                }
            }
        }
        $("#response").append("<a href=\"https://jira.dev.global-intra.net:8443/browse/" + key + "\" target=\"_blank\">" + key + "</a>: <b>" + 
                                (Math.round((time / 60 / 60) * 10) / 10) + " / " + (Math.round((Alltime / 60 / 60) * 10) / 10) + "</b>h<br>");
        issueshandled += 1;
        
        if (issueshandled >= length) {
            $("#response").append("<br>Total time: " + (Math.round((totaltime / 60 / 60) * 10) / 10) + "h");
        }
    }
});
