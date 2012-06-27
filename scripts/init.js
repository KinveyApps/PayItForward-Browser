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
   * 
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