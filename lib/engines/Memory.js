'use strict';

module.exports = function(defs, _schema) {
	return new Engine(defs, _schema);
};

var Engine = function(defs, _schema) {
	this.dataSet = defs.dataSet;
	this._schema = _schema;

	this._initialize();
};

var _ = Engine.prototype;

_._initialize = function() {
};

_.getSchema = function(cb) {
	cb(null, this._schema);
};

_.fetch = function(struct, cond, option, cb) {
	var data = this.dataSet.filter(function(data) {
		var flag = true;

		for(var key in cond) {
			var condVal = cond[key];

			if(condVal.type === 'operator') {
				if(!condVal.isTrue(data[key])) {
					flag = false;
				}
			} else if(Array.isArray(condVal)) {
				if(condVal.indexOf(data[key]) === -1) {
					flag = false;
				}
			} else {
				if(JSON.stringify(data[key]) !== JSON.stringify(condVal)) {
					flag = false;
				}
			}
		}

		return flag;
	});

	if(option.hasOwnProperty('target')) {
		var optTarget = option.target;

		data = data.map(function(datum) {
			var ret = {};

			optTarget.forEach(function(key) {
				ret[key] = datum[key];
			});

			return ret;
		});
	}

	if(option.hasOwnProperty('order')) {
		var optOrder = option.order,
			optOrderFlag = true;

		if(option.hasOwnProperty('orderFlag')) optOrderFlag = option.orderFlag;

		var orderConst = optOrderFlag ? 1 : -1;

		data.sort(function(a, b) {
			if(a[optOrder] > b[optOrder]) return -1 * orderConst;
			else if(a[optOrder] < b[optOrder]) return 1 * orderConst;
			else return 0;
		});
	}

	if(option.hasOwnProperty('limit')) {
		var optLimit = option.limit;

		data = data.splice(0, optLimit);
	}

	cb(null, data);
};

_.save = function(struct, data, cb) {
	data.id = -1;
	cb(null, data);
};

_.query = function(query, cb) {
	cb(null, []);
};
