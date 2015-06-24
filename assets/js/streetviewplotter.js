/*global google, alert */
var APP;
APP = function(apiKey) {

    /**
     * References `this`; use in callbacks for correct scoping
     * @type {Object}
     */
    var base = this;

    // --------------------------------------------------------------------------

    /**
     * The API key to use
     * @type {String}
     */
    base.apiKey = apiKey || null;

    // --------------------------------------------------------------------------

    /**
     * Where the user will start (calculated from postcode)
     * @type {Object}
     */
    base.origin = {
        'lat': 51.526771,
        'lng': -0.074334
    };

    // --------------------------------------------------------------------------

    base.target = {
        'lat': 51.526771,
        'lng': -0.074334
    };

    // --------------------------------------------------------------------------

    /**
     * Computes the heading between two points
     * @type {Object}
     */
    base.computeHeading = google.maps.geometry.spherical.computeHeading;

    // --------------------------------------------------------------------------

    /**
     * Holds an instance of the geocoder
     * @type {Object}
     */
    base.geocoder = null;

    // --------------------------------------------------------------------------

    base.map = null;

    // --------------------------------------------------------------------------

    base.markers = [];
    base.frames = [];

    // --------------------------------------------------------------------------

    base.frameRate = 12;
    base.player = {
        'instance': null,
        'timeout': 1000/base.frameRate,
        'currentFrame': null,
        'frames': []
    };

    // --------------------------------------------------------------------------

    base.minFrameSize = 5000;

    // --------------------------------------------------------------------------

    /**
     * Constructs the app
     * @return {Void}
     */
    base.__construct = function() {

        base.log('Starting up');

        // --------------------------------------------------------------------------

        //  Initiate
        base.directionService = new google.maps.DirectionsService();
        base.geocoder         = new google.maps.Geocoder();

        // --------------------------------------------------------------------------

        //  Build the map
        base.log('Creating map and adding event listeners');
        var mapOptions = {
            zoom: 17,
            disableDoubleClickZoom: true,
            center: new google.maps.LatLng(base.origin.lat, base.origin.lng)
        };

        base.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        google.maps.event.addListener(base.map, 'center_changed', function() {

            base.updateCenterCoordinates();
        });

        google.maps.event.addListener(base.map, 'click', function() {

            base.placeMarker();
        });

        base.updateCenterCoordinates();
        base.setCenterAsTarget();
        base.setApiKey();

        // --------------------------------------------------------------------------

        //  Bind to all the things
        //  Map searcher
        $('#map-searcher input').on('keyup', function(e) {
            var search = $(this).val().trim();
            if (search.length && e.which === 13) {
                base.centerMap(search);
            }
        });

        //  Set as target
        $('#action-set-target').on('click', function() {
            base.setCenterAsTarget();
        });

        //  Place marker
        $('#map-crosshair').on('click', function() {
            base.placeMarker();
        });

        //  Export data
        $('#action-export-data').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.exportData();
            }
        });

        //  Export frames
        $('#action-export-frames').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.exportFrames();
            }
        });

        //  Import data
        $('#action-import-data').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.importData();
            }
        });

        //  Clear frames
        $('#action-clear-frames').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.clearFrames();
            }
        });

        //  Preview animation
        $('#action-preview').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.buildAnimation();
            }
        });

        //  Stop the player
        $('#action-player-stop').on('click', function() {
            if (!$(this).hasClass('disabled')) {
                base.playerStop();
            }
        });

        //  Update the API Key
        $('#param-api-key').on('blur', function() {
            base.setApiKey($(this).val().trim());
        });

        //  Delete Frame
        $('#frames').on('click', '.action-delete', function() {

            var frame = $(this).data('frame-number');
            base.deleteFrame(frame);
        });

        $('#frames').on('blur', 'td.fov input, td.pitch input', function() {

            //  Get the frame number
            var frameNumber = $(this).closest('tr').data('frame-number');
            var frame = base.frames[frameNumber];
            var pitch = parseInt($('#frame-number-' + frameNumber + ' td.pitch input').val(), 10);
            var fov = parseInt($('#frame-number-' + frameNumber + ' td.fov input').val(), 10);

            //  Calculate the heading
            var heading = base.computeHeading(
                new google.maps.LatLng(frame.lat, frame.lng),
                new google.maps.LatLng(base.target.lat, base.target.lng)
            );

            //  Generate the streetview url
            var url = base.getImgUrl(
                100,
                75,
                frame.lat,
                frame.lng,
                heading,
                pitch,
                fov
            );

            //  Update the URL of the preview
            $('#frame-number-' + frameNumber + ' td.preview img').attr('src', url);

        });
    };

    // --------------------------------------------------------------------------

    base.centerMap = function(search) {

        base.log('Centering map: ' + search);
        base.getCoordinatesFromPostcode(search)
        .done(function(result) {

            base.log('Reveived new coordinates, centering map');
            base.map.setCenter(result);

        }).fail(function() {
            base.log('Failed to get coordinates');
            base.dialog('failed to get coordinates', 'Centering failed');
        });
    };

    // --------------------------------------------------------------------------

    base.setCenterAsTarget =function() {

        base.log('Setting centre of map as target');

        base.target.lat = base.map.getCenter().lat();
        base.target.lng = base.map.getCenter().lng();

        $('#param-target-lat').val(base.target.lat);
        $('#param-target-lng').val(base.target.lng);

        base.rebuildFrameList();
    };

    // --------------------------------------------------------------------------

    base.updateCenterCoordinates = function() {

        base.log('Updating displayed coordinates for map centre');
        $('#map-center-coordinates .lat').text(base.map.getCenter().lat());
        $('#map-center-coordinates .lng').text(base.map.getCenter().lng());
    };

    // --------------------------------------------------------------------------

    base.exportData = function(returnObj) {

        base.log('Exporting data');
        returnObj = returnObj || false;

        var exportData = {};
        var temp = {};
        var heading = null;
        var defaultPitch = parseInt($('#param-pitch').val(), 10);
        var defaultFov = parseInt($('#param-fov').val(), 10);
        var width = parseInt($('#param-frame-width').val(), 10);
        var height = parseInt($('#param-frame-height').val(), 10);

        //  Parameters
        exportData.target = base.target;
        exportData.pitch = defaultPitch;
        exportData.fov = defaultFov;
        exportData.width = width;
        exportData.height = height;
        exportData.frames = [];

        //  Frames
        for (var i = 0; i < base.frames.length; i++) {

            temp = {
                'lat': base.frames[i].lat,
                'lng': base.frames[i].lng,
                'pitch': parseInt($('#frame-number-' + i + ' td.pitch input').val(), 10) || defaultPitch,
                'fov': parseInt($('#frame-number-' + i + '  td.fov input').val(), 10) || defaultFov
            };

            //  Calculate the heading
            heading = base.computeHeading(
                new google.maps.LatLng(temp.lat, temp.lng),
                new google.maps.LatLng(base.target.lat, base.target.lng)
            );

            //  Generate the streetview url
            temp.url = base.getImgUrl(
                width,
                height,
                temp.lat,
                temp.lng,
                heading,
                temp.pitch,
                temp.fov
            );

            exportData.frames.push(temp);
        }

        if (returnObj) {
            return exportData;
        } else {
            $('#export-target').val(JSON.stringify(exportData, null, '\t'));
        }
    };

    // --------------------------------------------------------------------------

    base.exportFrames = function(returnObj) {

        base.log('Exporting frames');
        var exportData = base.exportData(true);
        var temp = [];

        for (var i = 0; i < exportData.frames.length; i++) {
            temp.push(exportData.frames[i].url);
        }

        if (returnObj) {
            return temp;
        } else {
            $('#export-target').val(JSON.stringify(temp, null, '\t'));
        }
    };

    // --------------------------------------------------------------------------

    base.importData = function() {

        base.log('Importing data');
        var importData = $('#export-target').val().trim();

        if (importData.length) {

            try {

                importData = JSON.parse(importData);

                $('#param-target-lat').val(importData.target.lat);
                $('#param-target-lng').val(importData.target.lng);
                $('#param-pitch').val(importData.pitch);
                $('#param-fov').val(importData.fov);
                $('#param-frame-width').val(importData.width);
                $('#param-frame-height').val(importData.height);

                //  Start fresh
                base.clearFrames();

                //  Center the map on the target
                base.map.setCenter(importData.target);
                base.setCenterAsTarget();

                for (var i = 0; i < importData.frames.length; i++) {

                    base.markers.push(new google.maps.Marker({
                        position: new google.maps.LatLng(
                            importData.frames[i].lat,
                            importData.frames[i].lng
                        ),
                        map: base.map
                    }));

                    base.frames.push({
                        'lat': importData.frames[i].lat,
                        'lng': importData.frames[i].lng,
                        'pitch': importData.frames[i].pitch || importData.pitch,
                        'fov': importData.frames[i].fov || importData.fov
                    });
                }

                //  Rebuilding marker list
                base.rebuildFrameList();

                base.log('Import completed successfully');
                base.dialog('Import completed successfully', 'Import OK');

            } catch (e) {

                base.log('Failed to import: Bad data - ' + e.message);
                base.dialog('Bad data - ' + e.message, 'Failed to import');
            }

        } else {
            base.log('Failed to import: Missing data');
            base.dialog('Missing data', 'Failed to import');
        }
    };

    // --------------------------------------------------------------------------

    base.placeMarker = function() {

        base.log('Placing marker');

        var lat = base.map.getCenter().lat();
        var lng = base.map.getCenter().lng();
        var pitch = parseInt($('#param-pitch').val(), 10);
        var fov = parseInt($('#param-fov').val(), 10);

        base.markers.push(new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map: base.map
        }));

        base.frames.push({
            'lat': lat,
            'lng': lng,
            'pitch': pitch,
            'fov': fov
        });

        //  Rebuilding marker list
        base.rebuildFrameList();
    };

    // --------------------------------------------------------------------------

    base.deleteFrame = function(frameNumber) {

        base.log('Deleting frame #' + frameNumber);
        //  Remove the marker
        base.markers[frameNumber].setMap(null);
        base.markers.splice(frameNumber, 1);

        //  Remove the frame
        base.frames.splice(frameNumber, 1);

        //  Rebuild the list
        base.rebuildFrameList();
    };

    // --------------------------------------------------------------------------

    base.clearFrames = function() {

        base.log('Clearing frames and markers');

        for (var i = base.markers.length - 1; i >= 0; i--) {
            base.markers[i].setMap(null);
        }

        base.markers = [];
        base.frames = [];

        base.rebuildFrameList();
    };

    // --------------------------------------------------------------------------

    base.rebuildFrameList = function() {

        base.log('Rebuilding frames list');

        $('#frames tbody').empty();

        var tr,td1,td2,td3,td4,td5,td6,td7,inp1,inp2,img,btn,heading,url;

        for (var i = 0; i < base.frames.length; i++) {

            heading = base.computeHeading(
                new google.maps.LatLng(base.frames[i].lat, base.frames[i].lng),
                new google.maps.LatLng(base.target.lat, base.target.lng)
            );

            //  Generate the streetview url
            url = base.getImgUrl(
                100,
                75,
                base.frames[i].lat,
                base.frames[i].lng,
                heading,
                base.frames[i].pitch,
                base.frames[i].fov
            );

            td1 = $('<td>').addClass('number').text(i);
            td2 = $('<td>').addClass('lat').text(base.frames[i].lat);
            td3 = $('<td>').addClass('lng').text(base.frames[i].lng);
            td4 = $('<td>').addClass('pitch');
            inp1 = $('<input>').val(base.frames[i].pitch);
            td5 = $('<td>').addClass('fov');
            inp2 = $('<input>').val(base.frames[i].fov);
            td6 = $('<td>').addClass('preview');
            img = $('<img>').attr('src', url);
            td7 = $('<td>').addClass('action');
            btn = $('<button>').addClass('action-delete').data('frame-number', i).text('Delete');

            tr = $('<tr>')
            .attr('id', 'frame-number-' + i)
            .data('frame-number', i)
            .append(td1)
            .append(td2)
            .append(td3)
            .append(td4.append(inp1))
            .append(td5.append(inp2))
            .append(td6.append(img))
            .append(td7.append(btn));

            $('#frames tbody').append(tr);
        }
    };

    // --------------------------------------------------------------------------

    base.buildAnimation = function() {

        base.log('Previewing animation');
        base.playerStop();
        $('#player-canvas').addClass('loading');

        //  Disable buttons
        $('#action-preview').addClass('disabled');
        $('#action-export-data').addClass('disabled');
        $('#action-export-frames').addClass('disabled');
        $('#action-import-data').addClass('disabled');
        $('#action-clear-frames').addClass('disabled');

        var allFrames    = base.exportData(true);
        var framesToLoad = $.extend(true, {}, allFrames);

        if (framesToLoad.frames.length) {

            base.log('Preloading ' + framesToLoad.frames.length + ' frames');
            base.loadFramesSequentially(framesToLoad.frames, function() {

                base.log('Finished pre-loading');
                base.playerPlay(allFrames.frames);

                $('#player-canvas').removeClass('loading');
                $('#action-preview').removeClass('disabled');
                $('#action-export-data').removeClass('disabled');
                $('#action-export-frames').removeClass('disabled');
                $('#action-import-data').removeClass('disabled');
                $('#action-clear-frames').removeClass('disabled');
            });

        } else {

            base.log('No frames');
            base.dialog('No frames available', 'Playback Error');

            //  Hide loader
            $('#player-canvas').removeClass('loading');

            //  Enable buttons
            $('#action-preview').removeClass('disabled');
            $('#action-export-data').removeClass('disabled');
            $('#action-export-frames').removeClass('disabled');
            $('#action-import-data').removeClass('disabled');
            $('#action-clear-frames').removeClass('disabled');
        }
    };

    // --------------------------------------------------------------------------

    base.loadFramesSequentially = function(framesToLoad, onFinish, totalFrames) {

        base.log('Initiating sequential load');

        if (!framesToLoad.length) {

            onFinish.call();
            return;
        }

        if (typeof totalFrames === 'undefined') {
            totalFrames = framesToLoad.length;
        }

        var img = new Image();
        var frame = framesToLoad.shift();
        var frameNumber = totalFrames - framesToLoad.length;

        base.log('Loading Frame #' + frameNumber + ' of ' + totalFrames);
        $('#player-info span').text('Loading Frame #' + frameNumber + ' of ' + totalFrames);

        img.onload = function() {

            base.log('Frame #' + frameNumber + ' loaded');
            base.loadFramesSequentially(framesToLoad, onFinish, totalFrames);
        };

        img.src = frame.url;
    };

    // --------------------------------------------------------------------------

    base.getCoordinatesFromPostcode = function(postcode) {

        var deferred = new $.Deferred();

        base.log('Geocoding "' + postcode + '"');

        base.geocoder.geocode({'address': postcode}, function (results, status)
        {
            if (status === google.maps.GeocoderStatus.OK)
            {
                base.log('Successfully geocoded "' + postcode + '"');
                base.log('Lat: ' + results[0].geometry.location.lat());
                base.log('Lng: ' + results[0].geometry.location.lng());

                var coordinates = {
                    'lat': results[0].geometry.location.lat(),
                    'lng': results[0].geometry.location.lng()
                };

                deferred.resolve(coordinates);

            } else {

                base.log('"' + postcode + '" could not be geocoded');
                deferred.reject({
                    'error': 'Failed to geocode "' + postcode + '".',
                    'response': results
                });
            }
        });

        return deferred.promise();
    };

    // --------------------------------------------------------------------------

    base.getImgUrl = function(width, height, lat, lng, heading, pitch, fov) {

        var url;

        width = width || 0;
        height = height || 0;

        url = 'http://maps.googleapis.com/maps/api/streetview?';
        url += 'size=' + width + 'x' + height;
        url += '&location=' + lat + ',' + lng;
        url += '&heading=' + heading;
        url += '&pitch=' + pitch;
        url += '&fov=' + fov;
        url += '&sensor=false';
        url += '&key=' + base.apiKey;

        if (!$.trim(base.apiKey).length) {
            base.warn('Missing API Key, Streetview URL will be rejected');
        }

        return url;
    };

    // --------------------------------------------------------------------------

    base.playerPlay = function(frames) {

        base.playerStop();
        base.log('Beginning playback');

        $('#action-player-stop').show();

        //  Reset
        base.player.frames = frames;
        base.player.currentFrame = null;

        //  Start playback
        base.player.instance = setInterval(function() {

            if (base.player.currentFrame === null) {
                base.player.currentFrame = -1;
            }

            base.player.currentFrame++;
            var curFrame = base.player.currentFrame;

            if (typeof base.player.frames[curFrame] === 'undefined') {
                base.player.currentFrame = 0;
                curFrame = 0;
            }

            $('#player-canvas').css('background-image', 'url(' + base.player.frames[curFrame].url + ')');
            $('#player-info span').text('Frame #' + curFrame);

        }, base.player.timeout);
    };

    base.playerStop = function() {

        base.log('Stopping playback');
        $('#player-canvas').css('background-image', 'none');
        $('#player-info span').text('Player ready...');
        $('#action-player-stop').hide();
        clearInterval(base.player.instance);
    };

    // --------------------------------------------------------------------------

    /**
     * Set a new API key
     * @param {String} key The key to set
     */
    base.setApiKey = function(key) {

        if (!key) {

            key = $('#param-api-key').val().trim();
        }

        base.log('Setting API Key: ' + key);
        base.apiKey = key;

        base.rebuildFrameList();

        return base;
    };

    // --------------------------------------------------------------------------

    /**
     * Renders a dialog
     * @return {Object}
     */
    base.dialog = function(message, subject, modalClass) {

        subject    = subject || 'Dialog Title';
        message    = message || 'No message supplied';
        modalClass = modalClass || 'default';

        //  @todo: implement bootstrap dialog
        alert(subject + ' - ' + message);
        base.log('Dialog: ' + subject + ' - ' + message);

        return base;
    };

    // --------------------------------------------------------------------------

    base.log = function(message) {

        if (typeof console !== 'undefined' && typeof console.log === 'function') {
            console.log(message);
        }
    };

    // --------------------------------------------------------------------------

    base.warn = function(message) {

        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn(message);
        }
    };

    // --------------------------------------------------------------------------

    //  Cosntruct the class
    base.__construct();
};