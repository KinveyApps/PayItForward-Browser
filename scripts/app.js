(function(window, Kinvey) {
  //Export, so declarations can be accessed outside this files’ scope.
  var App = window.PayItForward = {};

  // Configure conflict policy prior to init, since that will trigger
  // synchronization. Prioritize client over server.
  Kinvey.Sync.configure({ conflict: Kinvey.Sync.clientAlwaysWins });

  // Configure.
  Kinvey.init({
    appKey: '<127311370776830>',
    appSecret: '<41c8b21d83677f7a1dc43aa90d2dc25b>',
    sync: true// Enable offline saving.
  });

  /**
   * Define application-domain entities and collections.
   */
  // Define the base entity. Not accessible from outside current scope.
  var Entity = Kinvey.Entity.extend({
    // Override constructor to use the OfflineStore.
    constructor: function(attr, collection) {
      Kinvey.Entity.prototype.constructor.call(this, attr, collection, {
        store: Kinvey.Store.OFFLINE// Enable offline saving.
      });
    },

    // Convenience shortcut for returning the last modified date.
    added: function() {
      return this.getMetadata().lastModified();
    }
  });

  // Define the Request entity.
  App.Request = Entity.extend({
    // Preset collection.
    constructor: function(attr) {
      Entity.prototype.constructor.call(this, attr, 'requests');
    }
  });

  // Define the Forward entity.
  App.Forward = Entity.extend({
    // Preset collection.
    constructor: function(attr) {
      Entity.prototype.constructor.call(this, attr, 'forwards');
    }
  });

  // Define the base collection. Not accessible from outside current scope.
  var Collection = Kinvey.Collection.extend({
    // Override constructor to use the OfflineStore.
    constructor: function(collection, options) {
      options || (options = {});
      options.store = Kinvey.Store.OFFLINE;// Enable offline saving.
      Kinvey.Collection.prototype.constructor.call(this, collection, options);
    },

    // Upper and lower range of entities retrieved.
    oldest: null,
    newest: null,

    // Fetches entities older than the ones fetched in the previous call.
    history: function(options) {
      // To capture all request and forwards use cases, options can contain an
      // additional filter criteria. This filter is an ID, used in the "My
      // Forwards" screen.
      var query = new Kinvey.Query();
      if(options.id) {
        query.on('to.id').equal(options.id)
             .or(new Kinvey.Query().on('author.id').equal(options.id));
      }

      this.oldest && query.on('_kmd.lmt').lessThan(this.oldest);
      query.on('_kmd.lmt').sort(Kinvey.Query.DESC).setLimit(25);
      this.setQuery(query);

      // Override success handler to update the range.
      var fnSuccess = options.success;
      var self = this;
      options.success = function(list) {
        var total = list.length;
        if(0 !== total) {
          !self.latest && (self.latest = list[0].added());
          self.oldest = list[total - 1].added();
        }
        fnSuccess && fnSuccess(list);
      };

      this.fetch(options);
    },

    // Fetches all entities newer than the ones fetched in the previous call.
    updates: function(options) {
      // To capture all request and forwards use cases, options can contain an
      // additional filter criteria. This filter is an ID, used in the "My
      // Forwards" screen.
      var query = new Kinvey.Query();
      if(options.id) {
        query.on('to.id').equal(options.id)
             .or(new Kinvey.Query().on('author.id').equal(options.id));
      }

      this.latest && query.on('_kmd.lmt').greaterThan(this.latest);
      query.on('_kmd.lmt').sort(Kinvey.Query.DESC);
      this.setQuery(query);

      // Override success handler to update the range.
      var fnSuccess = options.success;
      var self = this;
      options.success = function(list) {
        var total = list.length;
        if(0 !== total) {
          self.latest = list[0].added();
          !self.oldest && (self.oldest = list[total - 1].added());
        }
        fnSuccess && fnSuccess(list);
      };

      this.fetch(options);
    }
  });

  // Define the Request collection.
  var RequestCollection = Collection.extend({
    // Override parent settings.
    entity: App.Request,
    constructor: function(query) {
      Collection.prototype.constructor.call(this, 'requests', { query: query });
    }
  });
  App.RequestCollection = new RequestCollection();// Application instance.

  // Define the Forward collection.
  var ForwardCollection = Collection.extend({
    entity: App.Forward,
    constructor: function(query) {
      Collection.prototype.constructor.call(this, 'forwards', { query: query });
    },

    // Retrieves leaderboard of users who forwarded the most requests.
    leaderboard: function(options) {
      var aggregation = new Kinvey.Aggregation();
      aggregation.on('author');// Equivalent to SQLs GROUP BY.
      aggregation.setReduce(function(a, b) {
        b.count++;
      });
      this.setQuery(null);// Reset query, possibly set by history() or updates().

      // Overwrite success handler to add sorting and limiting.
      var fnSuccess = options.success;// Reference to original handler.
      options.success = function(response) {
        response.sort(function(a, b) {
          return b.count - a.count;
        });
        response = response.slice(0, 10);// Pick top 10.
        fnSuccess && fnSuccess(response);
      };
      return this.aggregate(aggregation, options);
    }
  });

  // Export collection instances.
  App.ForwardCollection = new ForwardCollection();
  App.AllForwardCollection = new ForwardCollection();
}(window, Kinvey));
