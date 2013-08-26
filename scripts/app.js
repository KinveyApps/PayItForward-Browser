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
 /* global $: true, Kinvey: true */
(function() {
  'use strict';

  // Setup.
  // ------

  // Initialize Kinvey.
  var promise = Kinvey.init({
    appKey    : 'App Key',
    appSecret : 'App Secret',
    sync      : {
      enable : true,
      online : navigator.onLine
    }
  });
  promise.then(function() {
    // Preload templates.
    $.when([
      $.Mustache.load('templates/forward.html'),
      $.Mustache.load('templates/leaderboard.html'),
      $.Mustache.load('templates/request.html')
    ]).then(function() {
      $.mobile.initializePage();// Render page.
    });
  });

  // On/offline hooks.
  $(window).on({
    offline : Kinvey.Sync.offline,
    online  : function() {
      // Some browsers fire the online event before the connection is available
      // again, so set a timeout here.
      setTimeout(function() {
        Kinvey.Sync.online();
      }, 10000);
    }
  });

  // Globals.
  var doc = $(document);
  doc.on('click', '.logout', function() {
    if(null !== Kinvey.getActiveUser()) {
      var button = $(this).addClass('ui-disabled');

      // Logout the active user.
      Kinvey.User.logout().then(function() {
        $.mobile.changePage(splash);// Redirect.
      }, function(error) {
        doc.trigger('error', error);
      }).then(function() {// Restore UI.
        button.removeClass('ui-disabled');
      });
    }
  });
  doc.on({
    /**
     * Before show hook.
     */
    pagebeforeshow: function() {
      // If the user is not logged in, show the splash screen.
      if(null === Kinvey.getActiveUser()) {
        $.mobile.changePage(splash);
      }
    },

    /**
     * Error hook.
     */
    error: function(e, data) {
      // Show popup on errors.
      $.mobile.loading('show', {
        text        : 'Failure: ' + data.name,
        textonly    : true,
        textVisible : true,
        theme       : 'e'
      });
      setTimeout(function() {
        $.mobile.loading('hide');
      }, 5000);
    }
  });

  // Default mustache data filters.
  var mustacheData = {
    self: function() {
      return this.author._id === Kinvey.getActiveUser()._id ||
       (null != this.recipient && this.recipient._id === Kinvey.getActiveUser()._id);
    },
    name: function() {
      if(null != this.author._socialIdentity.facebook) {
        return this.author._socialIdentity.facebook.name;
      }
      return 'Anonymous';
    },
    toName: function() {
      if(null != this.recipient._socialIdentity.facebook) {
        return this.recipient._socialIdentity.facebook.name;
      }
      return 'Anonymous';
    },
    image: function() {
      if(null != this.author._socialIdentity.facebook) {
        return [
          'https://graph.facebook.com/',
          this.author._socialIdentity.facebook.id,
          '/picture?width=80&height=80'
        ].join('');
      }
      return 'images/picture.png';
    },
    toImage: function() {
      if(null != this.recipient._socialIdentity.facebook) {
        return [
          'https://graph.facebook.com/',
          this.recipient._socialIdentity.facebook.id,
          '/picture?width=80&height=80'
        ].join('');
      }
      return 'images/picture.png';
    },
    date: function() {
      return new Date(this._kmd.lmt).toUTCString();
    }
  };

  // Splash.
  // -------
  var splash = $('#splash');
  splash.on('pageinit', function() {
    // If the user is already logged in, skip the splash screen.
    if(null !== Kinvey.getActiveUser()) {
      $.mobile.changePage(home);
    }

    // Signup.
    splash.on('click', '.signup', function() {
      var button = $(this).addClass('ui-disabled');

      // Signup using Facebook.
      Kinvey.Social.connect(null, 'facebook').then(function() {
        $.mobile.changePage(home);// Redirect.
      }, function(error) {
        doc.trigger('error', error);
      }).then(function() {// Restore UI.
        button.removeClass('ui-disabled');
      });
    });
  });

  // Home.
  // -----
  var home = $('#home');
  home.on({
    /**
     * Init hook.
     */
    pageinit: function() {
      // More.
      home.on('click', '.more', function() {
        var button = $(this).addClass('ui-disabled');

        // Build the query.
        var query = new Kinvey.Query();
        query.lessThan('_kmd.lmt', home.jqmData('min') || '')
             .limit(10)
             .descending('_kmd.lmt');

        // Find older requests.
        Kinvey.DataStore.find('requests', query, {
          relations: { author: 'user' }
        }).then(function(requests) {
          // Update state.
          if(0 !== requests.length) {
            home.jqmData('min', requests[requests.length - 1]._kmd.lmt);
          }
          else {
            button.addClass('hidden');
          }

          // Display.
          home.find('.data').mustache('request', $.extend({ requests: requests }, mustacheData), {
            method: 'append'
          }).listview('refresh');
        }, function(error) {
          doc.trigger('error', error);
        }).then(function() {
          button.removeClass('ui-disabled');// Restore UI.
        });
      });
    },

    /**
     * Before show hook.
     */
    pagebeforeshow: function() {
      // Build the query.
      var query = new Kinvey.Query();
      query.greaterThan('_kmd.lmt', home.jqmData('max') || '')
           .limit(10)
           .descending('_kmd.lmt');

      // Find all new requests.
      Kinvey.DataStore.find('requests', query, {
        relations: { author: 'user' }
      }).then(function(requests) {
        // Update state.
        if(0 !== requests.length) {
          home.jqmData('max', requests[0]._kmd.lmt);
          home.jqmData('min', requests[requests.length - 1]._kmd.lmt);
        }

        // Display.
        home.find('.data').mustache('request', $.extend({ requests: requests }, mustacheData), {
          method: 'prepend'
        }).listview('refresh');
      }, function(error) {
        doc.trigger('error', error);
      });
    }
  });

  // Forward.
  // --------
  var forward   = $('#forward');
  var reference = null;
  home.on('click', '[data-id]', function() {
    // Update.
    reference = {
      id     : $(this).jqmData('id'),
      author : $(this).jqmData('author')
    };
  });
  forward.on('submit', function(e) {
    e.preventDefault();// Stop submit.

    // Validate form.
    var message = forward.find('#message');
    if('' === message.val().replace(/\s*/g, '')) {
      doc.trigger('error', { name: 'Message field cannot be empty.' });
      return;
    }
    var button = forward.find('button').attr('disabled', 'disabled');

    // Save new forward.
    Kinvey.DataStore.save('forwards', {
      author    : { _type: 'KinveyRef', _collection: 'user', _id: Kinvey.getActiveUser()._id },
      message   : message.val(),
      request   : { _type: 'KinveyRef', _collection: 'requests', _id : reference.id },
      recipient : { _type: 'KinveyRef', _collection: 'user', _id: reference.author }
    }).then(function() {
      forward.popup('close');// Close popup.
    }, function(error) {
      doc.trigger('error', error);
    }).then(function() {
      message.val('');// Empty form.
      button.removeAttr('disabled');// Restore UI.
    });
  });

  // New.
  // ----
  var newRequest = $('#new');
  newRequest.on('pageinit', function() {
    // New.
    newRequest.on('submit', 'form', function(e) {
      e.preventDefault();// Stop submit.

      // Validate form.
      var form    = $(this);
      var message = form.find('#message');
      if('' === message.val().replace(/\s*/g, '')) {
        doc.trigger('error', { name: 'Message field cannot be empty.' });
        return;
      }
      var button  = form.find('button').attr('disabled', 'disabled');

      // Save new request.
      Kinvey.DataStore.save('requests', {
        author  : { _type: 'KinveyRef', _collection : 'user', _id: Kinvey.getActiveUser()._id },
        message : message.val()
      }).then(function() {
        $.mobile.changePage(home);// Redirect.
      }, function(error) {
        doc.trigger('error', error);
      }).then(function() {
        message.val('');// Empty form.
        button.removeAttr('disabled');// Restore UI.
      });
    });
  });

  // Forwards.
  // ---------
  var forwards = $('#forwards');
  forwards.on({
    /**
     * Init hook.
     */
    pageinit: function() {
      // More.
      forwards.on('click', '.more', function() {
        var button = $(this).addClass('ui-disabled');

        // Build the query.
        var query = new Kinvey.Query();
        query.lessThan('_kmd.lmt', forwards.jqmData('min') || '')
             .and(
                 new Kinvey.Query()
                 .equalTo('author._id', Kinvey.getActiveUser()._id)
                 .or().equalTo('recipient._id', Kinvey.getActiveUser()._id)
             ).limit(10)
             .descending('_kmd.lmt');

        // Find older requests.
        Kinvey.DataStore.find('forwards', query, {
          relations: { author: 'user', request: 'requests', recipient: 'user' }
        }).then(function(requests) {
          // Update state.
          if(0 !== requests.length) {
            forwards.jqmData('min', requests[requests.length - 1]._kmd.lmt);
          }
          else {
            button.addClass('hidden');
          }

          // Display.
          forwards.find('.data').mustache('forward', $.extend({
            requests: requests
          }, mustacheData), { method: 'append' }).listview('refresh');
        }, function(error) {
          doc.trigger('error', error);
        }).then(function() {
          button.removeClass('ui-disabled');// Restore UI.
        });
      });
    },

    /**
     * Before show hook.
     */
    pagebeforeshow: function() {
      // Build the query.
      var query = new Kinvey.Query();
      query.greaterThan('_kmd.lmt', forwards.jqmData('max') || '')
           .and(
             new Kinvey.Query()
               .equalTo('author._id', Kinvey.getActiveUser()._id)
               .or().equalTo('recipient._id', Kinvey.getActiveUser()._id)
           ).limit(10)
           .descending('_kmd.lmt');

      // Find all new requests.
      Kinvey.DataStore.find('forwards', query, {
        relations: { author: 'user', request: 'requests', recipient: 'user' }
      }).then(function(requests) {
        // Update state.
        if(0 !== requests.length) {
          forwards.jqmData('max', requests[0]._kmd.lmt);
          forwards.jqmData('min', requests[requests.length - 1]._kmd.lmt);
        }

        // Display.
        forwards.find('.data').mustache('forward', $.extend({
          requests: requests
        }, mustacheData), { method: 'prepend' }).listview('refresh');
      }, function(error) {
        doc.trigger('error', error);
      });
    }
  });

  // All Forwards.
  // ---------
  var allForwards = $('#allForwards');
  allForwards.on({
    /**
     * Init hook.
     */
    pageinit: function() {
      // More.
      allForwards.on('click', '.more', function() {
        var button = $(this).addClass('ui-disabled');

        // Build the query.
        var query = new Kinvey.Query();
        query.lessThan('_kmd.lmt', allForwards.jqmData('min') || '')
             .limit(10)
             .descending('_kmd.lmt');

        // Find older requests.
        Kinvey.DataStore.find('forwards', query, {
          relations: { author: 'user', request: 'requests', recipient: 'user' }
        }).then(function(requests) {
          // Update state.
          if(0 !== requests.length) {
            allForwards.jqmData('min', requests[requests.length - 1]._kmd.lmt);
          }
          else {
            button.addClass('hidden');
          }

          // Display.
          allForwards.find('.data').mustache('forward', $.extend({
            requests: requests
          }, mustacheData), { method: 'append' }).listview('refresh');
        }, function(error) {
          doc.trigger('error', error);
        }).then(function() {
          button.removeClass('ui-disabled');// Restore UI.
        });
      });
    },

    /**
     * Before show hook.
     */
    pagebeforeshow: function() {
      // Build the query.
      var query = new Kinvey.Query();
      query.greaterThan('_kmd.lmt', allForwards.jqmData('max') || '')
           .limit(10)
           .descending('_kmd.lmt');

      // Find all new requests.
      Kinvey.DataStore.find('forwards', query, {
        relations: { author: 'user', request: 'requests', recipient: 'user' }
      }).then(function(requests) {
        // Update state.
        if(0 !== requests.length) {
          allForwards.jqmData('max', requests[0]._kmd.lmt);
          allForwards.jqmData('min', requests[requests.length - 1]._kmd.lmt);
        }

        // Display.
        allForwards.find('.data').mustache('forward', $.extend({
          requests: requests
        }, mustacheData), { method: 'prepend' }).listview('refresh');
      }, function(error) {
        doc.trigger('error', error);
      });
    }
  });

  // Leaderboard.
  // ------------
  var leaderboard = $('#leaderboard');
  leaderboard.on('pagebeforeshow', function() {
    // Build the query.
    var group = Kinvey.Group.count('author');
    group.query(new Kinvey.Query().limit(10).descending('total'));

    // Retrieve the leaderboard.
    Kinvey.DataStore.group('forwards', group).then(function(response) {
      // Lookup users.
      var query = new Kinvey.Query().contains('_id', response.map(function(item) {
        return item.author._id;
      }));
      Kinvey.User.find(query).then(function(users) {
        // Format response.
        response = response.map(function(item) {
          var userId = item.author._id;
          users.forEach(function(user) {
            if(user._id === userId) {
              item.author = user;
            }
          });
          return item;
        });

        // Display.
        leaderboard.find('[data-role="content"]').mustache('leaderboard', $.extend({
          leaderboard    : response,
          hasLeaderboard : 0 !== response.length
        }, mustacheData), { method: 'html' }).trigger('create');
      });
    }, function(error) {
      doc.trigger('error', error);
    });
  });

}.call(this));