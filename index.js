var _ = require('lodash');
var path = require('path');
var async = require('async');
var Promise = require('promise');
var gui = global.window.nwDispatcher.requireNwGui();

// One animation at a time
var AnimationQueue = function(options) {
	this.options = options;
	this.queue = [];
	this.running = false;
};

AnimationQueue.prototype.push = function(object) {
	if(this.running) {
		this.queue.push(object)
	} else {
		this.running = true;
		this.animate(object);
	}
}

AnimationQueue.prototype.animate = function(object) {
	var self = this;
	object.func.apply(null, object.args)
	.then(function() {
		if(self.queue.length > 0) {
			// Run next animation
			self.animate.call(self, self.queue.shift());
		} else {
			self.running = false;
		}
	});
}

var config = {
	width: 300,
	height: 65,
	padding: 10,
	borderRadius: 5,
	displayTime: 5000,
	animationSteps: 5,
	animationStepMs: 5,
	animateInParallel: false,
	appIcon: null,
	pathToModule: '',
	defaultStyleContainer: {
		backgroundColor: '#f0f0f0',
		overflow: 'hidden',
		padding: 8,
		border: '1px solid #CCC',
		fontFamily: 'Arial',
		fontSize: 12,
		position: 'relative',
		lineHeight: '15px'
	},
	defaultStyleAppIcon: {
		overflow: 'hidden',
		float: 'left',
		height: 40,
		width: 40,
		marginRight: 10,
		// marginTop: -2
	},
	defaultStyleImage: {
		overflow: 'hidden',
		float: 'right',
		height: 40,
		width: 40,
		marginLeft: 10,
		// marginTop: -2
	},
	defaultStyleClose: {
		position: 'absolute',
		top: 1,
		right: 3,
		fontSize: 11,
		color: '#CCC'
	},
	defaultStyleText: {
		margin: 0,
		overflow: 'hidden',
		cursor: 'default'
	}
};

function setConfig(customConfig) {
	config = _.defaults(customConfig, config);
}

// Little helper functions
function updateAppPath() {
	// Get path to node_modules
	var pathToAppIndex = window.location.href;
	var pathSegemnts = pathToAppIndex.split('/');
	// Remove last part (index.html of app)
	pathSegemnts.pop();
	config.appPath = pathSegemnts.join('/') + '/';
	return config.appPath;
}

function getAppPath() {
	if(config.appPath === undefined) {
		return updateAppPath();
	}
	return config.appPath;
}

function updateTemplatePath() {
	var appPath = getAppPath();
	config.templatePath = appPath + 'node_modules/nw-notify/notification.html';
	return config.templatePath;
}

function getTemplatePath() {
	if(config.templatePath === undefined) {
		return updateTemplatePath();
	}
	return config.templatePath;
}

function setTemplatePath(path) {
	config.templatePath = path;
}

// Calc totalHeight & totalWidth
config.totalHeight = config.height + config.padding;
config.totalWidth = config.width + config.padding;

// Init screen to gather some information
gui.Screen.Init();
var screens = gui.Screen.screens;

// Use first screen only
var cur_screen = screens[0];

// Display notifications starting from lower right corner
// Calc lower right corner
config.lowerRightCorner = {};
config.lowerRightCorner.x = cur_screen.bounds.x + cur_screen.work_area.x + cur_screen.work_area.width;
config.lowerRightCorner.y = cur_screen.bounds.y + cur_screen.work_area.y + cur_screen.work_area.height;

// Calc pos of first notification:
config.firstPos = {
	x: config.lowerRightCorner.x - config.totalWidth,
	y: config.lowerRightCorner.y - config.totalHeight
}

// Set nextInsertPos
var nextInsertPos = {
	x: config.firstPos.x,
	y: config.firstPos.y
}

// Maximum amount of Notifications we can show:
config.maxVisibleNotifications = Math.floor(cur_screen.work_area.height / (config.totalHeight));
config.maxVisibleNotifications = (config.maxVisibleNotifications > 7) ? 7 : config.maxVisibleNotifications;

// Array of windows with currently showing notifications
var activeNotifications = [];

// Recycle windows
var inactiveWindows = [];

// If we cannot show all notifications, queue them
var notificationQueue = [];

