'use strict';

var sprintf = require('sprintf').sprintf,
	DateUtil = require('date-utils'),
	async = require('async'),
	mysql = require('mysql'),
	Operator = require('../operator');

module.exports = function(defs) {
	return new Engine(defs);
};

var Engine = function(defs) {
	this.db = defs.db;
	this.table = defs.table;
	this.hooks = defs.hooks;
	DateUtil;
};

var _ = Engine.prototype;

_.getSchema = function(cb) {
	this.db.query(sprintf('DESCRIBE %s', this.table), function(err, results) {
		var schema = results.map(function(f) {
			if (f.Field === 'id') {
				return {
					field: 'id',
					type: 'Number'
				};
			} else if (f.Field === 'modified_at') {
				return {
					field: 'modified_at',
					type: 'Date'
				};
			} else if (f.Field === 'created_at') {
				return {
					field: 'created_at',
					type: 'Date'
				};
			} else if (f.Field === 'removed_at') {
				return {
					field: 'removed_at',
					type: 'Date'
				};
			}

			if (f.Type.match(/^varchar/) || f.Type.match(/^text/) || f.Type.match(/^mediumtext/) || f.Type.match(/^longtext/) || f.Type.match(/^tinytext/)) {
				return {
					field: f.Field,
					type: 'String'
				};
			} else if (f.Type.match(/^enum/)) {
				return {
					field: f.Field,
					type: 'String',
					choices: f.Type.replace(/(enum\(|\)|')/g,'').split(',')
				};
			} else if (f.Type.match(/^int/) || f.Type.match(/^float/) || f.Type.match(/^long/) || f.Type.match(/^double/)) {
				return {
					field: f.Field,
					type: 'Number'
				};
			} else if (f.Type.match(/^boolean/) || f.Type.match(/^tinyint/)) {
				return {
					field: f.Field,
					type: 'Boolean'
				};
			} else if (f.Type.match(/^datetime/) || f.Type.match(/^timestamp/) || f.Type.match(/^time/) || f.Type.match(/^date/) || f.Type.match(/^year/)) {
				return {
					field: f.Field,
					type: 'Date'
				};
			}
		});

		cb(err, schema);
	});
};

_.fetch = function(struct, cond, option, cb, conn) {
	var booleanList = [], i, j,
		query = this.buildFetchQuery(struct, cond, option);

	struct.schema.forEach(function(v) {
		if (v.type === 'Boolean') booleanList.push(v.field );
	});

	this.query(query, function(err, results) {
		if (booleanList.length > 0) {
			results.forEach(function(result) {
				i = booleanList.length;
				while (i--) {
					if (result.hasOwnProperty(j = booleanList[i])) result[j] = result[j] ? true : false;
				}
			});
		}

		cb(err, results);
	}, conn);
};

_._isSaveOptimizable = function(data) {
	var lengthCheck = false,
		expectedLength = Object.keys(data[0]).length;
	for (var key in data[0]) {
		for (var i = 0; i<data.length; i++) {
			if ( key === 'id' || /__/.test(key) || !data[i].hasOwnProperty(key)  || (!lengthCheck && expectedLength !== Object.keys(data[i]).length))
				return false;
		}
		lengthCheck = true;
	}
	return true;
};

_._buildMultiSaveQuery = function(multiInsertData) {
	var multiQuery = /INSERT INTO `\w+` \((\w|,|\s|`)+\) VALUES /.exec(multiInsertData.queue[0])[0];

	multiInsertData.queue.forEach(function(q, i) {
		if (i > 0)
			multiQuery += ',';
		multiQuery += /VALUES \((.|\r\n|\n|\r)+\)$/.exec(q)[0].replace(/^VALUES/,'');
	});
	return multiQuery;
};

_.save = function(struct, data, cb, conn, multiInsertData) {
	var that = this;
	if (Array.isArray(data)) {
		if (that._isSaveOptimizable(data)) {
			multiInsertData = {
				multiInsert : true,
				queue : []
			};
		}
		async.series(
			data.map(function(d) {
				return function(callback) {
					that.save(struct, d, callback, conn, multiInsertData);
				};
			}),
			function(err, results) {
				if (multiInsertData && multiInsertData.multiInsert && multiInsertData.queue.length > 0) {
					that.query(that._buildMultiSaveQuery(multiInsertData), function(err, results) {
						cb(err, results);
					}, conn);
				} else {
					cb(err, results);
				}
			}
		);
		
	} else {
		var rData = this.rearrangeData(struct, data),
			autoIDs = {};
		async.series(
			rData.map(function(d) {
				return function(callback) {
					var query = that.buildSaveQuery(struct, d.model, d.data, autoIDs);

					if (query) {						
						if (multiInsertData && multiInsertData.multiInsert) {
							setImmediate(function() {  // used for recursive deferral
								multiInsertData.queue.push(query);					
								callback(null,null);						
							});
						} else {
							that.query(query, function(err, results) {
								if (results) autoIDs[d.model] = results.insertId;
								callback(err, results);
							}, conn);
						}
					} else {
						callback(null, null);
					}
				};
			}),
			function(err, results) {
				cb(err, results);
			}
		);
	}
};

_.remove = function(struct, data, cb, conn) {
	var that = this,
		queries = this.buildRemoveQuery(struct, data);

	async.series(
		queries.map(function(q) {
			return function(callback) {
				that.query(q, function(err, results) {
					callback(err, results);
				}, conn);
			};
		}),
		function(err, results) {
			cb(err, results);
		}
	);
};

_.query = function(query, cb, conn) {
	print('Query:', query);
	if (conn) {
		conn.query(query, function(err, results) {
			cb(err, results);
		});
	} else {
		this.db.query(query, function(err, results) {
			cb(err, results);
		});
	}
};

_.buildFetchQuery = function(struct, cond, option) {
	var that = this,
		qSnip = [],
		condStr = [],
		protoFields = [],
		fields = [],
		tables = [this.table],
		structs = [struct],
		names = [];

	if (option.hasOwnProperty('target')) {
		option.target.forEach(function(t) {
			if (/\./.test(t)) {
				var column = t.split('.');

				if (column[1] === '*') {
					protoFields = protoFields.concat(struct.manager.models[column[0]].getDBFields().map(function(f) {
						return column[0] + '.' + f;
					}));
				} else {
					protoFields.push(t);
				}
			} else {
				if (t === '*') {
					protoFields = protoFields.concat(struct.getDBFields());
				} else {
					protoFields.push(t);
				}
			}
		});

		fields = protoFields.map(function(t) {
			var ret;

			if (/\./.test(t)) {
				var column = t.split('.');
				ret = sprintf('`%s`.`%s` AS `%s__%s`', struct.manager.models[column[0]].defs.table, column[1], column[0], column[1]);
			} else {
				ret = sprintf('`%s`.`%s` AS `%s`', that.table, t, t);
			}

			return ret;
		});
	} else {
		fields = struct.getDBFields().map(function(f) {
			return sprintf('`%s`.`%s` AS `%s`', that.table, f, f);
		});
	}
	qSnip.push(sprintf('SELECT %s', fields.join(', ')));

	if (option.hasOwnProperty('join')) {
		option.join.forEach(function(j) {
			var m = struct.manager.models[j];
			structs.push(m);
			tables.push(m.defs.table);
		});
	}

	names = structs.map(function(s) {
		return s.name;
	});

	structs.forEach(function(s) {
		s.schema.forEach(function(ss) {
			if (ss.type === 'RelN:M' && names.indexOf(ss.related) !== -1 && tables.indexOf(ss.joinTable) === -1) {
				tables.push(ss.joinTable);
			}
		});
	});

	var qTables = tables.map(function(t) {
		return sprintf('`%s`', t);
	});

	qSnip.push(sprintf('FROM %s', qTables.join(', ')));

	cond['removed_at'] = Operator.isNull();
	for (var key in cond) {
		var condVal = cond[key],
			rKey;

		if (/\./.test(key)) {
			rKey = key;
		} else {
			rKey = sprintf('`%s`.`%s`', this.table, key);
		}

		if (typeof condVal === 'undefined' || condVal === null) {
			condVal = Operator.isNull();
		}

		if (condVal.type === 'operator') {
			var queried = condVal.toQuery();
			if (typeof queried === 'string') {
				condStr.push(sprintf('%s %s', rKey, queried));
			} else {
				if (condVal.fn === 'btn') {
					condStr.push(sprintf('(%s %s AND %s %s)', rKey, queried[0], rKey, queried[1]));
				} else if (condVal.fn === 'nbtn') {
					condStr.push(sprintf('(%s %s OR %s %s)', rKey, queried[0], rKey, queried[1]));
				}
			}
		} else if (Array.isArray(condVal)) {
			condVal = condVal.map(function(v) {
				return mysql.escape(v);
			});
			if (condVal.length !== 0) {
				condStr.push(sprintf('%s IN (%s)', rKey, condVal.join(', ')));
			} else {
				condStr.push('FALSE');
			}
		} else if (typeof condVal === 'number') {
			condVal = mysql.escape(condVal);
			condStr.push(sprintf('%s = %s', rKey, condVal));
		} else if (typeof condVal === 'string') {
			condVal = mysql.escape(condVal);
			condStr.push(sprintf('%s = %s', rKey, condVal));
		}
	}

	if (option.hasOwnProperty('join')) {
		condStr = condStr.concat(struct.getJoinQuery(tables));
		option.join.forEach(function(j) {
			condStr = condStr.concat(struct.manager.models[j].getJoinQuery(tables));
		});
	}

	if (condStr.length === 0) {
		qSnip.push(sprintf('WHERE TRUE'));
	} else {
		qSnip.push(sprintf('WHERE %s', condStr.join(' AND ')));
	}

	if (option.hasOwnProperty('order')) {
		that = this;

		var qOrder = 'ORDER BY ',
			arrOrder = Array.isArray(option.order) ? option.order : [option.order],
			arrOrderFlag = Array.isArray(option.orderFlag) ? option.orderFlag : [option.orderFlag];
		if (arrOrder.length !== arrOrderFlag.length) {
			throw new Error('The number of ORDER BY columns do not match with the number of ORDER BY flags');
		}
		arrOrder.forEach(function(o, index) {
			if (/\./.test(o)) {
				var column = o.split('.');
				o = sprintf('`%s`.`%s`', struct.manager.models[column[0]].defs.table, column[1]);
			} else {
				o = sprintf('`%s`.`%s`', that.table, o);
			}
			if (index > 0)
				qOrder += ', ';
			qOrder += sprintf('%s %s', o, arrOrderFlag[index] ? 'DESC' : 'ASC');
		});
		qSnip.push(qOrder);
	}

	if (option.hasOwnProperty('limit')) {
		qSnip.push(sprintf('LIMIT %d', option.limit));
	}

	if (option.hasOwnProperty('offset')) {
		qSnip.push(sprintf('OFFSET %d', option.offset));
	}

	return qSnip.join(' ');
};

_.rearrangeData = function(struct, data) {
	var reArrange = {},
		joinNM = [];

	for (var i in data) {
		var modelName,
			keyName;

		if (/__/.test(i)) {
			var colArr = i.split('__');

			modelName = colArr[0];
			keyName = colArr[1];
		} else {
			modelName = struct.name;
			keyName = i;
		}

		if (!reArrange.hasOwnProperty(modelName)) {
			reArrange[modelName] = {};
		}
		reArrange[modelName][keyName] = data[i];
	}

	var theModels = Object.keys(reArrange),
		relations = ['Rel1:N', 'RelN:M'];

	theModels.sort(function(a, b) {
		var modelA = struct.manager.models[a],
			modelB = struct.manager.models[b],
			schA = modelA.schema,
			schB = modelB.schema,
			relA = schA.filter(function(v) {
				return (relations.indexOf(v.type) !== -1);
			}).map(function(v) {
				return v.related;
			}),
			relB = schB.filter(function(v) {
				return (relations.indexOf(v.type) !== -1);
			}).map(function(v) {
				return v.related;
			}),
			flagAB = (relA.indexOf(modelB.name) !== -1),
			flagBA = (relB.indexOf(modelA.name) !== -1);

		if (flagAB === flagBA) return 0;
		if (flagAB) return -1;
		if (flagBA) return 1;
	});

	for (i = 0; i < theModels.length; i++) {
		for (var j = 0; j < i; j++) {
			var modelA = struct.manager.models[theModels[i]],
				modelB = struct.manager.models[theModels[j]],
				schA = modelA.schema,
				schB = modelB.schema,
				relA = schA.filter(function(v) {
					return (v.type === 'RelN:M');
				}).map(function(v) {
					return v.related;
				}),
				relB = schB.filter(function(v) {
					return (v.type === 'RelN:M');
				}).map(function(v) {
					return v.related;
				}),
				flagAB = (relA.indexOf(modelB.name) !== -1),
				flagBA = (relB.indexOf(modelA.name) !== -1);

			if (flagAB && flagBA) {
				joinNM.push([theModels[i], theModels[j]]);
			}
		}
	}

	return theModels.map(function(v) {
		return {
			model: v,
			data: reArrange[v]
		};
	}).concat(joinNM.map(function(v) {
		return {
			model: v,
			data: [reArrange[v[0]], reArrange[v[1]]]
		};
	}));
};

_.buildSaveQuery = function(struct, model, data, autoIDs) {
	var that = this,
		query = '';

	if (!Array.isArray(model)) {
		var theModel = struct.manager.models[model];
		if (data.hasOwnProperty('id')) {
			data.modified_at = new Date();

			query += sprintf('UPDATE `%s` SET ', theModel.defs.table);

			var datArr = [];

			for (var i in data) {
				if (i === 'id') continue;
				if (data[i] === null) continue;

				var keyType = that.getKeyType(theModel.schema, i);

				if (keyType === null) continue;

				data[i] = mysql.escape(data[i]);

				switch (keyType) {
					case 'Number':
						datArr.push(sprintf('`%s` = %s', i, data[i]));
						break;
					case 'String':
					case 'Boolean':
						datArr.push(sprintf('`%s` = %s', i, data[i]));
						break;
					case 'Date':
						datArr.push(sprintf('`%s` = \'%s\'', i, (new Date(data[i])).toUTCFormat('YYYY-MM-DD HH24:MI:SS') ));
						break;
				}
			}

			if (Array.isArray(data['id'])) {
				var condStr = data['id'].join(', ');
				query += datArr.join(', ') + sprintf(' WHERE `id` IN (%s)', condStr);
			} else {
				query += datArr.join(', ') + sprintf(' WHERE `id`= %s', data['id']);
			}

			return query;
		} else {
			data.created_at = new Date();
			data.modified_at = new Date();

			query += sprintf('INSERT INTO `%s` ', theModel.defs.table);

			var relN1 = theModel.schema.filter(function(v) {
				return (v.type === 'RelN:1');
			});

			if (relN1.length !== 0) {
				relN1.forEach(function(r) {
					if (autoIDs[r.related]) {
						data[r.relKey] = autoIDs[r.related];
					}
				});
			}

			var colArr = [];
			
			datArr = [];

			for (i in data) {
				if (data[i] === null) continue;

				data[i] = mysql.escape(data[i]);

				keyType = that.getKeyType(theModel.schema, i);

				if (keyType === null) continue;

				colArr.push(i);

				switch (keyType) {
					case 'Number':
						datArr.push(data[i]);
						break;
					case 'String':
					case 'Boolean':
						datArr.push(sprintf('%s', data[i]));
						break;
					case 'Date':
						datArr.push(sprintf('\'%s\'', (new Date(data[i])).toUTCFormat('YYYY-MM-DD HH24:MI:SS')));
						break;
				}
			}

			colArr = colArr.map(function(c) {
				return sprintf('`%s`', c);
			});

			query += sprintf('(%s) VALUES (%s)', colArr.join(', '), datArr.join(', '));

			return query;
		}
	} else {
		var theModel0 = struct.manager.models[model[0]];
		// theModel1 = struct.manager.models[model[1]];

		if (!data[0].hasOwnProperty('id') && !data[1].hasOwnProperty('id')) {
			var theSchema = theModel0.schema.filter(function(s) {
				return (s.related === model[1]);
			})[0];

			query += sprintf(
				'INSERT INTO %s (%s, %s) VALUES (%s, %s)',
				theSchema.joinTable,
				theSchema.myKey,
				theSchema.relKey,
				autoIDs[model[0]],
				autoIDs[model[1]]
			);

			return query;
		} else {
			return '';
		}
	}
};

_.buildJoinModelSaveQuery = function(struct1, struct2, data) {
	var schema1 = struct2.schema.filter(function(v) {
			return (v.related === struct1.name);
		})[0],
		schema2 = struct1.schema.filter(function(v) {
			return (v.related === struct2.name);
		})[0];
		// joinTable = schema1.joinTable;
		// schema1.myKey,
		// schema1.relKey,

	return sprintf(
		'INSERT INTO %s (%s, %s, created_at, modified_at) VALUES (%s, %s, %s, %s)',
		schema1.joinTable,
		schema1.myKey,
		schema1.relKey,
		data[schema1.myKey],
		data[schema2.myKey],
		(new Date()).toUTCFormat('YYYY-MM-DD HH24:MI:SS'),
		(new Date()).toUTCFormat('YYYY-MM-DD HH24:MI:SS')
	);
};

_.buildRemoveQuery = function(struct, data) {
	var models = struct.schema.filter(function(v) {
			return (['Rel1:N', 'RelN:M'].indexOf(v.type) !== -1);
		}).map(function(v) {
			return {
				key: v.myKey,
				table: v.joinTable
			};
		}),
		qData = [{ key: 'id', table: struct.defs.table }].concat(models),
		theID = Array.isArray(data) ? data.map(function(v) {
			return v.id;
		}).join(',') : data.id,
		magicWord = Array.isArray(data) ? 'UPDATE %s SET removed_at=\'%s\' WHERE %s IN (%s)' : 'UPDATE %s SET removed_at=\'%s\' WHERE %s = %s';

	if (Array.isArray(data) && data.length === 0) {
		magicWord = 'SELECT 1';
	}

	return qData.map(function(qd) {
		return sprintf(
			magicWord,
			qd.table,
			(new Date()).toUTCFormat('YYYY-MM-DD HH24:MI:SS'),
			qd.key,
			theID
		);
	});
};

_.getKeyType = function(schema, key) {
	var filtered = schema.filter(function(v) {
		return (v.field === key);
	});

	if (filtered.length === 0) {
		return null;
	} else {
		return filtered[0].type;
	}
};
