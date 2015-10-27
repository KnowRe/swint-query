var swintQuery = require('../lib'),
	defs,
	schema;
	
defs = {
	name: 'foo',
	engine: 'MySQL',
	table: 'foos',
	hooks: {}
};
	
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
	}
];

module.exports = function(manager) {
	defs.db = manager.mySqlConn;
	return swintQuery.Structure(manager, defs, schema);
};
