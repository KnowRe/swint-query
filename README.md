# swint-query
MySQL query generator for Swint

**Warning: This is not the final draft yet, so do not use this until its official version is launched**

## Installation
```sh
$ npm install --save swint-query
```

## Manager
* Overall manager of ORM's
* Usage
```javascript
var manager = swintQuery.Manager({
		dir: path.join(__dirname, 'models'),
		mysql: {
			host: 'myhost.example.com',
			database: 'mydb',
			user: 'username',
			password: 'mypasswd'
		}
	}, function(err) {
		print(manager.models); // Models fetched from DB server
		done();
	});
```

## Structure
* Defining the model's structure
* Usage
```javascript
var defs = {
		name: 'foo',
		engine: 'MySQL',
		table: 'foos'
	},
	schema = [
		{
			field: 'bars',
			type: 'RelN:M',
			related: 'bar',
			joinTable: 'foos_bars',
			myKey: 'foo_id',
			relKey: 'bar_id'
		},
		{
			field: 'bazs',
			type: 'Rel1:N',
			related: 'baz',
			joinTable: 'bazs',
			myKey: 'foo_id'
		},
		{
			field: 'qux',
			type: 'RelN:1',
			related: 'qux',
			relKey: 'qux_id'
		}
	];

module.exports = function(manager) {
	defs.db = manager.mySqlConn;
	return swintQuery.Structure(manager, defs, schema);
};
```

## Model
* Methods
  * `.query(query, callback)`
    * Executes query
    * `query`: `String`, the query to be executed
    * `callback`: `Function`
  * `.save(data, callback)`
    * Insert data if the data doesn't have `id`, or update data if it has.
    * `data`: `Object` or `Array`, If array, it must be the array of objects to be saved
    * `callback`: `Function`
  * `.fetch(condition, option, callback)`
    * `condition`: `Object`, the key is the name of field
    * `option`: `Object`
      * `target`: `Array`, the list of fields to be fetched, can be `*` or `joinedModel.*`.
      * `join`: `Array`, the list of the names of models to be joined
      * `order`: `String` or `Array`, the name of the field to be sorted, can be `Array`.
      * `orderFlag`: `Boolean` or `Array`, the sorting order
      * `limit`: `Number`, the number of rows to fetch

* Usage
```javascript
models.foo.fetch({
	myColumn: operator.ne('foo')
}, {
	target: ['*', 'bar.*'],
	join: ['bar'],
	order: 'myColumn',
	orderFlag: true,
	limit: 42
}, function(err, res) {
	// ...
});
```

## Operator
* Various operators
* `eq`: Equal, `{ fieldName: eq(42) }`
* `ne`: Not equal, `{ fieldName: ne(42) }`
* `gt`: Greater than, `{ fieldName: gt(42) }`
* `gte`: Greater than or equal, `{ fieldName: gte(42) }`
* `lt`: Less than, `{ fieldName: lt(42) }`
* `lte`: Less than or equal, `{ fieldName: lte(42) }`
* `btn`: Between, `{ fieldName: btn(42, 84) }`
* `nbtn`: Not between, `{ fieldName: nbtn(42, 84) }`
* `isNull`: Is null, `{ fieldName: isNull() }`
* `notNull`: Not null, `{ fieldName: notNull() }`
