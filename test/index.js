'use strict';

var assert = require('assert'),
	path = require('path'),
	fs = require('fs'),
	swintQuery = require('../lib');

global.swintVar.printLevel = 1;

describe('Query test', function () {
	var models,
		operator = swintQuery.Operator;

	this.timeout(20000);

	before(function (done) {
		var credPath = path.join(process.env.HOME, '.swint', 'swint-query-test.json'),
			cred;

		try {
			fs.accessSync(credPath);
			cred = JSON.parse(fs.readFileSync(credPath));
		} catch (e) {
			cred = {
				host: process.env.SWINT_QUERY_TEST_HOST,
				database: process.env.SWINT_QUERY_TEST_DATABASE,
				user: process.env.SWINT_QUERY_TEST_USER,
				password: process.env.SWINT_QUERY_TEST_PASSWORD
			};
		}

		var manager = swintQuery.Manager({
			dir: path.join(__dirname, '../test_models'),
			mysql: cred
		}, function (err) {
			models = manager.models;
			done();
		});
	});

	it('Truncate tables', function (done) {
		models.foo.query("TRUNCATE TABLE foos", function () {
			models.foo.query("TRUNCATE TABLE bars", function () {
				models.foo.query("TRUNCATE TABLE bazs", function () {
					models.foo.query("TRUNCATE TABLE foos_bars", function () {
						done();
					});
				});
			});
		});
	});

	it('Create entries', function (done) {
		models.foo.save([
			{
				column1: 10001,
				column2: '1-2',
				column3: 'AAA'
			},
			{
				column1: 20001,
				column2: '2-2',
				column3: 'BBB'
			},
			{
				column1: 30001,
				column2: '3-2',
				column3: 'CCC'
			}
		], function (err, res) {
			done();
		});
	});

	it('Create with N:1 relations', function (done) {
		models.baz.save({
			column1: 'BAZ',
			foo__column1: 40001,
			foo__column2: '4-2',
			foo__column3: 'AAA'
		}, function (err, res) {
			done();
		});
	});

	it('Create with N:M relations', function (done) {
		models.bar.save({
			column1: 'BAR1',
			column2: 'BAR2',
			foo__column1: 50001,
			foo__column2: '5-2',
			foo__column3: 'BBB'
		}, function (err, res) {
			done();
		});
	});

	it('Fetch from foo', function (done) {
		models.foo.fetch({
			column3: operator.ne('CCC')
		}, {
			order: 'column3',
			orderFlag: true,
			limit: 3
		}, function (err, res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					column3: r.column3,
					id: r.id,
				}
			});

			assert.deepEqual(res, [
				{
					column1: 20001,
					column2: '2-2',
					column3: 'BBB',
					id: 2
				},
				{
					column1: 50001,
					column2: '5-2',
					column3: 'BBB',
					id: 5
				},
				{
					column1: 10001,
					column2: '1-2',
					column3: 'AAA',
					id: 1
				}
			]);

			done();
		});
	});

	it('Fetch from N:M relations', function (done) {
		models.foo.fetch({
			id: 5
		}, {
			target: ['*', 'bar.*'],
			join: ['bar']
		}, function (err, res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					column3: r.column3,
					id: r.id,
					bar__column1: r.bar__column1,
					bar__column2: r.bar__column2,
					bar__id: r.bar__id
				};
			});

			assert.deepEqual(res, [{
				column1: 50001,
				column2: '5-2',
				column3: 'BBB',
				id: 5,
				bar__column1: 'BAR1',
				bar__column2: 'BAR2',
				bar__id: 1
			}]);

			done();
		});
	});

	it('Fetch from N:1 relations', function (done) {
		models.bar.fetch({}, {
			target: ['*', 'foo.*'],
			join: ['foo']
		}, function (err, res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					id: r.id,
					foo__column1: r.foo__column1,
					foo__column2: r.foo__column2,
					foo__column3: r.foo__column3,
					foo__id: r.foo__id
				};
			});

			assert.deepEqual(res, [{
				column1: 'BAR1',
				column2: 'BAR2',
				id: 1,
				foo__column1: 50001,
				foo__column2: '5-2',
				foo__column3: 'BBB',
				foo__id: 5
			}]);

			done();
		});
	});

	it('Remove from foo', function (done) {
		models.foo.remove([
			{id: 2},
			{id: 4},
			{id: 5}
		], function (err, res) {
			assert.equal(res[0].affectedRows, 3);
			assert.equal(res[1].affectedRows, 1);
			assert.equal(res[2].affectedRows, 1);
			done();
		});
	});

	it('Truncate tables', function (done) {
		models.foo.query("TRUNCATE TABLE foos", function () {
			models.foo.query("TRUNCATE TABLE bars", function () {
				models.foo.query("TRUNCATE TABLE bazs", function () {
					models.foo.query("TRUNCATE TABLE foos_bars", function () {
						done();
					});
				});
			});
		});
	});

	it('Create entries Promise', function () {
		return models.foo.savePromise([
			{
				column1: 10001,
				column2: '1-2',
				column3: 'AAA'
			},
			{
				column1: 20001,
				column2: '2-2',
				column3: 'BBB'
			},
			{
				column1: 300001,
				column2: '3-2',
				column3: 'CCC'
			}
		]).then();
	});

	it('Create with N:1 relations Promise', function () {
		return models.baz.savePromise({
			column1: 'BAZ',
			foo__column1: 40001,
			foo__column2: '4-2',
			foo__column3: 'AAA'
		}).then();
	});

	it('Create with N:M relations Promise', function () {
		return models.bar.savePromise({
			column1: 'BAR1',
			column2: 'BAR2',
			foo__column1: 50001,
			foo__column2: '5-2',
			foo__column3: 'BBB'
		}).then();
	});

	it('Fetch from foo Promise', function () {
		return models.foo.fetchPromise({
			column3: operator.ne('CCC')
		}, {
			order: 'column3',
			orderFlag: true,
			limit: 3
		}).then(function (res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					column3: r.column3,
					id: r.id,
				}
			});

			assert.deepEqual(res, [
				{
					column1: 20001,
					column2: '2-2',
					column3: 'BBB',
					id: 2
				},
				{
					column1: 50001,
					column2: '5-2',
					column3: 'BBB',
					id: 5
				},
				{
					column1: 10001,
					column2: '1-2',
					column3: 'AAA',
					id: 1
				}
			]);
		});
	});


	it('Fetch from N:M relations', function () {
		return models.foo.fetchPromise({
			id: 5
		}, {
			target: ['*', 'bar.*'],
			join: ['bar']
		}).then(function (res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					column3: r.column3,
					id: r.id,
					bar__column1: r.bar__column1,
					bar__column2: r.bar__column2,
					bar__id: r.bar__id
				};
			});

			assert.deepEqual(res, [{
				column1: 50001,
				column2: '5-2',
				column3: 'BBB',
				id: 5,
				bar__column1: 'BAR1',
				bar__column2: 'BAR2',
				bar__id: 1
			}]);
		});
	});

	it('Fetch from N:1 relations', function () {
		return models.bar.fetchPromise({}, {
			target: ['*', 'foo.*'],
			join: ['foo']
		}).then(function (res) {
			res = res.map(function (r) {
				return {
					column1: r.column1,
					column2: r.column2,
					id: r.id,
					foo__column1: r.foo__column1,
					foo__column2: r.foo__column2,
					foo__column3: r.foo__column3,
					foo__id: r.foo__id
				};
			});

			assert.deepEqual(res, [{
				column1: 'BAR1',
				column2: 'BAR2',
				id: 1,
				foo__column1: 50001,
				foo__column2: '5-2',
				foo__column3: 'BBB',
				foo__id: 5
			}]);
		});
	});

	it('Remove from foo', function () {
		return models.foo.removePromise([
			{id: 2},
			{id: 4},
			{id: 5}
		]).then(function (res) {
			assert.equal(res[0].affectedRows, 3);
			assert.equal(res[1].affectedRows, 1);
			assert.equal(res[2].affectedRows, 1);
		});
	});

	it('Fetch with async await ', function () {
		async function getBarFooAndMerge() {
			var foo = await models.foo.fetchPromise({}, {});
			var bar = await models.bar.fetchPromise({}, {});
			return [...foo, ...bar];
		}

		return getBarFooAndMerge()
			.then(result => {
				assert.equal(result.length, 3);
			})
	});

	it('Fetch with promise all and async', function () {

		async function PromiseAll (){
			var [r1, r2] = await Promise.all([
				models.foo.fetchPromise({}, {}),
				models.bar.fetchPromise({}, {})
			]);
			return [...r1, ...r2];
		}

		return PromiseAll()
			.then(result=>{
				assert.equal(result.length, 3);
			})

	});

	it('Test prepared statement insert foos tables', function (done) {
		let reason = `Doesn't need after all`
		models.foo.query(
			`insert into foos (column1, column2, column3) values (99999, ?, 'CCC')`,
			[`${reason}`],
			function (err, res) {
				print(err);
				done();
			}
		);
	});

	it('Test queryPromise prepared statement select from foos', function (done) {
		let reason = `Doesn't need after all`
		models.foo.queryPromise(
			`select * from foos where column2=?`,
			[`${reason}`]
		).then(function (res) {
			print(res);
			done();
		});
	});


});