// To prevent executing mutliple animations at once
var animationQueue = new AnimationQueue();


function notify(title, text, url, iconPath, onClickFunc) {
	animationQueue.push({
		func: showNotification,
		args: [ {
			title: title,
			text: text,
			url: url,
			iconPath: iconPath,
			onClickFunc: onClickFunc
		} ]
	});
}

function showNotification(notificationObj) {
	return new Promise(function(resolve, reject) {
		// Can we show it?
		console.log((activeNotifications.length < config.maxVisibleNotifications), activeNotifications.length, config.maxVisibleNotifications);
		if(activeNotifications.length < config.maxVisibleNotifications) {
			// Get inactiveWindow or create new:
			getWindow().then(function(notificationWindow) {
				// Move window to position
				calcInsertPos()
				notificationWindow.moveTo(nextInsertPos.x, nextInsertPos.y);

				// Add to activeNotifications
				activeNotifications.push(notificationWindow);

				// Close notification function
				var closeNotification = function() {
					// Remove event listener
					var newContainer = container.cloneNode(true);
					container.parentNode.replaceChild(newContainer, container);
					clearTimeout(closeTimeout);
					// Remove URL clickHandler
					if(notificationObj.url) {
						var newCloseButton = closeButton.cloneNode(true);
					closeButton.parentNode.replaceChild(newCloseButton, closeButton);
					}
					// Recycle window
					var pos = activeNotifications.indexOf(notificationWindow);
					activeNotifications.splice(pos, 1);
					inactiveWindows.push(notificationWindow);
					// Hide notification
					notificationWindow.hide();

					checkForQueuedNotifications();

					// Move notifications down
					return moveOneDown(pos);
				}
				// Set timeout to hide notification
				var closeTimeout = setTimeout(function() {
					animationQueue.push({
						'func': closeNotification
					});
				}, config.displayTime);

				// Close button
				var notiDoc = notificationWindow.window.document;
				var closeButton = notiDoc.getElementById('close');
				closeButton.addEventListener('click', function(event) {
					event.stopPropagation();
					animationQueue.push({
						'func': closeNotification
					});
				});

				// URL
				var container = notiDoc.getElementById('container');
				if(notificationObj.url) {
					container.addEventListener('click', function() {
						gui.Shell.openExternal(notificationObj.url);
					});
				}

				// Set contents, ...
				setNotficationContents(notiDoc, notificationObj);

				// Show window
				notificationWindow.show();
				resolve(notificationWindow);
			});
		}
		// Add to notificationQueue
		else {
			notificationQueue.push(notificationObj);
			resolve();
		}
	});
}

function setNotficationContents(notiDoc, notificationObj) {
	// Title
	var titleDoc = notiDoc.getElementById('title');
	titleDoc.innerHTML = notificationObj.title;
	// message
	var titleDoc = notiDoc.getElementById('message');
	titleDoc.innerHTML = notificationObj.text;
	// Image
	var imageDoc = notiDoc.getElementById('image');
	if(notificationObj.iconPath !== undefined) {
		imageDoc.src = notificationObj.iconPath;
	} else {
		setStyleOnDomElement({ display: 'none'}, imageDoc);
	}

}

/**
 * Checks for queued notifications and add them
 * to AnimationQueue if possible
 */
function checkForQueuedNotifications() {
	if(notificationQueue.length > 0 &&
		(activeNotifications.length < config.maxVisibleNotifications)) {
		// Add new notification to animationQueue
		animationQueue.push({
			func: showNotification,
			args: [ notificationQueue.shift() ]
		})
	}
}

/**
 * Moves the notifications one position down,
 * starting with notification at startPos
 *
 * @param  {int} startPos
 */
function moveOneDown(startPos) {
	return new Promise(function(resolve, reject) {
		if(startPos >= activeNotifications || startPos === -1) {
			resolve();
			return;
		}
		// Build array with index of affected notifications
		var notificationPosArray = [];
		for(i = startPos; i < activeNotifications.length; i++) {
			notificationPosArray.push(i);
		}
		// Start to animate all notifications at once or in parallel
		var asyncFunc = async.map;
		if(config.animateInParallel === false) {
			asyncFunc = async.mapSeries;
		}
		asyncFunc(notificationPosArray, moveNotificationAnimation, function() {
			resolve();
		});
	});
}

