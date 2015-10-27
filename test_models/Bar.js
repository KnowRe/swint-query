var swintQuery = require('../lib'),
	defs,
	schema;

defs = {
	name: 'bar',
	engine: 'MySQL',
	table: 'bars',
	hooks: {}
};
	
schema = [
	{
		field: 'foos',
		type: 'RelN:M',
		related: 'foo',
		joinTable: 'foos_bars',
		myKey: 'bar_id',
		relKey: 'foo_id'
	}
];

module.exports = function(manager) {
	defs.db = manager.mySqlConn;
	return swintQuery.Structure(manager, defs, schema);
};
