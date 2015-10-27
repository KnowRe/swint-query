'use strict';

var swintHelper = require('swint-helper'),
	defaultize = swintHelper.defaultize,
	walk = swintHelper.walk,
	mysql = require('mysql'),
	async = require('async'),
	path = require('path'),
	transactionFactory = require('./transactionFactory');

/***
	The manager for ORM

	options = {
		dir: String,				// default: path.join(path.dirname(require.main.filename), 'orm')
		mysql: {
			host: String,			// default: 'localhost'
			database: String,		// default: 'database'
			user: String,			// default: 'root'
			password: String,		// default: 'foo'
			timezone: String		// default: '+0000'
		}
	}
***/

module.exports = function(options, callback) {
	return new Manager(options, callback);
};

var Manager = function(options, callback) {
	defaultize({
		dir: path.join(path.dirname(require.main.filename), 'orm'),
		mysql: {
			host: 'localhost',
			database: 'test',
			user: 'root',
			password: 'foo',
			timezone: '+0000'
		}
	}, options);

	this.options = options;
	this.initCallback = callback;
	this.factory = transactionFactory(this);

	this._initialize();
};

var _ = Manager.prototype;

_._initialize = function() {
	var that = this;

	async.series(
		[
			that._makeConnection(),
			that._loadModels()
		],
		function(err) {
			that.initCallback(err);
		}
	);
};

_._makeConnection = function() {
	var that = this;

	return function(cb) {
		that.mySqlConn = mysql.createPool(that.options.mysql);
		setTimeout(function() {
			cb(null);
		}, 1);
	};
};

_._loadModels = function() {
	var that = this;

	return function(cb) {
		var modelProtos = walk({
			dir: that.options.dir
		});

		that.models = {};

		async.series(
			modelProtos.map(function(m) {
				return function(cb) {
					var modelProto = new (require(m))(that);
					modelProto.getSchema(cb);
					that.models[modelProto.name] = modelProto;
				};
			}),
			function(err) {
				cb(err);
			}
		);
	};
};

_.createTransaction = function() {
	return this.factory.createInstance();
};
