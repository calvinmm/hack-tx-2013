// array of files we are going to upload
var filesToUpload = [];
var global_room_id = -1;

(function() {
    // add for regular upload
    var uploadFile = document.getElementById('file_upload');
    uploadFile.addEventListener('change', handleFileSelect, false);

    // add drop and drag
    var dropTheBass = document.getElementById('file_drop');
    dropTheBass.addEventListener('dragover', handleDragOver, false);
    dropTheBass.addEventListener('drop', handleDropSelect, false);

    var KEEP_ITEM = $("<span>", {"class": "badge badge-green"})
        .append($("<span>", {"class": "glyphicon glyphicon-ok"}));
    var REMOVE_ITEM = $("<span>", {"class": "badge badge-red",
            "data-toggle": "tooltip",
            "data-placement": "right",
            "data-title": "Click to remove file."})
        .append($("<span>", {"class": "glyphicon glyphicon-remove"}));

    // remove this item from the array
    $(REMOVE_ITEM).click(function() {

        var fileName = $(this).parent().text();
        for (var i = 0; i < filesToUpload.length; i++) {
            if (fileName == filesToUpload[i].name) {
                // remove the file from the array
                filesToUpload.splice(i, 1);
                refreshFileView();
                return;
            }
        }
    });

    $(REMOVE_ITEM).hover(function() {}, function() {
        var element = $(this).parent();
        var text = $(element).text();

        var temp = KEEP_ITEM.clone(true);
        $(element).empty().text(text).append(temp);
    });

    $(KEEP_ITEM).hover(function() {

        // user is hovering over item
        // swap out their child span for another

        var element = $(this).parent();
        var text = $(element).text();

        var temp = REMOVE_ITEM.clone(true);
        // $(temp).tooltip();

        $(element).empty().text(text).append(temp);

    }, function() {});

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var fileList = evt.target.files;
        handleFiles(fileList);
    }

    function handleDropSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var fileList = evt.dataTransfer.files;
        handleFiles(fileList);
    }

    function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    function handleFiles(fileList) {
        var numFiles = fileList.length;
        for (var i = 0; i < numFiles; i++) {
            filesToUpload.push(fileList[i]);
        }

        checkCreateButton();
        displayFiles();
    }

    function refreshFileView() {
        checkCreateButton();
        displayFiles();
    }

    // disable/enable the create button
    function checkCreateButton() {
        if (filesToUpload.length > 0) {
            $("#create-button").removeAttr("disabled");
        } else {
            $("#create-button").attr("disabled", "disabled");
        }
    }

    $("#create-button").click(function() {
        masterStart(filesToUpload);

        // TODO
        // do some action
        // clear out shit

    });

    // display the files on the right hand side
    function displayFiles() {
        var numFiles = filesToUpload.length;

        var builder = $("<div>");

        for (var i = 0; i < numFiles; i++) {
            var item = $("<li>", {"class": "list-group-item"})
                .text(filesToUpload[i].name).append(KEEP_ITEM.clone(true));
            $(builder).append(item);
        }
        
        $("#file-list").empty().append(builder);
    }
})();

// set up our room
function setupRoom(room_id) {
    // set global room id
    global_room_id = room_id;

    // TODO
    // update page with room_id
    // window.history.pushState();

    clientStartLoops();
}

function clientStartLoops() {
    // update peers
    window.setInterval(function() {
        refreshPeers();
    }, 100);

    // update the states
    window.setInterval(function() {
        updateOtherState();
    }, 1000);

    window.getParticipants();
}

// run on load only
(function checkRoomExists() {
    // TODO
    // if we have id, kill page, show only setup

    // set global loop id
    // call looping functions
    var path = window.location.pathname;
    if (path.substring(1).match(/^\d+$/)) {
        global_room_id = Number(path.substring(1));
        clientStartLoops();
    }
})();