function moveNotificationAnimation(i, done) {
	// Get notification to move
	var notification = activeNotifications[i];
	// Calc new y position
	var newY = config.lowerRightCorner.y - config.totalHeight * (i + 1);
	// Get startPos, calc step size and start animationInterval
	var startY = notification.y;
	var step = (newY-startY)/config.animationSteps;
	var curStep = 1;
	var animationInterval = setInterval(function() {
		// Abort condition
		if(curStep === config.animationSteps) {
			notification.moveTo(config.firstPos.x, newY);
			clearInterval(animationInterval);
			return done(null, 'done');
		}
		// Move one step down
		notification.moveTo(config.firstPos.x, startY + curStep * step);
		curStep++;
	}, config.animationStepMs)
}

/**
 * Find next possible insert position (on top)
 */
function calcInsertPos() {
	if(activeNotifications.length < config.maxVisibleNotifications) {
		nextInsertPos.y = config.lowerRightCorner.y - config.totalHeight * (activeNotifications.length + 1);
	}
}

/**
 * Get a window to display a notification. Use inactiveWindows or
 * create a new window
 * @return {Window}
 */
function getWindow() {
	return new Promise(function(resolve, reject) {
		var notificationWindow;
		// Are there still inactiveWindows?
		if(inactiveWindows.length > 0) {
			notificationWindow = inactiveWindows.pop();
			resolve(notificationWindow);
		}
		// Or create a new window
		else {
			notificationWindow = gui.Window.open(getTemplatePath(), {
			  'always-on-top': true,
			  'visible-on-all-workspaces': true,
			  'show_in_taskbar': false,
			  show: false,
			  frame: false,
			  width: config.width,
			  height: config.height,
			  transparent: true,
			  toolbar: false
			});
		}
		// Return once DOM is loaded
		notificationWindow.on('loaded', function() {
			// Style it
			var notiDoc = notificationWindow.window.document;
			var container = notiDoc.getElementById('container');
			var appIcon = notiDoc.getElementById('appIcon');
			var image = notiDoc.getElementById('image');
			var close = notiDoc.getElementById('close');
			var message = notiDoc.getElementById('message');
			// Default style
			setStyleOnDomElement(config.defaultStyleContainer, container);
			// Size and radius
			var style = {
				height: config.height - 2*config.borderRadius - 2*config.defaultStyleContainer.padding,
				width: config.width - 2*config.borderRadius  - 2*config.defaultStyleContainer.padding,
				borderRadius: config.borderRadius
			};
			setStyleOnDomElement(style, container);
			// Style appIcon or hide
			if(config.appIcon) {
				setStyleOnDomElement(config.defaultStyleAppIcon, appIcon);
				appIcon.src = config.appIcon;

			} else {
				setStyleOnDomElement({
					display: 'none'
				}, appIcon);
			}
			// Style image
			setStyleOnDomElement(config.defaultStyleImage, image);
			// Style close button
			setStyleOnDomElement(config.defaultStyleClose, close);
			// Remove margin from text p
			setStyleOnDomElement(config.defaultStyleText, message);
			// Done
			resolve(notificationWindow);
		});
	});
}

function setStyleOnDomElement(styleObj, domElement){
    // var root = document.documentElement //reference root element of document
    for (var styleAttr in styleObj){ //loop through possible properties
        // if (styleAttr in root.style){ //if property exists on element (
        	domElement.style[styleAttr] = styleObj[styleAttr];
        // } else {
        // 	console.log(styleObj[i] + ' not supported');
        // }
    }
}

function closeAll() {
	// Clear out animation Queue and close windows
	animationQueue = [];
	_.forEach(activeNotifications, function(window) {
		window.close();
	});
	_.forEach(inactiveWindows, function(window) {
		window.close();
	});
}

module.exports.notify = notify;
module.exports.setConfig = setConfig;
module.exports.getAppPath = getAppPath;
module.exports.getTemplatePath = getTemplatePath;
module.exports.setTemplatePath = setTemplatePath;
module.exports.closeAll = closeAll;