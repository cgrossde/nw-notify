# nw-notify (WIP)
*Nice and simple notifications for node-webkit apps*

*nw-notify* displays notifications in the lower right corner. Notifications are stacked (most recent on the top) and slide down, once they expire. *nw-notify* is a child of [Pullover](https://github.com/cgrossde/Pullover), a destop client for the Pushover service. I was not satisfied with node-webkits native notifications on windows (just a bubble dialog) and other notification modules like [node-notifier](https://github.com/mikaelbr/node-notifier), [node-webkit-desktop-notifications](https://github.com/edjafarov/node-webkit-desktop-notification) or [nw-desktop-notifications](https://github.com/robrighter/nw-desktop-notifications) did not work with node-webkit (node-notifier), had nasty bugs or just didn't look very nice. I made some design choices for *nw-notify* to prevent bugs the other implementations ran into:

* No slide in of notifications from the right side (prevent bugs with multiple screens)
* Short animation with as few steps as possible to keep it running smoothly
* Multi-Screen: Notifications are only shown on the first screen (this may change if someone makes a good pull-request)


## Features

* Windows and Mac supported (Linux not tested, but should work)
* AppIcons (optional, left of notification text) and images (optional, right of notification text)
* Close button (top right corner)
* Open URLs (optional)

## Usage

```
var nwNotify = require('nw-notify');
// Change config options
nwNotify.setConfig({
    appIcon: nwNotify.getAppPath() + 'images/icon.png',
    displayTime: 6000
});

// Send notifications
notify('Some title', 'Some text');
// With URL, click notification to open
notify('Open URL', 'Click to goto Wikipedia', 'http://wikipedia.org');
// Or some images within your app
notify('Open URL', 'Click to goto Wikipedia', 'http://wikipedia.org', nwNotify.getAppPath() + 'pathTo/image/from/nwAppRoot/folder.png');
// Do something when user clicks on notification
notify('Custom func','Action on click', null, null, function() {
    // Your code here
});

// Change config options again
nwNotify.setConfig({
    appIcon: nwNotify.getAppPath() + 'images/otherIcon.png',
    defaultStyleText: {
        color: '#FF000',
        fontWeight: 'bold'
    }
});
// Send notification that uses the new options
notify('Notification', 'Using some other app icon');

// Before terminating you should close all windows openend by nw-notify
nwNotify.closeAll();
```

## Max notifications and queueing

On startup *nw-notify* will determine the maximum amount of notifications that fit on the screen. This value will be stored in `config.maxVisibleNotifications` but cannot be greater than 7. This is to ensure that all animations go smoothly and *nw-notify* does not freeze your computer. However you can overwrite this value with `setConfig()`. If you do that you should use `calcMaxVisibleNotification()` to check if that many notifications fit onto the users screen.
**Queueing:** Once the limit of `config.maxVisibleNotifications` is reached, *nw-notify* will queue all new notifications internally. The order of `notifiy()`-calls will be preserved and once old notifications fade out, the queued notifications are shown.

## Function reference

### notify(title, text, url, image, onClickFunction)
Display new notification

### setConfig(configObj)
Change some config options. Can be run multiple times, also between `notify()`-calls to chnage *nw-notify*s behaviour.

### getAppPath() : string
Returns path to root of your node webkit app. Use it to provide paths to app icon or image files that are shipped with your app.

### closeAll()
Clears the animation queue and closes all windows opened by *nw-notify*. Call this to clean up before quiting your app.

### setTemplatePath(path)
If you want to use your own `notification.html` you use this method. Use it like this: `nwNotify.setTemplatePath(nwNotify.getAppPath() + 'path/to/notification.html');`

### calcMaxVisibleNotification() : int
Returns the maximum amount of notifications that fit onto the users screen.



## License

    Pullover - The unofficial Pushover desktop client
    Copyright (C) 2014  Christoph Groß <gross@blubyte.de> (http://chris-labs.de/)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    
    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.