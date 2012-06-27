(function(window, document, Kinvey, $, Handlebars) {
  /*globals Kinvey, Handlebars*/

  // Import.
  var App = window.PayItForward;

  // Template helpers.
  Handlebars.registerHelper('formatDate', function() {
    var month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    var date = new Date(Date.parse(this.added()));
    var result = month[date.getMonth()] + ' ' + date.getDate();
    if(new Date().getFullYear() !== date.getFullYear()) {
      result += ', ' + date.getFullYear();
    }
    return result;
  });
  Handlebars.registerHelper('prop', function(prop/*, prop...*/) {
    var value = this.get(prop);

    // Handle nested properties.
    var total = arguments.length - 1;// Last argument is by Handlebars.
    for(var i = 1; i < total; i += 1) {
      if(null == value) {
        break;
      }
      value = value[arguments[i]];
    }
    return value;
  });
  var template = function(id, data) {
    var tpl = Handlebars.compile($(id).html());
    return tpl(data);
  };
  var error = function(msg) {
    // Create error layer.
    var layer = $(template('#tpl-error', { msg: msg || 'An error occured.' } ));

    // Display.
    var page = $.mobile.activePage.find('[data-role="content"]');
    page.find('.pif-error').remove();// remove any previously set error messages.
    page.prepend(layer);
    layer.delay(2000).fadeOut('slow', function() {
      layer.remove();
    });
  };

  /**
   * Document-level events.
   */
  var document_ = $(document);
  document_.on({
    // Events to handle changing network connection status.
    offline: function() {
      $.mobile.changePage('#offline');
    },
    online: function() {
      $.mobile.changePage('#home');
    },
    pagebeforeshow: function() {
      // Disable navigation if in offline mode.
      if(!navigator.onLine && 'offline' !== $.mobile.activePage.attr('id')) {
        document_.trigger('offline');
      }
    }
  });

  // Event to redirect the user to the splash screen if it has no account.
  var queue = [];
  $('[data-role="page"]').on('pageinit pageshow', function(e) {
    var page = $(this);
    if(null === Kinvey.getCurrentUser() && -1 === ['offline', 'splash'].indexOf(page.attr('id'))) {
      e.stopImmediatePropagation();

      // The pageinit event needs to be executed, but at a later stage.
      if('pageinit' === e.type) {
        queue.push(page);
      }
      $.mobile.changePage('#splash');
    }
  });

  /**
   * Splash screen. Used to create a user account.
   */
  var splash = $('#splash');
  splash.on({
    pageinit: function() {
      // Add form controls.
      var form = splash.find('form');
      form.on('submit', function(e) {
        // Disable default handler.
        e.preventDefault();

        // Flood protection.
        if(form.loading()) {
          return;
        }
        form.loading(true);

        // Pull and validate name.
        var name = form.find('[name="name"]');
        var vName = name.val();
        if(vName.match(/^\s*$/)) {
          // Set error state and re-enable event.
          name.addClass('pif-form-error');
          form.loading(false);
          return;
        }
        var vImage = form.find('[name="image"]').val();

        // Save.
        Kinvey.User.create({
          name: vName,
          image: vImage || 'images/picture.jpg'
        }, {
          success: function() {
            // Trigger any outstanding init events.
            while(0 !== queue.length) {
              queue.shift().trigger('pageinit');
            }
            form.loading(false);
            $.mobile.changePage('#home');
          },
          error: function() {
            // Re-enable event.
            error('Failed to create a user.');
            form.loading(false);
          }
        });
      });
    },
    pageshow: function() {
      // If there is a user, redirect to homepage.
      null !== Kinvey.getCurrentUser() && $.mobile.changePage('#home');
    }
  });

  /**
   * Home screen. Displays all requests.
   */
  var home = $('#home');
  home.on({
    pageinit: function() {
      // Flood protection.
      if(home.loading()) {
        return;
      }
      home.loading(true);

      // Setup infinite scroll.
      var content = home.find('[data-role="content"]');
      var trigger = content.find('.pif-waypoint');
      var opts = { offset: 'bottom-in-view' };
      trigger.waypoint(function() {
        trigger.waypoint('remove');

        // Retrieve latest requests.
        App.RequestCollection.history({
          success: function(data) {
            if(0 !== data.length) {
              var html = template('#tpl-requests', { list: data });

              // Add to existing list, or replace content.
              var list = content.find('.pif-list');
              if(list.length) {
                list.append($(html).find('.pif-item')).trigger('create');
              }
              else {
                content.find('.pif-empty').remove();
                content.prepend(html).trigger('create');
              }

              // Re-enable infinite scroll.
              trigger.waypoint(opts);
            }

            // Re-enable event.
            home.loading(false);
          },
          error: function() {
            // Re-enable event.
            error('Failed to retrieve any requests.');
            home.loading(false);
          }
        });
      }, opts);
    },
    pageshow: function() {
      // Flood protection.
      if(home.loading()) {
        return;
      }
      home.loading(true);

      // Retrieve new requests.
      App.RequestCollection.updates({
        success: function(data) {
          if(0 !== data.length) {
            var html = template('#tpl-requests', { list: data });

            // Add to existing list, or replace content.
            var content = home.find('[data-role="content"]');
            var list = content.find('.pif-list');
            if(list.length) {
              list.prepend($(html).find('.pif-item')).trigger('create');
            }
            else {
              content.find('.pif-empty').remove();
              content.prepend(html).trigger('create');
            }
          }

          // Re-enable event.
          home.loading(false);
        },
        error: function() {
          // Re-enable event.
          error('Failed to retrieve any new requests.');
          home.loading(false);
        }
      });
    }
  });

  /**
   * New screen. Adds a new request.
   */
  var new_ = $('#new');
  new_.on({
    pageinit: function() {
      // Add form controls.
      var form = new_.find('form');
      form.on('submit', function(e) {
        // Disable default handler.
        e.preventDefault();

        // Flood protection.
        if(form.loading()) {
          return;
        }
        form.loading(true);

        // Pull and validate message.
        var message = form.find('[name="message"]');
        var vMessage = message.val();
        if(vMessage.match(/^\s*$/)) {
          // Set error state and re-enable event.
          message.addClass('pif-form-error');
          form.loading(false);
          return;
        }

        // Save.
        var user = Kinvey.getCurrentUser();
        new App.Request({
          author: {
            id: user.getId(),
            name: user.get('name'),
            image: user.get('image')
          },
          message: vMessage
        }).save({
          success: function() {
            // Re-enable event and redirect.
            form.loading(false);
            $.mobile.changePage('#home');
          },
          error: function() {
            // Re-enable event.
            error('Failed to save your request.');
            form.loading(false);
          }
        });
      });
    },
    pageshow: function() {
      // Reset form.
      new_.find('[name="message"]').removeClass('pif-form-error').val('');
    }
  });

  /**
   * Forward screen. Forwards a request.
   */
  // Set meta data to personalize the "Pay It Forward" page.
  home.on('click', '.pif-pif-inner', function() {
    var el = $(this);
    forward.jqmData('user', {
      id: el.attr('data-id'),
      name: el.attr('data-name'),
      image: el.attr('data-image')
    });
  });

  var forward = $('#forward');
  forward.on({
    pageinit: function() {
      // Add form controls.
      var form = forward.find('form');
      form.on('submit', function(e) {
        // Disable default handler.
        e.preventDefault();

        // Flood protection.
        if(form.loading()) {
          return;
        }
        form.loading(true);

        // Pull and validate message.
        var message = form.find('[name="message"]');
        var vMessage = message.val();
        if(vMessage.match(/^\s*$/)) {
          // Set error state and re-enable event.
          message.addClass('pif-form-error');
          form.loading(false);
          return;
        }

        // Save.
        var user = Kinvey.getCurrentUser();
        new App.Forward({
          author: {
            id: user.getId(),
            name: user.get('name'),
            image: user.get('image')
          },
          to: forward.jqmData('user'),
          message: vMessage
        }).save({
          success: function() {
            // Re-enable event and redirect.
            form.loading(false);
            $.mobile.changePage('#home');
          },
          error: function() {
            // Re-enable event.
            error('Failed to pay it forward.');
            form.loading(false);
          }
        });
      });
    },
    pageshow: function() {
      // Reset form.
      forward.find('[name="message"]').removeClass('pif-form-error').val('');
    }
  });

  /**
   * My forwards screen. Shows overview of who forwarded to you or vice-versa.
   */
  var forwards = $('#forwards');
  forwards.on({
    pageinit: function() {
      // Flood protection.
      if(forwards.loading()) {
        return;
      }
      forwards.loading(true);

      // Setup infinite scroll.
      var content = forwards.find('[data-role="content"]');
      var trigger = content.find('.pif-waypoint');
      var opts = { offset: 'bottom-in-view' };
      trigger.waypoint(function() {
        trigger.waypoint('remove');

        App.ForwardCollection.history({
          id: Kinvey.getCurrentUser().getId(),
          success: function(data) {
            if(0 !== data.length) {
              // Display list.
              var html = template('#tpl-forwards', { list: data, mine: true });

              // Add to existing list, or create list.
              var list = content.find('.pif-list');
              if(list.length) {
                list.append($(html).find('.pif-item')).trigger('create');
              }
              else {
                content.find('.pif-empty').remove();
                content.prepend(html).trigger('create');
              }

              // Re-enable infinite scroll.
              trigger.waypoint(opts);
            }

            // Re-enable event.
            forwards.loading(false);
          },
          error: function() {
            // Re-enable event.
            error('Failed to retrieve any forwards.');
            forwards.loading(false);
          }
        });
      }, opts);
    },
    pageshow: function() {
      // Flood protection.
      if(forwards.loading()) {
        return;
      }
      forwards.loading(true);

      // Retrieve new requests.
      var content = forwards.find('[data-role="content"]');
      App.ForwardCollection.updates({
        id: Kinvey.getCurrentUser().getId(),
        success: function(data) {
          if(0 !== data.length) {
            // Display list.
            var html = template('#tpl-forwards', { list: data, mine: true });

            // Add to existing list, or create list.
            var list = content.find('.pif-list');
            if(list.length) {
              list.prepend($(html).find('.pif-item')).trigger('create');
            }
            else {
              content.find('.pif-empty').remove();
              content.prepend(html).trigger('create');
            }
          }

          // Re-enable event.
          forwards.loading(false);
        },
        error: function() {
          // Re-enable event.
          error('Failed to retrieve any forwards.');
          forwards.loading(false);
        }
      });
    }
  });

  /**
   * All forwards screen. Shows all forwards.
   */
  var allForwards = $('#allForwards');
  allForwards.on({
    pageinit: function() {
      // Flood protection.
      if(allForwards.loading()) {
        return;
      }
      allForwards.loading(true);

      // Setup infinite scroll.
      var content = allForwards.find('[data-role="content"]');
      var trigger = content.find('.pif-waypoint');
      var opts = { offset: 'bottom-in-view' };
      trigger.waypoint(function() {
        trigger.waypoint('remove');

        // Retrieve latest requests.
        App.AllForwardCollection.history({
          success: function(data) {
            if(0 !== data.length) {
              // Display list.
              var html = template('#tpl-forwards', { list: data });

              // Add to existing list, or create list.
              var list = content.find('.pif-list');
              if(list.length) {
                list.append($(html).find('.pif-item')).trigger('create');
              }
              else {
                content.find('.pif-empty').remove();
                content.prepend(html).trigger('create');
              }

              // Re-enable infinite scroll.
              trigger.waypoint(opts);
            }

            // Re-enable event.
            allForwards.loading(false);
          },
          error: function() {
            // Re-enable event.
            error('Failed to retrieve any forwards.');
            allForwards.loading(false);
          }
        });
      }, opts);
    },
    pageshow: function() {
      // Flood protection.
      if(allForwards.loading()) {
        return;
      }
      allForwards.loading(true);

      // Retrieve new requests.
      App.AllForwardCollection.updates({
        success: function(data) {
          if(0 !== data.length) {
            // Display list.
            var html = template('#tpl-forwards', { list: data });

            // Add to existing list, or create list.
            var content = allForwards.find('[data-role="content"]');
            var list = content.find('.pif-list');
            if(list.length) {
              list.prepend($(html).find('.pif-item')).trigger('create');
            }
            else {
              content.find('.pif-empty').remove();
              content.prepend(html).trigger('create');
            }
          }

          // Re-enable event.
          allForwards.loading(false);
        },
        error: function() {
          // Re-enable event.
          error('Failed to retrieve any forwards.');
          allForwards.loading(false);
        }
      });
    }
  });

  /**
   * Leaderboard screen. Shows users, ranked by number of forwards.
   */
  var leaderboard = $('#leaderboard');
  leaderboard.on('pageshow', function() {
    // Flood protection.
    if(leaderboard.loading()) {
      return;
    }
    leaderboard.loading(true);

    // Display leaderboard.
    App.ForwardCollection.leaderboard({
      success: function(data) {
        // Display list.
        if(0 !== data.length) {
          leaderboard.find('[data-role="content"]')
                     .html(template('#tpl-leaderboard', { list: data }));
        }

        // Re-enable event.
        leaderboard.loading(false);
      },
      error: function() {
        // Re-enable event.
        error('Failed to retrieve the leaderboard.');
        leaderboard.loading(false);
      }
    });
  });

  /**
   * Settings screen. Just contains information about this app.
   */
//  var settings = $('#settings');

}(window, document, Kinvey, jQuery, Handlebars));