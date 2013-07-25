/**
 * Copyright 2013 Kinvey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function($) {
  // Configure jQuery Mobile.
  // @link http://jquerymobile.com/demos/1.1.0/docs/api/globalconfig.html
  $(document).bind('mobileinit', function() {
    $.extend($.mobile, {
      defaultPageTransition: 'none',// disable page ..
      defaultDialogTransition: 'none'// .. transitions.
    });
  });

  // Configure jQuery.
  $.ajaxSetup({
    cache: true// Enable AJAX caching.
  });

  /**
   * Flood protection and loading indicator.
   */
  $.fn.loading = function(flag) {
    // Return loading state.
    var el = $(this);
    if(null == flag) {
      return el.jqmData('active');
    }

    // Change loading state.
    el.jqmData('active', flag);
    if(flag) {
      // Show spinner if loading takes more then half a second.
      if(null == el.jqmData('timeout')) {
        el.jqmData('timeout', window.setTimeout($.mobile.showPageLoadingMsg, 500));
      }
    }
    else {
      // Reset timeout.
      var timeout = el.jqmData('timeout');
      timeout && window.clearTimeout(timeout);
      el.jqmRemoveData('timeout');

      // Hide spinner.
      $.mobile.hidePageLoadingMsg();
    }
  };
}(jQuery));