'use strict';

module.exports = function(manager) {
	return new TransactionFactory(manager);
};

var TransactionFactory = function(manager) {
	this.manager = manager;
	this.createInstance = function() {
		return new TransactionInstance(this.manager);
	};
};

var TransactionInstance = function(manager) {
	this.manager = manager;
	this.conn = null;
};

var _ = TransactionInstance.prototype;

_.beginTransaction = function(cb) {
	var that = this;

	this.manager.mySqlConn.getConnection(function(err, conn) {
		if(err) {
			throw err;
		}
		that.conn = conn;
		conn.beginTransaction(cb);
	});
};

_.commit = function(cb) {
	this.conn.commit(cb);
};

_.rollback = function(cb) {
	this.conn.rollback(cb);
};

_.release = function() {
	this.conn.release();
};

_.fetch = function(model, cond, option, cb) {
	model.fetch(cond, option, cb, this.conn);
};

_.save = function(model, data, cb) {
	model.save(data, cb, this.conn);
};

_.remove = function(model, data, cb) {
	model.remove(data, cb, this.conn);
};
