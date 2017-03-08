'use strict';

var sprintf = require('sprintf').sprintf,
	engines = require('./engines');

module.exports = function(manager, defs, _schema) {
	return new Structure(manager, defs, _schema);
};

var Structure = function(manager, defs, _schema) {
	this.manager = manager;
	this.name = defs.name;
	this.defs = defs;
	this.engine = engines[defs.engine](defs, _schema);
	this._schema = _schema;
};

var _ = Structure.prototype;

_.getSchema = function(cb) {
	var that = this;

	this.engine.getSchema(function(err, schema) {

		schema.forEach(function(s, idx, schema) {
			that._schema.forEach(function(es) {
				if (es.field === s.field) {
					schema[idx] = es;
				}
			});
		}); // Override fields on table

		var fieldNames = schema.map(function(s) {
			return s.field;
		});

		that._schema.forEach(function(es) {
			if (fieldNames.indexOf(es.field) !== -1) return;
			schema.push(es);
		});

		that.schema = schema;

		cb(err);
	});
};

_.fetch = function(cond, option, cb, conn) {
	this.engine.fetch(this, cond, option, cb, conn);
};

_.save = function(data, cb, conn) {
	this.engine.save(this, data, cb, conn);
};

_.remove = function(data, cb, conn) {
	this.engine.remove(this, data, cb, conn);
};

_.query = function(query, cb, conn) {
	this.engine.query(query, cb, conn);
};

_.getDBFields = function() {
	return this.schema.filter(function(s) {
		return !(/^Rel/.test(s.type));
	}).map(function(s) {
		return s.field;
	});
};

_.getJoinQuery = function(tables) {
	var that = this;

	return this.schema.filter(function(s) {
		switch (s.type) {
			case 'Rel1:N':
				return (tables.indexOf(s.joinTable) !== -1);
			case 'RelN:M':
				return (tables.indexOf(s.joinTable) !== -1);
			default:
				return false;
		}
	}).map(function(s) {
		return sprintf('`%s`.`id` = `%s`.`%s`', that.defs.table, s.joinTable, s.myKey);
	});
};

_.fetchPromise = function (cond, option, cb, conn) {
	var that = this;
	return new Promise((res,rej)=>{
		that.fetch(cond, option, (err,results)=>{
			if (err) return rej(err);
			res(results);
		}, conn);
	});
};

_.savePromise = function (data, cb, conn) {
	var that = this;
	return new Promise((res,rej)=>{
		that.save(data, (err,results)=>{
			if (err) return rej(err);
			res(results);
		}, conn);
	});
};

_.removePromise = function (data, cb, conn) {
	var that = this;
	return new Promise((res,rej)=>{
		that.remove(data, (err,results)=>{
			if (err) return rej(err);
			res(results);
		}, conn);
	});
};

_.queryPromise = function (query, cb, conn) {
	var that = this;
	return new Promise((res,rej)=>{
		that.query(query, (err,results)=>{
			if (err) return rej(err);
			res(results);
		}, conn);
	});
};