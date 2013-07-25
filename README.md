# PayItForward-HTML5

The Pay It Forward sample application is a simplified version of the [#RubyRiot app](http://www.kinvey.com/blog/70/observing-rubyriot-mobile-app-usage-was-fascinating) built by Kinvey in January 2012. The app makes it easy for conference attendees make introductions on behalf of others. This application shows you how to login via Facebook, store data, and implement offline saving for your app.

## Run It
After downloading or cloning the repository:

* Replace `<your-app-key>` and `<your-app-secret>` (lines 11–12 in `scripts/app.js`) with your application credentials.
* Replace `<your-facebook-app-id>` (line 293 in `index.html`) with your Facebook App ID/API Key.
* Start your web server.
* Point your browser to `http://localhost:80/index.html`. Adjust the hostname and port number if necessary.

## Functionality
This application demonstrates:

* Data Storage
* Login with Facebook
* Caching
* Offline Saving

## Architecture
The Pay It Forward app is a single-page application. All HTML code is contained in `index.html`.

jQuery and jQuery Mobile are used for handling the routes and displaying the appropriate pages. Also, a few other third party libraries are used to enhance the app. These resources are all contained in the `vendor` directory.

The `scripts` directory contains application-specific files. These are:

* `init.js` configures jQuery and jQuery Mobile.
* `app.js` initializes Kinvey’s JavaScript library for use in your app. In addition, the application domain is specified.
* `ui.js` connects the application domain with the user interface. Most of this file consists of event handlers which are executed when a page is requested.

## License

    Copyright 2013 Kinvey, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.