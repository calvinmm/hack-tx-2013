function displayProgress(fileNodes) {

    var build = $("<ul>", {
        "class": "list-group"
    });

    for (var i = 0; i < fileNodes.length; i++) {
        var currentFile = fileNodes[i];

        // create bar
        var bar = $("<div>", {
            "class": "progress progress-striped active"
        });

        var percentDone = currentFile.progress() * 100.0;

        var classText = "progress-bar progress-bar-primary";

        // update to green if 100%
        if (percentDone == 100) {
            classText = "progress-bar progress-bar-success";
        }

        var barbar = $("<div>", {
            "class": classText
        }).attr("role", "progressbar")
          .attr("aria-valuenow", percentDone + "")
          .attr("aria-valuemin", "0")
          .attr("aria-valuemax", "100")
          .css("width", percentDone + "%");

        // TODO what are file units
        var currentElement = $("<li>", {
            "class": "list-group-item",
            "text": currentFile.name + " | " + currentFile.size
        }).append($("<li>", {
            "class": "list-group-item",
            "id": "omit-border"
        }).append(bar.append(barbar)));

        $(build).append(currentElement);
    }

    $("#progress-group").empty().append(build);
}