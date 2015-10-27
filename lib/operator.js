'use strict';

var sprintf = require('sprintf').sprintf;


module.exports = function() {};

var _ = module.exports.prototype;

module.exports.eq = function(target) {
	return new eq(target);
};

module.exports.ne = function(target) {
	return new ne(target);
};

module.exports.gt = function(target) {
	return new gt(target);
};

module.exports.gte = function(target) {
	return new gte(target);
};

module.exports.lt = function(target) {
	return new lt(target);
};

module.exports.lte = function(target) {
	return new lte(target);
};

module.exports.btn = function(from, to) {
	return new btn(from, to);
};

module.exports.nbtn = function(from, to) {
	return new nbtn(from, to);
};

module.exports.isNull = function() {
	return new isNull();
};

module.exports.notNull = function() {
	return new notNull();
};



var convert = function(target) {
	if(typeof target === 'number') {
		return target;
	} else if(typeof target === 'string') {
		return sprintf('\'%s\'', target);
	} else if(typeof target === 'object') {
		if(target instanceof Date) {
			return sprintf('\'%s\'', target.toUTCFormat('YYYY-MM-DD HH24:MI:SS'));
		} else {
			return sprintf('\'%s\'', JSON.stringify(target));
		}
	}
};



var eq = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = eq.prototype;

_.toQuery = function() {
	return '= ' + this.target;
};

_.isTrue = function(data) {
	return (JSON.stringify(data) === JSON.stringify(this.target));
};



var ne = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = ne.prototype;

_.toQuery = function() {
	return '!= ' + this.target;
};

_.isTrue = function(data) {
	return (JSON.stringify(data) !== JSON.stringify(this.target));
};



var gt = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = gt.prototype;

_.toQuery = function() {
	return '> ' + this.target;
};

_.isTrue = function(data) {
	return (data > this.target);
};



var gte = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = gte.prototype;

_.toQuery = function() {
	return '>= ' + this.target;
};

_.isTrue = function(data) {
	return (data >= this.target);
};



var lt = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = lt.prototype;

_.toQuery = function() {
	return '< ' + this.target;
};

_.isTrue = function(data) {
	return (data < this.target);
};



var lte = function(target) {
	this.type = 'operator';
	this.target = convert(target);
};

_ = lte.prototype;

_.toQuery = function() {
	return '<= ' + this.target;
};

_.isTrue = function(data) {
	return (data <= this.target);
};



var btn = function(from, to) {
	this.type = 'operator';
	this.fn = 'btn';
	this.from = convert(from);
	this.to = convert(to);
};

_ = btn.prototype;

_.toQuery = function() {
	return [
		sprintf('> %s', this.from),
		sprintf('< %s', this.to)
	];
};

_.isTrue = function(data) {
	return (data > this.from) && (data < this.to);
};



var nbtn = function(from, to) {
	this.type = 'operator';
	this.fn = 'nbtn';
	this.from = convert(from);
	this.to = convert(to);
};

_ = nbtn.prototype;

_.toQuery = function() {
	return [
		sprintf('<= %s', this.from),
		sprintf('>= %s', this.to)
	];
};

_.isTrue = function(data) {
	return !((data > this.from) && (data < this.to));
};



var isNull = function() {
	this.type = 'operator';
};

_ = isNull.prototype;

_.toQuery = function() {
	return 'IS NULL';
};

_.isTrue = function(data) {
	return (data === null);
};



var notNull = function() {
	this.type = 'operator';
};

_ = notNull.prototype;

_.toQuery = function() {
	return 'IS NOT NULL';
};

_.isTrue = function(data) {
	return (data !== null);
};
