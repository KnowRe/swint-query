var swintQuery = require('../lib'),
	defs,
	schema;
	
defs = {
	name: 'baz',
	engine: 'MySQL',
	table: 'bazs',
	hooks: {}
};
	
schema = [
	{
		field: 'foo',
		type: 'RelN:1',
		related: 'foo',
		relKey: 'foo_id'
	}
];

module.exports = function(manager) {
	defs.db = manager.mySqlConn;
	return swintQuery.Structure(manager, defs, schema);
};
